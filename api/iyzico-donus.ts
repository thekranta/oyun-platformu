import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { dogrulaVeIsle, esitMi, gecerliSiparisId, getIyzicoConfig, getSiteUrl, hizSinirlayici, retrieveCheckoutForm } from './_lib/iyzico';
import { getOrder } from './_lib/webSiparis';

// İpucusuz (?siparis yok) geri dönüş her token için İyzico'ya sorgu attırır; mağazanın İyzico istek limiti bu yolla
// tüketilmesin diye IP başına dakikada 10. Gerçek akışta ipucu hep vardır, bu yol yalnız yedektir. Bellek içi (örnek başına).
const ipucusuzSinir = hizSinirlayici(10, 60_000);

/** Testler için sayacı sıfırlar. */
export function _donusSayaciniSifirla() {
  ipucusuzSinir.sifirla();
}

function istemciIp(req: VercelRequest): string {
  const xff = req.headers?.['x-forwarded-for'];
  return (Array.isArray(xff) ? xff[0] : xff || '').split(',')[0].trim() || 'bilinmiyor';
}

/**
 * POST /api/iyzico-donus — İyzico ödeme bitince (başarılı ya da başarısız) tarayıcıyı buraya POST eder; gövdede token.
 *
 * Geri dönüşe gelen HİÇBİR değere güvenilmez (tutar, durum vb. yoktur zaten; token bile yalnız anahtar):
 * token siparişteki token'la eşleşmeli, sonuç İyzico'dan bizim anahtarımızla SORGULANIR ve api/_lib/iyzico.ts
 * evaluateRetrieve ile doğrulanır. Sonra 303 ile SABİT taban + SABİT yola gidilir:
 *   ${SITE_URL}/odeme-sonuc?durum=basarili|basarisiz|beklemede&siparis=<siparisId>
 * URL'ye kişisel veri konmaz. Herhangi bir hatada da kullanıcı boş/hatalı sayfada kalmaz, sonuç sayfasına gider;
 * orada durum uç noktası (api/iyzico-durum) beklemedeki siparişi yeniden sorgular.
 */

function tokenOku(req: VercelRequest): string | null {
  let b: unknown = req.body;
  if (Buffer.isBuffer(b)) b = b.toString('utf8');
  let token: unknown;
  if (typeof b === 'string') {
    const s = b.trim();
    if (s.startsWith('{')) {
      try {
        token = JSON.parse(s)?.token;
      } catch {
        token = undefined;
      }
    } else {
      token = new URLSearchParams(s).get('token');
    }
  } else if (b && typeof b === 'object') {
    token = (b as Record<string, unknown>).token;
  }
  return typeof token === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(token) ? token : null;
}

function yonlendir(res: VercelResponse, durum: 'basarili' | 'basarisiz' | 'beklemede', siparisId?: string) {
  const q = new URLSearchParams({ durum });
  if (siparisId && gecerliSiparisId(siparisId)) q.set('siparis', siparisId);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', `${getSiteUrl()}/odeme-sonuc?${q.toString()}`);
  return res.status(303).end();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ hata: 'yontem_desteklenmiyor' });

  const token = tokenOku(req);
  const sorguSiparis = Array.isArray(req.query?.siparis) ? req.query.siparis[0] : req.query?.siparis;
  if (!token) return yonlendir(res, 'basarisiz');

  const cfg = getIyzicoConfig();
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!cfg || !supabaseUrl || !serviceRole) {
    console.error('iyzico-donus: odeme yapilandirmasi eksik');
    // Para çekilmiş olabilir: "başarısız" denmez; kurulum düzelince durum sorgusu siparişi kurtarır.
    return yonlendir(res, 'beklemede', gecerliSiparisId(sorguSiparis) ? sorguSiparis : undefined);
  }
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    // Sipariş kimliği callbackUrl'deki ipucundan; yoksa (İyzico sorguyu korumadıysa) token ile sorgulanıp
    // basketId'den (= sipariş kimliği) bulunur. Her iki yolda da siparişteki token eşleşmesi şarttır.
    let siparisId: string | null = gecerliSiparisId(sorguSiparis) ? sorguSiparis : null;
    if (!siparisId) {
      if (ipucusuzSinir.asildi(istemciIp(req))) {
        console.warn('iyzico-donus: ipucusuz geri donus hiz siniri');
        return yonlendir(res, 'basarisiz');
      }
      const ilk = await retrieveCheckoutForm(cfg, token, '');
      siparisId = gecerliSiparisId(ilk?.basketId) ? ilk.basketId : null;
    }
    if (!siparisId) return yonlendir(res, 'basarisiz');

    const order = await getOrder(admin, siparisId);
    if (!order || !order.token || !esitMi(order.token, token)) {
      // Başkasının sipariş kimliğiyle sahte geri dönüş: siparişe dokunulmaz.
      console.warn('iyzico-donus: token siparisle eslesmedi');
      return yonlendir(res, 'basarisiz');
    }

    // Yalnız kesin retler siparişi kapatır; geçici sorgu hatası beklemede kalır (durum sorgusu yeniden dener).
    const sonuc = await dogrulaVeIsle(admin, cfg, order);
    const durum = sonuc.durum === 'odendi' ? 'basarili' : sonuc.durum === 'basarisiz' ? 'basarisiz' : 'beklemede';
    return yonlendir(res, durum, order.id);
  } catch {
    console.error('iyzico-donus: beklenmeyen hata');
    return yonlendir(res, 'beklemede', gecerliSiparisId(sorguSiparis) ? sorguSiparis : undefined);
  }
}
