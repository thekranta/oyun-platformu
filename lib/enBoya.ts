import {
    EN_ALKISLAR,
    EN_BOYA_NESNELERI,
    EN_RENKLER,
    boyaGorevi,
    type EnBoyaNesnesi,
    type EnKelime,
} from '../constants/ingilizceKelimeler';

/**
 * İNGİLİZCE EK ETKİNLİK — Boya (Paint it!) mantığı (saf, test edilebilir).
 *
 * Maarif programı DIŞI ek etkinlik: Maarif kodu YOK (kazanimOdagi yalnız 'Ek etkinlik (Maarif dışı)' biçiminde).
 * Çocuğa yazı/puan/hata gösterilmez; hedef renk yalnız SESLE söylenir ("Paint the apple red."), ekranda üç renk
 * düğmesi vardır ve hedef onlardan biridir (hedefi gösterip aynısını buldurma kısayolu yok).
 */

export const EN_BOYA_OYUN_ADI = 'en-boya';
export const EN_BOYA_TUR_SAYISI = 8;
export const EN_BOYA_KAZANIM_ODAGI = 'Ek etkinlik (Maarif dışı): İngilizce — dinleyerek renk adını tanıma (Paint it!)';

/** Giriş yönergesi (CountdownOverlay mesajıyla BİREBİR aynı olmalı; testle korunur). */
export const EN_BOYA_GIRIS_MESAJI = 'Dinle ve doğru rengi seç. Resmi birlikte boyayalım!';

/** Bu oyunun söylediği TÜM Türkçe metinler (klipleri ayrıca üretilir). */
export const TR_YONERGELER: string[] = [EN_BOYA_GIRIS_MESAJI];

export type Rng = () => number;

export interface BoyaTuru {
    nesne: EnBoyaNesnesi;
    /** Sorulan renk (YALNIZ ses; ekranda ayrıca gösterilmez). */
    hedef: EnKelime;
    /** Paletteki 3 renk (hedef dahil), konumları rastgele. */
    secenekler: EnKelime[];
    /** Söylenecek görev cümlesi: "Paint the apple red." */
    gorev: string;
}

/** Tekrarlanabilir test için küçük tohumlu RNG (mulberry32). */
export function seededRng(seed: number): Rng {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function karistir<T>(liste: readonly T[], rng: Rng): T[] {
    const a = liste.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.min(i, Math.floor(rng() * (i + 1)));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function renkBul(id: string): EnKelime {
    const r = EN_RENKLER.find((x) => x.id === id);
    if (!r) throw new Error('Bilinmeyen renk: ' + id);
    return r;
}

/**
 * Bir oyunun turlarını kurar.
 *  - Aynı nesne ART ARDA gelmez; nesneler dengeli dağılır (en az kullanılan önce).
 *  - Aynı (nesne, renk) çifti, çiftler tükenmedikçe tekrarlanmaz; hedef renk de mümkünse bir önceki turdakinden farklıdır.
 *  - Her turda palet sırası rastgele (hedefin konumu da).
 */
export function buildRounds(rng: Rng = Math.random, count: number = EN_BOYA_TUR_SAYISI): BoyaTuru[] {
    const nesneler = EN_BOYA_NESNELERI;
    const nesneKullanim = new Map<string, number>();
    const ciftKullanim = new Map<string, number>();
    const turlar: BoyaTuru[] = [];
    let onceki: BoyaTuru | null = null;

    for (let i = 0; i < count; i++) {
        // 1) nesne: bir öncekinden farklı, en az kullanılanlar arasından rastgele
        const adaylar = nesneler.filter((n) => n.id !== onceki?.nesne.id);
        const enAz = Math.min(...adaylar.map((n) => nesneKullanim.get(n.id) ?? 0));
        const havuz = adaylar.filter((n) => (nesneKullanim.get(n.id) ?? 0) === enAz);
        const nesne = havuz[Math.min(havuz.length - 1, Math.floor(rng() * havuz.length))];

        // 2) hedef renk: bu nesnede en az sorulan, mümkünse bir önceki turun rengi değil
        const renkIdleri = nesne.renkler;
        const cift = (rid: string) => ciftKullanim.get(nesne.id + '/' + rid) ?? 0;
        const enAzCift = Math.min(...renkIdleri.map(cift));
        let renkHavuz = renkIdleri.filter((rid) => cift(rid) === enAzCift);
        const farkli = renkHavuz.filter((rid) => rid !== onceki?.hedef.id);
        if (farkli.length > 0) renkHavuz = farkli;
        const hedefId = renkHavuz[Math.min(renkHavuz.length - 1, Math.floor(rng() * renkHavuz.length))];
        const hedef = renkBul(hedefId);

        const tur: BoyaTuru = {
            nesne,
            hedef,
            secenekler: karistir(renkIdleri.map(renkBul), rng),
            gorev: boyaGorevi(nesne, hedef),
        };
        turlar.push(tur);
        onceki = tur;
        nesneKullanim.set(nesne.id, (nesneKullanim.get(nesne.id) ?? 0) + 1);
        ciftKullanim.set(nesne.id + '/' + hedefId, cift(hedefId) + 1);
    }
    return turlar;
}

/** Doğru cevap sonrası söylenecek olumlu cümle (veri dosyasındaki listeden). */
export function alkisSec(rng: Rng = Math.random): string {
    return EN_ALKISLAR[Math.min(EN_ALKISLAR.length - 1, Math.floor(rng() * EN_ALKISLAR.length))];
}

/** Bir renk düğmesine dokunuşun sonucu. */
export function degerlendir(tur: BoyaTuru, secilenRenkId: string): 'dogru' | 'yanlis' {
    return secilenRenkId === tur.hedef.id ? 'dogru' : 'yanlis';
}
