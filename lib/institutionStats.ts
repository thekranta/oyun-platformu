import { getMaarif } from '../constants/maarifMap';

// Kurum yönetim paneli (Meşe) — tipler + saf yardımcılar. Sunucu tarafı:
// supabase_migrations/add_institutions.sql. Panel TOPLU özet gösterir; çizim, AI yorumu ve veli bilgisi YOK.

export interface InstitutionInfo {
    id: string;
    name: string;
    expiresAt: string | null;
    teacherCount: number;
    classCount: number;
}

export interface Overview {
    teacherCount: number;
    classCount: number;
    childCount: number;
    /** Kardeşli hesaplar: toplu sayılara dahil edilmez, yalnız bildirilir. */
    hiddenCount: number;
    activeChildren: number;
    gameCount: number;
    totalSeconds: number;
    correctTotal: number;
    errorTotal: number;
    prevActiveChildren: number;
    prevGameCount: number;
}

export interface DailyPoint { day: string; gameCount: number; activeChildren: number }
export interface GameTypeRow { oyunTuru: string; gameCount: number; childCount: number }

export interface ClassRow {
    id: string;
    name: string;
    teacherName: string | null;
    childCount: number;
    hiddenCount: number;
    activeChildren: number;
    gameCount: number;
    lastPlayedAt: string | null;
}

export interface ChildRow {
    id: string;
    name: string | null;
    ageMonths: number | null;
    hidden: boolean;
    gameCount: number | null;
    correctTotal: number | null;
    errorTotal: number | null;
    lastPlayedAt: string | null;
}

export type PeriodDays = 7 | 30;

/** Panelin veri kaynağı: gerçek (RPC) ya da satış gösterisi (demo). */
export interface InstitutionDataSource {
    isDemo: boolean;
    overview(days: PeriodDays): Promise<Overview | null>;
    daily(days: PeriodDays): Promise<DailyPoint[]>;
    gamesByType(days: PeriodDays): Promise<GameTypeRow[]>;
    classes(days: PeriodDays): Promise<ClassRow[]>;
    classChildren(classId: string, days: PeriodDays): Promise<ChildRow[]>;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/** PostgREST bigint'leri string döndürebilir. */
export const num = (v: unknown): number => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    return Number.isFinite(n) ? n : 0;
};
export const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : num(v));

export const percent = (part: number, whole: number): number =>
    whole > 0 ? Math.round((part / whole) * 100) : 0;

/** Doğru cevap oranı (%); hiç cevap yoksa null. */
export const accuracy = (correct: number | null, errors: number | null): number | null => {
    const c = correct ?? 0, e = errors ?? 0;
    return c + e > 0 ? Math.round((c / (c + e)) * 100) : null;
};

export type Trend = { direction: 'up' | 'down' | 'flat' | 'none'; value: number };

/** Önceki döneme göre yüzde değişim; önceki dönem 0 ise karşılaştırma yok. */
export const trendOf = (current: number, previous: number): Trend => {
    if (previous <= 0) return { direction: 'none', value: 0 };
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct === 0) return { direction: 'flat', value: 0 };
    return { direction: pct > 0 ? 'up' : 'down', value: Math.abs(pct) };
};

/** 8130 sn → { hours: 2, minutes: 15 } (60 dk altı için hours 0). */
export const splitDuration = (seconds: number): { hours: number; minutes: number } => {
    const total = Math.max(0, Math.round(seconds / 60));
    return { hours: Math.floor(total / 60), minutes: total % 60 };
};

export const ageParts = (months: number | null): { years: number; months: number } | null =>
    months == null ? null : { years: Math.floor(months / 12), months: months % 12 };

export type Recency = { kind: 'never' } | { kind: 'today' } | { kind: 'days'; days: number };

export const recencyOf = (iso: string | null, now: Date = new Date()): Recency => {
    if (!iso) return { kind: 'never' };
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return { kind: 'never' };
    const days = Math.floor((startOfDay(now).getTime() - startOfDay(new Date(t)).getTime()) / DAY_MS);
    return days <= 0 ? { kind: 'today' } : { kind: 'days', days };
};

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// ---------------------------------------------------------------------------
// Sağlık durumu (sınıf / çocuk)
// ---------------------------------------------------------------------------
export type Health = 'good' | 'low' | 'idle' | 'empty';

/** Sınıf: etkin çocuk oranı ≥ %50 iyi, %1-49 düşük, 0 pasif; çocuk yoksa boş. */
export const classHealth = (c: Pick<ClassRow, 'childCount' | 'activeChildren'>): Health => {
    if (c.childCount <= 0) return 'empty';
    if (c.activeChildren <= 0) return 'idle';
    return c.activeChildren / c.childCount >= 0.5 ? 'good' : 'low';
};

/** Çocuk: dönemde oyun varsa iyi; yoksa son oynamaya göre düşük (≤14 gün) / pasif (>14 gün ya da hiç). */
export const childHealth = (c: Pick<ChildRow, 'gameCount' | 'lastPlayedAt' | 'hidden'>, now: Date = new Date()): Health => {
    if (c.hidden) return 'empty';
    if ((c.gameCount ?? 0) > 0) return 'good';
    const r = recencyOf(c.lastPlayedAt, now);
    if (r.kind === 'days' && r.days <= 14) return 'low';
    return 'idle';
};

// ---------------------------------------------------------------------------
// Gelişim alanı dağılımı (constants/maarifMap.ts tek kaynak)
// ---------------------------------------------------------------------------
export interface AreaMeta { emoji: string; color: string }

export const AREA_META: Record<string, AreaMeta> = {
    'Matematik': { emoji: '🔢', color: '#4F7DF0' },
    'Fen': { emoji: '🔬', color: '#2FA46F' },
    'Türkçe': { emoji: '📖', color: '#E8A21A' },
    'Sanat': { emoji: '🎨', color: '#E2599C' },
    'Müzik': { emoji: '🎵', color: '#8B64E0' },
    'Sosyal': { emoji: '🌍', color: '#F2784B' },
    'Sosyal-Duygusal': { emoji: '💛', color: '#E5616F' },
    'Hareket ve Sağlık': { emoji: '🏃', color: '#27AFC2' },
};
const FALLBACK_AREA: AreaMeta = { emoji: '🎮', color: '#8A94A6' };
export const areaMeta = (alan: string): AreaMeta => AREA_META[alan] ?? FALLBACK_AREA;

export interface AreaShare { alan: string; gameCount: number; share: number }

/** Oyun türü sayılarını Maarif alanına göre toplar; payların toplamı ≈ %100; çoktan aza sıralı. */
export const groupByArea = (rows: GameTypeRow[]): AreaShare[] => {
    const by = new Map<string, number>();
    let total = 0;
    for (const r of rows) {
        const alan = getMaarif(r.oyunTuru).alan || 'Diğer';
        by.set(alan, (by.get(alan) ?? 0) + r.gameCount);
        total += r.gameCount;
    }
    return [...by.entries()]
        .map(([alan, gameCount]) => ({ alan, gameCount, share: percent(gameCount, total) }))
        .sort((a, b) => b.gameCount - a.gameCount || a.alan.localeCompare(b.alan, 'tr'));
};

// ---------------------------------------------------------------------------
// "Dikkat gerektirenler"
// ---------------------------------------------------------------------------
export type AttentionItem =
    | { kind: 'idleClass'; classId: string; className: string; teacherName: string | null }
    | { kind: 'lowClass'; classId: string; className: string; teacherName: string | null; active: number; total: number }
    | { kind: 'passiveChildren'; count: number }
    | { kind: 'packageExpiring'; daysLeft: number }
    | { kind: 'hiddenChildren'; count: number };

export const PACKAGE_WARN_DAYS = 30;

export const buildAttention = (
    info: Pick<InstitutionInfo, 'expiresAt'>,
    overview: Overview | null,
    classes: ClassRow[],
    now: Date = new Date(),
): AttentionItem[] => {
    const items: AttentionItem[] = [];
    for (const c of classes) {
        const h = classHealth(c);
        if (h === 'idle') items.push({ kind: 'idleClass', classId: c.id, className: c.name, teacherName: c.teacherName });
        else if (h === 'low') items.push({ kind: 'lowClass', classId: c.id, className: c.name, teacherName: c.teacherName, active: c.activeChildren, total: c.childCount });
    }
    if (overview) {
        const passive = overview.childCount - overview.activeChildren;
        if (overview.childCount > 0 && passive > 0) items.push({ kind: 'passiveChildren', count: passive });
        if (overview.hiddenCount > 0) items.push({ kind: 'hiddenChildren', count: overview.hiddenCount });
    }
    if (info.expiresAt) {
        const left = Math.ceil((new Date(info.expiresAt).getTime() - now.getTime()) / DAY_MS);
        if (Number.isFinite(left) && left >= 0 && left <= PACKAGE_WARN_DAYS) items.push({ kind: 'packageExpiring', daysLeft: left });
    }
    return items;
};

// ---------------------------------------------------------------------------
// RPC satırı → tip (PostgREST snake_case)
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;

export const parseInstitution = (r: Row): InstitutionInfo => ({
    id: String(r.institution_id),
    name: String(r.name ?? ''),
    expiresAt: (r.expires_at as string | null) ?? null,
    teacherCount: num(r.teacher_count),
    classCount: num(r.class_count),
});

export const parseOverview = (r: Row): Overview => ({
    teacherCount: num(r.teacher_count),
    classCount: num(r.class_count),
    childCount: num(r.child_count),
    hiddenCount: num(r.hidden_count),
    activeChildren: num(r.active_children),
    gameCount: num(r.game_count),
    totalSeconds: num(r.total_seconds),
    correctTotal: num(r.correct_total),
    errorTotal: num(r.error_total),
    prevActiveChildren: num(r.prev_active_children),
    prevGameCount: num(r.prev_game_count),
});

export const parseDaily = (r: Row): DailyPoint => ({
    day: String(r.day).slice(0, 10),
    gameCount: num(r.game_count),
    activeChildren: num(r.active_children),
});

export const parseGameType = (r: Row): GameTypeRow => ({
    oyunTuru: String(r.oyun_turu),
    gameCount: num(r.game_count),
    childCount: num(r.child_count),
});

export const parseClass = (r: Row): ClassRow => ({
    id: String(r.class_id),
    name: String(r.class_name ?? ''),
    teacherName: (r.teacher_name as string | null) ?? null,
    childCount: num(r.child_count),
    hiddenCount: num(r.hidden_count),
    activeChildren: num(r.active_children),
    gameCount: num(r.game_count),
    lastPlayedAt: (r.last_played_at as string | null) ?? null,
});

export const parseChild = (r: Row): ChildRow => ({
    id: String(r.student_id),
    name: (r.child_name as string | null) ?? null,
    ageMonths: numOrNull(r.child_age_months),
    hidden: r.hidden === true,
    gameCount: numOrNull(r.game_count),
    correctTotal: numOrNull(r.correct_total),
    errorTotal: numOrNull(r.error_total),
    lastPlayedAt: (r.last_played_at as string | null) ?? null,
});
