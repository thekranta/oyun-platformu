import { supabase } from '../supabase';
import { OgretmenTier, VeliTier } from '../subscriptionTiers';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export type FoundUser =
    | { kind: 'veli'; email: string; label: string; tier: VeliTier; packageExpiresAt: string | null }
    | { kind: 'ogretmen'; email: string; label: string; tier: OgretmenTier; packageExpiresAt: string | null };

// 'free' tier veya süresiz seçim -> her zaman null (süresiz kabul edilir).
export function computeExpiryDate(tier: string, durationMonths: number | null, now: Date = new Date()): string | null {
    if (tier === 'free' || durationMonths === null) return null;
    return new Date(now.getFullYear(), now.getMonth() + durationMonths, now.getDate()).toISOString();
}

async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || SUPABASE_KEY || '';
    return { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function findUserByEmail(email: string): Promise<FoundUser | null> {
    const headers = await authHeaders();

    const veliRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=email,parent_name,child_name,subscription_tier,package_expires_at`,
        { headers }
    );
    const veliRows = veliRes.ok ? await veliRes.json() : [];
    if (veliRows.length > 0) {
        const r = veliRows[0];
        return {
            kind: 'veli',
            email: r.email,
            label: `${r.parent_name} (${r.child_name})`,
            tier: (r.subscription_tier || 'free') as VeliTier,
            packageExpiresAt: r.package_expires_at,
        };
    }

    const ogrRes = await fetch(
        `${SUPABASE_URL}/rest/v1/teachers?email=eq.${encodeURIComponent(email)}&select=email,name,school_name,subscription_tier,package_expires_at`,
        { headers }
    );
    const ogrRows = ogrRes.ok ? await ogrRes.json() : [];
    if (ogrRows.length > 0) {
        const r = ogrRows[0];
        return {
            kind: 'ogretmen',
            email: r.email,
            label: r.school_name ? `${r.name} · ${r.school_name}` : r.name,
            tier: (r.subscription_tier || 'free') as OgretmenTier,
            packageExpiresAt: r.package_expires_at,
        };
    }

    return null;
}

export async function assignPackage(
    kind: 'veli' | 'ogretmen',
    email: string,
    tier: VeliTier | OgretmenTier,
    durationMonths: number | null
): Promise<{ ok: true } | { ok: false; error: string }> {
    const headers = await authHeaders();
    const now = new Date();
    const table = kind === 'veli' ? 'profiles' : 'teachers';

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
            subscription_tier: tier,
            package_started_at: tier === 'free' ? null : now.toISOString(),
            package_expires_at: computeExpiryDate(tier, durationMonths, now),
        }),
    });

    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
        return { ok: false, error: 'Satır güncellenmedi (RLS engelledi olabilir).' };
    }
    return { ok: true };
}
