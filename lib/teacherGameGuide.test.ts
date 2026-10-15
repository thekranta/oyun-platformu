import { GAME_CATALOG } from '../constants/gameCatalog';
import { MAARIF_CIKTILAR_2026 } from '../constants/maarifCurriculum2026';
import { MAARIF_MAP } from '../constants/maarifMap';
import { ALAN_ORDER, alanSummary, buildClassGuide, buildGuide, classAlanSummary, countPlays, filterGuide, guideAlanlar, missingCount, stripOfficial, UNTRACKED_GAMES } from './teacherGameGuide';

describe('öğretmen oyun rehberi: her oyun listede', () => {
    it('katalogdaki HER oyunun geçerli bir Maarif kaydı var (yeni oyun eklerken maarifMap unutulmasın)', () => {
        const eksik = GAME_CATALOG.filter(g => {
            const e = MAARIF_MAP[g.id] ?? MAARIF_MAP[g.routeKey];
            return !e || !MAARIF_CIKTILAR_2026[e.cikti];
        }).map(g => g.id);
        expect(eksik).toEqual([]);
    });

    it('her katalog oyunu rehberde tam bir kez geçer ve adı boş değildir', () => {
        const guide = buildGuide();
        const ids = guide.flatMap(c => c.games.map(g => g.id));
        expect(new Set(ids).size).toBe(ids.length);
        expect([...ids].sort()).toEqual(GAME_CATALOG.map(g => g.id).sort());
        for (const c of guide) for (const g of c.games) expect(g.name.trim()).not.toBe('');
    });

    it('kazanımlar alan sırasına ve doğal kod sırasına göre dizilir (MAB.2, MAB.10\'dan önce)', () => {
        const guide = buildGuide();
        const rank = (a: string) => { const i = ALAN_ORDER.indexOf(a); return i === -1 ? 99 : i; };
        for (let i = 1; i < guide.length; i++) expect(rank(guide[i].alan)).toBeGreaterThanOrEqual(rank(guide[i - 1].alan));
        const mab = guide.filter(c => c.key.startsWith('MAB.')).map(c => parseInt(c.key.split('.')[1], 10));
        expect(mab).toEqual([...mab].sort((a, b) => a - b));
    });

    it('resmi metin Maarif belgesinden gelir; resmi olmayan (SDB) kodda kod gösterilmez', () => {
        const guide = buildGuide();
        const mab4 = guide.find(c => c.key === 'MAB.4')!;
        expect(mab4.code).toBe('MAB.4');
        expect(mab4.text).toBe('Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme');
        const sdb = guide.find(c => c.key.startsWith('SDB.'))!;
        expect(sdb.code).toBeNull();
        expect(sdb.alan).toBe('Sosyal-Duygusal');
    });

    it('paket etiketi: Müzik Kutusu Fidan, Akıllı oyunlar Filiz, ücretsiz oyun free', () => {
        const all = buildGuide().flatMap(c => c.games);
        expect(all.find(g => g.id === 'muzik-calar')?.tier).toBe('fidan');
        expect(all.find(g => g.id === 'akilli-sayi-avi')?.tier).toBe('filiz');
        expect(all.find(g => g.id === 'yapboz')?.tier).toBe('free');
    });
});

describe('oyun açıklaması resmi metni tekrar etmez', () => {
    it('stripOfficial yalnız oyuna özgü kısmı bırakır', () => {
        const off = 'Sayıları farklı durumlarda doğru kullanabilme';
        expect(stripOfficial(off + '; nicelikleri karşılaştırır (çok/az)', off)).toBe('Nicelikleri karşılaştırır (çok/az)');
        expect(stripOfficial(off + ' (nesne sayısını söyler)', off)).toBe('(nesne sayısını söyler)');
        expect(stripOfficial(off, off)).toBe('');
        expect(stripOfficial('Başka bir açıklama', off)).toBe('Başka bir açıklama');
        expect(stripOfficial('x', undefined)).toBe('x');
    });

    it('rehberde hiçbir oyun açıklaması resmi metinle başlamaz', () => {
        for (const c of buildGuide()) for (const g of c.games) expect({ id: g.id, basliyor: g.detail.startsWith(c.text) }).toEqual({ id: g.id, basliyor: false });
    });
});

describe('oynanma sayımı ve eksik kazanımlar', () => {
    it('skor adı kimlik, "kimlik - ek" ya da görünen adla eşleşir; hafiza-2 hafiza\'ya sayılmaz', () => {
        const c = countPlays([
            { oyun_turu: 'hafiza-2' }, { oyun_turu: 'hafiza-2' }, { oyun_turu: 'hafiza' },
            { oyun_turu: 'Yapboz - Karpuz' }, { oyun_turu: 'yapboz' },
            { oyun_turu: 'Davul Ustası' }, { oyun_turu: 'bilinmeyen-oyun' }, { oyun_turu: '' }, { oyun_turu: null },
        ]);
        expect(c['hafiza-2']).toBe(2);
        expect(c['hafiza']).toBe(1);
        expect(c['yapboz']).toBe(2);
        expect(c['davul-ustasi']).toBe(1);
        expect(Object.keys(c)).not.toContain('bilinmeyen-oyun');
    });

    it('öğrenci verisi yoksa eksik/oynanma bilgisi null', () => {
        for (const c of buildGuide()) {
            expect(c.missing).toBeNull();
            expect(c.playedGames).toBeNull();
            for (const g of c.games) expect(g.plays).toBeNull();
        }
    });

    it('hiç oynamayan çocukta izlenebilir oyunu olan her kazanım eksik; oynadıkça düşer', () => {
        const none = buildGuide({});
        const trackedCodes = none.filter(c => c.games.some(g => !UNTRACKED_GAMES.has(g.id)));
        expect(trackedCodes.every(c => c.missing === true)).toBe(true);
        const yapbozCode = MAARIF_MAP['yapboz'].cikti;
        const some = buildGuide({ yapboz: 3 });
        const c = some.find(x => x.key === yapbozCode)!;
        expect(c.missing).toBe(false);
        expect(c.playedGames).toBe(1);
        expect(c.games.find(g => g.id === 'yapboz')?.plays).toBe(3);
        expect(missingCount(some)).toBe(missingCount(none) - 1);
    });

    it('skor kaydı tutulmayan oyunlar (Müzik Kutusu) tek başına "eksik" yaptırmaz', () => {
        const code = MAARIF_MAP['muzik-calar'].cikti;
        const c = buildGuide({}).find(x => x.key === code)!;
        const tracked = c.games.filter(g => !UNTRACKED_GAMES.has(g.id));
        if (tracked.length === 0) expect(c.missing).toBeNull();
        expect(c.games.find(g => g.id === 'muzik-calar')?.plays).toBeNull();
    });
});

describe('arama ve süzgeç', () => {
    const guide = buildGuide({});

    it('kod, oyun adı (Türkçe karakter duyarsız büyük/küçük) ve Maarif metniyle aranır', () => {
        expect(filterGuide(guide, { query: 'mab.4' }).some(c => c.key === 'MAB.4')).toBe(true);
        expect(filterGuide(guide, { query: 'DAVUL' }).some(c => c.games.some(g => g.id === 'davul-ustasi'))).toBe(true);
        expect(filterGuide(guide, { query: 'karşılaştırma' }).length).toBeGreaterThan(0);
        expect(filterGuide(guide, { query: 'zzzyokboyleoyun' })).toEqual([]);
    });

    it('alan ve yalnız-eksikler süzgeci', () => {
        const mat = filterGuide(guide, { alan: 'Matematik' });
        expect(mat.length).toBeGreaterThan(0);
        expect(mat.every(c => c.alan === 'Matematik')).toBe(true);
        expect(filterGuide(guide, { onlyMissing: true }).every(c => c.missing === true)).toBe(true);
        expect(filterGuide(buildGuide(), { onlyMissing: true })).toEqual([]);   // öğrenci yokken eksik kavramı yok
        expect(guideAlanlar(guide)).toEqual(ALAN_ORDER.filter(a => guide.some(c => c.alan === a)));
    });
});

describe('alan özeti (grafik verisi)', () => {
    it('öğrenci yokken kazanım ve oyun sayıları; toplamlar rehberle tutarlı', () => {
        const guide = buildGuide();
        const sum = alanSummary(guide);
        expect(sum.map(s => s.alan)).toEqual(guideAlanlar(guide));
        expect(sum.reduce((n, s) => n + s.kod, 0)).toBe(guide.length);
        expect(sum.reduce((n, s) => n + s.oyun, 0)).toBe(GAME_CATALOG.length);
        for (const s of sum) { expect(s.izlenebilir).toBeNull(); expect(s.oynanan).toBeNull(); expect(s.eksik).toBeNull(); }
    });

    it('öğrenci varken oynanan + eksik = izlenebilir; oynadıkça kapsama artar', () => {
        const none = alanSummary(buildGuide({}));
        for (const s of none) {
            expect(s.oynanan).toBe(0);
            expect((s.oynanan ?? 0) + (s.eksik ?? 0)).toBe(s.izlenebilir);
        }
        const mat = (list: ReturnType<typeof alanSummary>) => list.find(s => s.alan === 'Matematik')!;
        const played = alanSummary(buildGuide({ hafiza: 2, siralama: 1 }));
        expect(mat(played).oynanan!).toBeGreaterThan(0);
        expect(mat(played).eksik!).toBeLessThan(mat(none).eksik!);
        expect((mat(played).oynanan ?? 0) + (mat(played).eksik ?? 0)).toBe(mat(played).izlenebilir);
    });
});

describe('sınıf görünümü', () => {
    const yapbozCode = MAARIF_MAP['yapboz'].cikti;
    const hafizaCode = MAARIF_MAP['hafiza-2'].cikti;
    const kids: Record<string, number>[] = [{ yapboz: 3 }, { yapboz: 1, 'hafiza-2': 2 }, {}, {}];

    it('kazanımda kaç çocuğun oynadığı sayılır; kimse oynamadıysa eksik', () => {
        const g = buildClassGuide(kids);
        const y = g.find(c => c.key === yapbozCode)!;
        expect(y.classSize).toBe(4);
        expect(y.classPlayedBy).toBeGreaterThanOrEqual(2);
        expect(y.missing).toBe(false);
        expect(y.games.find(x => x.id === 'yapboz')).toMatchObject({ plays: 4, classPlayedBy: 2 });
        const h = g.find(c => c.key === hafizaCode)!;
        expect(h.games.find(x => x.id === 'hafiza-2')).toMatchObject({ plays: 2, classPlayedBy: 1 });
        // kimsenin oynamadığı bir kazanım
        const nobody = g.filter(c => c.classPlayedBy === 0);
        expect(nobody.length).toBeGreaterThan(0);
        expect(nobody.every(c => c.missing === true)).toBe(true);
    });

    it('boş sınıf: eksik/ortalama hesaplanmaz, çökmez', () => {
        const g = buildClassGuide([]);
        expect(g.every(c => c.missing === null)).toBe(true);
        const s = classAlanSummary([]);
        expect(s.every(x => x.ortKapsama === null)).toBe(true);
    });

    it('alan özeti: ortalama kapsama 0..1, oynanan + eksik = izlenebilir, çok oynayan sınıfta ortalama artar', () => {
        const none = classAlanSummary([{}, {}]);
        for (const s of none) { expect(s.ortKapsama).toBe(0); expect((s.oynanan ?? 0) + (s.eksik ?? 0)).toBe(s.izlenebilir); }
        const some = classAlanSummary(kids);
        const mat = (l: ReturnType<typeof classAlanSummary>) => l.find(x => x.alan === 'Matematik')!;
        expect(mat(some).ortKapsama!).toBeGreaterThan(0);
        expect(mat(some).ortKapsama!).toBeLessThanOrEqual(1);
        expect(mat(some).oynanan!).toBeGreaterThan(mat(none).oynanan!);
    });

    it('süzgeç: yalnız-eksikler sınıfta kimsenin oynamadığı kazanımları getirir', () => {
        const g = buildClassGuide(kids);
        const only = filterGuide(g, { onlyMissing: true });
        expect(only.length).toBe(missingCount(g));
        expect(only.every(c => c.classPlayedBy === 0)).toBe(true);
    });
});
