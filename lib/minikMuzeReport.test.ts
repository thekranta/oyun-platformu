import { PAINTINGS } from '../constants/minikMuze';
import { buildWeeklyReport, buildWeeklyReportHTML } from '../services/weeklyReport';
import { CREDITS_INTRO, commonsPageUrl, creditLine } from './minikMuzeCredits';
import { parsePaintingIds, summarizeMuseum } from './minikMuzeReport';

describe('Minik Müze veli notu', () => {
    it('kimlikleri çözer: bilinmeyenleri atar, tekilleştirir', () => {
        expect(parsePaintingIds('mona-lisa, yildizli-gece,mona-lisa,yok-boyle')).toEqual(['mona-lisa', 'yildizli-gece']);
        expect(parsePaintingIds('')).toEqual([]);
        expect(parsePaintingIds(null)).toEqual([]);
    });

    it('yalnız minik-muze kayıtlarından tablo listesi çıkarır; yoksa null', () => {
        expect(summarizeMuseum([{ oyun_turu: 'hafiza', algilanan_kelime: 'mona-lisa' }])).toBeNull();
        expect(summarizeMuseum([{ oyun_turu: 'minik-muze', algilanan_kelime: '' }])).toBeNull();
        const s = summarizeMuseum([
            { oyun_turu: 'minik-muze', algilanan_kelime: 'mona-lisa,buyuk-dalga' },
            { oyun_turu: 'minik-muze', algilanan_kelime: 'buyuk-dalga,su-zambaklari' },
        ]);
        expect(s?.paintings.map((p) => p.id)).toEqual(['mona-lisa', 'buyuk-dalga', 'su-zambaklari']);
        expect(s?.idea).toContain('Mona Lisa');
    });

    it('haftalık rapora girer: veli raporunda bölüm var, öğretmen özetinde YOK, kayıt yoksa bölüm yok', () => {
        const now = new Date().toISOString();
        const withMuseum = buildWeeklyReport('Deniz', 54, [
            { created_at: now, oyun_turu: 'minik-muze', algilanan_kelime: 'mona-lisa,sari-kirmizi-mavi', correct_answers: 2, hata_sayisi: 0, sure: 120 },
            { created_at: now, oyun_turu: 'hafiza', correct_answers: 8, hata_sayisi: 1, sure: 60 },
        ]);
        expect(withMuseum.museum?.paintings).toHaveLength(2);
        const parent = buildWeeklyReportHTML(withMuseum, true, 'parent');
        expect(parent).toContain('Bu Hafta');
        expect(parent).toContain('Sarı, Kırmızı, Mavi');
        expect(buildWeeklyReportHTML(withMuseum, true, 'teacher')).not.toContain('Sarı, Kırmızı, Mavi');

        const without = buildWeeklyReport('Deniz', 54, [{ created_at: now, oyun_turu: 'hafiza', correct_answers: 8, hata_sayisi: 1, sure: 60 }]);
        expect(without.museum).toBeNull();
        expect(buildWeeklyReportHTML(without, true, 'parent')).not.toContain('Minik Müze');
    });
});

describe('Minik Müze künye', () => {
    it('Commons sayfa adresi kesme işareti, virgül ve boşluğu güvenle kodlar', () => {
        const u = commonsPageUrl("Georges Seurat - Un dimanche après-midi à l'île de la Grande Jatte.jpg");
        expect(u.startsWith('https://commons.wikimedia.org/wiki/File:')).toBe(true);
        expect(u).not.toContain(' ');
        expect(u).toContain('Georges_Seurat');
        expect(commonsPageUrl('Gelb-Rot-Blau, by Wassily Kandinsky.jpg')).toContain('%2C');
    });

    it('her tablonun künye satırı ressam, müze, kaynak ve lisansı içerir', () => {
        for (const p of PAINTINGS) {
            const line = creditLine(p);
            expect(line).toContain(p.artist);
            expect(line).toContain(p.credit.museum);
            expect(line).toContain('Public domain');
            expect(line).toContain('Wikimedia Commons');
        }
        expect(CREDITS_INTRO).toContain('kamu malı');
    });
});
