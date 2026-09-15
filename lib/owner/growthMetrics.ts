import { supabase } from '../supabase';
import { OgretmenTier, VeliTier } from '../subscriptionTiers';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export interface WeeklyCount {
    weekLabel: string;
    veli: number;
    ogretmen: number;
}

export type VeliTierCounts = Record<VeliTier, number>;
export type OgretmenTierCounts = Record<OgretmenTier, number>;

export interface GrowthData {
    weekly: WeeklyCount[];
    veliTiers: VeliTierCounts;
    ogretmenTiers: OgretmenTierCounts;
}

const VELI_TIER_LIST: VeliTier[] = ['free', 'tohum', 'filiz', 'fidan', 'orman'];
const OGRETMEN_TIER_LIST: OgretmenTier[] = ['free', 'cinar', 'mese'];

function mondayOf(d: Date): Date {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = copy.getDay();
    const diff = (day + 6) % 7; // Pazartesi = 0
    copy.setDate(copy.getDate() - diff);
    return copy;
}

function formatWeekLabel(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}`;
}

// Son `weeks` haftayı (bugünden geriye, Pazartesi başlangıçlı) sıralı diziye çevirir,
// her ISO created_at'i ait olduğu haftaya sayar. Aralığın dışında kalan tarihler atlanır.
export function bucketWeekly(veliDates: string[], ogretmenDates: string[], weeks: number, now: Date = new Date()): WeeklyCount[] {
    const currentMonday = mondayOf(now);
    const buckets: WeeklyCount[] = [];
    const indexByMonday = new Map<number, number>();

    for (let i = weeks - 1; i >= 0; i--) {
        const monday = new Date(currentMonday);
        monday.setDate(monday.getDate() - i * 7);
        indexByMonday.set(monday.getTime(), buckets.length);
        buckets.push({ weekLabel: formatWeekLabel(monday), veli: 0, ogretmen: 0 });
    }

    const addDate = (iso: string, key: 'veli' | 'ogretmen') => {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return;
        const idx = indexByMonday.get(mondayOf(d).getTime());
        if (idx !== undefined) buckets[idx][key]++;
    };
    veliDates.forEach((iso) => addDate(iso, 'veli'));
    ogretmenDates.forEach((iso) => addDate(iso, 'ogretmen'));

    return buckets;
}

// Bilinmeyen/boş tier -> 'free' sayılır (lib/subscriptionTiers.ts'teki
// getVeliFlags/getOgretmenFlags'in "bilinmeyen tier -> free" davranışıyla tutarlı).
export function countVeliTiers(tiers: (string | null | undefined)[]): VeliTierCounts {
    const counts: VeliTierCounts = { free: 0, tohum: 0, filiz: 0, fidan: 0, orman: 0 };
    for (const t of tiers) {
        const key = (VELI_TIER_LIST as string[]).includes(t || '') ? (t as VeliTier) : 'free';
        counts[key]++;
    }
    return counts;
}

export function countOgretmenTiers(tiers: (string | null | undefined)[]): OgretmenTierCounts {
    const counts: OgretmenTierCounts = { free: 0, cinar: 0, mese: 0 };
    for (const t of tiers) {
        const key = (OGRETMEN_TIER_LIST as string[]).includes(t || '') ? (t as OgretmenTier) : 'free';
        counts[key]++;
    }
    return counts;
}

async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || SUPABASE_KEY || '';
    return { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${token}` };
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<any[]> {
    try {
        const res = await fetch(url, { headers });
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

export async function fetchGrowthData(weeks = 8): Promise<GrowthData> {
    const headers = await authHeaders();
    const [veliRows, ogretmenRows] = await Promise.all([
        fetchJson(`${SUPABASE_URL}/rest/v1/profiles?select=created_at,subscription_tier&order=created_at.asc`, headers),
        fetchJson(`${SUPABASE_URL}/rest/v1/teachers?select=created_at,subscription_tier&order=created_at.asc`, headers),
    ]);

    return {
        weekly: bucketWeekly(
            veliRows.map((r) => r.created_at).filter(Boolean),
            ogretmenRows.map((r) => r.created_at).filter(Boolean),
            weeks
        ),
        veliTiers: countVeliTiers(veliRows.map((r) => r.subscription_tier)),
        ogretmenTiers: countOgretmenTiers(ogretmenRows.map((r) => r.subscription_tier)),
    };
}
