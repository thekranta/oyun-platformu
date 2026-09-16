import { supabase } from '../supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export interface WeeklyCost {
    weekLabel: string;
    totalUsd: number;
}

export interface ServiceBreakdown {
    servis: string;
    count: number;
    totalUsd: number;
}

export interface AiCostData {
    weekly: WeeklyCost[];
    byService: ServiceBreakdown[];
    totalUsd: number;
}

interface UsageRow {
    created_at: string;
    servis: string;
    tahmini_maliyet_usd: number;
}

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
// her satırın maliyetini ait olduğu haftaya toplar. Aralığın dışında kalan tarihler atlanır.
export function bucketWeeklyCost(rows: UsageRow[], weeks: number, now: Date = new Date()): WeeklyCost[] {
    const currentMonday = mondayOf(now);
    const buckets: WeeklyCost[] = [];
    const indexByMonday = new Map<number, number>();

    for (let i = weeks - 1; i >= 0; i--) {
        const monday = new Date(currentMonday);
        monday.setDate(monday.getDate() - i * 7);
        indexByMonday.set(monday.getTime(), buckets.length);
        buckets.push({ weekLabel: formatWeekLabel(monday), totalUsd: 0 });
    }

    for (const row of rows) {
        const d = new Date(row.created_at);
        if (isNaN(d.getTime())) continue;
        const idx = indexByMonday.get(mondayOf(d).getTime());
        if (idx !== undefined) buckets[idx].totalUsd += row.tahmini_maliyet_usd || 0;
    }

    return buckets;
}

const SERVICE_ORDER = ['gemini', 'openai_tts', 'openai_whisper'];

// Bilinen 3 servisi sabit sırada döner (veri olmasa da 0 ile listelenir), tanımadığı
// bir servis adı gelirse listenin sonuna eklenir (ileride yeni bir sağlayıcı eklenirse
// sessizce kaybolmasın diye).
export function sumByService(rows: { servis: string; tahmini_maliyet_usd: number }[]): ServiceBreakdown[] {
    const totals = new Map<string, { count: number; totalUsd: number }>();
    for (const key of SERVICE_ORDER) totals.set(key, { count: 0, totalUsd: 0 });

    for (const row of rows) {
        const key = row.servis || 'bilinmeyen';
        if (!totals.has(key)) totals.set(key, { count: 0, totalUsd: 0 });
        const entry = totals.get(key)!;
        entry.count++;
        entry.totalUsd += row.tahmini_maliyet_usd || 0;
    }

    return Array.from(totals.entries()).map(([servis, v]) => ({ servis, ...v }));
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

export async function fetchAiCostData(weeks = 8): Promise<AiCostData> {
    const headers = await authHeaders();
    const rows: UsageRow[] = await fetchJson(
        `${SUPABASE_URL}/rest/v1/ai_kullanim_kayitlari?select=created_at,servis,tahmini_maliyet_usd&order=created_at.asc`,
        headers
    );

    return {
        weekly: bucketWeeklyCost(rows, weeks),
        byService: sumByService(rows),
        totalUsd: rows.reduce((sum, r) => sum + (r.tahmini_maliyet_usd || 0), 0),
    };
}
