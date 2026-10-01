/**
 * RevenueCat webhook — satın alma olaylarını Supabase'teki profiles/teachers
 * tablolarına yansıtır (lib/owner/packageAssignment.ts'in otomatik karşılığı).
 *
 * KURULUM ("2. Adım", RevenueCat hesabı hazır olunca):
 *  1) RevenueCat dashboard > Project settings > Integrations > Webhooks'ta bu
 *     endpoint'in URL'ini tanımla: https://oyun.childhoodtech.com/api/revenuecat-webhook
 *  2) "Authorization header" alanına rastgele bir sır gir, aynısını Vercel'de
 *     REVENUECAT_WEBHOOK_SECRET olarak tanımla.
 *  3) Vercel'de SUPABASE_SERVICE_ROLE_KEY tanımla (Supabase dashboard > Settings >
 *     API > service_role key — RLS'i bypass eder, yalnızca sunucuda kullanılır).
 *  4) RevenueCat'te entitlement kimlikleri services/purchaseService.ts'teki ile
 *     AYNI olmalı: 'tohum' | 'filiz' | 'fidan' | 'orman' (veli), 'cinar' | 'mese' (öğretmen).
 *
 * app_user_id olarak kullanıcının e-postası bekleniyor (services/purchaseService.ts
 * appUserID'yi e-posta olarak ayarlıyor) — bu, profiles/teachers tablolarındaki
 * mevcut e-posta tabanlı arama anahtarıyla (bkz. lib/owner/packageAssignment.ts) eşleşir.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET || '';

// En yüksekten en düşüğe — entitlement_ids içinde birden fazlası varsa en üsttekini seçeriz.
const VELI_TIERS_DESC = ['orman', 'fidan', 'filiz', 'tohum'];
const OGRETMEN_TIERS_DESC = ['mese', 'cinar'];

// Erişim açan/yenileyen olaylar.
const GRANT_EVENTS = new Set([
  'INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION',
  'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT',
]);
// Erişimi gerçekten kapatan olay (CANCELLATION erişimi hemen kesmez — süre dolana kadar
// kullanıcı erişime devam eder, bu yüzden burada işlenmiyor, yalnızca EXPIRATION'da düşürüyoruz).
const REVOKE_EVENTS = new Set(['EXPIRATION']);

function highestTier(entitlementIds: string[], order: string[]): string | null {
  for (const tier of order) {
    if (entitlementIds.includes(tier)) return tier;
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!WEBHOOK_SECRET || req.headers.authorization !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('revenuecat-webhook: SUPABASE_SERVICE_ROLE_KEY tanımlı değil — kurulum tamamlanmamış');
    return res.status(500).json({ error: 'Not configured' });
  }

  const event = req.body?.event;
  if (!event?.type || typeof event?.app_user_id !== 'string') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const email = event.app_user_id;
  const entitlementIds: string[] = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [];
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  if (REVOKE_EVENTS.has(event.type)) {
    // Hangi tabloda (veli/öğretmen) olduğu event'ten belli değil — ikisinde de dene,
    // eşleşmeyen tarafta 0 satır güncellenir, zararsız.
    const [profileRes, teacherRes] = await Promise.all([
      supabaseAdmin.from('profiles').update({ subscription_tier: 'free', package_expires_at: null }).eq('email', email).select('email'),
      supabaseAdmin.from('teachers').update({ subscription_tier: 'free', package_expires_at: null }).eq('email', email).select('email'),
    ]);
    const downgraded = (profileRes.data?.length || 0) + (teacherRes.data?.length || 0);
    return res.status(200).json({ ok: true, downgraded: downgraded > 0 });
  }

  if (!GRANT_EVENTS.has(event.type)) {
    // CANCELLATION, BILLING_ISSUE, TEST vb. — şimdilik bilgilendirme amaçlı loglanır, DB değişmez.
    return res.status(200).json({ ok: true, ignored: event.type });
  }

  const veliTier = highestTier(entitlementIds, VELI_TIERS_DESC);
  const ogretmenTier = highestTier(entitlementIds, OGRETMEN_TIERS_DESC);
  const table = veliTier ? 'profiles' : ogretmenTier ? 'teachers' : null;
  const tier = veliTier || ogretmenTier;

  if (!table || !tier) {
    console.warn('revenuecat-webhook: entitlement_ids bilinen bir pakete eşleşmiyor', entitlementIds);
    return res.status(200).json({ ok: true, skipped: 'unknown_entitlement' });
  }

  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const { data, error } = await supabaseAdmin
    .from(table)
    .update({ subscription_tier: tier, package_started_at: new Date().toISOString(), package_expires_at: expiresAt })
    .eq('email', email)
    .select('email');

  if (error) {
    console.error('revenuecat-webhook: güncelleme hatası', error);
    return res.status(500).json({ error: error.message });
  }
  if (!data || data.length === 0) {
    console.warn(`revenuecat-webhook: ${email} için ${table} tablosunda satır bulunamadı`);
    return res.status(200).json({ ok: true, skipped: 'no_matching_row' });
  }
  return res.status(200).json({ ok: true, table, tier });
}
