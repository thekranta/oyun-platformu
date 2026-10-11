// Minik Müze: dünyaca ünlü tabloları çocuklara tam ekranda gösterip sade bir dille sesli anlatır.
// Sanat > "Sanat eserlerine ve sanatçılara değer verebilme" (SNAB.3) / "Sanat eseri inceleyebilme" (SNAB.2).
//
// KURALLAR
//  * Yalnız ESERİ KAMU MALI olan tablolar (sanatçı en az 70 yıl önce ölmüş) ve görseli Wikimedia Commons /
//    açık müze arşivlerinden alınmış olanlar eklenir. Çıplaklık ve şiddet içeren eserler eklenmez.
//  * Anlatım metinleri 3-6 yaş için KISA cümlelerdir ve konuşma için yazılır (rakam yok, yabancı adlar okunduğu
//    gibi yazılır: "Luvr"). Her metin için VoiceBox klibi üretilir (bkz. scripts/gen-voices.mjs; slug = metin).
//  * focus: tablonun hangi noktasına yakınlaşılacağı (x, y 0..1 görsele göre; scale 1.4..3). null = tüm tablo.
//  * pauseAfterMs: ses bittikten sonra çocuğun bakması için beklenecek süre (gözlem soruları için uzun).

export interface MuseumFocus { x: number; y: number; scale: number }

export interface PaintingSegment {
    text: string;
    focus: MuseumFocus | null;
    pauseAfterMs?: number;
}

export interface Painting {
    id: string;
    title: string;
    artist: string;
    /** Çocuğa değil veliye/künyeye: kısa tarih ifadesi. */
    yearLabel: string;
    country: string;
    /** assets/images/muze/<id>.webp (bkz. components/minikMuze/paintingImages.ts). */
    aspect: number;                 // genişlik / yükseklik
    accent: string;                 // çerçeve/arka plan vurgu rengi
    // Künye (kaynak + lisans): uygulama bilgi ekranında ve store telif beyanında kullanılır.
    credit: { source: string; commonsFile: string; license: 'Public domain'; museum: string };
    segments: PaintingSegment[];
}

export const MUSEUM_INTRO = "Minik Müze'ye hoş geldin! Bir tabloya dokun, dinle ve keşfet.";
export const MUSEUM_DONE = 'Aferin! Tabloyu birlikte inceledik.';

export const PAINTINGS: Painting[] = [
    {
        id: 'mona-lisa',
        title: 'Mona Lisa',
        artist: 'Leonardo da Vinci',
        yearLabel: '1503 – 1506 civarı',
        country: 'İtalya',
        aspect: 0.671,
        accent: '#8D6E3F',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg',
            license: 'Public domain',
            museum: 'Musée du Louvre, Paris',
        },
        segments: [
            { text: 'Merhaba! Bu tablonun adı Mona Lisa. Leonardo da Vinci adında çok ünlü bir ressam yapmış. Tablo, Paris şehrindeki Luvr Müzesi\'nde duruyor.', focus: null },
            { text: 'Tabloya iyi bak. Kimi görüyorsun? Sen de bak bakalım.', focus: null, pauseAfterMs: 5000 },
            { text: 'Mona Lisa hafifçe gülümsüyor. Bu gülümseme çok ünlü! İnsanlar yüzlerce yıldır ona bakıyor.', focus: { x: 0.46, y: 0.27, scale: 2.4 } },
            { text: 'Arkada uzun yollar, dağlar ve bir nehir var. Leonardo boyaları çok yumuşak sürmüş, sanki hafif bir sis var.', focus: { x: 0.22, y: 0.45, scale: 2.0 } },
            { text: 'İnsanlar bu tabloyu çok büyük sanır ama aslında küçük bir tablo. Bir kapıdan çok daha küçük!', focus: null },
            { text: 'Sence Mona Lisa ne düşünüyor? Mutlu mu, sakin mi? Sen de bir gülümseme çizebilirsin!', focus: { x: 0.46, y: 0.27, scale: 1.6 }, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'yildizli-gece',
        title: 'Yıldızlı Gece',
        artist: 'Vincent van Gogh',
        yearLabel: '1889',
        country: 'Hollanda',
        aspect: 1.263,
        accent: '#2F4A7A',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Van Gogh - Starry Night - Google Art Project.jpg',
            license: 'Public domain',
            museum: 'The Museum of Modern Art, New York',
        },
        segments: [
            { text: 'Bu tablonun adı Yıldızlı Gece. Vincent van Gogh adında bir ressam yapmış. Van Gogh, Hollandalı. Tablo, New York\'taki bir müzede duruyor.', focus: null },
            { text: 'Tabloya bak. Gökyüzünde neler görüyorsun? Sen de say bakalım.', focus: null, pauseAfterMs: 5000 },
            { text: 'Gökyüzü dönüyor gibi, değil mi? Van Gogh fırçayı kıvrım kıvrım gezdirmiş. Fırça izlerini görebiliyor musun?', focus: { x: 0.5, y: 0.37, scale: 2.2 } },
            { text: 'Sarı yıldızlar ve parlak bir ay var. Işıklar ışıl ışıl parlıyor.', focus: { x: 0.87, y: 0.18, scale: 2.4 } },
            { text: 'Aşağıda küçük bir köy var, evler uyuyor. Yanda uzun, koyu yeşil bir ağaç yükseliyor.', focus: { x: 0.42, y: 0.78, scale: 1.9 } },
            { text: 'Bu gece sence nasıl? Sakin mi, heyecanlı mı? Sen de yıldızlı bir gece çizebilirsin!', focus: null, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'buyuk-dalga',
        title: 'Büyük Dalga',
        artist: 'Katsushika Hokusai',
        yearLabel: '1831 civarı',
        country: 'Japonya',
        aspect: 1.488,
        accent: '#33577A',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Tsunami by hokusai 19th century.jpg',
            license: 'Public domain',
            museum: 'The Metropolitan Museum of Art, New York',
        },
        segments: [
            { text: 'Bu tablonun adı Büyük Dalga. Hokusai adında bir Japon ressam yapmış. Japonya çok uzaklarda bir ülke. Bu resmi önce tahtaya oyup sonra boya sürerek basmışlar.', focus: null },
            { text: 'Tabloya bak. Dalga ne kadar büyük! Sen ne görüyorsun?', focus: null, pauseAfterMs: 5000 },
            { text: 'Dalganın köpükleri sanki parmaklar gibi uzanıyor. Sence dalga ne yapmak istiyor?', focus: { x: 0.47, y: 0.28, scale: 2.0 } },
            { text: 'Dalganın altında küçük tekneler var. İçindeki insanlar kürek çekiyor.', focus: { x: 0.7, y: 0.8, scale: 2.1 } },
            { text: 'Çok uzakta karlı bir dağ görünüyor. Bu, Japonya\'nın en ünlü dağı: Fuji Dağı.', focus: { x: 0.63, y: 0.68, scale: 2.8 } },
            { text: 'Dalga sana ne hissettiriyor? Korkunç mu, heyecanlı mı? Sen de mavi boyayla bir dalga çizebilirsin!', focus: null, pauseAfterMs: 2500 },
        ],
    },
];

export const getPainting = (id: string): Painting | undefined => PAINTINGS.find((p) => p.id === id);

/** Anlatımda okunacak TÜM metinler (VoiceBox üretim listesi + test için). */
export const allMuseumTexts = (): string[] => [
    MUSEUM_INTRO,
    MUSEUM_DONE,
    ...PAINTINGS.flatMap((p) => p.segments.map((s) => s.text)),
];
