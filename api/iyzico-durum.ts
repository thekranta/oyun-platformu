import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getAuthedUser } from './_lib/auth';
import { dogrulaVeIsle, gecerliSiparisId, getIyzicoConfig, type IslemSonucu } from './_lib/iyzico';
import { getOrder } from './_lib/webSiparis';

/**
 * GET /api/iyzico-durum?siparis=<id> — web sonuç ekranı (/odeme-sonuc) siparişin durumunu sorar.
 * Yalnız siparişin sahibi (jetondaki e-posta) görür; başkasının siparişi "yok" gibi davranır (404, varlığı sızmasın).
 * 200: { durum: 'beklemede'|'odendi'|'basarisiz'|'atama_bekliyor', paket?, bitis? }
 *
 * NEDEN yeniden sorgu: veli ödeme sonrası sekmeyi kapatırsa ya da geri dönüş yarıda kalırsa sipariş "beklemede"
 * kalır; burada İyzico'dan yeniden sorgulanıp işlenir. "atama_bekliyor" (para alındı, paket yazılamadı) ve token'ı olan
 * "basarisiz" da yeniden doğrulanır. Yalnız kesin retler siparişi kapatır: veli henüz ödeme sayfasındayken sorgu
 * siparişi başarısız yapmaz.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ hata: 'yontem_desteklenmiyor' });

  const authed = await getAuthedUser(req);
  const email = authed?.user?.email?.trim().toLowerCase();
  if (!authed || !email) return res.status(401).json({ hata: 'giris_gerekli' });

  const siparis = Array.isArray(req.query?.siparis) ? req.query.siparis[0] : req.query?.siparis;
  if (!gecerliSiparisId(siparis)) return res.status(400).json({ hata: 'gecersiz_siparis' });

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRole) {
    console.error('iyzico-durum: SUPABASE_SERVICE_ROLE_KEY tanimli degil');
    return res.status(503).json({ hata: 'odeme_yapilandirilmadi' });
  }
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const order = await getOrder(admin, siparis);
    if (!order || String(order.email || '').trim().toLowerCase() !== email) return res.status(404).json({ hata: 'siparis_yok' });

    let sonuc: IslemSonucu;
    const durum = String(order.durum);
    if (durum === 'odendi') sonuc = { durum: 'odendi', paket: order.paket, bitis: order.bitis ?? null };
    // Token'ı olmayan başarısız sipariş İyzico'ya hiç ulaşmamıştır (başlatma düştü): sorulacak bir şey yok.
    else if (durum === 'basarisiz' && !order.token) sonuc = { durum: 'basarisiz' };
    else {
      const cfg = getIyzicoConfig();
      // NEDEN 'basarisiz' de yeniden doğrulanır: sipariş yanlışlıkla kapanmış ama para çekilmişse (eski bir sürümün ya
      // da bir hatanın kapattığı sipariş) burada kurtarılır; markPaidAndGrant 'basarisiz'ı da işler. Gerçekten
      // başarısızsa dogrulaVeIsle yine 'basarisiz' döner ve hiçbir şey yazmaz.
      // İyzico yapılandırması yoksa yeniden sorgulanamaz; kayıttaki durum gösterilir (çökme yok).
      sonuc = cfg
        ? await dogrulaVeIsle(admin, cfg, order)
        : { durum: durum === 'atama_bekliyor' ? 'atama_bekliyor' : durum === 'basarisiz' ? 'basarisiz' : 'beklemede' };
    }
    const yanit: Record<string, unknown> = { durum: sonuc.durum };
    if (sonuc.durum === 'odendi' || sonuc.durum === 'atama_bekliyor') {
      yanit.paket = sonuc.paket ?? order.paket;
      if (sonuc.bitis) yanit.bitis = sonuc.bitis;
    }
    return res.status(200).json(yanit);
  } catch {
    console.error('iyzico-durum: beklenmeyen hata', siparis);
    return res.status(500).json({ hata: 'sunucu_hatasi' });
  }
}
