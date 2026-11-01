import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/**
 * Yapay zekâ / ses izni. Apple App Review 5.1.2(i): kişisel veri üçüncü taraf yapay zekâ hizmetine
 * gönderilmeden ÖNCE kullanıcıya hangi verinin kime gittiği açıkça söylenmeli ve açık izin alınmalı.
 * Google Play Aile Politikası: çocuğun mikrofon verisi hassastır.
 *
 * İki ayrı kapsam (biri verilince ötekisi verilmiş sayılmaz):
 *   'voice'  — Bunu Söyle! oyununda çocuğun ses kaydı konuşmayı yazıya çevirmek için OpenAI'a gider.
 *   'report' — Gelişim raporu: çocuğun yaşı ve oyun sonuçları yorum yazdırmak için OpenAI'a gider (ad GİTMEZ).
 *
 * İzin hesabın user_metadata.ai_consent alanında tutulur (şema değişikliği gerekmez, cihazlar arası geçer)
 * ve çevrimdışı/hata durumu için cihazda yansıtılır. İzin metni değişince AI_CONSENT_VERSION artırılır:
 * eski sürümde verilmiş izin geçersiz sayılır ve yeniden sorulur.
 *
 * Bu dosya depolama + saf mantıktır; izin EKRANINI açan akış lib/aiConsentFlow.ts'tedir.
 */

export type AiConsentScope = 'voice' | 'report';

/** Kullanıcı izin vermediği için yapay zekâ isteği yapılmadı (bir hata değil, bilinçli red). */
export class AiConsentDeclinedError extends Error {
    constructor() {
        super('AI_CONSENT_DECLINED');
        this.name = 'AiConsentDeclinedError';
    }
}
export const AI_CONSENT_SCOPES: AiConsentScope[] = ['voice', 'report'];
export const AI_CONSENT_VERSION = '2026-11-01';
const LOCAL_KEY_PREFIX = 'aiConsent.v1:';

export interface AiConsent {
    version: string;
    /** İznin verildiği an (ISO); verilmemiş/geri alınmışsa null. */
    voice: string | null;
    report: string | null;
    /** Son değişiklik anı (ISO): iki kaynak (hesap/cihaz) çelişirse yenisi geçerli olur. */
    updatedAt: string | null;
}

export function emptyConsent(): AiConsent {
    return { version: AI_CONSENT_VERSION, voice: null, report: null, updatedAt: null };
}

const asIso = (v: unknown): string | null => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null);

/** Dışarıdan gelen (metadata/yerel depo) değeri güvenli biçime çevirir; sürüm eskiyse boş döner. */
export function parseConsent(raw: unknown): AiConsent {
    if (!raw || typeof raw !== 'object') return emptyConsent();
    const r = raw as Record<string, unknown>;
    if (r.version !== AI_CONSENT_VERSION) return emptyConsent();
    return { version: AI_CONSENT_VERSION, voice: asIso(r.voice), report: asIso(r.report), updatedAt: asIso(r.updatedAt) };
}

export function isScopeGranted(consent: AiConsent, scope: AiConsentScope): boolean {
    return consent[scope] !== null;
}

/** İki kaynaktan (hesap, cihaz) daha yeni değişikliği olanı seçer; eşitse hesap (birinci) kazanır. */
export function pickNewest(a: AiConsent, b: AiConsent): AiConsent {
    const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return tb > ta ? b : a;
}

export function applyConsent(current: AiConsent, scopes: AiConsentScope[], granted: boolean, nowIso: string): AiConsent {
    const next: AiConsent = { ...current, version: AI_CONSENT_VERSION, updatedAt: nowIso };
    for (const scope of scopes) next[scope] = granted ? nowIso : null;
    return next;
}

/** Kapsama göre istek, izin gerektirmeyen özelliklerden mi? (yönetici paneli kendi verisini inceler.) */
export function isConsentExemptFeature(feature: string | undefined): boolean {
    return typeof feature === 'string' && feature.startsWith('admin_');
}

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
