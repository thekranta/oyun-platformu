// Minik Müze "Detay Avı" verisi. Hedefler (spots) tablo görsellerine bakılarak yerleştirildi; x/y görselin sol-üstüne göre
// 0..1, r görselin genişliğine oranla yarıçaptır (bkz. lib/minikMuzeHunt.ts). Her yönerge ve "bulundu" metni için VoiceBox
// klibi üretilir (slug = metin; bkz. allMuseumTexts). Metinler 3-6 yaş için KISA ve rakamsızdır.
import type { HuntTarget } from '../lib/minikMuzeHunt';

export const HUNT_INTRO = 'Detay Avı başlıyor! Tabloya dikkatle bak ve söylediğim şeyi bul.';
export const HUNT_WRONG = 'Hımm, burada değil. Bir daha bak!';
export const HUNT_HELP = 'Sana yardım edeyim. Parlayan yerin yakınına bak!';
export const HUNT_DONE = 'Aferin! Bütün ayrıntıları buldun. Harika bir dedektifsin!';

export const HUNTS: Record<string, HuntTarget[]> = {
    'mona-lisa': [
        { id: 'gulumseme', prompt: "Mona Lisa'nın gülümsemesini bul! Hadi dokun.", found: 'İşte gülümseme! Çok hafif ama çok ünlü.', spots: [{ x: 0.46, y: 0.3, r: 0.07 }] },
        { id: 'eller', prompt: "Şimdi Mona Lisa'nın ellerini bul!", found: 'Evet, eller! Birbirinin üstüne nazikçe duruyor.', spots: [{ x: 0.42, y: 0.83, r: 0.14 }] },
        { id: 'yol', prompt: 'Arkadaki kıvrımlı yolu bul!', found: 'Buldun! Yol uzaklara doğru kıvrılıp gidiyor.', spots: [{ x: 0.14, y: 0.53, r: 0.13 }] },
    ],
    'yildizli-gece': [
        { id: 'ay', prompt: 'Parlak sarı ayı bul!', found: 'Aferin! Ay, sarı bir hilal gibi parlıyor.', spots: [{ x: 0.906, y: 0.19, r: 0.09 }] },
        {
            id: 'yildiz',
            prompt: 'Gökyüzünde bir yıldız bul!',
            found: 'İşte bir yıldız! Hepsi ışıl ışıl dönüyor.',
            spots: [
                { x: 0.104, y: 0.046, r: 0.045 }, { x: 0.229, y: 0.03, r: 0.04 }, { x: 0.344, y: 0.036, r: 0.04 }, { x: 0.41, y: 0.06, r: 0.04 },
                { x: 0.607, y: 0.082, r: 0.045 }, { x: 0.237, y: 0.174, r: 0.045 }, { x: 0.698, y: 0.23, r: 0.045 }, { x: 0.325, y: 0.326, r: 0.04 },
                { x: 0.047, y: 0.454, r: 0.035 }, { x: 0.13, y: 0.48, r: 0.04 }, { x: 0.36, y: 0.51, r: 0.06 },
            ],
        },
        { id: 'kule', prompt: 'Köydeki uzun kilise kulesini bul!', found: 'Evet, kule! Köy uyurken gökyüzü dans ediyor.', spots: [{ x: 0.568, y: 0.757, r: 0.06 }] },
    ],
    'buyuk-dalga': [
        { id: 'fuji', prompt: "Karlı Fuji Dağı'nı bul!", found: 'Buldun! Fuji Dağı o kadar uzakta ki çok küçük görünüyor.', spots: [{ x: 0.62, y: 0.69, r: 0.06 }] },
        {
            id: 'tekne',
            prompt: 'Denizdeki bir tekne bul!',
            found: 'İşte tekne! İçinde kürek çeken insanlar var.',
            spots: [{ x: 0.77, y: 0.627, r: 0.07 }, { x: 0.495, y: 0.852, r: 0.09 }, { x: 0.651, y: 0.922, r: 0.08 }, { x: 0.17, y: 0.66, r: 0.1 }],
        },
        { id: 'kopuk', prompt: 'Dalganın köpüklü parmaklarını bul!', found: 'Evet! Köpükler sanki uzanan parmaklar gibi.', spots: [{ x: 0.52, y: 0.333, r: 0.1 }] },
    ],
    'kaplumbaga-terbiyecisi': [
        {
            id: 'kaplumbaga',
            prompt: 'Bir kaplumbağa bul!',
            found: 'İşte kaplumbağa! Ne kadar sakin duruyor.',
            spots: [{ x: 0.297, y: 0.845, r: 0.09 }, { x: 0.176, y: 0.89, r: 0.09 }, { x: 0.306, y: 0.935, r: 0.09 }, { x: 0.945, y: 0.805, r: 0.07 }, { x: 0.89, y: 0.88, r: 0.08 }],
        },
        {
            id: 'ney',
            prompt: 'Amcanın tuttuğu neyi bul!',
            found: 'Evet, ney! Üfleyince tatlı bir ses çıkarır.',
            spots: [{ x: 0.917, y: 0.52, r: 0.06 }, { x: 0.834, y: 0.59, r: 0.06 }, { x: 0.741, y: 0.655, r: 0.06 }],
        },
        { id: 'sarik', prompt: 'Amcanın renkli sarığını bul!', found: 'Buldun! Sarık pembe, sarı ve mavi renklerde.', spots: [{ x: 0.482, y: 0.285, r: 0.1 }] },
    ],
    'cocuk-oyunlari': [
        { id: 'cember', prompt: 'Bir çember bul!', found: 'İşte çember! Çocuklar onu yuvarlıyor.', spots: [{ x: 0.547, y: 0.932, r: 0.07 }, { x: 0.669, y: 0.925, r: 0.07 }] },
        { id: 'fici', prompt: 'Bir fıçı bul!', found: 'Evet, fıçı! Üstüne çıkıp oynuyorlar.', spots: [{ x: 0.547, y: 0.81, r: 0.09 }, { x: 0.6875, y: 0.796, r: 0.08 }] },
        { id: 'takla', prompt: 'Takla atan bir çocuk bul!', found: 'Aferin! Ters dönmüş, çok eğleniyor.', spots: [{ x: 0.255, y: 0.53, r: 0.06 }, { x: 0.6, y: 0.373, r: 0.05 }] },
    ],
    'su-zambaklari': [
        {
            id: 'zambak',
            prompt: 'Pembe bir su zambağı bul!',
            found: 'İşte zambak! Pembe ve çok güzel.',
            spots: [{ x: 0.417, y: 0.786, r: 0.05 }, { x: 0.594, y: 0.743, r: 0.05 }, { x: 0.755, y: 0.748, r: 0.05 }, { x: 0.083, y: 0.72, r: 0.05 }],
        },
        { id: 'yaprak', prompt: 'Yeşil bir yaprak bul!', found: 'Evet! Zambakların yaprakları suyun üstünde yüzer.', spots: [{ x: 0.477, y: 0.894, r: 0.07 }, { x: 0.677, y: 0.88, r: 0.06 }] },
        { id: 'imza', prompt: 'Ressamın imzasını bul!', found: 'Buldun! Ressam adını tablonun köşesine yazmış.', spots: [{ x: 0.854, y: 0.954, r: 0.08 }] },
    ],
    // ---- Fidan'a özel tablolar ----
    'meyveden-portre': [
        { id: 'burun', prompt: 'Yüzün ortasındaki armut burnu bul!', found: 'İşte burun! Gerçek bir armut gibi duruyor.', spots: [{ x: 0.45, y: 0.32, r: 0.06 }] },
        { id: 'agiz', prompt: 'Ağız yerindeki kırmızı kirazları bul!', found: 'Evet, kirazlar! Sanki gülümseyen bir ağız.', spots: [{ x: 0.45, y: 0.42, r: 0.05 }] },
        { id: 'cicek', prompt: 'Beyaz bir çiçek bul!', found: 'İşte beyaz çiçek! Tabloda bir sürü çiçek var.', spots: [{ x: 0.25, y: 0.61, r: 0.07 }, { x: 0.53, y: 0.92, r: 0.07 }, { x: 0.23, y: 0.84, r: 0.05 }] },
    ],
    'sari-kirmizi-mavi': [
        { id: 'sari', prompt: 'Büyük sarı şekli bul!', found: 'İşte sarı! Tablonun adındaki ilk renk.', spots: [{ x: 0.32, y: 0.45, r: 0.09 }] },
        { id: 'kirmizi', prompt: 'Şimdi kırmızı bir şekil bul!', found: 'Kırmızı bulundu! Çok canlı bir renk.', spots: [{ x: 0.49, y: 0.52, r: 0.08 }, { x: 0.19, y: 0.1, r: 0.04 }, { x: 0.23, y: 0.415, r: 0.04 }] },
        { id: 'mavi', prompt: 'Mavi renkli büyük şekli bul!', found: 'Evet, mavi! Dalga dalga uzanıyor.', spots: [{ x: 0.78, y: 0.28, r: 0.1 }, { x: 0.1, y: 0.53, r: 0.05 }] },
    ],
    'tropik-firtinada-kaplan': [
        { id: 'kirmizi', prompt: 'Fırtınada sallanan kırmızı yaprakları bul!', found: 'Evet! Kırmızı yapraklar rüzgârda sallanıyor.', spots: [{ x: 0.88, y: 0.53, r: 0.08 }, { x: 0.455, y: 0.365, r: 0.04 }] },
        { id: 'yaprak', prompt: 'Koyu yeşil büyük yaprağı bul!', found: 'İşte büyük yaprak! Çok geniş ve koyu yeşil.', spots: [{ x: 0.78, y: 0.83, r: 0.1 }] },
        { id: 'imza', prompt: 'Sol alttaki ressam imzasını bul!', found: 'Buldun! Ressam adını sol alta yazmış.', spots: [{ x: 0.095, y: 0.953, r: 0.08 }] },
    ],
    'inci-kupeli-kiz': [
        { id: 'kupe', prompt: 'Parlayan inci küpeyi bul!', found: 'İşte inci küpe! Işıl ışıl parlıyor.', spots: [{ x: 0.63, y: 0.545, r: 0.045 }] },
        { id: 'baslik', prompt: 'Mavi renkli başlığı bul!', found: 'Evet, mavi başlık! Sarı kumaşla çok yakışmış.', spots: [{ x: 0.58, y: 0.29, r: 0.1 }, { x: 0.85, y: 0.77, r: 0.045 }] },
        { id: 'kumas', prompt: 'Başlıktan sarkan sarı kumaşı bul!', found: 'Buldun! Sarı kumaş omzuna doğru uzanıyor.', spots: [{ x: 0.815, y: 0.47, r: 0.09 }, { x: 0.66, y: 0.15, r: 0.07 }] },
    ],
    'aycicekleri': [
        { id: 'aycicegi', prompt: 'En üstteki büyük ayçiçeğini bul!', found: 'İşte ayçiçeği! Güneş gibi parlıyor.', spots: [{ x: 0.58, y: 0.1, r: 0.11 }] },
        { id: 'vazo', prompt: 'Ayçiçeklerinin durduğu vazoyu bul!', found: 'Evet, vazo! İçinde bir sürü çiçek var.', spots: [{ x: 0.52, y: 0.84, r: 0.15 }] },
        { id: 'imza', prompt: 'Vazonun üstündeki ressam imzasını bul!', found: 'Buldun! Ressam, Vincent adını vazonun üstüne yazmış.', spots: [{ x: 0.4, y: 0.805, r: 0.07 }] },
    ],
    'karda-avcilar': [
        { id: 'kopek', prompt: 'Avcıların köpeklerini bul!', found: 'İşte köpekler! Karda avcıların peşinden gidiyorlar.', spots: [{ x: 0.1, y: 0.81, r: 0.1 }, { x: 0.17, y: 0.81, r: 0.08 }] },
        { id: 'kus', prompt: 'Siyah bir kuş bul!', found: 'İşte kuş! Soğuk gökyüzünde süzülüyor.', spots: [{ x: 0.71, y: 0.26, r: 0.035 }, { x: 0.57, y: 0.19, r: 0.03 }, { x: 0.24, y: 0.073, r: 0.03 }] },
        { id: 'buz', prompt: 'Buzda kayan insanları bul!', found: 'Evet! Donmuş gölde kayarak eğleniyorlar.', spots: [{ x: 0.78, y: 0.59, r: 0.12 }] },
    ],
    'pazar-gunu-parkta': [
        { id: 'kopek', prompt: 'Bir köpek bul!', found: 'İşte köpek! Parkta gezintiye çıkmış.', spots: [{ x: 0.44, y: 0.78, r: 0.07 }, { x: 0.67, y: 0.876, r: 0.045 }] },
        { id: 'maymun', prompt: 'Bir maymun bul!', found: 'Evet, maymun! Hanımefendiyle gezintiye çıkmış.', spots: [{ x: 0.745, y: 0.82, r: 0.05 }] },
        { id: 'yelkenli', prompt: 'Suda yüzen yelkenli tekneyi bul!', found: 'İşte yelkenli! Rüzgârla suda ilerliyor.', spots: [{ x: 0.09, y: 0.215, r: 0.05 }] },
    ],
    'semsiyeler': [
        { id: 'semsiye', prompt: 'Mavi bir şemsiye bul!', found: 'İşte şemsiye! Herkes yağmurdan korunuyor.', spots: [{ x: 0.68, y: 0.22, r: 0.16 }, { x: 0.52, y: 0.11, r: 0.12 }, { x: 0.8, y: 0.06, r: 0.1 }] },
        { id: 'sepet', prompt: 'Büyük sepeti bul!', found: 'Evet, sepet! Genç kadın onu taşıyor.', spots: [{ x: 0.47, y: 0.63, r: 0.13 }] },
        { id: 'cember', prompt: 'Küçük kızın tuttuğu çemberi bul!', found: 'Buldun! Çember, kızın elinde duruyor.', spots: [{ x: 0.73, y: 0.845, r: 0.14 }] },
    ],
    'japon-koprusu': [
        { id: 'kopru', prompt: 'Kemerli köprüyü bul!', found: 'İşte köprü! Suyun üstünden kavis çiziyor.', spots: [{ x: 0.2, y: 0.33, r: 0.1 }, { x: 0.5, y: 0.3, r: 0.1 }, { x: 0.8, y: 0.32, r: 0.1 }] },
        { id: 'nilufer', prompt: 'Pembe bir nilüfer çiçeği bul!', found: 'Evet, nilüfer! Suyun üstünde yüzüyor.', spots: [{ x: 0.78, y: 0.6, r: 0.05 }, { x: 0.3, y: 0.815, r: 0.045 }, { x: 0.65, y: 0.78, r: 0.045 }, { x: 0.6, y: 0.6, r: 0.04 }] },
        { id: 'dallar', prompt: 'Yukarıdaki sarkan yeşil dalları bul!', found: 'Evet! Dallar suya doğru uzanıyor.', spots: [{ x: 0.1, y: 0.18, r: 0.12 }] },
    ],
    'elmali-naturmort': [
        { id: 'elma', prompt: 'Bir elma bul!', found: 'İşte elma! Sezan elmaları çok severmiş.', spots: [{ x: 0.62, y: 0.58, r: 0.1 }, { x: 0.53, y: 0.75, r: 0.05 }, { x: 0.3, y: 0.6, r: 0.055 }] },
        { id: 'kup', prompt: 'Büyük yeşil küpü bul!', found: 'Evet, küp! Rengi çok canlı.', spots: [{ x: 0.167, y: 0.375, r: 0.13 }] },
        { id: 'kutu', prompt: 'Çiçek desenli küçük kutuyu bul!', found: 'İşte kutu! Üstünde küçük çiçekler var.', spots: [{ x: 0.43, y: 0.69, r: 0.08 }] },
    ],
};

export const getHunt = (paintingId: string): HuntTarget[] | undefined => HUNTS[paintingId];

/** Detay Avı'nda okunacak TÜM metinler (VoiceBox üretim listesi + test için). */
export const allHuntTexts = (): string[] => [
    HUNT_INTRO, HUNT_WRONG, HUNT_HELP, HUNT_DONE,
    ...Object.values(HUNTS).flatMap((targets) => targets.flatMap((t) => [t.prompt, t.found])),
];
