import { PAINTINGS } from '../constants/minikMuze';
import { HUNTS, HUNT_DONE, HUNT_HELP, HUNT_INTRO, HUNT_WRONG, allHuntTexts, getHunt } from '../constants/minikMuzeHunt';
import { HUNT_SLACK, MIN_TAP_RADIUS_PX, hintLevel, hitTest, nearestSpot, nextTargetIndex } from './minikMuzeHunt';

const target = { spots: [{ x: 0.5, y: 0.5, r: 0.1 }, { x: 0.1, y: 0.9, r: 0.05 }] };

describe('Detay Avı dokunuş mantığı', () => {
    it('merkez ve yarıçap içindeki dokunuş doğru; uzak dokunuş yanlış', () => {
        expect(hitTest(target, 500, 250, 1000, 500)).toBe(true);                 // tam merkez
        expect(hitTest(target, 500 + 100, 250, 1000, 500)).toBe(true);           // r = 100 px içinde
        expect(hitTest(target, 500 + 100 * HUNT_SLACK - 1, 250, 1000, 500)).toBe(true);   // parmak payı içinde
        expect(hitTest(target, 500 + 100 * HUNT_SLACK + 5, 250, 1000, 500)).toBe(false);
        expect(hitTest(target, 50, 50, 1000, 500)).toBe(false);
    });

    it('birden çok alan: herhangi biri doğru sayılır', () => {
        expect(hitTest(target, 100, 450, 1000, 500)).toBe(true);                 // ikinci alan
    });

    it('küçük ekranda çok küçük hedef de en az parmak yarıçapı kadar dokunulabilir', () => {
        const tiny = { spots: [{ x: 0.5, y: 0.5, r: 0.001 }] };
        expect(hitTest(tiny, 150 + MIN_TAP_RADIUS_PX - 1, 100, 300, 200)).toBe(true);
        expect(hitTest(tiny, 150 + MIN_TAP_RADIUS_PX + 3, 100, 300, 200)).toBe(false);
    });

    it('geçersiz boyutta çökmez ve doğru saymaz', () => {
        expect(hitTest(target, 10, 10, 0, 0)).toBe(false);
        expect(hitTest({ spots: [] }, 10, 10, 100, 100)).toBe(false);
    });

    it('ipucu halkası dokunuşa en yakın alanı seçer', () => {
        expect(nearestSpot(target, 120, 440, 1000, 500)).toEqual(target.spots[1]);
        expect(nearestSpot(target, 600, 200, 1000, 500)).toEqual(target.spots[0]);
    });

    it('ipucu düzeyi ve sıradaki hedef', () => {
        expect([0, 1, 2, 3, 9].map(hintLevel)).toEqual([0, 1, 2, 2, 2]);
        expect(nextTargetIndex(0, 3)).toBe(1);
        expect(nextTargetIndex(2, 3)).toBeNull();
    });
});

describe('Detay Avı verisi', () => {
    const ids = Object.keys(HUNTS);

    it('yalnız var olan tablolar için tanımlı ve her tabloda 3 hedef var', () => {
        for (const id of ids) {
            expect({ id, tablo: !!PAINTINGS.find((p) => p.id === id) }).toEqual({ id, tablo: true });
            expect({ id, n: HUNTS[id].length }).toEqual({ id, n: 3 });
        }
        expect(getHunt('yok')).toBeUndefined();
    });

    it('tüm tabloların (ücretsiz, Tohum ve Fidan) hepsinde av var', () => {
        for (const p of PAINTINGS) expect({ id: p.id, var: ids.includes(p.id) }).toEqual({ id: p.id, var: true });
    });

    it('hedef alanları görselin içinde ve makul büyüklükte', () => {
        for (const id of ids) for (const t of HUNTS[id]) {
            expect(t.spots.length).toBeGreaterThan(0);
            for (const s of t.spots) {
                expect({ id, t: t.id, ok: s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1 }).toEqual({ id, t: t.id, ok: true });
                expect(s.r).toBeGreaterThanOrEqual(0.03);
                expect(s.r).toBeLessThanOrEqual(0.2);
            }
        }
    });

    it('konuşma metinleri kısa, rakamsız ve tekil (her biri bir klip)', () => {
        const all = allHuntTexts();
        expect(new Set(all).size).toBe(all.length);
        expect(all).toEqual(expect.arrayContaining([HUNT_INTRO, HUNT_WRONG, HUNT_HELP, HUNT_DONE]));
        for (const t of all) {
            expect(t.length).toBeLessThanOrEqual(110);
            expect({ t, digit: /\d/.test(t) }).toEqual({ t, digit: false });
        }
        // sorular "bul" ile biter ya da "bul!" içerir; çocuğa net bir görev verir
        for (const id of ids) for (const t of HUNTS[id]) expect(t.prompt).toMatch(/bul/);
    });
});
