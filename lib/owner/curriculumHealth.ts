import { supabase } from '../supabase';
import { normalizeOyunTuru } from '../normalizeOyunTuru';
import { MAARIF_CIKTILAR_2026, MaarifCikti2026 } from '../../constants/maarifCurriculum2026';
import { MAARIF_MAP, MaarifEntry } from '../../constants/maarifMap';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export interface GameCoverage {
    oyunTuru: string;
    displayName: string;
    oynanmaSayisi: number;
    /** Aynı oyunun skor kaydında kullanılabilen diğer adları (katalog kimliği ile kayıt adı farklı olabilir); oyun BİR kez sayılır. */
    aliases?: string[];
}

export interface CodeCoverage {
    code: string;
    alan: string;
    aciklama: string;
    /** false: Maarif belgesinde resmi kodu olmayan, platformun iç numaralandırdığı beceri (SDB.*). */
    resmi: boolean;
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
// Aynı Maarif kaydını paylaşan anahtarlar (katalog kimliği / kayıt adı takma adları) TEK oyun sayılır.
export function computeCodeCoverage(
    ciktilar: Record<string, MaarifCikti2026> = MAARIF_CIKTILAR_2026,
    gameMap: Record<string, MaarifEntry> = MAARIF_MAP
): CodeCoverage[] {
    const byCode = new Map<string, GameCoverage[]>();
    for (const code of Object.keys(ciktilar)) byCode.set(code, []);

    const keysByEntry = new Map<MaarifEntry, string[]>();
    for (const [oyunTuru, entry] of Object.entries(gameMap)) {
        const keys = keysByEntry.get(entry);
        if (keys) keys.push(oyunTuru); else keysByEntry.set(entry, [oyunTuru]);
    }
    for (const [entry, keys] of keysByEntry) {
        const list = byCode.get(entry.cikti);
        if (list) list.push({ oyunTuru: keys[0], displayName: entry.displayName, oynanmaSayisi: 0, aliases: keys.slice(1) });
    }

    return Object.values(ciktilar).map((c) => ({
        code: c.code,
        alan: c.alan,
        aciklama: c.aciklama,
        resmi: c.resmi,
        oyunlar: byCode.get(c.code) || [],
    }));
}

// Skor adını harita anahtarına katlar: "Yapboz - Karpuz" ("yapboz---karpuz") -> "yapboz". Harita anahtarı olmayan ad olduğu gibi kalır (saf).
export function foldScoreName(oyunTuru: string, gameMap: Record<string, MaarifEntry> = MAARIF_MAP): string {
    const key = normalizeOyunTuru(oyunTuru || '');
    const base = key.split('---')[0];
    return base !== key && gameMap[base] ? base : key;
}

// Her oyuna (ve takma adlarına) gerçek oynanma sayısını iliştirir (saf).
export function attachPlayCounts(coverage: CodeCoverage[], playCounts: Record<string, number>): CodeCoverage[] {
    return coverage.map((c) => ({
        ...c,
        oyunlar: c.oyunlar.map((g) => ({
            ...g,
            oynanmaSayisi: [g.oyunTuru, ...(g.aliases ?? [])].reduce((sum, k) => sum + (playCounts[normalizeOyunTuru(k)] || 0), 0),
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

export interface OfficialSplit {
    /** Maarif belgesindeki resmi kodlar. */
    resmiToplam: number;
    resmiKapsanan: number;
    /** Resmi kodu olmayan, platformun adlandırdığı sosyal-duygusal beceriler. */
    beceriToplam: number;
    beceriKapsanan: number;
}

/** Başlıktaki "kod kapsanıyor" sayısı resmi kodları, platform becerilerinden ayırarak verir (saf). */
export function officialSplit(coverage: CodeCoverage[]): OfficialSplit {
    const resmi = coverage.filter((c) => c.resmi);
    const beceri = coverage.filter((c) => !c.resmi);
    return {
        resmiToplam: resmi.length,
        resmiKapsanan: resmi.filter((c) => c.oyunlar.length > 0).length,
        beceriToplam: beceri.length,
        beceriKapsanan: beceri.filter((c) => c.oyunlar.length > 0).length,
    };
}

async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || SUPABASE_KEY || '';
    return { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${token}` };
}

const PAGE_SIZE = 1000;      // PostgREST varsayılan en çok satır sınırı; sayfa sayfa çekilir
const MAX_PAGES = 200;       // güvenlik sınırı (200 bin kayıt)

export interface PlayCountsResult {
    counts: Record<string, number>;
    /** Sayıma giren oyun kaydı adedi. */
    rows: number;
    /** false: kayıtlar eksiksiz alınamadı (ağ/yetki hatası ya da sayfa sınırı); sayılar eksik olabilir. */
    ok: boolean;
}

// oyun_skorlari'ndan SADECE oyun_turu kolonu (owner_reads_scores RLS'i zaten var), sayfalı: tek istek en çok 1000 satır döner.
export async function fetchGamePlayCounts(): Promise<PlayCountsResult> {
    const counts: Record<string, number> = {};
    let rows = 0;
    try {
        const headers = await authHeaders();
        for (let page = 0; page < MAX_PAGES; page++) {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/oyun_skorlari?select=oyun_turu&order=id.asc&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
                { headers },
            );
            if (!res.ok) return { counts, rows, ok: false };
            const list = await res.json();
            if (!Array.isArray(list)) return { counts, rows, ok: false };
            for (const r of list) {
                const key = foldScoreName(r.oyun_turu || '');
                counts[key] = (counts[key] || 0) + 1;
                rows++;
            }
            if (list.length < PAGE_SIZE) return { counts, rows, ok: true };
        }
        return { counts, rows, ok: false };
    } catch {
        return { counts, rows, ok: false };
    }
}

/** Oyun kayıtları güvenilmez mi? Hata ya da SIFIR satır: yetkisiz/RLS'li istek hata vermeden boş liste döner, bu da "hiçbir oyun oynanmamış" gibi görünür. */
export function recordsUnreliable(plays: Pick<PlayCountsResult, 'ok' | 'rows'>): boolean {
    return !plays.ok || plays.rows === 0;
}

export interface CurriculumHealthResult extends CurriculumHealthData {
    resmi: OfficialSplit;
    skorSayisi: number;
    /** Oyun kayıtları eksiksiz alınamadı: "hiç oynanmamış" listesi güvenilmez, gösterilmez. */
    kayitHatasi: boolean;
}

export async function fetchCurriculumHealthData(): Promise<CurriculumHealthResult> {
    const plays = await fetchGamePlayCounts();
    const coverage = attachPlayCounts(computeCodeCoverage(), plays.counts);
    return { ...summarize(coverage), resmi: officialSplit(coverage), skorSayisi: plays.rows, kayitHatasi: recordsUnreliable(plays) };
}
