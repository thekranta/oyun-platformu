/**
 * DİNLE VE DOKUN (İngilizce ek etkinlik, dinleme) — saf mantık (ekran/ses yok; test: lib/enDinleDokun.test.ts).
 *
 * Her tur: ses bir İNGİLİZCE sözcük söyler ("apple"); çocuk ekrandaki 2-4 resimden doğrusuna dokunur. Hedef resim ÖNCEDEN
 * GÖSTERİLMEZ (yalnız ses; "göster ve aynısını bul" kısayoldur). Yazılı sözcük gösterilmez, çocuğun söylemesi puanlanmaz.
 *
 * Zorluk UYARLANIR (lib/useAdaptiveDifficulty): seviye 1-5 → seçenek sayısı 2→3→4 ve tema karışımı 1→2→3 tema.
 * Aynı SÖZCÜK (en metni) bir turda iki kez geçmez: "orange" hem renk hem meyvedir, karışık turda ikisi birden çıkarsa
 * ses ikisine de uyar → mantık hatası (tur kurucu bunu eler). Art arda iki tur aynı sözcüğü hedeflemez.
 */
import { EN_ALKISLAR, EN_TEMALAR, type EnKelime, type EnTema } from '../constants/ingilizceKelimeler';
import type { AdaptiveOptions } from './useAdaptiveDifficulty';

/** Rastgelelik kaynağı (testte sabit tohumla). 0 <= r < 1. */
export type Rng = () => number;

/** Bir oyundaki tur sayısı (8-10 aralığı; her 2 turda bir uyarlama → 4 değerlendirme). */
export const TOPLAM_TUR = 10;

/** Çocuğa söylenen Türkçe giriş yönergesi (ses klibi `ttsSlug` ile aranır; scripts bunu TR_YONERGELER'den okur). */
export const GIRIS_MESAJI = 'Kulağını aç! Duyduğun şeyin resmine dokun.';

/** Bu oyunun söylediği TÜM Türkçe metinler (klip üretimi için). */
export const TR_YONERGELER: string[] = [GIRIS_MESAJI];

/** `onGameEnd` kazanım alanı: Maarif DIŞI ek etkinlik (kod yok). */
export const KAZANIM_ODAGI = 'Ek etkinlik (Maarif dışı): İngilizce — dinleyerek sözcük-resim eşleştirme (renkler, hayvanlar, meyveler)';

/** Uyarlanır zorluk motoru ayarı: 1. seviyeden başlar (ilk turlar kolay), her 2 turda bir değerlendirir. */
export const DINLE_DOKUN_ADAPTIF: AdaptiveOptions = {
    minDifficulty: 1,
    maxDifficulty: 5,
    startDifficulty: 1,
    checkpointEvery: 2,
    lowerThreshold: 0.55,
};

export interface ZorlukAyari {
    /** Ekrandaki resim sayısı. */
    secenekSayisi: 2 | 3 | 4;
    /** Turdaki seçeneklerin geldiği tema sayısı (1 = tek tema, 3 = hepsi karışık). */
    temaSayisi: 1 | 2 | 3;
}

/** Zorluk seviyesi (1-5) → tur ayarı. Seçenek sayısı ve tema karışımı geri dönmeden artar. */
export const ZORLUK_AYARLARI: Readonly<Record<number, ZorlukAyari>> = {
    1: { secenekSayisi: 2, temaSayisi: 1 },
    2: { secenekSayisi: 3, temaSayisi: 1 },
    3: { secenekSayisi: 3, temaSayisi: 2 },
    4: { secenekSayisi: 4, temaSayisi: 2 },
    5: { secenekSayisi: 4, temaSayisi: 3 },
};

/** Seviyeyi 1-5'e sıkıştırıp ayarını döner (geçersiz giriş en kolay seviyeye düşer). */
export function ayarOf(zorluk: number): ZorlukAyari {
    const z = Number.isFinite(zorluk) ? Math.min(5, Math.max(1, Math.round(zorluk))) : 1;
    return ZORLUK_AYARLARI[z];
}

/** Hız değerlendirmesi için beklenen süre (ms): seçenek sayısıyla artar (dinleme süresi dahil, cömert). */
export function hedefSureMs(secenekSayisi: number): number {
    return 3500 + 1000 * secenekSayisi;
}

/** Fisher-Yates karıştırma (girdiyi değiştirmez). */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.min(i, Math.floor(rng() * (i + 1)));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const pick = <T,>(items: readonly T[], rng: Rng): T => items[Math.min(items.length - 1, Math.floor(rng() * items.length))];

/** Doğru cevap sonrası olumlu ses: EN_ALKISLAR'dan DÖNGÜSEL (i. doğru cevap → i % uzunluk). */
export function alkisSec(i: number): string {
    const n = EN_ALKISLAR.length;
    return EN_ALKISLAR[((Math.floor(i) % n) + n) % n];
}

export interface DinleDokunTuru {
    /** Söylenen (ve dokunulması gereken) sözcük. */
    hedef: EnKelime;
    /** Ekrandaki resimler (hedef dahil, karışık sırada; aynı `en` metni iki kez yok). */
    secenekler: EnKelime[];
    /** Hedefin `secenekler` içindeki konumu. */
    hedefIndeks: number;
    /** Turda kullanılan temalar (en az bir seçenek her temadan gelir). */
    temalar: EnTema[];
}

export interface TurGirdisi {
    /** Zorluk seviyesi (1-5; useAdaptiveDifficulty.recordLevel'ın döndürdüğü). */
    zorluk: number;
    rng?: Rng;
    /** Bir önceki turun hedefinin `en` metni: art arda aynı sözcük gelmez. */
    oncekiHedefEn?: string;
    /** Bu oyunda daha önce hedef olmuş sözcüklerin `en` metinleri: mümkün olduğunca tekrar edilmez. */
    kullanilanEn?: Iterable<string>;
}

/**
 * Bir tur kurar. Garantiler:
 *  - `secenekler.length` = ayarın seçenek sayısı; hepsinin `en` metni FARKLI (orange renk/meyve çakışması dahil);
 *  - hedef `oncekiHedefEn`'e eşit değil; mümkünse `kullanilanEn` içinde de değil;
 *  - `temaSayisi` kadar farklı temadan, her temadan en az bir seçenek (tek temada hepsi o temadan).
 */
export function turKur(girdi: TurGirdisi): DinleDokunTuru {
    const rng = girdi.rng ?? Math.random;
    const ayar = ayarOf(girdi.zorluk);
    const tumTemalar = Object.keys(EN_TEMALAR) as EnTema[];
    const kullanilan = new Set<string>(girdi.kullanilanEn ?? []);
    const taze = (t: EnTema) => EN_TEMALAR[t].filter((k) => k.en !== girdi.oncekiHedefEn && !kullanilan.has(k.en));
    // Temalar rastgele seçilir; ama oyunda hiç hedef olmamış sözcüğü kalan temalar öne alınır (tek temalı turlarda
    // 8 sözcüklük tema tükenip aynı sözcük tekrar çıkmasın).
    const karisik = shuffle(tumTemalar, rng);
    const temalar = [...karisik.filter((t) => taze(t).length > 0), ...karisik.filter((t) => taze(t).length === 0)].slice(0, ayar.temaSayisi);

    // Hedef: seçilen temaların birleşiminden; önceki tur hariç, mümkünse oyunda hiç hedef olmamış sözcük.
    const tazeAdaylar = temalar.flatMap((t) => taze(t).map((k) => ({ k, t })));
    const tumAdaylar = temalar.flatMap((t) => EN_TEMALAR[t].filter((x) => x.en !== girdi.oncekiHedefEn).map((k) => ({ k, t })));
    const secim = pick(tazeAdaylar.length > 0 ? tazeAdaylar : tumAdaylar, rng);
    const hedef = secim.k;
    const hedefTema = secim.t;

    const secilenEn = new Set<string>([hedef.en]);
    const secilen: EnKelime[] = [hedef];
    const ekle = (k: EnKelime): boolean => {
        if (secilenEn.has(k.en)) return false;
        secilenEn.add(k.en);
        secilen.push(k);
        return true;
    };

    // Karışık turda: hedef dışındaki her temadan bir seçenek (tema karışımı gerçekten görünsün).
    for (const t of temalar) {
        if (t === hedefTema) continue;
        const uygun = EN_TEMALAR[t].filter((k) => !secilenEn.has(k.en));
        if (uygun.length > 0) ekle(pick(uygun, rng));
    }
    // Kalanı seçilen temaların birleşiminden doldur.
    const havuz = shuffle(
        temalar.flatMap((t) => EN_TEMALAR[t]).filter((k) => !secilenEn.has(k.en)),
        rng,
    );
    for (const k of havuz) {
        if (secilen.length >= ayar.secenekSayisi) break;
        ekle(k);
    }

    const secenekler = shuffle(secilen, rng);
    return { hedef, secenekler, hedefIndeks: secenekler.indexOf(hedef), temalar };
}
