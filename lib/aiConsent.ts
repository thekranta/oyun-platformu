import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyConsent, emptyConsent, isScopeGranted, parseConsent, pickNewest, type AiConsent, type AiConsentScope } from './aiConsentCore';
import { supabase } from './supabase';

/**
 * Yapay zekâ / ses izni — DEPOLAMA. Saf kurallar lib/aiConsentCore.ts'tedir (sunucu uçları da aynı dosyayı kullanır);
 * buradan aynen yeniden dışa aktarılır, eski içe alımlar değişmez.
 *
 * İzin hesabın user_metadata.ai_consent alanında tutulur (şema değişikliği gerekmez, cihazlar arası geçer; sunucu
 * uçları da bu alanı denetler) ve çevrimdışı/hata durumu için cihazda yansıtılır. İzin EKRANINI açan akış
 * lib/aiConsentFlow.ts'tedir.
 */
export * from './aiConsentCore';

const LOCAL_KEY_PREFIX = 'aiConsent.v1:';

// ---------------------------------------------------------------------------
// Depolama
// ---------------------------------------------------------------------------

async function readLocal(userId: string): Promise<AiConsent> {
    try {
        const raw = await AsyncStorage.getItem(LOCAL_KEY_PREFIX + userId);
        return raw ? parseConsent(JSON.parse(raw)) : emptyConsent();
    } catch {
        return emptyConsent();
    }
}

async function writeLocal(userId: string, consent: AiConsent): Promise<void> {
    try {
        await AsyncStorage.setItem(LOCAL_KEY_PREFIX + userId, JSON.stringify(consent));
    } catch {
        // Yerel yazma başarısızsa hesaba yazma yine denenir.
    }
}

/** Oturumdaki kullanıcının güncel iznini okur (oturum yoksa userId null ve izin boş). */
export async function getAiConsent(): Promise<{ userId: string | null; consent: AiConsent }> {
    try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user) return { userId: null, consent: emptyConsent() };
        const fromAccount = parseConsent((user.user_metadata as Record<string, unknown> | undefined)?.ai_consent);
        const fromDevice = await readLocal(user.id);
        return { userId: user.id, consent: pickNewest(fromAccount, fromDevice) };
    } catch {
        return { userId: null, consent: emptyConsent() };
    }
}

export async function hasAiConsent(scope: AiConsentScope): Promise<boolean> {
    const { consent } = await getAiConsent();
    return isScopeGranted(consent, scope);
}

/** İzni verir ya da geri alır. Cihaza her zaman yazar; hesaba yazma başarısızsa (çevrimdışı) yine de true döner. */
export async function setAiConsent(scopes: AiConsentScope | AiConsentScope[], granted: boolean): Promise<boolean> {
    const list = Array.isArray(scopes) ? scopes : [scopes];
    const { userId, consent } = await getAiConsent();
    if (!userId) return false;
    const next = applyConsent(consent, list, granted, new Date().toISOString());
    await writeLocal(userId, next);
    try {
        await supabase.auth.updateUser({ data: { ai_consent: next } });
    } catch {
        // Cihazdaki kayıt geçerli kalır; sonraki başarılı yazmada hesaba da geçer.
    }
    return true;
}
