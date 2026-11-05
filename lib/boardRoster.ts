import { useCallback, useEffect, useRef, useState } from 'react';
import { ageGroupToMonths, clampAgeMonths, type BoardAgeGroup } from './boardMode';
import { supabase } from './supabase';

/**
 * Tahta Modu "Sıra kimde?": öğretmenin sınıf listesinden çocuk seçmesi. Arayüz: components/board/PlayerSheet.tsx.
 *
 * Veri, Sınıf Bahçesi'nin kullandığı sunucu fonksiyonundan gelir (teacher_class_roster): yalnız veli onaylı (ya da
 * ücretli sınıf paketiyle açık), tek çocuklu hesapların çocukları döner; öğretmen ham tabloya dokunmaz. Tahtaya YALNIZ
 * ilk ad ve yaş alınır: e-posta, soyad, oyun sayısı bellekte tutulmaz. Bu sürümde sonuç KAYDEDİLMEZ; seçilen çocuğun
 * yaşı oyuna uygulanır ve tahtada kimin sırası olduğu gösterilir.
 */

export interface BoardClass {
    id: string;
    name: string;
}

export interface BoardPlayer {
    /** class_students.id (sunucu fonksiyonlarının tanıdığı öğrenci kimliği). */
    id: string;
    /** Tahtada görünen ad: yalnız ilk ad; aynı ilk ad birden çoksa ayırt edici bir ek ("Elif Y." / "Elif (2)"). */
    name: string;
    /** Gerçek yaş (ay); bilinmiyorsa null (o zaman sınıfın yaş grubu kullanılır). */
    ageMonths: number | null;
}

/** teacher_class_roster satırından kullandığımız alanlar. */
export interface RosterRow {
    student_id?: string | null;
    status?: string | null;
    child_name?: string | null;
    child_age_months?: number | null;
    hidden?: boolean | null;
}

export type BoardRosterPhase = 'off' | 'loading' | 'ready' | 'error';

const MAX_NAME_LENGTH = 14;

/** Tam addan ilk sözcük (en çok 14 karakter; emoji/birleşik karakter ortadan bölünmez). */
export function firstNameOf(full: string | null | undefined): string {
    const word = (full ?? '').trim().split(/\s+/)[0] ?? '';
    const chars = Array.from(word);
    return chars.length > MAX_NAME_LENGTH ? chars.slice(0, MAX_NAME_LENGTH).join('') : word;
}

function secondInitial(full: string): string {
    const second = full.trim().split(/\s+/)[1];
    const first = second ? Array.from(second)[0] : '';
    return first ? first.toLocaleUpperCase('tr') : '';
}

/**
 * Sınıf listesinden tahtada seçilebilecek çocuklar. Yalnız onaylı (accepted), kardeşli hesap olmayan (hidden değil) ve adı
 * bilinen çocuklar alınır; geri kalanı `excluded` olarak sayılır (öğretmen neden eksik olduğunu görsün). Ad ilk sözcüktür;
 * aynı ilk ad birden çoksa ikinci sözcüğün baş harfi eklenir, o da ayıramazsa sıra numarası.
 */
export function buildPlayers(rows: readonly RosterRow[]): { players: BoardPlayer[]; excluded: number } {
    const usable = rows
        .filter((r) => r && r.status === 'accepted' && !r.hidden && typeof r.student_id === 'string' && r.student_id !== '' && firstNameOf(r.child_name) !== '')
        .map((r) => ({
            id: r.student_id as string,
            full: String(r.child_name),
            base: firstNameOf(r.child_name),
            ageMonths: typeof r.child_age_months === 'number' && Number.isFinite(r.child_age_months) && r.child_age_months > 0 ? Math.round(r.child_age_months) : null,
            label: '',
        }));

    const groups = new Map<string, typeof usable>();
    for (const item of usable) {
        const key = item.base.toLocaleLowerCase('tr');
        groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    for (const group of groups.values()) {
        if (group.length === 1) {
            group[0].label = group[0].base;
            continue;
        }
        const labels = group.map((item) => {
            const initial = secondInitial(item.full);
            return initial ? `${item.base} ${initial}.` : item.base;
        });
        const unique = new Set(labels).size === labels.length;
        group.forEach((item, i) => { item.label = unique ? labels[i] : `${item.base} (${i + 1})`; });
    }

    const players = usable
        .map((item): BoardPlayer => ({ id: item.id, name: item.label, ageMonths: item.ageMonths }))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    return { players, excluded: rows.length - usable.length };
}

/** Oyuna verilecek yaş (ay): seçili çocuğun yaşı (oyunların desteklediği aralığa çekilir); yoksa sınıfın yaş grubu. */
export function playerAgeMonths(player: Pick<BoardPlayer, 'ageMonths'> | null, group: BoardAgeGroup): number {
    return player && player.ageMonths != null ? clampAgeMonths(player.ageMonths) : ageGroupToMonths(group);
}

/** Ay → yıl + ay (ekranda "4 yaş 6 ay"). */
export function ageParts(months: number): { years: number; months: number } {
    const total = Number.isFinite(months) ? Math.max(0, Math.round(months)) : 0;
    return { years: Math.floor(total / 12), months: total % 12 };
}

/** Hatırlanan sınıf listede varsa o, yoksa ilk sınıf, hiç sınıf yoksa null. */
export function pickClassId(classes: readonly BoardClass[], preferred: string | null | undefined): string | null {
    if (preferred && classes.some((c) => c.id === preferred)) return preferred;
    return classes[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Sunucudan okuma
// ---------------------------------------------------------------------------

interface RosterClientLike {
    from(table: string): any;
    rpc(fn: string, args?: Record<string, unknown>): any;
}

/** Öğretmenin KENDİ sınıfları (kullanıcı kimliğiyle süzülür; satır güvenliği ayrıca korur). Hata/oturum yoksa null. */
export async function loadBoardClasses(client: RosterClientLike, userId: string): Promise<BoardClass[] | null> {
    try {
        const { data, error } = await client
            .from('classes')
            .select('id, name, created_at')
            .eq('teacher_id', userId)
            .order('created_at', { ascending: true });
        if (error || !Array.isArray(data)) return null;
        return data
            .filter((c: any) => c && typeof c.id === 'string' && c.id !== '')
            .map((c: any) => ({ id: c.id as string, name: String(c.name ?? '').trim() }));
    } catch {
        return null;
    }
}

/** Bir sınıfın seçilebilir çocukları; yalnız sunucu fonksiyonundan (ham tablodan değil). Hata olursa null. */
export async function loadBoardRoster(client: RosterClientLike, classId: string): Promise<{ players: BoardPlayer[]; excluded: number } | null> {
    try {
        const { data, error } = await client.rpc('teacher_class_roster', { p_class_id: classId });
        if (error || !Array.isArray(data)) return null;
        return buildPlayers(data as RosterRow[]);
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Geliştirme önizlemesi (YALNIZ __DEV__ + ?dev=1): gerçek oturum olmadan arayüzü denemek için sahte sınıf
// ---------------------------------------------------------------------------

function devClasses(): BoardClass[] {
    return [{ id: 'dev-class-1', name: 'Papatyalar' }, { id: 'dev-class-2', name: 'Lalelar' }];
}

function devRoster(classId: string): { players: BoardPlayer[]; excluded: number } {
    const ok = (id: string, name: string, age: number | null): RosterRow => ({ student_id: id, status: 'accepted', child_name: name, child_age_months: age });
    if (classId === 'dev-class-2') {
        return buildPlayers([ok('d2-1', 'Defne Kaya', 40), ok('d2-2', 'Mert Aslan', 70), ok('d2-3', 'Nehir Çelik', 55)]);
    }
    return buildPlayers([
        ok('d1-1', 'Elif Yılmaz', 52), ok('d1-2', 'Elif Kaya', 61), ok('d1-3', 'Mert Demir', 47), ok('d1-4', 'Zeynep Su Arslan', 66),
        ok('d1-5', 'Ahmet Can', 39), ok('d1-6', 'Ayşe Nur Öztürk', 58), ok('d1-7', 'Yusuf Efe', 72), ok('d1-8', 'Defne', null),
        ok('d1-9', 'İpek Naz', 44), ok('d1-10', 'Ömer Asaf Şahin', 63), ok('d1-11', 'Çağan', 50), ok('d1-12', 'Mina Bulut', 56),
        { student_id: 'd1-13', status: 'pending', child_name: null, child_age_months: null },
        { student_id: 'd1-14', status: 'accepted', child_name: null, child_age_months: null, hidden: true },
    ]);
}

// ---------------------------------------------------------------------------
// React kancası
// ---------------------------------------------------------------------------

export interface BoardRoster {
    phase: BoardRosterPhase;
    classes: BoardClass[];
    classId: string | null;
    players: BoardPlayer[];
    excluded: number;
    selectClass: (id: string) => void;
    retry: () => void;
}

interface ClassesState { status: 'idle' | 'loading' | 'ready' | 'error'; list: BoardClass[] }
interface RosterState { for: string | null; status: 'loading' | 'ready' | 'error'; players: BoardPlayer[]; excluded: number }

const EMPTY_ROSTER: RosterState = { for: null, status: 'loading', players: [], excluded: 0 };

/**
 * `enabled` kapalıyken (ücretsiz öğretmen) hiçbir şey okunmaz ve `phase` 'off' olur. Aşama, iki ayrı yüklemeden (sınıflar,
 * seçili sınıfın çocukları) TÜRETİLİR: yarım kalmış bir yükleme ya da eski sınıfın listesi hiçbir zaman "hazır" görünmez.
 */
export function useBoardRoster(opts: { enabled: boolean; userId: string | null; dev: boolean; preferredClassId?: string | null }): BoardRoster {
    const { enabled, userId, dev } = opts;
    const [classesState, setClassesState] = useState<ClassesState>({ status: 'idle', list: [] });
    const [classId, setClassId] = useState<string | null>(null);
    const [rosterState, setRosterState] = useState<RosterState>(EMPTY_ROSTER);
    const [attempt, setAttempt] = useState(0);
    const preferredRef = useRef(opts.preferredClassId ?? null);
    preferredRef.current = opts.preferredClassId ?? null;

    useEffect(() => {
        if (!enabled) return;
        let alive = true;
        setClassesState({ status: 'loading', list: [] });
        (async () => {
            const list = __DEV__ && dev ? devClasses() : userId ? await loadBoardClasses(supabase, userId) : null;
            if (!alive) return;
            if (!list) {
                setClassesState({ status: 'error', list: [] });
                return;
            }
            setClassesState({ status: 'ready', list });
            setClassId(pickClassId(list, preferredRef.current));
        })();
        return () => { alive = false; };
    }, [enabled, userId, dev, attempt]);

    useEffect(() => {
        if (!enabled || !classId) return;
        let alive = true;
        setRosterState({ for: classId, status: 'loading', players: [], excluded: 0 });
        (async () => {
            const result = __DEV__ && dev ? devRoster(classId) : await loadBoardRoster(supabase, classId);
            if (!alive) return;
            setRosterState(result ? { for: classId, status: 'ready', ...result } : { for: classId, status: 'error', players: [], excluded: 0 });
        })();
        return () => { alive = false; };
    }, [enabled, classId, dev, attempt]);

    const selectClass = useCallback((id: string) => setClassId(id), []);
    const retry = useCallback(() => setAttempt((n) => n + 1), []);

    let phase: BoardRosterPhase;
    if (!enabled) phase = 'off';
    else if (classesState.status === 'error') phase = 'error';
    else if (classesState.status !== 'ready') phase = 'loading';
    else if (classesState.list.length === 0) phase = 'ready';
    else if (classId === null || rosterState.for !== classId || rosterState.status === 'loading') phase = 'loading';
    else phase = rosterState.status === 'error' ? 'error' : 'ready';

    const current = rosterState.for === classId && rosterState.status === 'ready';
    return {
        phase,
        classes: enabled ? classesState.list : [],
        classId: enabled ? classId : null,
        players: current ? rosterState.players : [],
        excluded: current ? rosterState.excluded : 0,
        selectClass,
        retry,
    };
}
