import { MAARIF_MAP } from '../constants/maarifMap';
import { DEMO_GAME_POOL, createDemoInstitution } from './institutionDemo';
import {
    accuracy, ageParts, buildAttention, childHealth, classHealth, groupByArea, num, parseChild, parseClass, parseDaily,
    parseOverview, percent, recencyOf, splitDuration, trendOf,
} from './institutionStats';

const NOW = new Date(2026, 9, 10, 12, 0, 0); // 10 Ekim 2026, öğle

describe('institutionStats yardımcıları', () => {
    it('num: string bigint, null ve saçma değerleri güvenle çevirir', () => {
        expect(num('42')).toBe(42);
        expect(num(7)).toBe(7);
        expect(num(null)).toBe(0);
        expect(num(undefined)).toBe(0);
        expect(num('abc')).toBe(0);
    });

    it('percent / accuracy / trendOf', () => {
        expect(percent(1, 3)).toBe(33);
        expect(percent(5, 0)).toBe(0);
        expect(accuracy(8, 2)).toBe(80);
        expect(accuracy(0, 0)).toBeNull();
        expect(accuracy(null, null)).toBeNull();
        expect(trendOf(120, 100)).toEqual({ direction: 'up', value: 20 });
        expect(trendOf(80, 100)).toEqual({ direction: 'down', value: 20 });
        expect(trendOf(100, 100)).toEqual({ direction: 'flat', value: 0 });
        expect(trendOf(50, 0)).toEqual({ direction: 'none', value: 0 }); // önceki dönem yok → karşılaştırma yok
    });

    it('splitDuration / ageParts', () => {
        expect(splitDuration(8130)).toEqual({ hours: 2, minutes: 16 });
        expect(splitDuration(59)).toEqual({ hours: 0, minutes: 1 });
        expect(splitDuration(-5)).toEqual({ hours: 0, minutes: 0 });
        expect(ageParts(50)).toEqual({ years: 4, months: 2 });
        expect(ageParts(null)).toBeNull();
    });

    it('recencyOf: bugün / gün önce / hiç', () => {
        expect(recencyOf(null, NOW)).toEqual({ kind: 'never' });
        expect(recencyOf('geçersiz', NOW)).toEqual({ kind: 'never' });
        expect(recencyOf(new Date(2026, 9, 10, 8, 0, 0).toISOString(), NOW)).toEqual({ kind: 'today' });
        expect(recencyOf(new Date(2026, 9, 7, 23, 0, 0).toISOString(), NOW)).toEqual({ kind: 'days', days: 3 });
    });

    it('classHealth ve childHealth', () => {
        expect(classHealth({ childCount: 0, activeChildren: 0 })).toBe('empty');
        expect(classHealth({ childCount: 10, activeChildren: 0 })).toBe('idle');
        expect(classHealth({ childCount: 10, activeChildren: 3 })).toBe('low');
        expect(classHealth({ childCount: 10, activeChildren: 5 })).toBe('good');
        const d = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
        expect(childHealth({ gameCount: 4, lastPlayedAt: d(0), hidden: false }, NOW)).toBe('good');
        expect(childHealth({ gameCount: 0, lastPlayedAt: d(9), hidden: false }, NOW)).toBe('low');
        expect(childHealth({ gameCount: 0, lastPlayedAt: d(20), hidden: false }, NOW)).toBe('idle');
        expect(childHealth({ gameCount: 0, lastPlayedAt: null, hidden: false }, NOW)).toBe('idle');
        expect(childHealth({ gameCount: null, lastPlayedAt: null, hidden: true }, NOW)).toBe('empty');
    });

    it('groupByArea: oyun türleri Maarif alanına toplanır, çoktan aza sıralanır', () => {
        const r = groupByArea([
            { oyunTuru: 'miktar-avcisi', gameCount: 6, childCount: 3 },
            { oyunTuru: 'hafiza', gameCount: 2, childCount: 2 },
            { oyunTuru: 'davul-ustasi', gameCount: 2, childCount: 1 },
        ]);
        const total = r.reduce((s, x) => s + x.gameCount, 0);
        expect(total).toBe(10);
        expect(r[0].gameCount).toBeGreaterThanOrEqual(r[r.length - 1].gameCount);
        expect(r.some((x) => x.alan === 'Müzik')).toBe(true);
        expect(groupByArea([])).toEqual([]);
    });

    it('buildAttention: pasif sınıf, düşük sınıf, pasif çocuk, kardeşli hesap, paket bitişi', () => {
        const classes = [
            { id: 'a', name: 'A', teacherName: 'T1', childCount: 10, hiddenCount: 0, activeChildren: 0, gameCount: 0, lastPlayedAt: null },
            { id: 'b', name: 'B', teacherName: 'T2', childCount: 10, hiddenCount: 0, activeChildren: 2, gameCount: 5, lastPlayedAt: null },
            { id: 'c', name: 'C', teacherName: 'T3', childCount: 10, hiddenCount: 0, activeChildren: 9, gameCount: 50, lastPlayedAt: null },
        ];
        const overview = parseOverview({ child_count: '30', active_children: '11', hidden_count: '2' });
        const soon = new Date(NOW.getTime() + 10 * 86400000).toISOString();
        const kinds = buildAttention({ expiresAt: soon }, overview, classes, NOW).map((i) => i.kind);
        expect(kinds).toEqual(['idleClass', 'lowClass', 'passiveChildren', 'hiddenChildren', 'packageExpiring']);
        // paket uzakta, sorun yok → boş
        const far = new Date(NOW.getTime() + 200 * 86400000).toISOString();
        expect(buildAttention({ expiresAt: far }, parseOverview({ child_count: 5, active_children: 5 }), [classes[2]], NOW)).toEqual([]);
        expect(buildAttention({ expiresAt: null }, null, [], NOW)).toEqual([]);
    });

    it('RPC satırı ayrıştırıcıları: bigint string, NULL ve kardeşli hesap', () => {
        const o = parseOverview({ child_count: '12', game_count: '340', total_seconds: '9000', prev_game_count: '300' });
        expect(o.childCount).toBe(12);
        expect(o.gameCount).toBe(340);
        expect(o.prevGameCount).toBe(300);
        expect(o.hiddenCount).toBe(0);
        expect(parseDaily({ day: '2026-10-10T00:00:00', game_count: '4', active_children: 2 })).toEqual({ day: '2026-10-10', gameCount: 4, activeChildren: 2 });
        const c = parseChild({ student_id: 'x', child_name: null, hidden: true, game_count: null, last_played_at: null });
        expect(c.hidden).toBe(true);
        expect(c.name).toBeNull();
        expect(c.gameCount).toBeNull();
        const k = parseClass({ class_id: 'k', class_name: 'Papatyalar', teacher_name: null, child_count: '3' });
        expect(k.teacherName).toBeNull();
        expect(k.childCount).toBe(3);
    });
});

describe('demo kurum verisi (satış gösterisi)', () => {
    it('kullanılan her oyun türü maarifMap\'te vardır (alan çözülebilir)', () => {
        const missing = DEMO_GAME_POOL.filter((p) => !MAARIF_MAP[p.turu]).map((p) => p.turu);
        expect(missing).toEqual([]);
    });

    it.each([7, 30] as const)('%i günlük görünümde tüm toplamlar birbiriyle TUTARLI', async (days) => {
        const { info, source } = createDemoInstitution(NOW);
        const [ov, daily, types, classes] = await Promise.all([source.overview(days), source.daily(days), source.gamesByType(days), source.classes(days)]);
        expect(ov).not.toBeNull();
        expect(daily).toHaveLength(days);
        expect(daily.reduce((s, d) => s + d.gameCount, 0)).toBe(ov!.gameCount);
        expect(types.reduce((s, t) => s + t.gameCount, 0)).toBe(ov!.gameCount);
        expect(classes.reduce((s, c) => s + c.gameCount, 0)).toBe(ov!.gameCount);
        expect(classes.reduce((s, c) => s + c.childCount, 0)).toBe(ov!.childCount);
        expect(classes.reduce((s, c) => s + c.activeChildren, 0)).toBe(ov!.activeChildren);
        expect(classes.reduce((s, c) => s + c.hiddenCount, 0)).toBe(ov!.hiddenCount);
        expect(ov!.classCount).toBe(classes.length);
        expect(info.classCount).toBe(classes.length);
        expect(ov!.activeChildren).toBeLessThanOrEqual(ov!.childCount);
        // sınıf çocukları sınıf özetiyle uyumlu
        for (const c of classes) {
            const kids = await source.classChildren(c.id, days);
            const visible = kids.filter((k) => !k.hidden);
            expect(visible).toHaveLength(c.childCount);
            expect(kids.filter((k) => k.hidden)).toHaveLength(c.hiddenCount);
            expect(visible.filter((k) => (k.gameCount ?? 0) > 0)).toHaveLength(c.activeChildren);
            expect(visible.reduce((s, k) => s + (k.gameCount ?? 0), 0)).toBe(c.gameCount);
            for (const k of kids.filter((x) => x.hidden)) {
                expect(k.name).toBeNull();
                expect(k.gameCount).toBeNull();
            }
        }
    });

    it('gösteri anlatısı: etkin sınıflar + pasif sınıf + düşük sınıf + kardeşli hesap + makul sayılar', async () => {
        const { source } = createDemoInstitution(NOW);
        const classes = await source.classes(7);
        const ov = (await source.overview(7))!;
        const health = classes.map(classHealth);
        expect(health).toContain('good');
        expect(health).toContain('idle');
        expect(health).toContain('low');
        expect(ov.hiddenCount).toBe(2);
        expect(ov.childCount).toBe(84);
        expect(ov.gameCount).toBeGreaterThan(150);
        expect(percent(ov.activeChildren, ov.childCount)).toBeGreaterThan(30);
        expect(percent(ov.activeChildren, ov.childCount)).toBeLessThan(95);
        const acc = accuracy(ov.correctTotal, ov.errorTotal)!;
        expect(acc).toBeGreaterThan(55);
        expect(acc).toBeLessThan(95);
        const area = groupByArea(await source.gamesByType(30));
        expect(area.length).toBeGreaterThanOrEqual(6); // alanların çoğu görünsün
        expect(area[0].alan).toBe('Matematik');
    });

    it('deterministik: aynı gün için iki üretim aynı veriyi verir', async () => {
        const a = createDemoInstitution(NOW), b = createDemoInstitution(NOW);
        expect(await a.source.overview(30)).toEqual(await b.source.overview(30));
        expect(await a.source.classes(7)).toEqual(await b.source.classes(7));
    });

    it('çocuk adları yalnız ad + soyad baş harfi; e-posta/aile bilgisi yok', async () => {
        const { source } = createDemoInstitution(NOW);
        for (const c of await source.classes(7)) {
            for (const k of await source.classChildren(c.id, 7)) {
                if (k.hidden) continue;
                expect(k.name).toMatch(/^\S+ \S\.$/);
                expect(JSON.stringify(k)).not.toMatch(/@/);
            }
        }
    });
});
