/**
 * Yapay zekâ / ses izninin SAF mantığı: depolama ve Supabase içermez, bu yüzden hem uygulama (lib/aiConsent.ts
 * yeniden dışa aktarır) hem sunucu uçları (api/_lib/aiAccess.ts) aynı kuralı kullanır.
 *
 * Apple App Review 5.1.2(i): kişisel veri üçüncü taraf yapay zekâ hizmetine gönderilmeden ÖNCE açık izin alınmalı.
 * İki ayrı kapsam (biri verilince ötekisi verilmiş sayılmaz):
 *   'voice'  — Bunu Söyle! oyununda çocuğun ses kaydı konuşmayı yazıya çevirmek için OpenAI'a gider.
 *   'report' — Gelişim raporu: çocuğun yaşı ve oyun sonuçları yorum yazdırmak için OpenAI'a gider (ad GİTMEZ).
 * İzin metni değişince AI_CONSENT_VERSION artırılır: eski sürümde verilmiş izin geçersiz sayılır ve yeniden sorulur.
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

/** İzin gerektirmeyen özellikler: yönetici (uzman) paneli. Sunucu bunlar için admins üyeliği ister (bkz. decideAiAccess). */
export function isConsentExemptFeature(feature: string | undefined): boolean {
    return typeof feature === 'string' && feature.startsWith('admin_');
}

/** İstemcinin bildirdiği özellik adı: küçük harf/rakam/alt çizgi, en çok 64 karakter (ör. veli_kumulatif_rapor). */
export const AI_FEATURE_PATTERN = /^[a-z0-9_]{1,64}$/;

export type AiAccessDecision =
    | { allowed: true; scope: AiConsentScope | null }
    | { allowed: false; reason: 'invalid_feature' | 'admin_required' | 'consent_required'; scope: AiConsentScope | null };

/**
 * Sunucu tarafı kapı kararı (api/openai-analyze.ts, api/transcribe.ts):
 *  - özellik adı biçimsizse reddedilir;
 *  - admin_* özellikleri yalnız admins üyesine açıktır (izin kapsamı aranmaz: uzman kendi kuyruğunu inceler);
 *  - diğer her şey, çağıran hesabın user_metadata.ai_consent kaydında ilgili kapsamı ister: ses özellikleri 'voice',
 *    metin özellikleri 'report'. Özellik adı hiç gönderilmemişse (eski istemci) yine izin aranır.
 */
export function decideAiAccess(p: { feature: unknown; kind: 'text' | 'voice'; consentRaw: unknown; isAdmin: boolean }): AiAccessDecision {
    const feature = typeof p.feature === 'string' ? p.feature : '';
    if (feature !== '' && !AI_FEATURE_PATTERN.test(feature)) return { allowed: false, reason: 'invalid_feature', scope: null };
    if (isConsentExemptFeature(feature)) {
        return p.isAdmin ? { allowed: true, scope: null } : { allowed: false, reason: 'admin_required', scope: null };
    }
    const scope: AiConsentScope = p.kind === 'voice' ? 'voice' : 'report';
    return isScopeGranted(parseConsent(p.consentRaw), scope)
        ? { allowed: true, scope }
        : { allowed: false, reason: 'consent_required', scope };
}
