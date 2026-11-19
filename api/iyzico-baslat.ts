import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getAuthedUser } from './_lib/auth';
import { WEB_PAKETLER, isWebPaket, kurusToIyzicoPrice } from './_lib/webPaketler';
import { IyzicoError, getIyzicoConfig, getSiteUrl, hizSinirlayici, initializeCheckoutForm, sandboxDenemeIzni } from './_lib/iyzico';
import { attachToken, createOrder, hasHigherActivePackage, markFailed, profileExists } from './_lib/webSiparis';

/**
 * POST /api/iyzico-baslat — web'de tek seferlik paket ödemesi başlatır (yalnız web ekranı /odeme çağırır).
 *
 * Gövde: { paket: 'tohum'|'filiz'|'fidan'|'orman', alici: { ad, soyad, telefon, tckn?, adres, sehir } }
 * 200: { siparisId, odemeUrl }  -> tarayıcı odemeUrl'e (İyzico'nun ödeme sayfası) gider.
 * Hatalar { hata }: 401 giris_gerekli, 400 gecersiz_paket|gecersiz_alici, 409 daha_yuksek_paket_var|profil_yok,
 *                    429 cok_istek, 503 odeme_yapilandirilmadi, 502 saglayici_hatasi.
 *
 * Güvenlik: e-posta ve kullanıcı kimliği JETONDAN gelir; fiyat ve süre sunucu tablosundan (webPaketler.ts).
 * Gövdedeki fazladan alanlar (fiyat, e-posta...) yok sayılır. TCKN ve adres yalnız İyzico'ya iletilir, saklanmaz.
 * KURULUM: Vercel'de IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL, SITE_URL ve SUPABASE_SERVICE_ROLE_KEY.
 * Üretim/önizlemede sandbox ile denemek için IYZICO_SANDBOX_EPOSTALAR (bkz. api/_lib/iyzico.ts).
 * Paket yazımı service_role ile yapılır: supabase_migrations/fix_lock_tier_service_role.sql canlıda çalışmış olmalı.
 */

// Basit hız sınırı: aynı e-posta dakikada en fazla 5 sipariş. NOT: bellek içidir, her sunucusuz örneğin kendi sayacı
// vardır; amaç kazara çift tıklama ve kaba kötüye kullanımı kesmek, tam koruma değil (İyzico'nun kendi limiti de var).
// Daha sağlam üst sınır (aynı e-postanın açık 'beklemede' sipariş sayısı) veritabanı katmanında (webSiparis) olmalı.
const epostaSiniri = hizSinirlayici(5, 60_000);

export function hizSiniriAsildi(email: string, simdi: number = Date.now()): boolean {
  return epostaSiniri.asildi(email, simdi);
}

/** Testler için sayacı sıfırlar. */
export function _hizSayaciniSifirla() {
  epostaSiniri.sifirla();
}

// İyzico identityNumber alanı zorunlu; veli TCKN vermezse kullanılan yer tutucu. NOT: üretimde kabul edilip
// edilmediği halka açık belgede yazmıyor, İyzico'ya (entegrasyon@iyzico.com) teyit ettirilmeli.
export const TCKN_YER_TUTUCU = '11111111111';

/**
 * TC kimlik no: istemciyle (lib/webOdeme.ts tcknGecerliMi) AYNI kural — 11 hane, ilk hane 0 değil. Sağlama basamağı
 * BİLEREK denetlenmez: İyzico'nun belgedeki sandbox örnek numarası (74300864791) sağlamaya uymaz; ayrıca istemciden
 * geçip sunucuda alan belirtmeyen 400 alan bir form veliyi çıkmaza sokar. Gerçek doğrulamayı İyzico yapar.
 */
export function tcknGecerli(t: string): boolean {
  return /^[1-9]\d{10}$/.test(t);
}

/** Telefonu +905XXXXXXXXX biçimine getirir (TR cep); yurt dışı numara +ülke kodu ile 10-15 hane kabul edilir. */
export function telefonNormalize(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\s().-]/g, '');
  let m = s.match(/^(?:\+90|0090|90|0)?(5\d{9})$/);
  if (m) return `+90${m[1]}`;
  m = s.match(/^(?:\+|00)([1-9]\d{9,14})$/);
  if (m) return `+${m[1]}`;
  return null;
}

/** Metin alanını temizler: kontrol karakterleri ve fazla boşluk atılır, uzunluk sınırlanır. */
function temizMetin(v: unknown, min: number, max: number): string | null {
  if (typeof v !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length < min || s.length > max) return null;
  return s;
}

export interface TemizAlici {
  ad: string;
  soyad: string;
  telefon: string;
  tckn: string;
  adres: string;
  sehir: string;
}

/**
 * Alıcı alanlarını doğrular; herhangi biri geçersizse null (400 gecersiz_alici).
 * NEDEN sınırlar istemciyle aynı ya da daha geniş: istemci (lib/webOdeme.ts aliciyiDogrula) ad/soyad/şehir 2-60,
 * adres 10-250 ister ve hatalı alanı veliye gösterir; sunucu daha sıkı olursa istemciden geçen form alan belirtmeyen
 * 400 alır. Burada yalnız kaba sınır + kontrol karakteri temizliği var (değerler yalnız İyzico'ya JSON olarak gider).
 */
export function aliciDogrula(a: unknown): TemizAlici | null {
  if (!a || typeof a !== 'object') return null;
  const o = a as Record<string, unknown>;
  const ad = temizMetin(o.ad, 1, 60);
  const soyad = temizMetin(o.soyad, 1, 60);
  const sehir = temizMetin(o.sehir, 2, 60);
  const adres = temizMetin(o.adres, 5, 300);
  const telefon = telefonNormalize(o.telefon);
  if (!ad || !soyad || !sehir || !adres || !telefon) return null;
  let tckn = TCKN_YER_TUTUCU;
  if (o.tckn != null && o.tckn !== '') {
    const t = typeof o.tckn === 'string' ? o.tckn.replace(/\s/g, '') : '';
    if (!tcknGecerli(t)) return null;
    tckn = t;
  }
  return { ad, soyad, telefon, tckn, adres, sehir };
}

function istemciIp(req: VercelRequest): string | undefined {
  const xff = req.headers['x-forwarded-for'];
  const ilk = (Array.isArray(xff) ? xff[0] : xff || '').split(',')[0].trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(ilk) ? ilk : undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ hata: 'yontem_desteklenmiyor' });

  const authed = await getAuthedUser(req);
  const email = authed?.user?.email?.trim().toLowerCase();
  if (!authed || !email) return res.status(401).json({ hata: 'giris_gerekli' });

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
  if (!isWebPaket(body.paket)) return res.status(400).json({ hata: 'gecersiz_paket' });
  const paketKodu = body.paket;
  const paket = WEB_PAKETLER[paketKodu];
  const alici = aliciDogrula(body.alici);
  if (!alici) return res.status(400).json({ hata: 'gecersiz_alici' });

  const cfg = getIyzicoConfig();
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!cfg || !supabaseUrl || !serviceRole) {
    console.error('iyzico-baslat: odeme yapilandirmasi eksik (IYZICO_* / SUPABASE_SERVICE_ROLE_KEY)');
    return res.status(503).json({ hata: 'odeme_yapilandirilmadi' });
  }
  // Üretim/önizleme dağıtımında sandbox açıksa yalnız deneme e-postaları başlatabilir (test kartıyla bedava paket olmasın).
  if (!sandboxDenemeIzni(cfg, email)) {
    console.error('iyzico-baslat: sandbox bu dagitimda yalniz deneme e-postalarina acik');
    return res.status(503).json({ hata: 'odeme_yapilandirilmadi' });
  }

  if (hizSiniriAsildi(email)) return res.status(429).json({ hata: 'cok_istek' });

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  let siparisId: string | null = null;
  try {
    if (!(await profileExists(admin, email))) return res.status(409).json({ hata: 'profil_yok' });
    if (await hasHigherActivePackage(admin, email, paketKodu)) return res.status(409).json({ hata: 'daha_yuksek_paket_var' });

    // KVKK: TCKN ve açık adres siparişe yazılmaz (yalnız İyzico'ya iletilir); iletişim için ad/telefon/şehir yeterli.
    const order = await createOrder(admin, {
      email,
      paket: paketKodu,
      tutarKurus: paket.kurus,
      sureAy: paket.sureAy,
      alici: { ad: alici.ad, soyad: alici.soyad, telefon: alici.telefon, sehir: alici.sehir },
    });
    siparisId = order.id;
    const fiyat = kurusToIyzicoPrice(paket.kurus);
    const adres = { contactName: `${alici.ad} ${alici.soyad}`, city: alici.sehir, country: 'Turkey', address: alici.adres };
    const ip = istemciIp(req);

    const sonuc = await initializeCheckoutForm(cfg, {
      conversationId: order.conversationId || order.id,
      basketId: order.id,
      price: fiyat,
      // Sipariş kimliği yalnız ipucudur: geri dönüşte token siparişteki token'la eşleşmezse hiçbir şey yapılmaz.
      callbackUrl: `${getSiteUrl()}/api/iyzico-donus?siparis=${encodeURIComponent(order.id)}`,
      buyer: {
        id: authed.user.id,
        name: alici.ad,
        surname: alici.soyad,
        identityNumber: alici.tckn,
        email,
        gsmNumber: alici.telefon,
        registrationAddress: alici.adres,
        city: alici.sehir,
        country: 'Turkey',
        ...(ip ? { ip } : {}),
      },
      address: adres,
      basketItem: { id: paketKodu, name: `Bilimo ${paket.ad} Paketi (${paket.sureAy} ay)`, category1: 'Dijital Egitim', price: fiyat },
    });
    if (!sonuc.ok) {
      // İyzico'nun hata METNİ istemciye/günlüğe yazılmaz (kişisel veri yankılayabilir); yalnız kodu.
      console.error('iyzico-baslat: baslatma reddedildi', order.id, sonuc.errorCode);
      await markFailed(admin, order.id, `baslatma_${sonuc.errorCode}`).catch(() => undefined);
      return res.status(502).json({ hata: 'saglayici_hatasi' });
    }
    await attachToken(admin, order.id, sonuc.token);
    return res.status(200).json({ siparisId: order.id, odemeUrl: sonuc.paymentPageUrl });
  } catch (e) {
    const kod = e instanceof IyzicoError ? e.kod : 'beklenmeyen';
    console.error('iyzico-baslat: hata', siparisId, kod);
    if (siparisId) await markFailed(admin, siparisId, `baslatma_${kod}`).catch(() => undefined);
    return res.status(e instanceof IyzicoError ? 502 : 500).json({ hata: e instanceof IyzicoError ? 'saglayici_hatasi' : 'sunucu_hatasi' });
  }
}
