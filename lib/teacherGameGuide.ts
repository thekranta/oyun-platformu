import { GAME_CATALOG, GameCatalogItem } from '../constants/gameCatalog';
import { MAARIF_CIKTILAR_2026 } from '../constants/maarifCurriculum2026';
import { MAARIF_MAP } from '../constants/maarifMap';
import { normalizeOyunTuru } from './gameDisplay';
import { requiredVeliTierForGame, VeliTier } from './subscriptionTiers';

// Öğretmen "Oyun Rehberi": platformdaki TÜM oyunlar, Maarif Modeli 2026 kodu ve resmi metniyle, kazanıma göre gruplu.
// Kaynak constants/gameCatalog.ts + constants/maarifMap.ts + constants/maarifCurriculum2026.ts'tir: yeni oyun kataloğa ve
// maarifMap'e girince rehbere KENDİLİĞİNDEN eklenir (lib/teacherGameGuide.test.ts her katalog oyununun Maarif kaydını zorunlu kılar).
// Bir öğrencinin oyun geçmişi verilirse henüz oynanmamış (eksik) kazanımlar işaretlenir.

export const ALAN_ORDER = ['Matematik', 'Fen', 'Türkçe', 'Sosyal', 'Sosyal-Duygusal', 'Sanat', 'Müzik', 'Hareket ve Sağlık'];

export const TIER_LABELS: Record<VeliTier, string> = { free: 'Ücretsiz', tohum: 'Tohum', filiz: 'Filiz', fidan: 'Fidan', orman: 'Orman' };

/** Skor kaydı OLUŞTURMAYAN oyunlar (renderer onGameEnd almıyor): "oynadı mı" bilinemez, eksik sayılmaz. */
export const UNTRACKED_GAMES: ReadonlySet<string> = new Set(['muzik-calar', 'ceviz-macera']);

export interface GuideGame {
    id: string;
    name: string;
    /** Bu oyunun bu kazanıma özel açıklaması (oyun içinde ne yaptırdığı). */
    detail: string;
    /** Oyunu açan asgari veli paketi. */
    tier: VeliTier;
    /** Öğrenci verildiyse oynanma sayısı; verilmediyse ya da kayıt tutulmayan oyunda null. */
    plays: number | null;
}

export interface GuideCode {
    /** Gruplama anahtarı (Maarif çıktı kodu; SDB.* gibi resmi olmayan kodlar da burada). */
    key: string;
    /** Öğretmene gösterilecek resmi kod; resmi olmayan (platform içi) kodlarda null. */
    code: string | null;
    alan: string;
    /** Maarif belgesindeki resmi metin. */
    text: string;
    games: GuideGame[];
    /** Öğrenci verildiyse: bu kazanımdaki oyunların hiçbiri oynanmamış (ve en az biri izlenebilir). Öğrenci yoksa/izlenemiyorsa null. */
    missing: boolean | null;
    /** Öğrenci verildiyse bu kazanımda oynanan farklı oyun sayısı. */
    playedGames: number | null;
}

/**
 * Oyun açıklamaları genelde resmi kazanım metniyle başlar ("Sayıları farklı durumlarda doğru kullanabilme; nesne sayısını söyler…");
 * kartın başlığında resmi metin zaten var, bu yüzden tekrarı atılır ve yalnız oyuna özgü kısım kalır.
 */
export function stripOfficial(detail: string, official?: string): string {
    if (!official || !detail.startsWith(official)) return detail;
    const rest = detail.slice(official.length).replace(/^[s;:,.-–]+/, '').trim();
    return rest ? rest.charAt(0).toLocaleUpperCase('tr') + rest.slice(1) : '';
}

/** MAB.2 < MAB.10 gibi doğal kod sıralaması. */
function codeCompare(a: string, b: string): number {
    const pa = a.split('.'), pb = b.split('.');
    if (pa[0] !== pb[0]) return pa[0].localeCompare(pb[0], 'tr');
    return (parseInt(pa[1], 10) || 0) - (parseInt(pb[1], 10) || 0);
}

const alanRank = (alan: string) => {
    const i = ALAN_ORDER.indexOf(alan);
    return i === -1 ? ALAN_ORDER.length : i;
};

/**
 * Skor listesinden oyun başına oynanma sayısı. Kayıttaki oyun adı katalog kimliğiyle ('hafiza-2'), "kimlik --- ek" biçimiyle
 * ('Yapboz - Karpuz' → yapboz) ya da görünen adla eşleşebilir.
 */
export function countPlays(
    scores: { oyun_turu?: string | null }[],
    catalog: GameCatalogItem[] = GAME_CATALOG,
): Record<string, number> {
    const counts: Record<string, number> = {};
    const byId = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const g of catalog) {
        byId.set(normalizeOyunTuru(g.id), g.id);
        byId.set(normalizeOyunTuru(g.routeKey), g.id);
        const entry = MAARIF_MAP[g.id] ?? MAARIF_MAP[g.routeKey];
        if (entry?.displayName) byName.set(normalizeOyunTuru(entry.displayName), g.id);
    }
    // Aynı görünen adı paylaşan kardeş oyunlarda (alias) birine yığmamak için yalnız kimlik/ön ek eşleşmesi öncelikli.
    const ids = [...byId.keys()].sort((a, b) => b.length - a.length);   // uzun kimlik önce ('hafiza-2' > 'hafiza')
    for (const s of scores) {
        const key = normalizeOyunTuru(s.oyun_turu ?? '');
        if (!key) continue;
        let gameId = byId.get(key);
        if (!gameId) {
            const prefix = ids.find(id => key.startsWith(id + '---'));
            if (prefix) gameId = byId.get(prefix);
        }
        if (!gameId) gameId = byName.get(key);
        if (gameId) counts[gameId] = (counts[gameId] || 0) + 1;
    }
    return counts;
}

/** Rehberin tamamı. `plays` (öğrenci için countPlays sonucu) verilirse eksik kazanımlar işaretlenir. */
export function buildGuide(plays?: Record<string, number> | null, catalog: GameCatalogItem[] = GAME_CATALOG): GuideCode[] {
    const groups = new Map<string, GuideGame[]>();
    for (const g of catalog) {
        const entry = MAARIF_MAP[g.id] ?? MAARIF_MAP[g.routeKey];
        if (!entry) continue;                       // test: katalogda Maarif kaydı olmayan oyun kalmamalı
        const tracked = !UNTRACKED_GAMES.has(g.id);
        const game: GuideGame = {
            id: g.id,
            name: entry.displayName || g.title,
            detail: stripOfficial(entry.ciktiAciklama, MAARIF_CIKTILAR_2026[entry.cikti]?.aciklama),
            tier: requiredVeliTierForGame(g),
            plays: plays && tracked ? (plays[g.id] ?? 0) : null,
        };
        const list = groups.get(entry.cikti);
        if (list) list.push(game); else groups.set(entry.cikti, [game]);
    }

    const out: GuideCode[] = [];
    for (const [key, games] of groups) {
        const curr = MAARIF_CIKTILAR_2026[key];
        const trackedGames = games.filter(g => g.plays !== null);
        out.push({
            key,
            code: curr?.resmi ? key : null,
            alan: curr?.alan ?? '',
            text: curr?.aciklama ?? games[0].detail,   // resmi kod yoksa (SDB gibi) oyunun kendi açıklaması
            games: games.sort((a, b) => a.name.localeCompare(b.name, 'tr')),
            missing: plays && trackedGames.length > 0 ? trackedGames.every(g => (g.plays ?? 0) === 0) : null,
            playedGames: plays ? trackedGames.filter(g => (g.plays ?? 0) > 0).length : null,
        });
    }
    return out.sort((a, b) => alanRank(a.alan) - alanRank(b.alan) || codeCompare(a.key, b.key));
}

export interface GuideFilter { query?: string; alan?: string | null; onlyMissing?: boolean }

const fold = (s: string) => s.toLocaleLowerCase('tr').trim();

/** Arama (oyun adı, kod, Maarif metni, oyun açıklaması), alan ve "yalnız eksikler" süzgeci. */
export function filterGuide(list: GuideCode[], f: GuideFilter): GuideCode[] {
    const q = fold(f.query ?? '');
    return list.filter(c => {
        if (f.alan && c.alan !== f.alan) return false;
        if (f.onlyMissing && c.missing !== true) return false;
        if (!q) return true;
        if (fold(c.key).includes(q) || fold(c.text).includes(q)) return true;
        return c.games.some(g => fold(g.name).includes(q) || fold(g.detail).includes(q));
    });
}

/** Rehberdeki alanlar (sıralı, yalnız oyunu olanlar). */
export function guideAlanlar(list: GuideCode[]): string[] {
    return [...new Set(list.map(c => c.alan))].sort((a, b) => alanRank(a) - alanRank(b));
}

export const missingCount = (list: GuideCode[]): number => list.filter(c => c.missing === true).length;

export interface AlanSummary {
    alan: string;
    /** Bu alandaki (oyunu olan) kazanım sayısı. */
    kod: number;
    /** Bu alandaki oyun sayısı. */
    oyun: number;
    /** Öğrenci verildiyse: oynanıp oynanmadığı bilinebilen kazanım sayısı (kayıt tutulmayan oyunlar hariç). */
    izlenebilir: number | null;
    /** Öğrenci verildiyse: en az bir oyunun oynandığı kazanım sayısı. */
    oynanan: number | null;
    /** Öğrenci verildiyse: hiç oyun oynanmamış (eksik) kazanım sayısı. */
    eksik: number | null;
}

/** Alan başına özet (öğretmen paneli grafiği için): kazanım/oyun sayısı ve öğrenci verildiyse kapsama. */
export function alanSummary(list: GuideCode[]): AlanSummary[] {
    const hasStudent = list.some(c => c.missing !== null || c.playedGames !== null);
    return guideAlanlar(list).map(alan => {
        const codes = list.filter(c => c.alan === alan);
        const izlenebilir = codes.filter(c => c.missing !== null);
        return {
            alan,
            kod: codes.length,
            oyun: codes.reduce((n, c) => n + c.games.length, 0),
            izlenebilir: hasStudent ? izlenebilir.length : null,
            oynanan: hasStudent ? izlenebilir.filter(c => c.missing === false).length : null,
            eksik: hasStudent ? izlenebilir.filter(c => c.missing === true).length : null,
        };
    });
}
