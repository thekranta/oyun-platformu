import { buildTeacherSummaryPrompt, SummaryGame } from './teacherSummary';

const day = 86400000;
const mk = (n: number): SummaryGame[] => Array.from({ length: n }, (_, k) => ({
    oyun_turu: ['hafiza-2', 'siralama', 'ilk-harf'][k % 3],
    created_at: new Date(Date.UTC(2026, 9, 12) - k * day).toISOString(),   // k=0 en yeni
    hamle_sayisi: 10 + k,
    hata_sayisi: k % 4,
    sure: 30 + k,
    correct_answers: 10 - (k % 4),
}));

const veri = (p: string) => JSON.parse(p.slice(p.indexOf('['), p.lastIndexOf(']') + 1)) as { ortam?: string }[];

describe('öğretmen özeti: sınıf tahtasında (öğretmen eşliğinde) oynanan oyunlar', () => {
    it('tahta satırı yoksa istem eskisi gibidir: "ortam" alanı ve ORTAM NOTU yok', () => {
        const p = buildTeacherSummaryPrompt(52, mk(6));
        expect(p).not.toContain('ORTAM NOTU');
        expect(p).not.toContain('"ortam"');
    });

    it('tahta satırı varsa yalnız o satırda "ortam" alanı, istemde ORTAM NOTU bulunur', () => {
        const games = mk(6);
        const p = buildTeacherSummaryPrompt(52, [{ ...games[0], kaynak: 'tahta' }, ...games.slice(1)]);
        expect(p).toContain('ORTAM NOTU');
        const json = veri(p);
        expect(json.filter((g) => g.ortam)).toHaveLength(1);
        expect(json[json.length - 1].ortam).toMatch(/sınıf tahtası/);   // en yeni oyun (k=0) eskiden yeniye sırada sona gelir
    });
});
