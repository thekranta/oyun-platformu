import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Bu proxy endpoint'lerini (AI analiz, TTS, transkripsiyon, e-posta) kimliksiz
// internet trafiğine kapatmak için paylaşılan yardımcı. İstemci, Supabase oturum
// access_token'ını `Authorization: Bearer <token>` header'ı ile gönderir; burada
// bu token Supabase Auth'a karşı doğrulanır. Anon key zaten public olduğu için
// (istemci bundle'ında da var) sunucuda kullanılması güvenlik riski oluşturmaz.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

function getBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization || (req.headers as any).Authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

/**
 * Authorization header'daki Supabase access_token'ı doğrular.
 * Geçerliyse { user, supabase } döner (supabase istemcisi bu kullanıcı olarak
 * yetkilendirilmiştir, RLS bu kullanıcı gibi uygulanır). Geçersizse null döner.
 */
export async function getAuthedUser(req: VercelRequest) {
  const token = getBearerToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return { user: data.user, supabase };
}

/** Herhangi bir oturum açmış kullanıcı (veli/öğretmen/admin) gerektirir. */
export async function requireUser(req: VercelRequest, res: VercelResponse) {
  const authed = await getAuthedUser(req);
  if (!authed) {
    res.status(401).json({ error: 'Unauthorized: valid Supabase session required' });
    return null;
  }
  return authed;
}

/** Yalnızca `admins` tablosunda kaydı olan kullanıcıya izin verir. */
export async function requireAdmin(req: VercelRequest, res: VercelResponse) {
  const authed = await getAuthedUser(req);
  if (!authed) {
    res.status(401).json({ error: 'Unauthorized: valid Supabase session required' });
    return null;
  }
  const { data: adminRow } = await authed.supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', authed.user.id)
    .maybeSingle();
  if (!adminRow) {
    res.status(403).json({ error: 'Forbidden: admin access required' });
    return null;
  }
  return authed;
}
