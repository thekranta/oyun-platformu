import { computeUzmanPerformans } from './teamPerformance';

describe('computeUzmanPerformans', () => {
    it('tek uzmanın birden fazla oyunu doğru sayar', () => {
        const result = computeUzmanPerformans([
            { uzman_oylamalari: { 'Ayşe': { oy: 'onay', tarih: '2026-09-01T10:00:00' } } },
            { uzman_oylamalari: { 'Ayşe': { oy: 'onay', tarih: '2026-09-02T10:00:00' } } },
            { uzman_oylamalari: { 'Ayşe': { oy: 'revize', gerekce: 'x', tarih: '2026-09-03T10:00:00' } } },
        ]);
        expect(result).toEqual([
            { uzmanAdi: 'Ayşe', toplamOy: 3, onay: 2, revize: 1, reddet: 0, sonKararTarihi: '2026-09-03T10:00:00' },
        ]);
    });

    it('birden fazla uzmanı ayrı ayrı toplar, toplamOy azalana göre sıralar', () => {
        const result = computeUzmanPerformans([
            { uzman_oylamalari: { 'Ayşe': { oy: 'onay', tarih: '2026-09-01T10:00:00' } } },
            { uzman_oylamalari: { 'Mehmet': { oy: 'reddet', tarih: '2026-09-01T10:00:00' }, 'Ayşe': { oy: 'onay', tarih: '2026-09-02T10:00:00' } } },
        ]);
        expect(result.map((r) => r.uzmanAdi)).toEqual(['Ayşe', 'Mehmet']);
        expect(result[0].toplamOy).toBe(2);
        expect(result[1].toplamOy).toBe(1);
    });

    it('en son karar tarihini doğru bulur (tarih sırasız gelse bile)', () => {
        const result = computeUzmanPerformans([
            { uzman_oylamalari: { 'Ayşe': { oy: 'onay', tarih: '2026-09-05T10:00:00' } } },
            { uzman_oylamalari: { 'Ayşe': { oy: 'onay', tarih: '2026-09-01T10:00:00' } } },
        ]);
        expect(result[0].sonKararTarihi).toBe('2026-09-05T10:00:00');
    });

    it('eski bare-string oy formatını da doğru sayar (normalizeVotes uyumu)', () => {
        const result = computeUzmanPerformans([
            { uzman_oylamalari: { 'Ayşe': 'onay' } },
            { uzman_oylamalari: { 'Ayşe': 'reddet' } },
        ]);
        expect(result[0]).toEqual({ uzmanAdi: 'Ayşe', toplamOy: 2, onay: 1, revize: 0, reddet: 1, sonKararTarihi: '' });
    });

    it('boş/null uzman_oylamalari satırını sessizce atlar', () => {
        const result = computeUzmanPerformans([
            { uzman_oylamalari: null },
            { uzman_oylamalari: {} },
            { uzman_oylamalari: { 'Ayşe': { oy: 'onay', tarih: '2026-09-01T10:00:00' } } },
        ]);
        expect(result).toHaveLength(1);
        expect(result[0].uzmanAdi).toBe('Ayşe');
    });

    it('boş satır listesinde boş dizi döner', () => {
        expect(computeUzmanPerformans([])).toEqual([]);
    });
});
