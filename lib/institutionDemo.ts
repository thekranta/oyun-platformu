import {
    ChildRow, ClassRow, DAY_MS, DailyPoint, GameTypeRow, InstitutionDataSource, InstitutionInfo, Overview, PeriodDays,
} from './institutionStats';

// Satış gösterisi için DEMO veri: tamamı uydurmadır, hiçbir gerçek çocuğa/kuruma ait değildir.
// Tek bir günlük "ev sahibi" matristen üretilir; böylece özet, günlük grafik, alan dağılımı ve sınıf
// listesi birbiriyle TUTARLI çıkar (toplamlar tutar) ve her açılışta aynı görünür (tohumlu).

const HORIZON = 60; // gün

// oyun_turu -> constants/maarifMap.ts'te gerçek anahtarlar (alan oradan çözülür). Ağırlık = göreli sıklık.
export const DEMO_GAME_POOL: { turu: string; w: number }[] = [
    { turu: 'miktar-avcisi', w: 6 }, { turu: 'onluk-cerceve', w: 4 }, { turu: 'siralama', w: 4 }, { turu: 'hafiza', w: 5 },
    { turu: 'sayi-komsulari', w: 3 }, { turu: 'golge-dedektifi', w: 3 }, { turu: 'sekil-treni', w: 3 }, { turu: 'akilli-toplama', w: 3 },
    { turu: 'akilli-siniflandir', w: 3 }, { turu: 'iz-dedektifi', w: 2 }, { turu: 'mevsim-bahcesi', w: 2 },
    { turu: 'akilli-harf', w: 4 }, { turu: 'kafiye-bahcesi', w: 3 }, { turu: 'sonra-ne-olur', w: 2 },
    { turu: 'sihirli-tuval', w: 3 }, { turu: 'yaratici-cizim', w: 2 },
    { turu: 'davul-ustasi', w: 2 }, { turu: 'muzik-durunca-don', w: 2 },
    { turu: 'minik-market', w: 2 }, { turu: 'aile-sepeti', w: 1 },
    { turu: 'duygu-yuzleri', w: 2 }, { turu: 'sakinlesme-bahcesi', w: 1 },
    { turu: 'hayvan-jimnastigi', w: 1 },
];
const POOL_TOTAL = DEMO_GAME_POOL.reduce((s, p) => s + p.w, 0);

type Profile = 'high' | 'mid' | 'low' | 'idle';
interface ClassDef { id: string; name: string; teacher: string; count: number; hidden: number; profile: Profile; minAge: number; maxAge: number }

const CLASSES: ClassDef[] = [
    { id: 'demo-c1', name: 'Papatyalar', teacher: 'Ayşe Yılmaz', count: 15, hidden: 1, profile: 'high', minAge: 60, maxAge: 72 },
    { id: 'demo-c2', name: 'Kelebekler', teacher: 'Ayşe Yılmaz', count: 14, hidden: 0, profile: 'mid', minAge: 48, maxAge: 60 },
    { id: 'demo-c3', name: 'Yıldızlar', teacher: 'Merve Demir', count: 16, hidden: 0, profile: 'high', minAge: 60, maxAge: 72 },
    { id: 'demo-c4', name: 'Arılar', teacher: 'Zeynep Kaya', count: 12, hidden: 0, profile: 'low', minAge: 36, maxAge: 48 },
    { id: 'demo-c5', name: 'Gökkuşağı', teacher: 'Zeynep Kaya', count: 14, hidden: 1, profile: 'mid', minAge: 48, maxAge: 60 },
    { id: 'demo-c6', name: 'Minik Kaşifler', teacher: 'Elif Şahin', count: 13, hidden: 0, profile: 'idle', minAge: 36, maxAge: 48 },
];

const GIRLS = ['Ada', 'Defne', 'Elif', 'Zeynep', 'Asya', 'Mina', 'Ecrin', 'Nehir', 'Azra', 'Lina', 'Ela', 'Duru', 'İpek', 'Nila', 'Sare', 'Mira', 'Ceren', 'Ayla', 'Derin', 'Güneş'];
const BOYS = ['Mert', 'Efe', 'Kerem', 'Yusuf', 'Arda', 'Emir', 'Çınar', 'Atlas', 'Deniz', 'Kuzey', 'Bora', 'Ege', 'Toprak', 'Alp', 'Mirza', 'Ozan', 'Yiğit', 'Barış', 'Can', 'Poyraz'];
const INITIALS = ['A', 'B', 'C', 'Ç', 'D', 'E', 'G', 'K', 'M', 'N', 'O', 'S', 'Ş', 'T', 'Y', 'Z'];

// Tohumlu rastgele (mulberry32) — Math.random YOK: aynı veri her açılışta aynı çıkar.
const rng = (seed: number) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash = (...n: number[]) => n.reduce((h, x) => Math.imul(h ^ (x + 0x9E3779B9), 0x85EBCA6B) >>> 0, 0x1234567);

interface DemoChild {
    id: string; classId: string; name: string | null; ageMonths: number | null; hidden: boolean;
    games: number[]; correct: number[]; errors: number[]; seconds: number[]; // [gün sapması 0 = bugün]
    types: Record<string, number>[];                                          // gün başına oyun türü sayıları
}

const profileRate = (p: Profile, r: () => number): number => {
    switch (p) {
        case 'high': return 0.5 + r() * 1.9;
        case 'mid': return 0.2 + r() * 1.2;
        case 'low': return r() < 0.7 ? 0 : 0.2 + r() * 0.5;
        default: return 0;
    }
};

const pickType = (n: number): string => {
    let x = n % POOL_TOTAL;
    for (const p of DEMO_GAME_POOL) { if (x < p.w) return p.turu; x -= p.w; }
    return DEMO_GAME_POOL[0].turu;
};

function build(now: Date): { children: DemoChild[]; todayDow: number } {
    const children: DemoChild[] = [];
    const todayDow = now.getDay();
    let idx = 0;
    for (const cls of CLASSES) {
        const r = rng(hash(cls.id.length, cls.count, cls.minAge));
        for (let i = 0; i < cls.count + cls.hidden; i++, idx++) {
            const hidden = i >= cls.count;
            const female = r() < 0.5;
            const first = (female ? GIRLS : BOYS)[Math.floor(r() * 20)];
            const name = hidden ? null : `${first} ${INITIALS[Math.floor(r() * INITIALS.length)]}.`;
            const age = Math.round(cls.minAge + r() * (cls.maxAge - cls.minAge));
            // bazı çocuklar 2+ haftadır bırakmış (pasif): dormantFrom gün öncesinden beri hiç oynamıyor (7 günlük eğilimi bozmaz)
            const dormantFrom = cls.profile !== 'idle' && r() < 0.1 ? Math.floor(15 + r() * 20) : null;
            const rate = profileRate(cls.profile, r);
            const skill = 0.55 + r() * 0.4;
            const c: DemoChild = {
                id: `demo-s${idx}`, classId: cls.id, name, ageMonths: hidden ? null : age, hidden,
                games: [], correct: [], errors: [], seconds: [], types: [],
            };
            for (let k = 0; k < HORIZON; k++) {
                const dow = (todayDow - k % 7 + 7) % 7;
                const weekend = dow === 0 || dow === 6;
                const trend = 1.5 - k * 0.012; // kurumun kullanımı zamanla artıyor (gösteride yukarı yönlü eğilim)
                const live = dormantFrom !== null && k < dormantFrom ? 0 : 1;
                const lambda = rate * (weekend ? 0.35 : 1) * trend * live;
                const h = rng(hash(idx, k, 7));
                // 0..N oyun: lambda'nın tam kısmı + olasılıkla bir tane daha
                let g = Math.floor(lambda) + (h() < lambda - Math.floor(lambda) ? 1 : 0);
                if (g > 6) g = 6;
                let cor = 0, err = 0, sec = 0;
                const t: Record<string, number> = {};
                for (let q = 0; q < g; q++) {
                    const total = 6 + Math.floor(h() * 4);
                    const ok = Math.min(total, Math.round(total * (skill + (h() - 0.5) * 0.3)));
                    cor += ok; err += total - ok; sec += 60 + Math.floor(h() * 110);
                    const turu = pickType(hash(idx, k, q, 3));
                    t[turu] = (t[turu] ?? 0) + 1;
                }
                c.games.push(g); c.correct.push(cor); c.errors.push(err); c.seconds.push(sec); c.types.push(t);
            }
            children.push(c);
        }
    }
    return { children, todayDow };
}

const sum = (xs: number[], from: number, to: number) => { let s = 0; for (let k = from; k < to; k++) s += xs[k] ?? 0; return s; };

const isoDay = (now: Date, k: number): string => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - k);
    const m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${dd}`;
};

export const DEMO_INSTITUTION_NAME = 'Minik Adımlar Anaokulları';

export function createDemoInstitution(now: Date = new Date()): { info: InstitutionInfo; source: InstitutionDataSource } {
    const { children } = build(now);
    const visible = children.filter((c) => !c.hidden);
    const hiddenCount = children.length - visible.length;
    const teachers = new Set(CLASSES.map((c) => c.teacher));

    const lastPlayed = (c: DemoChild): string | null => {
        for (let k = 0; k < HORIZON; k++) if (c.games[k] > 0) return new Date(now.getTime() - k * DAY_MS + 0).toISOString();
        return null;
    };

    const info: InstitutionInfo = {
        id: 'demo-institution', name: DEMO_INSTITUTION_NAME, expiresAt: new Date(now.getTime() + 200 * DAY_MS).toISOString(),
        teacherCount: teachers.size, classCount: CLASSES.length,
    };

    const source: InstitutionDataSource = {
        isDemo: true,
        async overview(days: PeriodDays): Promise<Overview> {
            const d = days;
            const active = (from: number, to: number) => visible.filter((c) => sum(c.games, from, to) > 0).length;
            const all = (f: (c: DemoChild) => number[], from: number, to: number) => visible.reduce((s, c) => s + sum(f(c), from, to), 0);
            return {
                teacherCount: teachers.size, classCount: CLASSES.length, childCount: visible.length, hiddenCount,
                activeChildren: active(0, d), gameCount: all((c) => c.games, 0, d), totalSeconds: all((c) => c.seconds, 0, d),
                correctTotal: all((c) => c.correct, 0, d), errorTotal: all((c) => c.errors, 0, d),
                prevActiveChildren: active(d, 2 * d), prevGameCount: all((c) => c.games, d, 2 * d),
            };
        },
        async daily(days: PeriodDays): Promise<DailyPoint[]> {
            const out: DailyPoint[] = [];
            for (let k = days - 1; k >= 0; k--) {
                out.push({
                    day: isoDay(now, k),
                    gameCount: visible.reduce((s, c) => s + c.games[k], 0),
                    activeChildren: visible.filter((c) => c.games[k] > 0).length,
                });
            }
            return out;
        },
        async gamesByType(days: PeriodDays): Promise<GameTypeRow[]> {
            const games: Record<string, number> = {};
            const kids: Record<string, Set<string>> = {};
            for (const c of visible) {
                for (let k = 0; k < days; k++) {
                    for (const [turu, n] of Object.entries(c.types[k])) {
                        games[turu] = (games[turu] ?? 0) + n;
                        (kids[turu] ??= new Set()).add(c.id);
                    }
                }
            }
            return Object.keys(games).map((turu) => ({ oyunTuru: turu, gameCount: games[turu], childCount: kids[turu].size }))
                .sort((a, b) => b.gameCount - a.gameCount);
        },
        async classes(days: PeriodDays): Promise<ClassRow[]> {
            return CLASSES.map((cls) => {
                const kids = visible.filter((c) => c.classId === cls.id);
                const last = kids.map(lastPlayed).filter((x): x is string => !!x).sort().pop() ?? null;
                return {
                    id: cls.id, name: cls.name, teacherName: cls.teacher, childCount: kids.length, hiddenCount: cls.hidden,
                    activeChildren: kids.filter((c) => sum(c.games, 0, days) > 0).length,
                    gameCount: kids.reduce((s, c) => s + sum(c.games, 0, days), 0), lastPlayedAt: last,
                };
            });
        },
        async classChildren(classId: string, days: PeriodDays): Promise<ChildRow[]> {
            return children.filter((c) => c.classId === classId).map((c) => c.hidden
                ? { id: c.id, name: null, ageMonths: null, hidden: true, gameCount: null, correctTotal: null, errorTotal: null, lastPlayedAt: null }
                : {
                    id: c.id, name: c.name, ageMonths: c.ageMonths, hidden: false,
                    gameCount: sum(c.games, 0, days), correctTotal: sum(c.correct, 0, days), errorTotal: sum(c.errors, 0, days),
                    lastPlayedAt: lastPlayed(c),
                })
                .sort((a, b) => Number(a.hidden) - Number(b.hidden) || (a.name ?? '').localeCompare(b.name ?? '', 'tr'));
        },
    };
    return { info, source };
}
