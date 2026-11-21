import { readFileSync } from 'fs';
import { join } from 'path';
import { EN_ALKISLAR, EN_SAYILAR, enKlipMetinleri } from '../constants/ingilizceKelimeler';
import {
    GIRIS_MESAJI,
    KAZANIM_ODAGI,
    MAX_COUNT,
    NESNE_EMOJILERI,
    OPTION_COUNT,
    RANGE_BY_ROUND,
    TOTAL_ROUNDS,
    TR_YONERGELER,
    buildGame,
    buildOptions,
    pickAlkis,
    rangeOf,
    sayiSozcugu,
    tapObject,
} from './enSayalim';

// Deterministik rastgele (mulberry32) — testler tekrarlanabilir olsun.
const seeded = (seed: number) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('Sayalım: tur planı', () => {
    it('6-8 tur; tur sayısı sabiti ve aralık tablosu uyumlu', () => {
        expect(TOTAL_ROUNDS).toBeGreaterThanOrEqual(6);
        expect(TOTAL_ROUNDS).toBeLessThanOrEqual(8);
        expect(RANGE_BY_ROUND).toHaveLength(TOTAL_ROUNDS);
    });

    it('ilk turlar 1-5, son turlar 6-10 aralığında; aralık dışına çıkmaz', () => {
        for (let seed = 1; seed <= 200; seed++) {
            const game = buildGame(seeded(seed));
            expect(game).toHaveLength(TOTAL_ROUNDS);
            game.forEach((r, i) => {
                const [lo, hi] = rangeOf(i + 1);
                expect(r.n).toBeGreaterThanOrEqual(lo);
                expect(r.n).toBeLessThanOrEqual(hi);
                expect(r.n).toBeGreaterThanOrEqual(1);
                expect(r.n).toBeLessThanOrEqual(MAX_COUNT);
            });
            expect(game[0].n).toBeLessThanOrEqual(5);
            expect(game[1].n).toBeLessThanOrEqual(5);
            expect(game[TOTAL_ROUNDS - 1].n).toBeGreaterThanOrEqual(6);
            expect(game[TOTAL_ROUNDS - 2].n).toBeGreaterThanOrEqual(6);
        }
    });

    it('aynı sayı ya da aynı nesne art arda gelmez (1000 rastgele oyun)', () => {
        for (let seed = 1; seed <= 1000; seed++) {
            const game = buildGame(seeded(seed));
            for (let i = 1; i < game.length; i++) {
                expect(game[i].n).not.toBe(game[i - 1].n);
                expect(game[i].emoji).not.toBe(game[i - 1].emoji);
            }
        }
    });

    it('nesne emojileri tek kaynaktaki hayvan/meyve emojileridir', () => {
        expect(NESNE_EMOJILERI.length).toBeGreaterThanOrEqual(10);
        for (const r of buildGame(seeded(7))) expect(NESNE_EMOJILERI).toContain(r.emoji);
    });
});

describe('Sayalım: rakam kartları', () => {
    it('her n için üç FARKLI rakam, doğru dahil, 1-10 içinde', () => {
        for (let n = 1; n <= MAX_COUNT; n++) {
            for (let seed = 1; seed <= 50; seed++) {
                const opts = buildOptions(n, seeded(seed * 31 + n));
                expect(opts).toHaveLength(OPTION_COUNT);
                expect(new Set(opts).size).toBe(OPTION_COUNT);
                expect(opts).toContain(n);
                for (const o of opts) {
                    expect(o).toBeGreaterThanOrEqual(1);
                    expect(o).toBeLessThanOrEqual(MAX_COUNT);
                }
            }
        }
    });

    it('çeldiriciler hedefe yakındır (en çok 2 fark)', () => {
        for (let n = 1; n <= MAX_COUNT; n++) {
            for (const o of buildOptions(n, seeded(n))) expect(Math.abs(o - n)).toBeLessThanOrEqual(2);
        }
    });

    it('oyun planındaki her turun seçeneklerinde doğru sayı var', () => {
        for (const r of buildGame(seeded(99))) expect(r.options).toContain(r.n);
    });
});

describe('Sayalım: sayma kilidi', () => {
    it('her yeni nesne sıradaki sayıyı alır (1, 2, 3...) ve son nesnede tamamlanır', () => {
        let assigned = [0, 0, 0, 0];
        const order = [2, 0, 3, 1];
        order.forEach((idx, k) => {
            const res = tapObject(assigned, idx);
            expect(res.newNumber).toBe(k + 1);
            expect(res.completed).toBe(k === order.length - 1);
            assigned = res.assigned;
        });
        expect(assigned).toEqual([2, 4, 1, 3]);
    });

    it('aynı nesneye ikinci dokunuş sayıyı artırmaz', () => {
        const first = tapObject([0, 0, 0], 1);
        expect(first.newNumber).toBe(1);
        const again = tapObject(first.assigned, 1);
        expect(again.newNumber).toBeNull();
        expect(again.completed).toBe(false);
        expect(again.assigned).toEqual([0, 1, 0]);
        // sonraki yeni nesne 2 alır (1 tekrarlanmaz, atlanmaz)
        expect(tapObject(again.assigned, 0).newNumber).toBe(2);
    });

    it('girdi dizisini değiştirmez; geçersiz indeks yok sayılır', () => {
        const base = [0, 0];
        tapObject(base, 0);
        expect(base).toEqual([0, 0]);
        expect(tapObject(base, 5).newNumber).toBeNull();
        expect(tapObject(base, -1).newNumber).toBeNull();
        expect(tapObject(base, 0.5).newNumber).toBeNull();
    });

    it('tek nesneli turda ilk dokunuş turu tamamlar', () => {
        const res = tapObject([0], 0);
        expect(res.newNumber).toBe(1);
        expect(res.completed).toBe(true);
    });
});

describe('Sayalım: İngilizce metinler yalnız ortak veriden', () => {
    const klipler = new Set(enKlipMetinleri());

    it('1-10 için sayı adı veri dosyasındaki klip metniyle birebir', () => {
        for (let n = 1; n <= MAX_COUNT; n++) {
            const w = sayiSozcugu(n);
            expect(w).not.toBeNull();
            expect(klipler.has(w as string)).toBe(true);
            expect(EN_SAYILAR.find((k) => k.rakam === n)?.en).toBe(w);
        }
        expect(sayiSozcugu(0)).toBeNull();
        expect(sayiSozcugu(11)).toBeNull();
    });

    it('alkışlar EN_ALKISLAR içinden; art arda aynısı gelmez', () => {
        for (const a of EN_ALKISLAR) {
            for (let s = 1; s <= 20; s++) {
                const next = pickAlkis(a, seeded(s));
                expect(EN_ALKISLAR).toContain(next);
                expect(next).not.toBe(a);
            }
        }
        expect(EN_ALKISLAR).toContain(pickAlkis(null, seeded(3)));
    });

    it('bileşen yalnız veri dosyasındaki soru cümlesini kullanır, kendi İngilizce metnini yazmaz', () => {
        const src = readFileSync(join(__dirname, '..', 'components', 'EnglishSayalim.tsx'), 'utf8');
        expect(src).toContain('EN_SAYALIM_SORU');
        // speak(...) çağrıları yalnız değişken/sabit alır; tırnaklı İngilizce sabit metin yok.
        expect(src).not.toMatch(/speak(?:ThenWait)?\(\s*['"`]/);
    });
});

describe('Sayalım: kural uyumu', () => {
    it('kazanimOdagi Maarif kodu içermez ve "Ek etkinlik (Maarif dışı): İngilizce — " ile başlar', () => {
        expect(KAZANIM_ODAGI.startsWith('Ek etkinlik (Maarif dışı): İngilizce — ')).toBe(true);
        expect(KAZANIM_ODAGI).not.toMatch(/\b[A-ZÇĞİÖŞÜ]{2,6}\.\d/);
    });

    it('TR_YONERGELER giriş mesajını içerir; zorluk cümlesi yok', () => {
        expect(TR_YONERGELER).toContain(GIRIS_MESAJI);
        for (const t of TR_YONERGELER) expect(t).not.toMatch(/zorlaş|başardıkça/i);
    });

    it('bileşen onGameEnd oyun adını en-sayalim verir ve ekrana puan/hata basmaz', () => {
        const src = readFileSync(join(__dirname, '..', 'components', 'EnglishSayalim.tsx'), 'utf8');
        expect(src).toMatch(/onGameEnd\('en-sayalim'/);
        expect(src).not.toMatch(/>\s*(Hata|Puan|Skor|Doğru)\s*:?\s*(<|\{)/);
    });
});
