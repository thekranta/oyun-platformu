import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getAuthedUser } from './_lib/auth';
import { DeletionError, deleteAccountData, isRecentlyAuthenticated } from './_lib/accountDeletion';

/**
 * POST /api/delete-account — oturumdaki kullanıcının hesabını ve tüm verisini kalıcı siler.
 *
 * Güvenlik:
 *  - Geçerli Supabase oturumu şart (Authorization: Bearer <access_token>).
 *  - Jeton SON 10 DAKİKA içinde alınmış bir girişe dayanmalı: istemci silmeden hemen önce parolayı yeniden
 *    doğrular (signInWithPassword). Çalınmış/eski bir oturumla hesap silinemez (403 reauth_required).
 *  - Gövde { confirm: 'DELETE_MY_ACCOUNT' } içermeli (yanlışlıkla çağrıya karşı).
 *  - Yalnız kendi hesabını siler: kimlik jetondan gelir, gövdeden değil.
 *
 * KURULUM: Vercel'de SUPABASE_SERVICE_ROLE_KEY tanımlı olmalı (Supabase > Settings > API > service_role;
 * RLS'i atlar, yalnız sunucuda kullanılır). İsteğe bağlı: REVENUECAT_SECRET_API_KEY (RevenueCat > API keys >
 * secret key) tanımlıysa RevenueCat'teki müşteri kaydı da silinir.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REVENUECAT_SECRET = process.env.REVENUECAT_SECRET_API_KEY || '';

export const CONFIRM_PHRASE = 'DELETE_MY_ACCOUNT';

function bearerToken(req: VercelRequest): string {
  const header = req.headers.authorization || (req.headers as Record<string, unknown>).Authorization;
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
}

/** RevenueCat müşteri kaydını siler (en iyi çaba; hata hesabın silinmesini engellemez). Mağaza aboneliğini İPTAL ETMEZ. */
async function deleteRevenueCatSubscriber(appUserId: string): Promise<'deleted' | 'skipped' | 'failed'> {
  if (!REVENUECAT_SECRET) return 'skipped';
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${REVENUECAT_SECRET}` },
    });
    return res.ok || res.status === 404 ? 'deleted' : 'failed';
  } catch {
    return 'failed';
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authed = await getAuthedUser(req);
  if (!authed) return res.status(401).json({ error: 'unauthorized' });

  if (!isRecentlyAuthenticated(bearerToken(req), Math.floor(Date.now() / 1000))) {
    return res.status(403).json({ error: 'reauth_required' });
  }
  if (req.body?.confirm !== CONFIRM_PHRASE) return res.status(400).json({ error: 'confirmation_required' });

  const email = authed.user.email?.trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'no_email' });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('delete-account: SUPABASE_SERVICE_ROLE_KEY tanımlı değil — kurulum tamamlanmamış');
    return res.status(500).json({ error: 'not_configured' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const report = await deleteAccountData(admin, { id: authed.user.id, email });
    const revenuecat = await deleteRevenueCatSubscriber(email);
    return res.status(200).json({ ok: true, report, revenuecat });
  } catch (e) {
    if (e instanceof DeletionError) {
      // Kullanıcının e-postası/kimliği günlüğe yazılmaz; yalnız adım.
      console.error('delete-account: adım düştü:', e.step);
      if (e.step === 'admin_account') return res.status(403).json({ error: 'admin_account' });
      return res.status(500).json({ error: 'deletion_failed', step: e.step });
    }
    console.error('delete-account: beklenmeyen hata');
    return res.status(500).json({ error: 'deletion_failed' });
  }
}
