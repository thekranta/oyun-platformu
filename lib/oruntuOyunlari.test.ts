import { readFileSync } from 'fs';
import { join } from 'path';
import { ORUNTU_BASAMAKLARI, ORUNTU_IKILI, ORUNTU_UCLU, type OruntuAsamasi } from '../constants/oruntuOyunlari';

// Dizi `kural`ın tekrarı mı, cevap bu tekrarın DEVAMI mı? Harfler şekillere ilk görünme sırasıyla atanır.
function kuraliDogrula(p: OruntuAsamasi): string | null {
    const harf = new Map<string, string>();
    const harfOf = (s: string) => {
        if (!harf.has(s)) harf.set(s, String.fromCharCode(65 + harf.size));
        return harf.get(s)!;
    };
    const harfler = [...p.sequence, p.answer].map(harfOf);
    for (let i = 0; i < harfler.length; i++) {
        const beklenen = p.kural[i % p.kural.length];
        if (harfler[i] !== beklenen) return `${i}. konum '${harfler[i]}' ama '${p.kural}' kuralı '${beklenen}' ister`;
    }
    if (harf.size !== new Set(p.kural).size) return `farklı şekil sayısı ${harf.size}, kuralda ${new Set(p.kural).size}`;
    return null;
}

const SETLER: [string, OruntuAsamasi[]][] = [
    ['İkili Örüntü (AB)', ORUNTU_IKILI],
    ['Örüntü Basamakları (AB → ABB)', ORUNTU_BASAMAKLARI],
    ['Üçlü Örüntü (ABC)', ORUNTU_UCLU],
];

describe.each(SETLER)('%s', (_ad, set) => {
    it('5 aşamalıdır', () => {
        expect(set).toHaveLength(5);
    });

    it.each(set.map((p, i) => [i + 1, p] as const))('aşama %i kuralı tekrarlar ve cevap devamıdır', (_no, p) => {
        expect(kuraliDogrula(p)).toBeNull();
    });

    it.each(set.map((p, i) => [i + 1, p] as const))('aşama %i seçenekleri geçerlidir (cevap var, tekrar yok, en az 2)', (_no, p) => {
        expect(p.options).toContain(p.answer);
        expect(new Set(p.options).size).toBe(p.options.length);
        expect(p.options.length).toBeGreaterThanOrEqual(2);
        // Cevap dizideki tek bir doğru seçenektir; diğer seçenekler cevaba eşit olamaz (zaten tekrar yok) ve geçerli şekil olmalı.
        for (const o of p.options) expect(['kare', 'ucgen', 'daire', 'dikdortgen']).toContain(o);
    });

    it('kural dizide en az İKİ tam tekrar boyunca görünür', () => {
        for (const p of set) {
            expect(p.sequence.length).toBeGreaterThanOrEqual(p.kural.length * 2);
        }
    });
});

describe('kademeli ilerleme', () => {
    it('İkili Örüntü yalnız AB kuralı kullanır', () => {
        expect(new Set(ORUNTU_IKILI.map(p => p.kural))).toEqual(new Set(['AB']));
    });

    it('Basamaklar AB ile başlar, ABB ile devam eder ve geri dönmez', () => {
        const kurallar = ORUNTU_BASAMAKLARI.map(p => p.kural);
        expect(kurallar[0]).toBe('AB');
        expect(kurallar[kurallar.length - 1]).toBe('ABB');
        const ilkABB = kurallar.indexOf('ABB');
        expect(ilkABB).toBeGreaterThan(0);
        expect(kurallar.slice(ilkABB).every(k => k === 'ABB')).toBe(true);
    });

    it('Üçlü Örüntü yalnız ABC kuralı kullanır ve seçenek sayısı 4 olur', () => {
        expect(new Set(ORUNTU_UCLU.map(p => p.kural))).toEqual(new Set(['ABC']));
        expect(ORUNTU_UCLU.every(p => p.options.length === 4)).toBe(true);
    });

    it('İkili Örüntü: dizi uzunluğu aşamayla artar', () => {
        for (let i = 1; i < ORUNTU_IKILI.length; i++) {
            expect(ORUNTU_IKILI[i].sequence.length).toBeGreaterThan(ORUNTU_IKILI[i - 1].sequence.length);
        }
    });

    it('İkili Örüntü: seçenek sayısı aşamayla azalmaz', () => {
        for (let i = 1; i < ORUNTU_IKILI.length; i++) {
            expect(ORUNTU_IKILI[i].options.length).toBeGreaterThanOrEqual(ORUNTU_IKILI[i - 1].options.length);
        }
    });
});

// Kayıt defteri bağlantısı: her varyant KENDİ setini, kendi oyunAdi'yla alır (yanlış sabit yazılsa test kırılır).
describe('gameRegistry bağlantısı', () => {
    const kaynak = readFileSync(join(__dirname, '..', 'components', 'gameRegistry.tsx'), 'utf8').split('\r\n').join('\n');
    const blok = (anahtar: string) => {
        const bas = kaynak.indexOf(`'${anahtar}': (c) =>`);
        expect(bas).toBeGreaterThan(-1);
        const son = kaynak.indexOf('\n  ),', bas);
        return kaynak.slice(bas, son);
    };

    it.each([
        ['diziyi-tamamla-4', 'ORUNTU_IKILI'],
        ['diziyi-tamamla-5', 'ORUNTU_BASAMAKLARI'],
        ['diziyi-tamamla-6', 'ORUNTU_UCLU'],
    ])('%s -> %s', (anahtar, sabit) => {
        const b = blok(anahtar);
        expect(b).toContain(`oyunAdi="${anahtar}"`);
        expect(b).toContain(`patterns={${sabit}}`);
    });
});
