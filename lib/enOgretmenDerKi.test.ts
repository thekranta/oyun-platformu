import { EN_ALKISLAR, EN_EYLEMLER, ogretmenDerKi } from '../constants/ingilizceKelimeler';
import {
    GIRIS_MESAJI,
    KAZANIM_ODAGI,
    TOTAL_ROUNDS,
    TR_YONERGELER,
    buildResult,
    buildSequence,
    pickApplause,
    shuffle,
    unlockDelayMs,
} from './enOgretmenDerKi';

/** Tohumlu, tekrarlanabilir rastgelelik (mulberry32). */
function seeded(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe('Öğretmen Der Ki mantığı', () => {
    it('bir oyun = 6 tur ve her eylem tam bir kez', () => {
        expect(TOTAL_ROUNDS).toBe(6);
        for (let seed = 1; seed <= 50; seed++) {
            const ids = buildSequence(seeded(seed)).map((e) => e.id);
            expect(ids).toHaveLength(6);
            expect([...ids].sort()).toEqual(EN_EYLEMLER.map((e) => e.id).sort());
        }
    });

    it('aynı tohum aynı sırayı, farklı tohumlar farklı sıraları verir; girdi değişmez', () => {
        const a = buildSequence(seeded(7)).map((e) => e.id).join();
        expect(buildSequence(seeded(7)).map((e) => e.id).join()).toBe(a);
        const sets = new Set<string>();
        for (let seed = 1; seed <= 30; seed++) sets.add(buildSequence(seeded(seed)).map((e) => e.id).join());
        expect(sets.size).toBeGreaterThan(5);
        const src = [1, 2, 3, 4];
        shuffle(src, seeded(3));
        expect(src).toEqual([1, 2, 3, 4]);
    });

    it('rng uç değerlerinde (0 ve 0.999…) de geçerli permütasyon', () => {
        for (const v of [0, 0.9999999]) {
            const ids = buildSequence(() => v).map((e) => e.id);
            expect([...ids].sort()).toEqual(EN_EYLEMLER.map((e) => e.id).sort());
        }
    });

    it('her eylemin söylenecek cümlesi veri dosyasındaki ogretmenDerKi() ile aynı (klibi var)', () => {
        expect(ogretmenDerKi(EN_EYLEMLER[0])).toBe('Teacher says, clap!');
    });

    it('kilit süresi: her eylemde pozitif; hareketi azalt kısaltır ama sıfır değildir', () => {
        for (const e of EN_EYLEMLER) {
            const full = unlockDelayMs(e.id, false);
            const reduced = unlockDelayMs(e.id, true);
            expect(full).toBeGreaterThanOrEqual(3000);
            expect(reduced).toBeGreaterThan(1500);
            expect(reduced).toBeLessThanOrEqual(full);
        }
        expect(unlockDelayMs('bilinmeyen', false)).toBeGreaterThan(0);
    });

    it('olumlu ses: veri dosyasındaki cümlelerden, mümkünse öncekinden farklı', () => {
        for (let seed = 1; seed <= 40; seed++) {
            const rng = seeded(seed);
            const first = pickApplause(rng);
            expect(EN_ALKISLAR).toContain(first);
            const second = pickApplause(rng, first);
            expect(EN_ALKISLAR).toContain(second);
            expect(second).not.toBe(first);
        }
        expect(EN_ALKISLAR).toContain(pickApplause(() => 0.9999999));
    });

    it('sonuç: hata her zaman 0, correct_answers = tamamlanan tur (0-6 arasında kırpılır)', () => {
        expect(buildResult(6)).toMatchObject({ finalHata: 0, correct_answers: 6 });
        expect(buildResult(3).correct_answers).toBe(3);
        expect(buildResult(-2).correct_answers).toBe(0);
        expect(buildResult(99).correct_answers).toBe(6);
        expect(buildResult(2).finalHata).toBe(0);
    });

    it('kazanım alanı: Maarif DIŞI ek etkinlik biçimi, hiçbir Maarif kodu yok', () => {
        expect(KAZANIM_ODAGI.startsWith('Ek etkinlik (Maarif dışı): İngilizce — ')).toBe(true);
        expect(KAZANIM_ODAGI).not.toMatch(/\b[A-ZÇĞİÖŞÜ]{2,6}\.\d/);
    });

    it('Türkçe yönerge: giriş mesajı listede, "zorlaşır" / puan dili yok, İngilizce sözcük yok', () => {
        expect(TR_YONERGELER).toContain(GIRIS_MESAJI);
        for (const m of TR_YONERGELER) {
            expect(m).not.toMatch(/zorlaş|başardıkça|puan|hata|yanlış/i);
            for (const e of EN_EYLEMLER) expect(m.toLowerCase()).not.toContain(e.en);
        }
    });
});
