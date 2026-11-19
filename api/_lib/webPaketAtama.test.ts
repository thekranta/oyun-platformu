import { addCalendarMonths, dahaYuksekGecerliPaketVar, paketGecerli, yeniPaketHesapla } from './webPaketAtama';

const now = new Date('2026-11-19T10:00:00.000Z');
const ileri = '2027-01-10T08:00:00.000Z';
const geri = '2026-10-01T00:00:00.000Z';

describe('takvim ayı ekleme (ay sonu taşmasız)', () => {
    it('31 Ocak + 1 ay = 28 Şubat (artık olmayan yıl), 29 Şubat (artık yıl)', () => {
        expect(addCalendarMonths(new Date('2027-01-31T12:00:00Z'), 1).toISOString()).toBe('2027-02-28T12:00:00.000Z');
        expect(addCalendarMonths(new Date('2028-01-31T12:00:00Z'), 1).toISOString()).toBe('2028-02-29T12:00:00.000Z');
    });
    it('31 Ağustos + 3 ay = 30 Kasım; 31 Mart + 6 ay = 30 Eylül; yıl atlaması', () => {
        expect(addCalendarMonths(new Date('2026-08-31T00:00:00Z'), 3).toISOString()).toBe('2026-11-30T00:00:00.000Z');
        expect(addCalendarMonths(new Date('2026-03-31T00:00:00Z'), 6).toISOString()).toBe('2026-09-30T00:00:00.000Z');
        expect(addCalendarMonths(new Date('2026-11-19T10:00:00Z'), 12).toISOString()).toBe('2027-11-19T10:00:00.000Z');
        expect(addCalendarMonths(new Date('2026-12-31T23:59:59Z'), 1).toISOString()).toBe('2027-01-31T23:59:59.000Z');
    });
});

describe('paket geçerliliği', () => {
    it('free/boş geçersiz, bitiş NULL süresiz geçerli, geçmiş bitiş geçersiz', () => {
        expect(paketGecerli('free', null, now)).toBe(false);
        expect(paketGecerli(null, ileri, now)).toBe(false);
        expect(paketGecerli('filiz', null, now)).toBe(true);
        expect(paketGecerli('filiz', ileri, now)).toBe(true);
        expect(paketGecerli('filiz', geri, now)).toBe(false);
    });
});

describe('atama matrisi', () => {
    it('paket yok -> şimdiden başlar', () => {
        const r = yeniPaketHesapla(null, 'tohum', 1, now);
        expect(r).toEqual({ engel: false, kural: 'yeni', tier: 'tohum', startedAt: now.toISOString(), expiresAt: '2026-12-19T10:00:00.000Z' });
    });

    it('free -> şimdiden başlar', () => {
        const r = yeniPaketHesapla({ tier: 'free', expiresAt: null }, 'filiz', 3, now);
        expect(r).toMatchObject({ engel: false, kural: 'yeni', expiresAt: '2027-02-19T10:00:00.000Z' });
    });

    it('aynı paket hâlâ geçerli -> mevcut BİTİŞTEN uzatılır, başlangıç korunur', () => {
        const r = yeniPaketHesapla({ tier: 'filiz', startedAt: '2026-10-10T08:00:00.000Z', expiresAt: ileri }, 'filiz', 3, now);
        expect(r).toEqual({ engel: false, kural: 'uzatma', tier: 'filiz', startedAt: '2026-10-10T08:00:00.000Z', expiresAt: '2027-04-10T08:00:00.000Z' });
    });

    it('aynı paket geçerli, bitiş ay sonunda -> uzatma ay sonunu taşırmaz', () => {
        const r = yeniPaketHesapla({ tier: 'tohum', expiresAt: '2027-01-31T09:00:00.000Z' }, 'tohum', 1, now);
        expect(r).toMatchObject({ kural: 'uzatma', expiresAt: '2027-02-28T09:00:00.000Z' });
    });

    it('aynı paket süresi dolmuş -> şimdiden başlar (geçmiş bitişten uzatılmaz)', () => {
        const r = yeniPaketHesapla({ tier: 'fidan', expiresAt: geri }, 'fidan', 6, now);
        expect(r).toMatchObject({ kural: 'yeni', startedAt: now.toISOString(), expiresAt: '2027-05-19T10:00:00.000Z' });
    });

    it('aynı paket süresiz -> süresiz korunur (kısaltılmaz)', () => {
        const r = yeniPaketHesapla({ tier: 'orman', expiresAt: null }, 'orman', 12, now);
        expect(r).toMatchObject({ engel: false, kural: 'suresiz_korundu', expiresAt: null });
    });

    it('daha yüksek paket -> şimdiden başlar, eski kalan süre yok sayılır', () => {
        const r = yeniPaketHesapla({ tier: 'tohum', expiresAt: ileri }, 'orman', 12, now);
        expect(r).toEqual({ engel: false, kural: 'yukseltme', tier: 'orman', startedAt: now.toISOString(), expiresAt: '2027-11-19T10:00:00.000Z' });
    });

    it('geçerli daha yüksek paket varken daha düşük paket -> engel (paket düşürülmez)', () => {
        expect(yeniPaketHesapla({ tier: 'fidan', expiresAt: ileri }, 'tohum', 1, now)).toEqual({ engel: true, neden: 'daha_yuksek_paket_var' });
        expect(yeniPaketHesapla({ tier: 'orman', expiresAt: null }, 'filiz', 3, now)).toEqual({ engel: true, neden: 'daha_yuksek_paket_var' });
        expect(dahaYuksekGecerliPaketVar({ tier: 'fidan', expiresAt: ileri }, 'tohum', now)).toBe(true);
    });

    it('süresi dolmuş daha yüksek paket -> düşük paket şimdiden başlar', () => {
        const r = yeniPaketHesapla({ tier: 'orman', expiresAt: geri }, 'tohum', 1, now);
        expect(r).toMatchObject({ engel: false, kural: 'yeni', tier: 'tohum' });
        expect(dahaYuksekGecerliPaketVar({ tier: 'orman', expiresAt: geri }, 'tohum', now)).toBe(false);
    });

    it('geçersiz süre reddedilir', () => {
        expect(() => yeniPaketHesapla(null, 'tohum', 0, now)).toThrow('gecersiz_sure');
        expect(() => yeniPaketHesapla(null, 'tohum', 1.5, now)).toThrow('gecersiz_sure');
    });
});
