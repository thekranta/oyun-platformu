import { router } from 'expo-router';
import { hasAiConsent, type AiConsentScope } from './aiConsent';

/**
 * Yapay zekâ / ses izni AKIŞI: izin yoksa izin ekranını (app/ai-izni.tsx) açar ve sonucu bekler.
 * Depolama ve saf mantık lib/aiConsent.ts'tedir. Kullanım (izin gerektiren özelliğin başında):
 *
 *   if (!(await ensureAiConsent('report'))) return;   // ebeveyn izin vermedi → özellik çalışmaz
 */

let pending: ((granted: boolean) => void) | null = null;

/** İzin ekranı kararı bildirir (ekran kapanırken de, karar verilmeden kapanırsa false ile çağrılır). */
export function finishAiConsentFlow(granted: boolean): void {
    const resolve = pending;
    pending = null;
    resolve?.(granted);
}

/** İzin zaten varsa true; yoksa izin ekranını açar ve ebeveynin kararını döndürür. */
export async function ensureAiConsent(scope: AiConsentScope): Promise<boolean> {
    if (await hasAiConsent(scope)) return true;
    finishAiConsentFlow(false); // açık kalmış eski bir akış varsa vazgeçilmiş sayılır
    return new Promise<boolean>((resolve) => {
        pending = resolve;
        router.push(`/ai-izni?scope=${scope}` as Parameters<typeof router.push>[0]);
    });
}
