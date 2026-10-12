import { buildTeacherSummaryPrompt, developmentalPeriod, gameStats, selectSummaryGames, SUMMARY_GAME_LIMIT, SummaryGame } from './teacherSummary';

const day = 86400000;
const mk = (n: number): SummaryGame[] => Array.from({ length: n }, (_, k) => ({
    oyun_turu: ['hafiza-2', 'siralama', 'ilk-harf'][k % 3],
    created_at: new Date(Date.UTC(2026, 9, 12) - k * day).toISOString(),   // k=0 en yeni
    hamle_sayisi: 10 + k,
    hata_sayisi: k % 4,
    sure: 30 + k,
    correct_answers: 10 - (k % 4),
}));

describe('öğretmen gelişim özeti istemi', () => {
    it('pencere son 12 oyundur (en yeni başta gelen listeden)', () => {
        expect(selectSummaryGames(mk(20))).toHaveLength(SUMMARY_GAME_LIMIT);
        expect(selectSummaryGames(mk(5))).toHaveLength(5);
    });

    it('istem eskiden yeniye sıralar ve yalnız son 12 oyunu içerir', () => {
        const p = buildTeacherSummaryPrompt(52, mk(20));
        const json = JSON.parse(p.slice(p.indexOf('['), p.lastIndexOf(']') + 1));
        expect(json).toHaveLength(12);
        expect(json[0].sira).toBe(1);
        // sıra 1 = pencerenin EN ESKİ oyunu (k=11), sıra 12 = EN YENİ (k=0): hamle = 10 + k
        expect(json[0].hamle_sayisi).toBe(21);
        expect(json[11].hamle_sayisi).toBe(10);
        expect(new Date(json[0].tarih.split('.').reverse().join('-')).getTime()).toBeLessThan(new Date(json[11].tarih.split('.').reverse().join('-')).getTime());
    });

    it('çocuğun adı istemde YOK (gizlilik); yaş ve dönem var; veli bölümü yasaklanır; kodlar veriden gelir', () => {
        const p = buildTeacherSummaryPrompt(52, mk(6));
        expect(p).not.toMatch(/Ahmet|Ayşe|isim:/i);
        expect(p).toContain('52 aylık');
        expect(p).toContain('Okul Öncesi Geç Dönem');
        expect(p).toMatch(/Veli bölümü.*YAZMA/);
        expect(p).toMatch(/Başka kod UYDURMA/);
        const codes = Array.from(new Set((p.match(/"maarif_cikti": "([A-Z]+\.\d)"/g) || []).map((x) => x.replace(/.*: "|"/g, ''))));
        expect(codes.length).toBeGreaterThan(0);
    });

    it('yaş bilinmiyorsa istem bozulmaz', () => {
        expect(buildTeacherSummaryPrompt(null, mk(4))).toContain('yaşı bilinmiyor');
        expect(developmentalPeriod(70)).toContain('Okula Hazırlık');
        expect(developmentalPeriod(30)).toContain('Erken Çocukluk');
    });

    it('oyun başına istatistik: ortalama hata artan sırada', () => {
        const s = gameStats(mk(12));
        expect(s.length).toBe(3);
        expect(s[0].avgErrors).toBeLessThanOrEqual(s[1].avgErrors);
        expect(s[1].avgErrors).toBeLessThanOrEqual(s[2].avgErrors);
    });
});
