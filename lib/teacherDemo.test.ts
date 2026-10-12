import { DEMO_CLASSES, demoPreview, demoRoster, demoScores, demoSummary, demoTotalGames } from './teacherDemo';

describe('öğretmen satış demosu verisi tutarlılığı', () => {
    it('her sınıfın öğrenci listesi, sınıf kartındaki çocuk sayısına eşittir', () => {
        for (const c of DEMO_CLASSES) expect({ sinif: c.name, n: demoRoster(c.id).length }).toEqual({ sinif: c.name, n: c.size });
        expect(demoRoster('yok')).toEqual([]);
    });

    it('öğrenciler benzersiz ad ve kimliğe sahip; e-postalar yalnız ASCII (örnek alan adı)', () => {
        const all = DEMO_CLASSES.flatMap((c) => demoRoster(c.id));
        expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
        expect(new Set(all.map((s) => s.child_name)).size).toBe(all.length);
        for (const s of all) expect(s.email).toMatch(/^[a-z.]+@ornek\.com$/);
    });

    it('her öğrencinin "🎮 N" sayısı geçmiş kayıt sayısına eşit (en çok 20), en yeni başta, hata dağılımı grafiği çıkar (≥3 kayıt)', () => {
        for (const c of DEMO_CLASSES) {
            for (const s of demoRoster(c.id)) {
                const scores = demoScores(s, Date.UTC(2026, 9, 12));
                expect(scores.length).toBe(Math.min(s.gameCount, 20));
                expect(scores.length).toBeGreaterThanOrEqual(3);
                const times = scores.map((x) => new Date(x.created_at).getTime());
                expect([...times].sort((a, b) => b - a)).toEqual(times);
                expect(new Set(scores.map((x) => x.id)).size).toBe(scores.length);
            }
        }
    });

    it('oyun türleri çeşitli; hata sayıları öğrenciler arasında farklılaşır', () => {
        const all = DEMO_CLASSES.flatMap((c) => demoRoster(c.id));
        const games = new Set(all.flatMap((s) => demoScores(s).map((x) => x.oyun_turu)));
        expect(games.size).toBeGreaterThanOrEqual(5);
        const avgErr = all.map((s) => { const sc = demoScores(s); return sc.reduce((a, b) => a + b.hata_sayisi, 0) / sc.length; });
        expect(Math.max(...avgErr) - Math.min(...avgErr)).toBeGreaterThan(0.5);
    });

    it('toplam oyun sayısı öğrencilerin oyun sayıları toplamıdır; demo ekle önizlemesi ağsız ve e-postayı korur', () => {
        const sum = DEMO_CLASSES.flatMap((c) => demoRoster(c.id)).reduce((a, s) => a + s.gameCount, 0);
        expect(demoTotalGames()).toBe(sum);
        expect(demoPreview('  veli@ornek.com ').email).toBe('veli@ornek.com');
        expect(demoPreview('x@y.com').child_name).toBeTruthy();
    });

    it('demo gelişim özeti öğrencinin kendi geçmişinden hesaplanır: 4 başlık, öğrenciler arasında farklı, adı içermez', () => {
        const roster = DEMO_CLASSES.flatMap((c) => demoRoster(c.id));
        const texts = roster.map((s) => demoSummary(demoScores(s)));
        for (const [i, t] of texts.entries()) {
            expect(t).toContain('Genel görünüm:');
            expect(t).toContain('Güçlü yönler:');
            expect(t).toContain('Desteklenecek alanlar:');
            expect(t).toContain('Sınıfta öneriler:');
            expect(t).not.toMatch(/undefined|NaN|\[object/);
            expect(t).not.toContain(roster[i].child_name.split(' ')[0] + ' ');
        }
        expect(new Set(texts).size).toBeGreaterThan(5);
    });
});
