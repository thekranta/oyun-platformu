import { supabase } from '../supabase';
import { normalizeVotes } from '../admin/flags';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export interface UzmanPerformans {
    uzmanAdi: string;
    toplamOy: number;
    onay: number;
    revize: number;
    reddet: number;
    sonKararTarihi: string; // en son oy tarihi (ISO), yoksa ''
}

// Ham oyun_skorlari.uzman_oylamalari satırlarından uzman bazlı toplamı çıkarır (saf, ağsız).
export function computeUzmanPerformans(rows: { uzman_oylamalari: any }[]): UzmanPerformans[] {
    const byUzman = new Map<string, UzmanPerformans>();

    for (const row of rows) {
        const votes = normalizeVotes(row.uzman_oylamalari);
        for (const [uzmanAdi, oy] of Object.entries(votes)) {
            if (!byUzman.has(uzmanAdi)) {
                byUzman.set(uzmanAdi, { uzmanAdi, toplamOy: 0, onay: 0, revize: 0, reddet: 0, sonKararTarihi: '' });
            }
            const p = byUzman.get(uzmanAdi)!;
            p.toplamOy++;
            if (oy.oy === 'onay') p.onay++;
            else if (oy.oy === 'revize') p.revize++;
            else if (oy.oy === 'reddet') p.reddet++;
            if (oy.tarih && oy.tarih > p.sonKararTarihi) p.sonKararTarihi = oy.tarih;
        }
    }

    return Array.from(byUzman.values()).sort((a, b) => b.toplamOy - a.toplamOy);
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

// lib/owner/ownerDetail.ts'in fetchUzmanKararlari'siyle AYNI sorgu deseni, tek uzmana filtrelemeden.
export async function fetchTeamPerformanceData(): Promise<UzmanPerformans[]> {
    const rows = await fetchJson(
        `${SUPABASE_URL}/rest/v1/oyun_skorlari?select=uzman_oylamalari&uzman_oylamalari=not.is.null&limit=500`,
        await authHeaders()
    );
    return computeUzmanPerformans(rows);
}
