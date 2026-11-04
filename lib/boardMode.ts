import { GAME_CATALOG } from '../constants/gameCatalog';
import { MAARIF_MAP } from '../constants/maarifMap';
import { GAME_CARD_META, GAME_EMOJI } from './menuHelpers';
import { ALAN_ORDER } from './teacherGameGuide';
import {
    combineGameTier,
    getEffectiveOgretmenTier,
    requiredVeliTierForGame,
    veliTierMeetsMinimum,
    type OgretmenTier,
    type VeliTier,
} from './subscriptionTiers';

/**
 * Tahta Modu (akıllı tahta / projeksiyon) — SAF mantık. Arayüz: app/tahta.tsx, components/board/*.
 *
 * Oyunlar telefon boyutuna göre yazılmıştır (genişlik sınırları 380-540 px; bkz. akilli-tahta-analizi): 1920x1080
 * bir tahtada küçük bir sütun olarak kalırlar. Tarayıcıyı %200 yakınlaştırmak bunu çözer (oyun, pencere genişliğine
 * göre yeniden yerleşir). Tahta Modu bunu OTOMATİK yapar: oyun, tahtadan küçük bir "sanal pencere" (iframe) içinde
 * çalışır ve CSS ölçeğiyle tahtayı doldurur; oyun kendini sanal pencerenin boyutuna göre yerleştirir.
 */

// ---------------------------------------------------------------------------
// Büyütme (zoom)
// ---------------------------------------------------------------------------

/** Alt kontrol çubuğunun yüksekliği (px). Oyun sahnesi pencere yüksekliğinden bu kadar kısadır. */
export const BOARD_BAR_HEIGHT = 72;
/** Sanal pencerenin hedef boyutu (CSS px): 1080p tahtada tarayıcı %200 yakınlaştırmasının karşılığı (960x504). */
export const BOARD_TARGET_WIDTH = 960;
export const BOARD_TARGET_HEIGHT = 500;
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.25;

export function clampZoom(zoom: number): number {
    if (!Number.isFinite(zoom)) return ZOOM_MIN;
    const stepped = Math.round(zoom / ZOOM_STEP) * ZOOM_STEP;
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, stepped));
}

/**
 * Pencereye göre otomatik büyütme: sanal pencere hedef boyuttan (960x500) KÜÇÜLMEYECEK şekilde en büyük adım.
 * 1920x1080 → 2 (sanal 960x504); 1366x768 → 1,25; 1024x768 → 1; 3840x2160 → 4.
 */
export function autoZoom(windowWidth: number, windowHeight: number): number {
    const stageHeight = Math.max(0, windowHeight - BOARD_BAR_HEIGHT);
    const raw = Math.min(windowWidth / BOARD_TARGET_WIDTH, stageHeight / BOARD_TARGET_HEIGHT);
    if (!Number.isFinite(raw) || raw <= 0) return ZOOM_MIN;
    return clampZoom(Math.floor(raw / ZOOM_STEP) * ZOOM_STEP);
}

export function stepZoom(zoom: number, direction: 1 | -1): number {
    return clampZoom(zoom + direction * ZOOM_STEP);
}

/** Sanal pencerenin boyutu: ölçeklenince sahneyi tam KAPLAR (yukarı yuvarlanır, taşan <1 px kırpılır). */
export function virtualSize(stageWidth: number, stageHeight: number, zoom: number): { width: number; height: number } {
    const z = clampZoom(zoom);
    return {
        width: Math.max(1, Math.ceil(stageWidth / z)),
        height: Math.max(1, Math.ceil(stageHeight / z)),
    };
}

export function zoomPercent(zoom: number): number {
    return Math.round(clampZoom(zoom) * 100);
}

/** Öğretmenin seçtiği büyütme = otomatik büyütme + `offset` adım (farklı boyuttaki tahtalarda da anlamlı kalır). */
export function zoomWithOffset(auto: number, offset: number): number {
    return clampZoom(auto + Math.round(offset) * ZOOM_STEP);
}

/** Büyütme `zoom` olduğunda saklanacak adım sayısı (otomatiğe göre). */
export function offsetForZoom(auto: number, zoom: number): number {
    return Math.round((clampZoom(zoom) - auto) / ZOOM_STEP);
}

// ---------------------------------------------------------------------------
// Sınıfın yaşı
// ---------------------------------------------------------------------------

export type BoardAgeGroup = 3 | 4 | 5 | 6;
export const BOARD_AGE_GROUPS: readonly BoardAgeGroup[] = [3, 4, 5, 6];
export const DEFAULT_AGE_GROUP: BoardAgeGroup = 4;
export const DEFAULT_AGE_MONTHS = 54;

const AGE_MONTHS: Record<BoardAgeGroup, number> = { 3: 42, 4: 54, 5: 66, 6: 72 };

/** Oyunlar yaşı AY olarak alır (kayıttaki aralık 36-72); yaş grubunun ortasına denk gelen ay. */
export function ageGroupToMonths(group: BoardAgeGroup): number {
    return AGE_MONTHS[group];
}

export function clampAgeMonths(months: number): number {
    if (!Number.isFinite(months)) return DEFAULT_AGE_MONTHS;
    return Math.min(72, Math.max(36, Math.round(months)));
}

export function isAgeGroup(value: unknown): value is BoardAgeGroup {
    return typeof value === 'number' && (BOARD_AGE_GROUPS as readonly number[]).includes(value);
}

// ---------------------------------------------------------------------------
// Oyun listesi
// ---------------------------------------------------------------------------

/**
 * Tahtada AÇILMAYAN oyunlar:
 *  - bunu-soyle: çocuğun sesini yapay zekâ hizmetine gönderir (ebeveyn izni + mikrofon; sınıf tahtasına uygun değil);
 *  - ceviz-macera: sonucunu kendisi veritabanına yazar (öğretmen hesabına çocuk skoru yazılırdı).
 * Yeni bir oyun kendi başına veritabanına yazıyorsa buraya eklenmeli (lib/boardMode.test.ts yazanları arar).
 */
export const BOARD_EXCLUDED_ROUTES: ReadonlySet<string> = new Set(['bunu-soyle', 'ceviz-macera']);

export interface BoardGame {
    id: string;
    routeKey: string;
    title: string;
    subtitle: string;
    emoji: string;
    color: string;
    /** Maarif alanı (ALAN_ORDER içindeki adlardan biri ya da 'Diğer'). */
    alan: string;
    locked: boolean;
    /** Oyunu açan asgari paket (veli ölçeğinde). */
    minTier: VeliTier;
}

/** Öğretmenin paketi → oyun erişim düzeyi (Çınar = Filiz düzeyi, Meşe = Fidan düzeyi; süresi dolmuşsa ücretsiz). */
export function boardGameTier(teacherTier: OgretmenTier | null | undefined, expiresAt: string | null | undefined): VeliTier {
    return combineGameTier('free', getEffectiveOgretmenTier(teacherTier ?? null, expiresAt ?? null));
}

/** Kilitli bir oyunu hangi ÖĞRETMEN paketi açar (kilit notunda gösterilir). */
export function teacherTierFor(minTier: VeliTier): 'cinar' | 'mese' {
    return veliTierMeetsMinimum('filiz', minTier) ? 'cinar' : 'mese';
}

function alanOf(id: string, routeKey: string): string {
    const entry = MAARIF_MAP[id] ?? MAARIF_MAP[routeKey];
    return entry && ALAN_ORDER.includes(entry.alan) ? entry.alan : 'Diğer';
}

/** Kataloğun, bu tarayıcıda oynanabilen (renderer'ı olan) ve tahtaya uygun oyunları; alana, sonra ada göre sıralı. */
export function buildBoardGames(renderers: Record<string, unknown>, tier: VeliTier): BoardGame[] {
    const games: BoardGame[] = [];
    for (const g of GAME_CATALOG) {
        if (!renderers[g.routeKey] || BOARD_EXCLUDED_ROUTES.has(g.routeKey)) continue;
        const meta = GAME_CARD_META[g.id];
        const minTier = requiredVeliTierForGame(g);
        games.push({
            id: g.id,
            routeKey: g.routeKey,
            title: meta?.displayTitle || g.title,
            subtitle: meta?.subtitle ?? '',
            emoji: GAME_EMOJI[g.id] || '🎮',
            color: meta?.color ?? '#90A4AE',
            alan: alanOf(g.id, g.routeKey),
            locked: !veliTierMeetsMinimum(tier, minTier),
            minTier,
        });
    }
    const order = (alan: string) => {
        const i = ALAN_ORDER.indexOf(alan);
        return i < 0 ? ALAN_ORDER.length : i;
    };
    return games.sort((a, b) => order(a.alan) - order(b.alan) || Number(a.locked) - Number(b.locked) || a.title.localeCompare(b.title, 'tr'));
}

/** Seçilebilir alanlar (oyunu olanlar), ALAN_ORDER sırasında; her biri oyun sayısıyla. */
export function boardAreas(games: readonly BoardGame[]): { alan: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const g of games) counts.set(g.alan, (counts.get(g.alan) ?? 0) + 1);
    const known = ALAN_ORDER.filter((a) => counts.has(a)).map((a) => ({ alan: a, count: counts.get(a)! }));
    return counts.has('Diğer') ? [...known, { alan: 'Diğer', count: counts.get('Diğer')! }] : known;
}

export function filterByArea(games: readonly BoardGame[], alan: string | null): BoardGame[] {
    return alan ? games.filter((g) => g.alan === alan) : [...games];
}

// ---------------------------------------------------------------------------
// Oyun penceresi (iframe) adresi ve iletişim
// ---------------------------------------------------------------------------

export const BOARD_CHILD_NAME = 'Küçük Kaşif';

export function boardPlayHref(params: { game: string; ageMonths: number; dev?: boolean }): string {
    const q = `g=${encodeURIComponent(params.game)}&yas=${clampAgeMonths(params.ageMonths)}${params.dev ? '&dev=1' : ''}`;
    return `/tahta-oyun?${q}`;
}

type Param = string | string[] | undefined;
const first = (v: Param): string | undefined => (Array.isArray(v) ? v[0] : v);

export function parseBoardPlayParams(query: { g?: Param; yas?: Param }): { game: string | null; ageMonths: number } {
    const game = first(query.g)?.trim() || null;
    const age = Number(first(query.yas));
    return { game, ageMonths: first(query.yas) === undefined ? DEFAULT_AGE_MONTHS : clampAgeMonths(age) };
}

export const BOARD_MESSAGE_SOURCE = 'minizeka-board' as const;
export type BoardToParentType = 'ready' | 'ended' | 'exit';
export type ParentToBoardType = 'silence' | 'restart';
export interface BoardMessage<T extends string = BoardToParentType | ParentToBoardType> {
    source: typeof BOARD_MESSAGE_SOURCE;
    type: T;
}

export function boardMessage<T extends BoardToParentType | ParentToBoardType>(type: T): BoardMessage<T> {
    return { source: BOARD_MESSAGE_SOURCE, type };
}

/** Gelen iletinin türünü döndürür; kaynağı/türü bilinmiyorsa null (başka sayfaların iletileri yok sayılır). */
export function readBoardMessage<T extends string>(data: unknown, allowed: readonly T[]): T | null {
    if (!data || typeof data !== 'object') return null;
    const { source, type } = data as { source?: unknown; type?: unknown };
    if (source !== BOARD_MESSAGE_SOURCE || typeof type !== 'string') return null;
    return (allowed as readonly string[]).includes(type) ? (type as T) : null;
}

// ---------------------------------------------------------------------------
// Tercihler (cihazda saklanır)
// ---------------------------------------------------------------------------

export interface BoardPrefs {
    ageGroup: BoardAgeGroup;
    /** Otomatik büyütmeye göre adım sayısı (0 = otomatik; + daha büyük, − daha küçük). */
    zoomOffset: number;
}

export const DEFAULT_PREFS: BoardPrefs = { ageGroup: DEFAULT_AGE_GROUP, zoomOffset: 0 };
const MAX_OFFSET = 12;

export function parseBoardPrefs(raw: string | null | undefined): BoardPrefs {
    if (!raw) return DEFAULT_PREFS;
    try {
        const value = JSON.parse(raw) as { ageGroup?: unknown; zoomOffset?: unknown };
        const offset = typeof value.zoomOffset === 'number' && Number.isFinite(value.zoomOffset) ? Math.round(value.zoomOffset) : 0;
        return {
            ageGroup: isAgeGroup(value.ageGroup) ? value.ageGroup : DEFAULT_AGE_GROUP,
            zoomOffset: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, offset)),
        };
    } catch {
        return DEFAULT_PREFS;
    }
}
