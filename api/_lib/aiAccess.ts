import type { VercelResponse } from '@vercel/node';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { decideAiAccess, isConsentExemptFeature } from '../../lib/aiConsentCore';

// Ücretli yapay zekâ uçlarının SUNUCU tarafı kapısı. İstemci zaten izin ekranını gösterir (lib/aiConsentFlow.ts); burada
// aynı kural ikinci kez, istemciye güvenmeden uygulanır: eski bir uygulama sürümü ya da elle yapılan istek izinsiz
// çocuk verisi gönderemez. Karar lib/aiConsentCore.ts decideAiAccess'tedir; bu dosya yalnız admins üyeliğini okur ve
// HTTP yanıtını yazar.

export async function isAdminUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}

/**
 * İzin yoksa 403 (`consent_required` + kapsam, ya da `admin_required`), özellik adı biçimsizse 400 yazar ve false döner.
 * `kind`: 'voice' = ses kaydı (voice kapsamı), 'text' = metin istemi (report kapsamı).
 */
export async function enforceAiAccess(
  res: VercelResponse,
  authed: { user: User; supabase: SupabaseClient },
  feature: unknown,
  kind: 'text' | 'voice',
): Promise<boolean> {
  const name = typeof feature === 'string' ? feature : undefined;
  const isAdmin = isConsentExemptFeature(name) ? await isAdminUser(authed.supabase, authed.user.id) : false;
  const consentRaw = (authed.user.user_metadata as Record<string, unknown> | undefined)?.ai_consent;
  const decision = decideAiAccess({ feature, kind, consentRaw, isAdmin });
  if (decision.allowed) return true;
  res.status(decision.reason === 'invalid_feature' ? 400 : 403).json({ error: decision.reason, scope: decision.scope });
  return false;
}
