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
    /** Yalnız 'ended': oyunun bildirdiği sonuç. Alıcı onu readBoardResult ile süzer, ham haline güvenmez. */
    result?: BoardResult;
}

export function boardMessage<T extends BoardToParentType | ParentToBoardType>(type: T, result?: BoardResult | null): BoardMessage<T> {
    return result ? { source: BOARD_MESSAGE_SOURCE, type, result } : { source: BOARD_MESSAGE_SOURCE, type };
}

/** Gelen iletinin türünü döndürür; kaynağı/türü bilinmiyorsa null (başka sayfaların iletileri yok sayılır). */
export function readBoardMessage<T extends string>(data: unknown, allowed: readonly T[]): T | null {
    if (!data || typeof data !== 'object') return null;
    const { source, type } = data as { source?: unknown; type?: unknown };
    if (source !== BOARD_MESSAGE_SOURCE || typeof type !== 'string') return null;
    return (allowed as readonly string[]).includes(type) ? (type as T) : null;
}

// ---------------------------------------------------------------------------
// Oyun sonucu (çocuğun dosyasına kaydetmek için)
// ---------------------------------------------------------------------------

/**
 * Oyunun onGameEnd ile bildirdiği sonuçtan KAYDA giden alanlar. Çizim verisi ve algılanan kelime BİLEREK yoktur.
 * Sınırlar supabase_migrations/add_board_results.sql'deki sunucu sınırlarıyla AYNIDIR (sunucu yine de denetler).
 */
export interface BoardResult {
    /** Oyunun bildirdiği ad: normal oyun kaydındaki oyun_turu ile aynı (eski oyunlarda 'Kodlama Oyunu' gibi olabilir). */
    oyunAdi: string;
    sure: number;
    hamle: number;
    hata: number;
    correct: number | null;
    zorluk: number | null;
    kazanim: string | null;
    deneme: number | null;
    distanceEffect: number | null;
    responseTime: number | null;
    cognitiveSpeed: number | null;
    visualAttention: number | null;
    /** Tur geçmişi: JSON metni (normal oyun kaydıyla aynı biçim). */
    roundHistory: string | null;
}

/** Sunucudaki sınırlarla (add_board_results.sql) AYNI; lib/boardResultsSql.test.ts ikisini karşılaştırır. */
export const BOARD_RESULT_LIMITS = {
    gameName: 60,
    sure: 7200,
    hamle: 10000,
    hata: 10000,
    correct: 1000,
    zorluk: 20,
    deneme: 1000,
    kazanim: 120,
    history: 30000,
} as const;

const MAX_GAME_NAME = BOARD_RESULT_LIMITS.gameName;
const MAX_KAZANIM = BOARD_RESULT_LIMITS.kazanim;
const MAX_HISTORY = BOARD_RESULT_LIMITS.history;

function wholeNumber(value: unknown, max: number): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.min(max, Math.max(0, Math.round(value)));
}

function decimal(value: unknown, limit: number): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const rounded = Math.round(value * 1000) / 1000;
    return Math.abs(rounded) <= limit ? rounded : null;
}

function hasControlCharacter(text: string): boolean {
    for (const ch of text) {
        const code = ch.charCodeAt(0);
        if (code < 32 || code === 127) return true;
    }
    return false;
}

function historyText(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    let text: unknown = value;
    if (typeof value !== 'string') {
        try {
            text = JSON.stringify(value);
        } catch {
            return null;
        }
    }
    if (typeof text !== 'string' || text.length === 0 || text.length > MAX_HISTORY) return null;
    try {
        JSON.parse(text);
    } catch {
        return null;
    }
    return text;
}

/** Ham sonucu süzer: oyun adı geçersizse null (kayıt önerilmez); sayılar sınırlara çekilir, bozuk isteğe bağlı alanlar boşalır. */
export function sanitizeBoardResult(raw: unknown): BoardResult | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const name = typeof r.oyunAdi === 'string' ? r.oyunAdi.trim() : '';
    if (name === '' || Array.from(name).length > MAX_GAME_NAME || hasControlCharacter(name)) return null;
    const kazanim = typeof r.kazanim === 'string' ? Array.from(r.kazanim.trim()).slice(0, MAX_KAZANIM).join('') : '';
    return {
        oyunAdi: name,
        sure: wholeNumber(r.sure, BOARD_RESULT_LIMITS.sure) ?? 0,
        hamle: wholeNumber(r.hamle, BOARD_RESULT_LIMITS.hamle) ?? 0,
        hata: wholeNumber(r.hata, BOARD_RESULT_LIMITS.hata) ?? 0,
        correct: wholeNumber(r.correct, BOARD_RESULT_LIMITS.correct),
        zorluk: wholeNumber(r.zorluk, BOARD_RESULT_LIMITS.zorluk),
        kazanim: kazanim === '' ? null : kazanim,
        deneme: wholeNumber(r.deneme, BOARD_RESULT_LIMITS.deneme),
        distanceEffect: decimal(r.distanceEffect, 1000000),
        responseTime: decimal(r.responseTime, 100000000),
        cognitiveSpeed: decimal(r.cognitiveSpeed, 1000000),
        visualAttention: decimal(r.visualAttention, 1000000),
        roundHistory: historyText(r.roundHistory),
    };
}

/** onGameEnd'in ek verisinden (extraData) kullandığımız alanlar. */
export interface GameEndExtra {
    zorlukSeviyesi?: unknown;
    kazanimOdagi?: unknown;
    denemeNo?: unknown;
    distance_effect?: unknown;
    response_time?: unknown;
    round_history?: unknown;
    correct_answers?: unknown;
    cognitive_speed_score?: unknown;
    visual_attention_score?: unknown;
}

/** Oyunun onGameEnd(oyunAdi, sure, hamle, hata, kelime, extra) çağrısını kayıt sonucuna çevirir (çizim ve kelime düşer). */
export function resultFromGameEnd(oyunAdi: unknown, sure: unknown, hamle: unknown, hata: unknown, extra?: GameEndExtra | null): BoardResult | null {
    return sanitizeBoardResult({
        oyunAdi,
        sure,
        hamle,
        hata,
        correct: extra?.correct_answers,
        zorluk: extra?.zorlukSeviyesi,
        kazanim: extra?.kazanimOdagi,
        deneme: extra?.denemeNo,
        distanceEffect: extra?.distance_effect,
        responseTime: extra?.response_time,
        cognitiveSpeed: extra?.cognitive_speed_score,
        visualAttention: extra?.visual_attention_score,
        roundHistory: extra?.round_history,
    });
}

/** Gelen iletinin sonucunu okur: kaynak bizim değilse ya da sonuç geçersizse null. */
export function readBoardResult(data: unknown): BoardResult | null {
    if (!data || typeof data !== 'object') return null;
    const { source, result } = data as { source?: unknown; result?: unknown };
    return source === BOARD_MESSAGE_SOURCE ? sanitizeBoardResult(result) : null;
}

// ---------------------------------------------------------------------------
// Tercihler (cihazda saklanır)
// ---------------------------------------------------------------------------

export interface BoardPrefs {
    ageGroup: BoardAgeGroup;
    /** Otomatik büyütmeye göre adım sayısı (0 = otomatik; + daha büyük, − daha küçük). */
    zoomOffset: number;
    /** Son seçilen sınıf (Meşe'de birden çok sınıf olabilir; tahtanın bilgisayarı hep aynı sınıfı açsın). */
    classId: string | null;
}

export const DEFAULT_PREFS: BoardPrefs = { ageGroup: DEFAULT_AGE_GROUP, zoomOffset: 0, classId: null };
const MAX_OFFSET = 12;
const MAX_CLASS_ID_LENGTH = 64;

export function parseBoardPrefs(raw: string | null | undefined): BoardPrefs {
    if (!raw) return DEFAULT_PREFS;
    try {
        const value = JSON.parse(raw) as { ageGroup?: unknown; zoomOffset?: unknown; classId?: unknown };
        const offset = typeof value.zoomOffset === 'number' && Number.isFinite(value.zoomOffset) ? Math.round(value.zoomOffset) : 0;
        const classId = typeof value.classId === 'string' && value.classId.length > 0 && value.classId.length <= MAX_CLASS_ID_LENGTH ? value.classId : null;
        return {
            ageGroup: isAgeGroup(value.ageGroup) ? value.ageGroup : DEFAULT_AGE_GROUP,
            zoomOffset: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, offset)),
            classId,
        };
    } catch {
        return DEFAULT_PREFS;
    }
}
