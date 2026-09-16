import { supabase } from '../supabase';
import { normalizeOyunTuru } from '../gameDisplay';
import { MAARIF_CIKTILAR_2026, MaarifCikti2026 } from '../../constants/maarifCurriculum2026';
import { MAARIF_MAP, MaarifEntry } from '../../constants/maarifMap';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export interface GameCoverage {
    oyunTuru: string;
    displayName: string;
    oynanmaSayisi: number;
}

export interface CodeCoverage {
    code: string;
    alan: string;
    aciklama: string;
    oyunlar: GameCoverage[];
}

export interface AlanCoverage {
    alan: string;
    kodSayisi: number;
    kapsananKodSayisi: number;
    oyunSayisi: number;
}

export interface CurriculumHealthData {
    toplamKod: number;
    kapsananKod: number;
    kapsamOrani: number;
    alanlar: AlanCoverage[];
    bosluklar: CodeCoverage[];
    kirilgan: CodeCoverage[];
    oynanmayanOyunlar: GameCoverage[];
}

// Her kanonik kod için hangi oyunların o koda bağlı olduğunu bulur (saf, ağsız).
export function computeCodeCoverage(
    ciktilar: Record<string, MaarifCikti2026> = MAARIF_CIKTILAR_2026,
    gameMap: Record<string, MaarifEntry> = MAARIF_MAP
): CodeCoverage[] {
    const byCode = new Map<string, GameCoverage[]>();
    for (const code of Object.keys(ciktilar)) byCode.set(code, []);

    for (const [oyunTuru, entry] of Object.entries(gameMap)) {
        const list = byCode.get(entry.cikti);
        if (list) list.push({ oyunTuru, displayName: entry.displayName, oynanmaSayisi: 0 });
    }

    return Object.values(ciktilar).map((c) => ({
        code: c.code,
        alan: c.alan,
        aciklama: c.aciklama,
        oyunlar: byCode.get(c.code) || [],
    }));
}

// Her oyuna gerçek oynanma sayısını iliştirir (saf).
export function attachPlayCounts(coverage: CodeCoverage[], playCounts: Record<string, number>): CodeCoverage[] {
    return coverage.map((c) => ({
        ...c,
        oyunlar: c.oyunlar.map((g) => ({
            ...g,
            oynanmaSayisi: playCounts[normalizeOyunTuru(g.oyunTuru)] || 0,
        })),
    }));
}

// bosluklar/kirilgan/alanlar/oranları türetir (saf).
export function summarize(coverage: CodeCoverage[]): CurriculumHealthData {
    const toplamKod = coverage.length;
    const kapsananKod = coverage.filter((c) => c.oyunlar.length > 0).length;
    const kapsamOrani = toplamKod > 0 ? Math.round((kapsananKod / toplamKod) * 100) : 0;

    const alanMap = new Map<string, AlanCoverage>();
    for (const c of coverage) {
        if (!alanMap.has(c.alan)) alanMap.set(c.alan, { alan: c.alan, kodSayisi: 0, kapsananKodSayisi: 0, oyunSayisi: 0 });
        const a = alanMap.get(c.alan)!;
        a.kodSayisi++;
        if (c.oyunlar.length > 0) a.kapsananKodSayisi++;
        a.oyunSayisi += c.oyunlar.length;
    }

    const oynanmayanOyunlar: GameCoverage[] = [];
    const seenOyun = new Set<string>();
    for (const c of coverage) {
        for (const g of c.oyunlar) {
            if (g.oynanmaSayisi === 0 && !seenOyun.has(g.oyunTuru)) {
                seenOyun.add(g.oyunTuru);
                oynanmayanOyunlar.push(g);
            }
        }
    }

    return {
        toplamKod,
        kapsananKod,
        kapsamOrani,
        alanlar: Array.from(alanMap.values()),
        bosluklar: coverage.filter((c) => c.oyunlar.length === 0),
        kirilgan: coverage.filter((c) => c.oyunlar.length === 1),
        oynanmayanOyunlar,
    };
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

// Tek ağ çağrısı: oyun_skorlari'ndan SADECE oyun_turu kolonu (owner_reads_scores RLS'i zaten var).
export async function fetchGamePlayCounts(): Promise<Record<string, number>> {
    const rows = await fetchJson(`${SUPABASE_URL}/rest/v1/oyun_skorlari?select=oyun_turu`, await authHeaders());
    const counts: Record<string, number> = {};
    for (const r of rows) {
        const key = normalizeOyunTuru(r.oyun_turu || '');
        counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
}

export async function fetchCurriculumHealthData(): Promise<CurriculumHealthData> {
    const [coverage, playCounts] = await Promise.all([
        Promise.resolve(computeCodeCoverage()),
        fetchGamePlayCounts(),
    ]);
    return summarize(attachPlayCounts(coverage, playCounts));
}
