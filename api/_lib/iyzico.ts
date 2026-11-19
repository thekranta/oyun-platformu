/**
 * İyzico Checkout Form için küçük, bağımlılıksız istemci (fetch + crypto) ve ödeme doğrulama mantığı.
 *
 * NEDEN iyzipay paketi değil: yeni bağımlılık eklememek ve gönderilen/imzalanan baytları tam denetlemek.
 * Kimlik doğrulama IYZWSv2 (HMAC-SHA256): docs.iyzico.com > Authentication > HMACSHA256 Auth.
 *
 * ORTAM DEĞİŞKENLERİ (yalnız sunucu; koda gömülmez, günlüğe/yanıta yazılmaz):
 *  - IYZICO_API_KEY, IYZICO_SECRET_KEY : İyzico Merchant Panel > Settings > API anahtarları
 *  - IYZICO_BASE_URL                   : varsayılan https://sandbox-api.iyzipay.com; canlı https://api.iyzipay.com
 *  - IYZICO_ALLOW_SANDBOX=1            : üretimde (VERCEL_ENV=production) sandbox'ı bilerek açmak için. NEDEN: sandbox'ta
 *                                        herkese açık test kartlarıyla "ödeme" yapılır; üretimde sandbox'a bağlı kalmak
 *                                        bedava paket açtırır (RevenueCat'teki REVENUECAT_ALLOW_SANDBOX ile aynı mantık).
 *  - IYZICO_SANDBOX_EPOSTALAR          : virgülle ayrılmış deneme e-postaları. Sandbox adresi üretim (production) ya da
 *                                        önizleme (preview) dağıtımında kullanılıyorsa ödemeyi YALNIZ bu e-postalar
 *                                        başlatabilir; liste boşsa kimse başlatamaz (503). NEDEN: test kartı herkese
 *                                        açık; aksi halde giriş yapan herkes canlı veritabanında bedava paket açardı.
 *  - IYZICO_IMZA_DOGRULAMA=kapali      : yanıt imzası formülü sandbox'ta tutmazsa geçici kapatmak için. YALNIZ sandbox
 *                                        adresinde etkilidir; canlı adreste yok sayılır (imza her zaman denetlenir).
 *                                        Yanıtı zaten kendi kimliğimizle TLS üzerinden İyzico'dan sorguluyoruz; imza ek
 *                                        bir savunma katmanıdır. Varsayılan: AÇIK.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { iyzicoPriceToKurus } from './webPaketler';
import { markFailed, markPaidAndGrant } from './webSiparis';

export const IYZICO_SANDBOX_URL = 'https://sandbox-api.iyzipay.com';
export const IYZICO_LIVE_URL = 'https://api.iyzipay.com';
const IZINLI_TABANLAR = new Set([IYZICO_SANDBOX_URL, IYZICO_LIVE_URL]);

export const INIT_PATH = '/payment/iyzipos/checkoutform/initialize/auth/ecom';
export const RETRIEVE_PATH = '/payment/iyzipos/checkoutform/auth/ecom/detail';
const ZAMAN_ASIMI_MS = 15_000;

export interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  imzaDogrula: boolean;
}

/**
 * Yapılandırmayı ortamdan okur; eksik/geçersizse null (çağıran 503 odeme_yapilandirilmadi döner).
 * Taban adres yalnız İyzico'nun iki resmî adresinden biri olabilir: yanlış bir ortam değeri gizli anahtarı başka
 * bir sunucuya imzalatmasın.
 */
export function getIyzicoConfig(env: NodeJS.ProcessEnv = process.env): IyzicoConfig | null {
  const apiKey = (env.IYZICO_API_KEY || '').trim();
  const secretKey = (env.IYZICO_SECRET_KEY || '').trim();
  const baseUrl = (env.IYZICO_BASE_URL || IYZICO_SANDBOX_URL).trim().replace(/\/+$/, '');
  if (!apiKey || !secretKey) return null;
  if (!IZINLI_TABANLAR.has(baseUrl)) return null;
  if (baseUrl === IYZICO_SANDBOX_URL && env.VERCEL_ENV === 'production' && env.IYZICO_ALLOW_SANDBOX !== '1') return null;
  // İmza denetimini kapatma bayrağı canlı adreste etkisiz: canlıda savunma katmanı ortam hatasıyla düşmesin.
  const imzaKapali = baseUrl === IYZICO_SANDBOX_URL && env.IYZICO_IMZA_DOGRULAMA === 'kapali';
  return { apiKey, secretKey, baseUrl, imzaDogrula: !imzaKapali };
}

/**
 * Bu e-posta ödeme BAŞLATABİLİR mi? Canlı adreste herkes; sandbox adresinde yerel geliştirmede (VERCEL_ENV yok ya da
 * development) herkes; sandbox + production/preview birleşiminde yalnız IYZICO_SANDBOX_EPOSTALAR listesindekiler.
 * NEDEN preview de: önizleme dağıtımları da service_role ve gerçek veritabanını taşır; orada hiçbir bayrak gerekmeden
 * sandbox açık olduğundan test kartıyla gerçek paket açılabilirdi.
 */
export function sandboxDenemeIzni(cfg: Pick<IyzicoConfig, 'baseUrl'>, email: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (cfg.baseUrl !== IYZICO_SANDBOX_URL) return true;
  if (env.VERCEL_ENV !== 'production' && env.VERCEL_ENV !== 'preview') return true;
  const liste = (env.IYZICO_SANDBOX_EPOSTALAR || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return liste.includes(email.trim().toLowerCase());
}

/**
 * Bellek içi kayan pencere hız sınırlayıcı. NOT: her sunucusuz örneğin kendi sayacı vardır; amaç kazara tekrarları ve
 * kaba kötüye kullanımı kesmek, tam koruma değil (İyzico'nun kendi istek limiti de var).
 */
export function hizSinirlayici(sinir: number, pencereMs: number) {
  const kayitlar = new Map<string, number[]>();
  return {
    /** Anahtar bu istekle sınırı aşıyorsa true (istek sayılmaz); aşmıyorsa isteği sayar ve false. */
    asildi(anahtar: string, simdi: number = Date.now()): boolean {
      const liste = (kayitlar.get(anahtar) || []).filter((t) => simdi - t < pencereMs);
      if (liste.length >= sinir) {
        kayitlar.set(anahtar, liste);
        return true;
      }
      liste.push(simdi);
      kayitlar.set(anahtar, liste);
      if (kayitlar.size > 5000) kayitlar.clear(); // bellek sınırsız büyümesin
      return false;
    },
    sifirla() {
      kayitlar.clear();
    },
  };
}

export const VARSAYILAN_SITE_URL = 'https://oyun.childhoodtech.com';

/**
 * Geri dönüş ve sonuç yönlendirmesinin tabanı. Yalnız https kökü kabul edilir (yol/sorgu atılır); geçersizse varsayılan.
 * NEDEN: yönlendirme adresi istekten ASLA kurulmaz (açık yönlendirme olmasın), yalnız bu sabit taban + sabit yol.
 */
export function getSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  try {
    const u = new URL((env.SITE_URL || '').trim());
    if (u.protocol === 'https:' && !u.username && !u.password) return u.origin;
  } catch {
    /* varsayılana düş */
  }
  return VARSAYILAN_SITE_URL;
}

/**
 * Sipariş kimliği biçimi (veritabanı uuid üretir; biçim B2'ye sıkı bağlanmasın diye harf/rakam/tire genel kalıbı).
 * Yönlendirme adresine ve sorgulara yalnız bu biçim girer.
 */
export function gecerliSiparisId(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(v);
}

/**
 * SAF: IYZWSv2 başlıklarını üretir (test vektörüyle sınanır).
 * imza = hex(HMAC-SHA256(secretKey, randomKey + uriPath + gövde)); gövde boşsa yalnız randomKey + uriPath.
 * Authorization = "IYZWSv2 " + base64("apiKey:" + apiKey + "&randomKey:" + randomKey + "&signature:" + imza)
 */
export function buildAuthHeaders(apiKey: string, secretKey: string, randomKey: string, uriPath: string, body: string) {
  const signature = createHmac('sha256', secretKey).update(randomKey + uriPath + (body || '')).digest('hex');
  const auth = Buffer.from(`apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`).toString('base64');
  return { Authorization: `IYZWSv2 ${auth}`, 'x-iyzi-rnd': randomKey };
}

/** Sağlayıcıya ulaşılamadı / yanıt okunamadı. Mesaj sabit kodlardır; ham yanıt ya da anahtar taşımaz. */
export class IyzicoError extends Error {
  constructor(public kod: 'zaman_asimi' | 'ag_hatasi' | 'gecersiz_yanit' | 'sunucu_hatasi', public httpStatus?: number) {
    super(kod);
  }
}

export type IyzicoYanit = Record<string, any>;

/**
 * İmzalı POST. Gövde BİR KEZ stringify edilir; aynı metin hem imzalanır hem gönderilir (bayt bayt eşit olmalı).
 * HTTP 400 İyzico'nun normal hata biçimidir ({status:'failure', errorCode}); veri olarak döner.
 * 5xx, zaman aşımı, JSON olmayan yanıt IyzicoError fırlatır (çağıran "beklemede" sayar, sonra yeniden dener).
 */
export async function iyziPost(cfg: IyzicoConfig, path: string, bodyObj: unknown): Promise<IyzicoYanit> {
  const body = JSON.stringify(bodyObj);
  const rnd = Date.now().toString() + randomBytes(6).toString('hex');
  const headers = {
    ...buildAuthHeaders(cfg.apiKey, cfg.secretKey, rnd, path, body),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ZAMAN_ASIMI_MS);
  let r: Response;
  try {
    r = await fetch(cfg.baseUrl + path, { method: 'POST', headers, body, signal: ac.signal });
  } catch (e: any) {
    throw new IyzicoError(e?.name === 'AbortError' ? 'zaman_asimi' : 'ag_hatasi');
  } finally {
    clearTimeout(timer);
  }
  if (r.status >= 500) throw new IyzicoError('sunucu_hatasi', r.status);
  let data: unknown;
  try {
    data = await r.json();
  } catch {
    throw new IyzicoError('gecersiz_yanit', r.status);
  }
  if (!data || typeof data !== 'object') throw new IyzicoError('gecersiz_yanit', r.status);
  return data as IyzicoYanit;
}

/** Sabit sürede dize karşılaştırması (zamanlamadan imza tahmin edilmesin). */
export function esitMi(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** İmza için fiyat normalleştirme: sondaki sıfırlar ve gereksiz nokta atılır ("10.50" -> "10.5", "399.00000000" -> "399"). */
export function normalizePriceForSignature(v: unknown): string {
  let s = typeof v === 'number' ? String(v) : String(v ?? '').trim();
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

const hmacHex = (secretKey: string, msg: string) => createHmac('sha256', secretKey).update(msg).digest('hex');

/** Başlatma yanıtı imzası: hex(HMAC(secretKey, conversationId + ":" + token)). */
export function verifyInitSignature(secretKey: string, data: IyzicoYanit): boolean {
  return esitMi(data.signature, hmacHex(secretKey, `${data.conversationId ?? ''}:${data.token ?? ''}`));
}

/** Sonuç sorgusu imzası: paymentStatus:paymentId:currency:basketId:conversationId:paidPrice:price:token. */
export function verifyRetrieveSignature(secretKey: string, data: IyzicoYanit): boolean {
  const msg = [
    data.paymentStatus, data.paymentId, data.currency, data.basketId, data.conversationId,
    normalizePriceForSignature(data.paidPrice), normalizePriceForSignature(data.price), data.token,
  ].map((p) => (p == null ? '' : String(p))).join(':');
  return esitMi(data.signature, hmacHex(secretKey, msg));
}

export interface CheckoutBaslatGirdi {
  /** Siparişin İyzico anahtarı (web_siparisleri.conversation_id; tahmin edilemez uuid). */
  conversationId: string;
  /** Sipariş kimliği (web_siparisleri.id): geri dönüşte siparişi bulmak için basketId olarak gider. */
  basketId: string;
  price: string;
  callbackUrl: string;
  buyer: Record<string, string>;
  address: { contactName: string; city: string; country: string; address: string };
  basketItem: { id: string; name: string; category1: string; price: string };
}

/** Checkout Form başlatır. Başarılıysa token + ödeme sayfası adresi; değilse yalnız İyzico hata kodu (metin değil). */
export async function initializeCheckoutForm(
  cfg: IyzicoConfig,
  g: CheckoutBaslatGirdi,
): Promise<{ ok: true; token: string; paymentPageUrl: string } | { ok: false; errorCode: string }> {
  const data = await iyziPost(cfg, INIT_PATH, {
    locale: 'tr',
    conversationId: g.conversationId,
    price: g.price,
    paidPrice: g.price,
    currency: 'TRY',
    basketId: g.basketId,
    paymentGroup: 'PRODUCT',
    callbackUrl: g.callbackUrl,
    // Tek çekim: taksitte paidPrice vade farkıyla değişir, tutar eşitliği doğrulaması bozulur.
    enabledInstallments: [1],
    buyer: g.buyer,
    billingAddress: g.address,
    // Sanal üründe kargo adresi gerekmez; belgeye göre göndermek zararsız, şema doğrulaması takılmasın.
    shippingAddress: g.address,
    basketItems: [{ ...g.basketItem, itemType: 'VIRTUAL' }],
  });
  if (data.status !== 'success' || typeof data.token !== 'string' || typeof data.paymentPageUrl !== 'string') {
    return { ok: false, errorCode: String(data.errorCode ?? 'bilinmiyor') };
  }
  if (data.conversationId !== g.conversationId) return { ok: false, errorCode: 'siparis_uyusmazligi' };
  if (cfg.imzaDogrula && !verifyInitSignature(cfg.secretKey, data)) return { ok: false, errorCode: 'imza_dogrulanamadi' };
  if (!isIyzicoPaymentUrl(data.paymentPageUrl)) return { ok: false, errorCode: 'gecersiz_odeme_adresi' };
  return { ok: true, token: data.token, paymentPageUrl: data.paymentPageUrl };
}

/** Tarayıcıyı yalnız İyzico'nun HTTPS alan adına yönlendiririz (açık yönlendirme olmasın). */
export function isIyzicoPaymentUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && (url.hostname === 'iyzipay.com' || url.hostname.endsWith('.iyzipay.com'));
  } catch {
    return false;
  }
}

export function retrieveCheckoutForm(cfg: IyzicoConfig, token: string, conversationId: string) {
  return iyziPost(cfg, RETRIEVE_PATH, { locale: 'tr', token, conversationId });
}

// ---------------------------------------------------------------------------------------------------------------
// Doğrulama (SAF) ve sipariş işleme
// ---------------------------------------------------------------------------------------------------------------

/** Doğrulamanın ihtiyaç duyduğu sipariş alanları (api/_lib/webSiparis.ts Order'ının alt kümesi). */
export interface DogrulanacakSiparis {
  id: string;
  /** İyzico conversationId (B2'de ayrı sütun); yoksa sipariş kimliği kullanılır. */
  conversationId?: string;
  paket: string;
  tutarKurus: number;
  durum: string;
  token: string | null;
  bitis?: string | null;
}

export type RedNedeni =
  | 'sorgu_basarisiz' | 'odeme_basarisiz' | 'odeme_durumu_yok' | 'dolandiricilik_red' | 'siparis_uyusmazligi'
  | 'tutar_uyusmazligi' | 'para_birimi_uyusmazligi' | 'odeme_kimligi_yok';
export type BekleNedeni = 'dolandiricilik_inceleme' | 'imza_dogrulanamadi' | 'istek_limiti' | 'saglayici_ulasilamadi';

export type Degerlendirme =
  | { tip: 'onay'; paymentId: string; paidKurus: number; ham: Record<string, unknown> }
  | { tip: 'red'; neden: RedNedeni }
  | { tip: 'bekle'; neden: BekleNedeni };

/**
 * Ödeme kesinleşmiş olarak başarısız sayılabilir mi? Geri dönüşte de durum sorgusunda da YALNIZ bunlar siparişi
 * "basarisiz" yapar. Geri kalanlar (sorgu_basarisiz: İyzico'nun geçici status=failure yanıtı, odeme_durumu_yok,
 * odeme_kimligi_yok) beklemede kalır ve durum sorgusu yeniden dener. NEDEN: para çekilmiş ama sorgu o an hata
 * vermişse sipariş kalıcı "başarısız" görünür, sonuç ekranı "Tekrar dene" sunar ve veli ikinci kez öderdi; ayrıca
 * veli henüz ödeme sayfasındayken sorgu "ödeme yok" diyebilir.
 */
const KESIN_RED = new Set<RedNedeni>([
  'odeme_basarisiz', 'dolandiricilik_red', 'siparis_uyusmazligi', 'tutar_uyusmazligi', 'para_birimi_uyusmazligi',
]);

/**
 * SAF: İyzico sonuç sorgusunu siparişe karşı doğrular. Paketi açmak için HEPSİ gerekir:
 * status=success, paymentStatus=SUCCESS, fraudStatus=1, imza, token/conversationId/basketId = sipariş,
 * currency=TRY, price ve paidPrice = SUNUCUDAKİ tutar, paymentId var. İstemciden/geri dönüşten gelen hiçbir değer kullanılmaz.
 */
export function evaluateRetrieve(order: DogrulanacakSiparis, data: IyzicoYanit, cfg: Pick<IyzicoConfig, 'secretKey' | 'imzaDogrula'>): Degerlendirme {
  if (data.status !== 'success') {
    if (String(data.errorCode) === '50000') return { tip: 'bekle', neden: 'istek_limiti' };
    return { tip: 'red', neden: 'sorgu_basarisiz' };
  }
  if (data.paymentStatus == null || data.paymentStatus === '') return { tip: 'red', neden: 'odeme_durumu_yok' };
  if (data.paymentStatus !== 'SUCCESS') return { tip: 'red', neden: 'odeme_basarisiz' };
  if (cfg.imzaDogrula && !verifyRetrieveSignature(cfg.secretKey, data)) return { tip: 'bekle', neden: 'imza_dogrulanamadi' };
  if (!esitMi(data.token, order.token ?? '') || data.conversationId !== (order.conversationId || order.id) || data.basketId !== order.id) {
    return { tip: 'red', neden: 'siparis_uyusmazligi' };
  }
  if (data.currency !== 'TRY') return { tip: 'red', neden: 'para_birimi_uyusmazligi' };
  const paid = iyzicoPriceToKurus(data.paidPrice);
  const price = iyzicoPriceToKurus(data.price);
  if (paid !== order.tutarKurus || price !== order.tutarKurus) return { tip: 'red', neden: 'tutar_uyusmazligi' };
  // Belge: fraudStatus yalnız 1 ise teslim et; 0 ise inceleme sürüyor (bildirim/sonraki sorgu beklenir); -1 red.
  const fraud = Number(data.fraudStatus);
  if (fraud === -1) return { tip: 'red', neden: 'dolandiricilik_red' };
  if (fraud !== 1) return { tip: 'bekle', neden: 'dolandiricilik_inceleme' };
  if (data.paymentId == null || String(data.paymentId) === '') return { tip: 'red', neden: 'odeme_kimligi_yok' };
  return { tip: 'onay', paymentId: String(data.paymentId), paidKurus: paid, ham: kisaHam(data) };
}

/**
 * Veritabanına saklanacak yanıt özeti. NEDEN kısaltma: kart bilgisi (BIN, son 4 hane, kart ailesi) ve komisyon
 * ayrıntısı gerekmez (KVKK: en az veri). İade için paymentTransactionId gerekir, o tutulur.
 */
function kisaHam(d: IyzicoYanit): Record<string, unknown> {
  const items = Array.isArray(d.itemTransactions) ? d.itemTransactions : [];
  return {
    paymentId: d.paymentId, paymentStatus: d.paymentStatus, fraudStatus: d.fraudStatus,
    price: d.price, paidPrice: d.paidPrice, currency: d.currency, installment: d.installment,
    conversationId: d.conversationId, basketId: d.basketId, systemTime: d.systemTime,
    itemTransactions: items.map((i: any) => ({ itemId: i?.itemId, paymentTransactionId: i?.paymentTransactionId, paidPrice: i?.paidPrice })),
  };
}

export type IslemSonucu = { durum: 'odendi' | 'basarisiz' | 'beklemede' | 'atama_bekliyor'; paket?: string; bitis?: string | null };

/**
 * Siparişi İyzico'dan SORGULAYIP doğrular ve sonucu veritabanına işler (geri dönüş ve durum uç noktası ortak yolu).
 * Yalnız KESIN_RED siparişi kapatır; diğer retler ve "bekle" sonuçları siparişi beklemede bırakır.
 * Çift işleme (iki sekme, geri dönüş + durum aynı anda) markPaidAndGrant'in paymentId benzersizliğiyle tek atamaya iner.
 */
export async function dogrulaVeIsle(admin: any, cfg: IyzicoConfig, order: DogrulanacakSiparis): Promise<IslemSonucu> {
  if (order.durum === 'odendi') return { durum: 'odendi', paket: order.paket, bitis: order.bitis ?? null };
  // NOT: 'basarisiz' sipariş de burada yeniden doğrulanır (çağıran karar verir): erken kapanmış bir siparişe
  // sonradan doğrulanmış başarılı ödeme gelirse markPaidAndGrant onu yine işler (para kaybolmasın).
  if (!order.token) return { durum: order.durum === 'basarisiz' ? 'basarisiz' : 'beklemede' };

  let data: IyzicoYanit;
  try {
    data = await retrieveCheckoutForm(cfg, order.token, order.conversationId || order.id);
  } catch (e) {
    console.error('iyzico: sonuc sorgusu yapilamadi', order.id, e instanceof IyzicoError ? e.kod : 'bilinmiyor');
    // Ulaşılamadı = yeni bilgi yok: kayıttaki durum korunur (başarısız sipariş "beklemede"ye dönüp titremesin).
    return { durum: order.durum === 'basarisiz' ? 'basarisiz' : 'beklemede' };
  }

  const d = evaluateRetrieve(order, data, cfg);
  if (d.tip === 'onay') {
    let r: Awaited<ReturnType<typeof markPaidAndGrant>>;
    try {
      r = await markPaidAndGrant(admin, { id: order.id, iyzicoPaymentId: d.paymentId, paidKurus: d.paidKurus, ham: d.ham });
    } catch (e: any) {
      // Ödeme doğrulandı ama kayıt yazılamadı: "başarısız" DENMEZ; durum sorgusu yeniden dener.
      console.error('iyzico: odeme kaydi yazilamadi', order.id, typeof e?.kod === 'string' ? e.kod : 'bilinmiyor');
      return { durum: 'beklemede' };
    }
    if (r.durum === 'atama_bekliyor') {
      // Para alındı ama paket yazılamadı (ör. lock_tier_columns istisnası eksik): durum sorgusu yeniden dener.
      console.error('iyzico: odeme alindi, paket atamasi bekliyor', order.id);
      return { durum: 'atama_bekliyor', paket: r.paket, bitis: r.bitis };
    }
    return { durum: 'odendi', paket: r.paket, bitis: r.bitis };
  }
  if (d.tip === 'bekle') {
    console.warn('iyzico: siparis beklemede', order.id, d.neden);
    // İstek limiti yeni bilgi taşımaz: başarısız sipariş başarısız kalır. Diğer "bekle"ler (fraud incelemesi, imza)
    // ödemenin var olduğunu gösterir; o zaman veli "beklemede" görsün, yeniden ödemeye yönlendirilmesin.
    if (order.durum === 'basarisiz' && d.neden === 'istek_limiti') return { durum: 'basarisiz' };
    return { durum: 'beklemede' };
  }
  if (order.durum === 'basarisiz') return { durum: 'basarisiz' };
  if (KESIN_RED.has(d.neden)) {
    // tutar/sipariş uyuşmazlığında para çekilmiş olabilir: neden kayda geçer, sahip panelinden iade edilir.
    console.warn('iyzico: siparis basarisiz', order.id, d.neden);
    try {
      await markFailed(admin, order.id, d.neden);
    } catch {
      console.error('iyzico: basarisiz durumu yazilamadi', order.id);
      return { durum: 'beklemede' };
    }
    return { durum: 'basarisiz' };
  }
  console.warn('iyzico: kesin olmayan red, siparis beklemede', order.id, d.neden);
  return { durum: 'beklemede' };
}
