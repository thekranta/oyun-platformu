import { readFileSync } from 'fs';
import { join } from 'path';
import { EN_ALKISLAR, EN_TEMALAR, enKlipMetinleri, type EnTema } from '../constants/ingilizceKelimeler';
import {
    DINLE_DOKUN_ADAPTIF,
    GIRIS_MESAJI,
    KAZANIM_ODAGI,
    TOPLAM_TUR,
    TR_YONERGELER,
    ZORLUK_AYARLARI,
    alkisSec,
    ayarOf,
    hedefSureMs,
    turKur,
} from './enDinleDokun';
import { difficultyAfterLevel, type LevelOutcome } from './useAdaptiveDifficulty';

// Küçük tohumlu rastgele (mulberry32): testler tekrarlanabilir olsun.
const seeded = (seed: number) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const temaOf = (id: string): EnTema => {
    for (const t of Object.keys(EN_TEMALAR) as EnTema[]) if (EN_TEMALAR[t].some((k) => k.id === id)) return t;
    throw new Error('bilinmeyen kimlik ' + id);
};

describe('zorluk ayarları', () => {
    it('seçenek sayısı 2→4 ve tema sayısı 1→3 aralığında, geri dönmeden artar', () => {
        for (let z = 1; z <= 5; z++) {
            const a = ZORLUK_AYARLARI[z];
            expect(a.secenekSayisi).toBeGreaterThanOrEqual(2);
            expect(a.secenekSayisi).toBeLessThanOrEqual(4);
            expect(a.temaSayisi).toBeGreaterThanOrEqual(1);
            expect(a.temaSayisi).toBeLessThanOrEqual(3);
            if (z > 1) {
                expect(a.secenekSayisi).toBeGreaterThanOrEqual(ZORLUK_AYARLARI[z - 1].secenekSayisi);
                expect(a.temaSayisi).toBeGreaterThanOrEqual(ZORLUK_AYARLARI[z - 1].temaSayisi);
            }
        }
    });

    it('ilk seviye kolay: 2 seçenek, tek tema; motor 1. seviyeden başlar', () => {
        expect(ZORLUK_AYARLARI[1]).toEqual({ secenekSayisi: 2, temaSayisi: 1 });
        expect(DINLE_DOKUN_ADAPTIF.startDifficulty).toBe(1);
    });

    it('ayarOf: sınır dışı/geçersiz seviye 1-5 içine sıkışır', () => {
        expect(ayarOf(0)).toEqual(ZORLUK_AYARLARI[1]);
        expect(ayarOf(99)).toEqual(ZORLUK_AYARLARI[5]);
        expect(ayarOf(NaN)).toEqual(ZORLUK_AYARLARI[1]);
        expect(ayarOf(2.4)).toEqual(ZORLUK_AYARLARI[2]);
    });

    it('hedef süre seçenek sayısıyla artar', () => {
        expect(hedefSureMs(3)).toBeGreaterThan(hedefSureMs(2));
        expect(hedefSureMs(4)).toBeGreaterThan(hedefSureMs(3));
    });
});

describe('tur kurma', () => {
    it('her seviyede seçenek sayısı ayara uyar, hedef seçeneklerde tam bir kez ve hedefIndeks doğru', () => {
        const rng = seeded(11);
        for (let z = 1; z <= 5; z++) {
            for (let i = 0; i < 300; i++) {
                const t = turKur({ zorluk: z, rng });
                expect(t.secenekler).toHaveLength(ZORLUK_AYARLARI[z].secenekSayisi);
                expect(t.secenekler[t.hedefIndeks]).toBe(t.hedef);
                expect(t.secenekler.filter((k) => k.id === t.hedef.id)).toHaveLength(1);
            }
        }
    });

    it('seçeneklerde aynı sözcük (en metni) iki kez geçmez — "orange" renk/meyve çakışması dahil', () => {
        const rng = seeded(3);
        for (let z = 1; z <= 5; z++) {
            for (let i = 0; i < 1500; i++) {
                const t = turKur({ zorluk: z, rng });
                const ens = t.secenekler.map((k) => k.en);
                expect(new Set(ens).size).toBe(ens.length);
            }
        }
    });

    it('"orange" çakışması gerçekten sınanıyor: karışık turlarda orange hedef olur ve diğer orange asla yanında çıkmaz', () => {
        const rng = seeded(21);
        let orangeHedef = 0;
        let karisikOrange = 0;
        for (let i = 0; i < 6000; i++) {
            const t = turKur({ zorluk: 5, rng });
            if (t.hedef.en === 'orange') {
                orangeHedef++;
                expect(t.secenekler.filter((k) => k.en === 'orange')).toHaveLength(1);
                if (new Set(t.secenekler.map((k) => temaOf(k.id))).size > 1) karisikOrange++;
            }
        }
        expect(orangeHedef).toBeGreaterThan(50);
        expect(karisikOrange).toBeGreaterThan(20);
    });

    it('kimlikleri de farklı (orange renk ve orange-fruit aynı turda birlikte olmaz)', () => {
        const rng = seeded(5);
        for (let i = 0; i < 3000; i++) {
            const t = turKur({ zorluk: 5, rng });
            const ids = t.secenekler.map((k) => k.id);
            expect(ids.includes('orange') && ids.includes('orange-fruit')).toBe(false);
        }
    });

    it('tek temalı seviyelerde (1-2) tüm seçenekler aynı temadan', () => {
        const rng = seeded(9);
        for (const z of [1, 2]) {
            for (let i = 0; i < 300; i++) {
                const t = turKur({ zorluk: z, rng });
                expect(new Set(t.secenekler.map((k) => temaOf(k.id))).size).toBe(1);
                expect(t.temalar).toHaveLength(1);
            }
        }
    });

    it('karışık seviyelerde seçenekler tam olarak tema sayısı kadar temadan gelir', () => {
        const rng = seeded(13);
        for (const z of [3, 4, 5]) {
            for (let i = 0; i < 400; i++) {
                const t = turKur({ zorluk: z, rng });
                expect(t.temalar).toHaveLength(ZORLUK_AYARLARI[z].temaSayisi);
                const kullanilan = new Set(t.secenekler.map((k) => temaOf(k.id)));
                expect(kullanilan.size).toBe(ZORLUK_AYARLARI[z].temaSayisi);
                for (const tm of kullanilan) expect(t.temalar).toContain(tm);
            }
        }
    });

    it('hedef önceki turun sözcüğüyle aynı olmaz (oyun boyunca art arda tekrar yok)', () => {
        const rng = seeded(17);
        for (const z of [1, 3, 5]) {
            let onceki: string | undefined;
            const kullanilan = new Set<string>();
            for (let tur = 0; tur < TOPLAM_TUR * 20; tur++) {
                const t = turKur({ zorluk: z, rng, oncekiHedefEn: onceki, kullanilanEn: kullanilan });
                if (onceki !== undefined) expect(t.hedef.en).not.toBe(onceki);
                onceki = t.hedef.en;
                kullanilan.add(t.hedef.en);
            }
        }
    });

    it('bir oyunda (10 tur) hedefler birbirinden farklı', () => {
        for (let seed = 1; seed <= 100; seed++) {
            const rng = seeded(seed);
            const kullanilan = new Set<string>();
            let onceki: string | undefined;
            for (let tur = 0; tur < TOPLAM_TUR; tur++) {
                const t = turKur({ zorluk: 1 + (tur % 5), rng, oncekiHedefEn: onceki, kullanilanEn: kullanilan });
                expect(kullanilan.has(t.hedef.en)).toBe(false);
                kullanilan.add(t.hedef.en);
                onceki = t.hedef.en;
            }
        }
    });

    it('doğru cevabın konumu seçenek sayısı kadar yere eşit yakın dağılır (tek konuma yapışmaz)', () => {
        const rng = seeded(31);
        for (const z of [1, 2, 4]) {
            const n = ZORLUK_AYARLARI[z].secenekSayisi;
            const sayac = new Array(n).fill(0);
            const N = 4000;
            for (let i = 0; i < N; i++) sayac[turKur({ zorluk: z, rng }).hedefIndeks]++;
            for (const c of sayac) {
                expect(c / N).toBeGreaterThan(0.6 / n);
                expect(c / N).toBeLessThan(1.4 / n);
            }
        }
    });

    it('tohumlanabilir: aynı tohum aynı turu verir, farklı tohum farklılaşır', () => {
        const a = turKur({ zorluk: 4, rng: seeded(77) });
        const b = turKur({ zorluk: 4, rng: seeded(77) });
        expect(b.secenekler.map((k) => k.id)).toEqual(a.secenekler.map((k) => k.id));
        expect(b.hedef.id).toBe(a.hedef.id);
        const farkli = new Set<string>();
        for (let s = 1; s <= 30; s++) farkli.add(turKur({ zorluk: 4, rng: seeded(s) }).secenekler.map((k) => k.id).join('|'));
        expect(farkli.size).toBeGreaterThan(10);
    });

    it('her seçenek çizilebilir: renk için hex, diğerleri için emoji var', () => {
        const rng = seeded(41);
        for (let i = 0; i < 500; i++) {
            for (const k of turKur({ zorluk: 5, rng }).secenekler) expect(Boolean(k.hex) !== Boolean(k.emoji)).toBe(true);
        }
    });

    it('tüm kelimeler hedef olabilir (veri uyumu): sözcük dışı bir şey asla seçilmez', () => {
        const rng = seeded(51);
        const hepsi = new Set(Object.values(EN_TEMALAR).flatMap((l) => l.map((k) => k.id)));
        const gorulen = new Set<string>();
        for (let i = 0; i < 4000; i++) {
            const t = turKur({ zorluk: 5, rng });
            for (const k of t.secenekler) { expect(hepsi.has(k.id)).toBe(true); gorulen.add(k.id); }
        }
        expect(gorulen.size).toBe(hepsi.size);
    });
});

describe('olumlu geri bildirim', () => {
    it('alkisSec EN_ALKISLAR üzerinde döngüsel ilerler', () => {
        for (let i = 0; i < EN_ALKISLAR.length * 3; i++) expect(alkisSec(i)).toBe(EN_ALKISLAR[i % EN_ALKISLAR.length]);
        expect(alkisSec(-1)).toBe(EN_ALKISLAR[EN_ALKISLAR.length - 1]);
    });

    it('söylenen her İngilizce metin veri dosyasının klip listesinde (klibi olan metin)', () => {
        const klipler = new Set(enKlipMetinleri());
        for (const l of Object.values(EN_TEMALAR)) for (const k of l) expect(klipler.has(k.en)).toBe(true);
        for (let i = 0; i < EN_ALKISLAR.length; i++) expect(klipler.has(alkisSec(i))).toBe(true);
    });
});

describe('uyarlanır zorluk (motorla birlikte)', () => {
    const SEVIYE: LevelOutcome = { correct: 1, total: 1, errors: 0, timeMs: 2500, targetMs: hedefSureMs(2) };
    const CFG = {
        minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 2, raiseThreshold: 0.8, lowerThreshold: 0.55, accuracyWeight: 0.7,
    };
    const oyna = (cikti: (zorluk: number, tur: number) => LevelOutcome) => {
        let z = 1;
        const gecmis: LevelOutcome[] = [];
        const yol: number[] = [];
        for (let tur = 0; tur < TOPLAM_TUR; tur++) {
            yol.push(z);
            gecmis.push(cikti(z, tur));
            z = difficultyAfterLevel(gecmis, z, CFG).next;
        }
        return yol;
    };

    it('kusursuz ve hızlı çocuk 10 turda 4 seçeneğe ve karışık temaya ulaşır', () => {
        const yol = oyna(() => SEVIYE);
        expect(yol[0]).toBe(1);
        expect(Math.max(...yol)).toBeGreaterThanOrEqual(4);
        expect(ZORLUK_AYARLARI[Math.max(...yol)].secenekSayisi).toBe(4);
    });

    it('çok zorlanan çocuk 1. seviyede (2 seçenek, tek tema) kalır', () => {
        const yol = oyna(() => ({ correct: 1, total: 1, errors: 3, timeMs: 20000, targetMs: hedefSureMs(2) }));
        expect(Math.max(...yol)).toBe(1);
    });
});

describe('çocuğa dönük metin ve kayıt kuralları', () => {
    it('Türkçe yönergeler dışa aktarılır ve giriş mesajını içerir; Maarif kodu yok, "zorlaşır" yok', () => {
        expect(TR_YONERGELER).toContain(GIRIS_MESAJI);
        for (const m of TR_YONERGELER) expect(m).not.toMatch(/zorlaş|başardıkça|puan|hata/i);
        expect(KAZANIM_ODAGI).toMatch(/^Ek etkinlik \(Maarif dışı\): İngilizce — /);
        expect(KAZANIM_ODAGI).not.toMatch(/\b[A-ZÇ]{2,5}\.\d+/);
    });

    it('bileşen: oyun adı, kazanım etiketi ve çocuğa sayaç/yazı göstermeme kuralları', () => {
        const src = readFileSync(join(__dirname, '..', 'components', 'EnglishDinleDokun.tsx'), 'utf8');
        expect(src).toMatch(/onGameEnd\('en-dinle-dokun'/);
        expect(src).toMatch(/kazanimOdagi: KAZANIM_ODAGI/);
        expect(src).toMatch(/speak\(tur\.hedef\.en, \{ lang: 'en' \}\)/);
        // yazılı sözcük/Türkçe karşılık ekrana basılmaz
        expect(src).not.toMatch(/\.tr\}/);
        expect(src).not.toMatch(/\{k\.en\}|\{tur\.hedef\.en\}<\/Text>/);
        expect(src).not.toMatch(/zorlaş|Seviye yüksel/i);
    });
});
