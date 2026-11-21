import { EN_HAYVANLAR, enKlipMetinleri } from '../constants/ingilizceKelimeler';
import {
    bellekHatasiMi,
    bittiMi,
    ciftMi,
    ciftSec,
    CIFT_SAYISI,
    emojiAdi,
    hayvanHavuzu,
    izgaraDuzeni,
    karistir,
    kartlariKur,
    KAZANIM_ODAGI,
    yeniOyun,
} from './enKonusanCiftler';
import * as fs from 'fs';
import * as path from 'path';

// Küçük tohumlu rastgele (mulberry32): testler tekrarlanabilir olsun.
const seeded = (seed: number) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('Konuşan Çiftler: deste', () => {
    it('6 çift = 12 kart; her çiftten tam iki kart, kimlikler benzersiz', () => {
        for (let s = 1; s <= 40; s++) {
            const d = yeniOyun(seeded(s));
            expect(d).toHaveLength(CIFT_SAYISI * 2);
            expect(new Set(d.map((k) => k.id)).size).toBe(d.length);
            const sayim = new Map<string, number>();
            for (const k of d) sayim.set(k.pairId, (sayim.get(k.pairId) ?? 0) + 1);
            expect(sayim.size).toBe(CIFT_SAYISI);
            for (const v of sayim.values()) expect(v).toBe(2);
        }
    });

    it('çiftler farklı hayvanlardır ve hepsi EN_HAYVANLAR verisinden gelir (söylenen metin klibi olan metindir)', () => {
        const klipler = new Set(enKlipMetinleri());
        for (let s = 1; s <= 40; s++) {
            const d = yeniOyun(seeded(s));
            for (const k of d) {
                const h = EN_HAYVANLAR.find((x) => x.id === k.pairId);
                expect(h).toBeDefined();
                expect(k.en).toBe(h!.en);
                expect(k.emoji).toBe(h!.emoji);
                expect(klipler.has(k.en)).toBe(true);
            }
        }
    });

    it('kart sırası karışık (farklı tohumlar farklı dizilim) ve karistir girdiyi bozmaz', () => {
        const girdi = [1, 2, 3, 4, 5, 6, 7, 8];
        const kopya = girdi.slice();
        const a = karistir(girdi, seeded(1));
        expect(girdi).toEqual(kopya);
        expect([...a].sort()).toEqual(kopya);
        const diziler = new Set<string>();
        for (let s = 1; s <= 20; s++) diziler.add(yeniOyun(seeded(s)).map((k) => k.id).join(','));
        expect(diziler.size).toBeGreaterThan(10);
    });

    it('ciftSec en fazla havuz kadar, tekrarsız hayvan döner', () => {
        const havuz = hayvanHavuzu();
        expect(ciftSec(100, seeded(3))).toHaveLength(havuz.length);
        const sec = ciftSec(6, seeded(4));
        expect(new Set(sec.map((h) => h.id)).size).toBe(6);
    });

    it('havuzdaki her hayvanın emojisi var', () => {
        expect(hayvanHavuzu().length).toBeGreaterThanOrEqual(CIFT_SAYISI);
        for (const h of hayvanHavuzu()) expect(h.emoji).toBeTruthy();
    });
});

describe('Konuşan Çiftler: emoji → ad eşlemesi', () => {
    it('her hayvanın emojisi kendi İngilizce adına döner; bilinmeyen emoji null', () => {
        for (const h of EN_HAYVANLAR) expect(emojiAdi(h.emoji as string)).toBe(h.en);
        expect(emojiAdi('🚗')).toBeNull();
    });
});

describe('Konuşan Çiftler: eşleşme', () => {
    const deste = kartlariKur(EN_HAYVANLAR.slice(0, 6), seeded(9));
    const ikiKart = (pairId: string) => deste.filter((k) => k.pairId === pairId);

    it('aynı çiftin iki kartı eşleşir; aynı kart kendisiyle ya da başka çiftle eşleşmez', () => {
        const [a, b] = ikiKart('cat');
        const [c] = ikiKart('dog');
        expect(ciftMi(a, b)).toBe(true);
        expect(ciftMi(a, a)).toBe(false);
        expect(ciftMi(a, c)).toBe(false);
    });

    it('bellek hatası yalnız daha önce görülmüş bir kart varsa sayılır', () => {
        const [a] = ikiKart('cat');
        const [c] = ikiKart('dog');
        expect(bellekHatasiMi(a, c, new Set())).toBe(false);
        expect(bellekHatasiMi(a, c, new Set([a.id]))).toBe(true);
        expect(bellekHatasiMi(a, c, new Set([c.id]))).toBe(true);
    });

    it('bittiMi: tüm çiftler bulununca true', () => {
        const hepsi = new Set(deste.map((k) => k.pairId));
        expect(bittiMi(deste, hepsi)).toBe(true);
        const eksik = new Set(hepsi);
        eksik.delete('cat');
        expect(bittiMi(deste, eksik)).toBe(false);
        expect(bittiMi([], new Set())).toBe(false);
    });
});

describe('Konuşan Çiftler: ızgara düzeni (taşma yok)', () => {
    const KUTULAR: [string, number, number][] = [
        ['360x640 telefon (üst çubuk sonrası)', 336, 480],
        ['320x568 küçük telefon', 296, 420],
        ['yatay telefon 640x360', 616, 290],
        ['tablet', 700, 800],
        ['masaüstü web', 800, 600],
    ];

    it.each(KUTULAR)('%s: 12 kart alana sığar, dokunma hedefi >= 64', (_ad, w, h) => {
        const d = izgaraDuzeni(w, h, 12, 10);
        expect(d.cols * d.rows).toBeGreaterThanOrEqual(12);
        expect(d.cols * d.size + 10 * (d.cols - 1)).toBeLessThanOrEqual(w);
        expect(d.rows * d.size + 10 * (d.rows - 1)).toBeLessThanOrEqual(h);
        expect(d.size).toBeGreaterThanOrEqual(64);
        expect(d.size).toBeLessThanOrEqual(120);
    });

    it('ölçüm gelmeden (0x0) boyut 0: çizilmez', () => {
        expect(izgaraDuzeni(0, 0, 12, 10).size).toBe(0);
    });
});

describe('Konuşan Çiftler: Maarif dışı ve çocuğa yazı yok', () => {
    it('kazanımOdağı "Ek etkinlik (Maarif dışı): İngilizce — " ile başlar ve Maarif kodu içermez', () => {
        expect(KAZANIM_ODAGI.startsWith('Ek etkinlik (Maarif dışı): İngilizce — ')).toBe(true);
        expect(KAZANIM_ODAGI).not.toMatch(/\b[A-Z]{2,5}\.\d/);
    });

    const bilesen = fs.readFileSync(path.resolve(__dirname, '..', 'components', 'EnglishKonusanCiftler.tsx'), 'utf8');

    it('bileşen yalnız veri dosyasındaki İngilizce metinleri söyler (sabit İngilizce dize yok)', () => {
        const enCagrilari = [...bilesen.matchAll(/speak(?:ThenWait)?\(([^)]*lang:\s*'en'[^)]*)\)/g)].map((m) => m[1]);
        expect(enCagrilari.length).toBeGreaterThanOrEqual(3);
        for (const c of enCagrilari) expect(c).not.toMatch(/^\s*['"`]/); // ilk argüman dize değişmezi değil
    });

    it('TR_YONERGELER dışa aktarılır ve giriş mesajı "zorlaşır" demez', () => {
        expect(bilesen).toMatch(/export const TR_YONERGELER: string\[\] = \[GIRIS_MESAJI\];/);
        const m = bilesen.match(/const GIRIS_MESAJI = '([^']*)'/);
        expect(m).not.toBeNull();
        expect(m![1]).not.toMatch(/zorla|başardıkça|Maarif|puan/i);
    });

    it('çocuğa dönük JSX metni/sayaç yok (Puan/Hata/Doğru etiketi)', () => {
        expect(bilesen).not.toMatch(/>\s*(Hata|Puan|Skor|Doğru)\b/);
    });

    it('bitişte tebrik konuşması unmount temizliğinde yalnız bitmemişse kesilir', () => {
        expect(bilesen).toMatch(/if \(!finishedRef\.current\) stopSpeech\(\);/);
    });
});
