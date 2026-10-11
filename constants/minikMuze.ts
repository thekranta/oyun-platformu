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

export type PaintingTier = 'free' | 'tohum' | 'fidan';

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
    /** Tabloyu izlemek için gereken asgari paket (lib/minikMuzeAccess.ts): free = vitrin, tohum = ilk 6 tablo, fidan = tümü. */
    tier: PaintingTier;
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
        tier: 'free',
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
        tier: 'tohum',
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
        tier: 'tohum',
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
            { text: 'Bu tablonun adı Büyük Dalga. Hokusai adında bir Japon ressam yapmış. Resmi tahtaya kazıyıp boya sürerek basmış.', focus: null },
            { text: 'Tabloya bak. Dalga ne kadar büyük! Sen ne görüyorsun?', focus: null, pauseAfterMs: 5000 },
            { text: 'Dalganın köpükleri sanki parmaklar gibi uzanıyor. Sence dalga ne yapmak istiyor?', focus: { x: 0.47, y: 0.28, scale: 2.0 } },
            { text: 'Dalganın altında küçük tekneler var. İçindeki insanlar kürek çekiyor.', focus: { x: 0.7, y: 0.8, scale: 2.1 } },
            { text: 'Çok uzakta karlı bir dağ görünüyor. Bu, Japonya\'nın en ünlü dağı: Fuji Dağı.', focus: { x: 0.63, y: 0.68, scale: 2.8 } },
            { text: 'Dalga sana ne hissettiriyor? Korkunç mu, heyecanlı mı? Sen de mavi boyayla bir dalga çizebilirsin!', focus: null, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'kaplumbaga-terbiyecisi',
        tier: 'tohum',
        title: 'Kaplumbağa Terbiyecisi',
        artist: 'Osman Hamdi Bey',
        yearLabel: '1906',
        country: 'Türkiye',
        aspect: 0.539,
        accent: '#6B7F4A',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Osman Hamdi Bey - The Tortoise Trainer.jpg',
            license: 'Public domain',
            museum: 'Pera Müzesi, İstanbul',
        },
        segments: [
            { text: "Bu tablonun adı Kaplumbağa Terbiyecisi. Osman Hamdi Bey adında bir Türk ressam yapmış. Tablo, İstanbul'daki Pera Müzesi'nde duruyor.", focus: null },
            { text: 'Tabloya bak. Yaşlı amcanın etrafında kimler var? Sen de say bakalım.', focus: null, pauseAfterMs: 5000 },
            { text: 'Amca eline bir ney almış. Ney, üflenerek çalınan bir çalgı. Kaplumbağalara müzik dinletiyor!', focus: { x: 0.72, y: 0.52, scale: 2.0 } },
            { text: 'Kaplumbağalar çok yavaş yürür. Amca acele etmeden, sabırla bekliyor.', focus: { x: 0.3, y: 0.88, scale: 2.2 } },
            { text: "Osman Hamdi Bey aynı zamanda müze kuran bir ressam. İstanbul'daki Arkeoloji Müzesi'ni o kurmuş.", focus: null },
            { text: 'Sence kaplumbağalar müziği dinliyor mu? Sen de sabırlı bir kaplumbağa çizebilirsin!', focus: { x: 0.3, y: 0.88, scale: 1.6 }, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'cocuk-oyunlari',
        tier: 'tohum',
        title: 'Çocuk Oyunları',
        artist: 'Pieter Bruegel',
        yearLabel: '1560',
        country: 'Flandra',
        aspect: 1.377,
        accent: '#9A5B3C',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Pieter Bruegel the Elder - Children’s Games - Google Art Project.jpg',
            license: 'Public domain',
            museum: 'Kunsthistorisches Museum, Viyana',
        },
        segments: [
            { text: "Bu tablonun adı Çocuk Oyunları. Pieter Bruegel adında bir ressam yapmış. Tablo, Avusturya'nın Viyana şehrindeki bir müzede duruyor.", focus: null },
            { text: 'Tabloya bak. Çocuklar neler oynuyor? Sen de bulabilir misin?', focus: null, pauseAfterMs: 6000 },
            { text: 'Bu tabloda yüzlerce çocuk var ve hepsi oyun oynuyor! Bazıları koşuyor, bazıları sırtından atlıyor.', focus: { x: 0.62, y: 0.58, scale: 2.3 } },
            { text: 'Körebe, birdirbir, çember çevirme... Bunlar çok eski oyunlar. Sen hangilerini biliyorsun?', focus: { x: 0.6, y: 0.9, scale: 2.4 } },
            { text: 'Bu tablo, çok eski zamanlarda çocukların da bizim gibi oyun sevdiğini gösteriyor.', focus: null },
            { text: 'Sen en çok hangi oyunu seviyorsun? Sen de arkadaşlarınla oynadığın bir oyunu çizebilirsin!', focus: null, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'meyveden-portre',
        tier: 'fidan',
        title: 'Meyveden Portre',
        artist: 'Giuseppe Arcimboldo',
        yearLabel: '1590 civarı',
        country: 'İtalya',
        aspect: 0.812,
        accent: '#7A5A2E',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Giuseppe Arcimboldo - Rudolf II of Habsburg as Vertumnus - Google Art Project.jpg',
            license: 'Public domain',
            museum: 'Skoklosters slott, İsveç',
        },
        segments: [
            { text: "Bu tablonun adı Meyveden Portre. Arcimboldo adında İtalyan bir ressam yapmış. Tablo, İsveç'teki bir şatoda duruyor.", focus: null },
            { text: 'Tabloya iyi bak. Bu bir insan yüzü ama neyden yapılmış? Sen de bak bakalım.', focus: null, pauseAfterMs: 5000 },
            { text: 'Yanaklar elma ve şeftali gibi, burun ise bir armut! Gözü ve ağzı bulabilir misin?', focus: { x: 0.45, y: 0.33, scale: 2.2 } },
            { text: 'Saçlarında çiçekler, buğday başakları ve üzüm salkımları var. Her şey bahçeden toplanmış gibi!', focus: { x: 0.5, y: 0.15, scale: 2.0 } },
            { text: 'Bu portre bir imparatoru gösteriyor ama ressam onu meyve, sebze ve çiçeklerle yapmış. Çok yaratıcı, değil mi?', focus: null },
            { text: 'Sen de sebze ve meyvelerle bir yüz yapabilirsin! Havuç burun olur mu, sence?', focus: null, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'sari-kirmizi-mavi',
        tier: 'fidan',
        title: 'Sarı, Kırmızı, Mavi',
        artist: 'Vasili Kandinski',
        yearLabel: '1925',
        country: 'Rusya',
        aspect: 1.567,
        accent: '#2F6EA3',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Gelb-Rot-Blau, by Wassily Kandinsky, Centre Pompidou.jpg',
            license: 'Public domain',
            museum: 'Centre Pompidou, Paris',
        },
        segments: [
            { text: "Bu tablonun adı Sarı, Kırmızı, Mavi. Vasili Kandinski adında bir ressam yapmış. Kandinski Rusya'da doğmuş. Tablo, Paris'teki bir müzede duruyor.", focus: null },
            { text: 'Tabloya bak. Hangi renkleri ve şekilleri görüyorsun? Say bakalım.', focus: null, pauseAfterMs: 5000 },
            { text: 'Daireler, çizgiler ve şekiller var. Hepsi dans ediyor gibi!', focus: { x: 0.65, y: 0.45, scale: 2.0 } },
            { text: 'Kandinski, renklerde müzik duyduğunu söylermiş. Resim yaparken sanki bir şarkı çalıyormuş.', focus: { x: 0.32, y: 0.41, scale: 2.0 } },
            { text: 'Sence sarı hangi sesi çıkarır? Mavi ve kırmızı ne dersin?', focus: { x: 0.8, y: 0.3, scale: 2.0 } },
            { text: 'Sen de müzik dinleyip duyduğun sesi renklerle çizebilirsin!', focus: null, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'su-zambaklari',
        tier: 'tohum',
        title: 'Su Zambakları',
        artist: 'Claude Monet',
        yearLabel: '1906',
        country: 'Fransa',
        aspect: 1.041,
        accent: '#4F8A8B',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Claude Monet - Water Lilies - 1906, Ryerson.jpg',
            license: 'Public domain',
            museum: 'Art Institute of Chicago',
        },
        segments: [
            { text: "Bu tablonun adı Su Zambakları. Claude Monet adında Fransız bir ressam yapmış. Monet, kendi bahçesindeki gölete bakarak çizmiş. Tablo, Amerika'da bir müzede duruyor.", focus: null },
            { text: 'Tabloya bak. Suyun üstünde neler yüzüyor? Sen de bak bakalım.', focus: null, pauseAfterMs: 5000 },
            { text: 'Yeşil yapraklar ve pembe çiçekler suyun üstünde yüzüyor. Bunlara su zambağı denir.', focus: { x: 0.6, y: 0.75, scale: 2.4 } },
            { text: 'Monet fırçayı küçük küçük dokundurmuş. Yakından bakınca boya lekeleri görürsün, uzaktan bakınca göl olur!', focus: { x: 0.15, y: 0.72, scale: 2.8 } },
            { text: 'Suyun içinde gökyüzü ve bulutlar görünüyor. Sanki gölet bir ayna!', focus: { x: 0.4, y: 0.4, scale: 2.0 } },
            { text: 'Sen de suya bir taş atılmış gibi dalgalı bir gölet çizebilirsin!', focus: null, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'tropik-firtinada-kaplan',
        tier: 'fidan',
        title: 'Tropik Fırtınada Kaplan',
        artist: 'Henri Rousseau',
        yearLabel: '1891',
        country: 'Fransa',
        aspect: 1.252,
        accent: '#3F7A4A',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Surprised-Rousseau.jpg',
            license: 'Public domain',
            museum: 'The National Gallery, Londra',
        },
        segments: [
            { text: "Bu tablonun adı Tropik Fırtınada Kaplan. Henri Rousseau adında Fransız bir ressam yapmış. Tablo, Londra'daki bir müzede duruyor.", focus: null },
            { text: 'Tabloya bak. Ormanda neler oluyor? Kaplan ne yapıyor, sence?', focus: null, pauseAfterMs: 5000 },
            { text: 'Ormanda kocaman yapraklar ve tüylü, uzun otlar var. Rousseau her yaprağı özenle boyamış.', focus: { x: 0.16, y: 0.33, scale: 2.2 } },
            { text: 'Yağmur ince çizgiler gibi yağıyor. Yapraklar rüzgârda sallanıyor, uzakta şimşek çakıyor.', focus: { x: 0.55, y: 0.15, scale: 2.0 } },
            { text: 'Rousseau hiç gerçek bir ormana gitmemiş! Hayal gücüyle ve bitki bahçelerinde gördüğü bitkilerle çizmiş.', focus: { x: 0.78, y: 0.42, scale: 2.0 } },
            { text: 'Sen de hayalindeki bir ormanı çizebilirsin. Orada hangi hayvanlar yaşıyor?', focus: null, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'inci-kupeli-kiz',
        tier: 'fidan',
        title: 'İnci Küpeli Kız',
        artist: 'Johannes Vermeer',
        yearLabel: '1665 civarı',
        country: 'Hollanda',
        aspect: 0.846,
        accent: '#2C4A6B',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Girl with a Pearl Earring.jpg',
            license: 'Public domain',
            museum: 'Mauritshuis, Lahey',
        },
        segments: [
            { text: "Bu tablonun adı İnci Küpeli Kız. Johannes Vermeer adında Hollandalı bir ressam yapmış. Tablo, Hollanda'daki Lahey şehrinde bir müzede duruyor.", focus: null },
            { text: 'Tabloya bak. Kız sana mı bakıyor? Neler görüyorsun?', focus: null, pauseAfterMs: 5000 },
            { text: 'Kızın kulağında büyük, parlak bir inci küpe var. Işık küpenin üstünde pırıl pırıl parlıyor.', focus: { x: 0.62, y: 0.54, scale: 2.6 } },
            { text: 'Başında mavi ve sarı renkli bir örtü var. Bu renkleri bulabiliyor musun?', focus: { x: 0.55, y: 0.26, scale: 1.9 } },
            { text: 'Kız tam bize dönüp bakıyor, sanki bir şey söyleyecek! Arkası düz, koyu bir renk.', focus: { x: 0.4, y: 0.4, scale: 2.2 } },
            { text: 'Sence bu kız kim? Neden bize bakıyor? Sen de arkadaşının portresini çizebilirsin!', focus: null, pauseAfterMs: 2500 },
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
