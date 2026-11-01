import { supabase } from './supabase';
import type { PaywallKind } from './paywall';

/**
 * Satın alma sonrası paket eşitleme. Mağaza satın alımı RevenueCat webhook'u (api/revenuecat-webhook.ts) ile
 * veritabanına birkaç saniyede yansır; çocuk odası paketi veritabanından okur. Burada:
 *  - `emitPackageChanged()`: ödeme ekranı "paket değişti" diye haber verir, çocuk odası profili yeniden okur;
 *  - `waitForTier()`: webhook işleyene kadar (kısa süre) paketin veritabanına geçmesini bekler.
 */

type Listener = () => void;
const listeners = new Set<Listener>();

export function onPackageChanged(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function emitPackageChanged(): void {
    for (const listener of [...listeners]) {
        try { listener(); } catch { /* bir dinleyicinin hatası ötekileri durdurmasın */ }
    }
}

export interface OwnPackage {
    tier: string | null;
    expiresAt: string | null;
}

/** Oturumdaki hesabın veritabanındaki paketini okur (veli → profiles, öğretmen → teachers). */
export async function fetchOwnPackage(kind: PaywallKind, email: string): Promise<OwnPackage | null> {
    try {
        const table = kind === 'ogretmen' ? 'teachers' : 'profiles';
        const { data, error } = await supabase
            .from(table)
            .select('subscription_tier, package_expires_at')
            .eq('email', email)
            .limit(1);
        if (error || !data || data.length === 0) return null;
        return { tier: (data[0].subscription_tier as string | null) ?? null, expiresAt: (data[0].package_expires_at as string | null) ?? null };
    } catch {
        return null;
    }
}

/**
 * Veritabanındaki paket `expected` olana dek (en çok `tries` kez, `delayMs` arayla) bekler.
 * Bulursa o paketi, bulamazsa son okunanı (ya da null) döndürür. `sleep` testte sahtelenir.
 */
export async function waitForTier(
    kind: PaywallKind,
    email: string,
    expected: string,
    opts: { tries?: number; delayMs?: number; sleep?: (ms: number) => Promise<void>; fetchPackage?: typeof fetchOwnPackage } = {},
): Promise<OwnPackage | null> {
    const { tries = 8, delayMs = 2000, sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)), fetchPackage = fetchOwnPackage } = opts;
    let last: OwnPackage | null = null;
    for (let i = 0; i < tries; i++) {
        last = await fetchPackage(kind, email);
        if (last?.tier === expected) return last;
        if (i < tries - 1) await sleep(delayMs);
    }
    return last;
}
