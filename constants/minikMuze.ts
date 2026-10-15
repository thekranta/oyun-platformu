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

import { allHuntTexts } from './minikMuzeHunt';
import { allPuzzleTexts } from './minikMuzeYapboz';

export const MUSEUM_INTRO = "Minik Müze'ye hoş geldin! Bir tabloya dokun, dinle ve keşfet.";
export const MUSEUM_DONE = 'Aferin! Tabloyu birlikte inceledik.';
/** "Sen de çiz" (Yaratıcı Çizim, tablo köşede) açılış cümlesi — components/YaraticiCizim.tsx okur. */
export const MUSEUM_DRAW_INTRO = 'Tabloya bak ve ondan ilham alarak kendi resmini çiz!';

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
    {
        id: 'aycicekleri',
        tier: 'fidan',
        title: 'Ayçiçekleri',
        artist: 'Vincent van Gogh',
        yearLabel: '1888',
        country: 'Hollanda',
        aspect: 0.787,
        accent: '#B8860B',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Vincent van Gogh - Sunflowers (1888, National Gallery London).jpg',
            license: 'Public domain',
            museum: 'The National Gallery, Londra',
        },
        segments: [
            { text: "Bu tablonun adı Ayçiçekleri. Vincent van Gogh adında Hollandalı bir ressam yapmış. Tablo, Londra'daki bir müzede duruyor.", focus: null },
            { text: 'Tabloya bak. Vazoda kaç tane çiçek var? Sen de saymaya çalış.', focus: null, pauseAfterMs: 5000 },
            { text: 'Çiçeklerin sarı yaprakları güneş gibi parlıyor. Van Gogh sarı rengi çok severmiş.', focus: { x: 0.78, y: 0.46, scale: 2.2 } },
            { text: 'Boyayı kalın kalın sürmüş. Yakından bak, fırça izlerini görebiliyor musun?', focus: { x: 0.15, y: 0.27, scale: 2.8 } },
            { text: 'Bazı çiçekler açmış, bazıları solmaya başlamış. Hepsi farklı duruyor.', focus: { x: 0.22, y: 0.66, scale: 2.2 } },
            { text: 'Sen de en sevdiğin çiçeği sarı boyayla çizebilirsin!', focus: null, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'karda-avcilar',
        tier: 'fidan',
        title: 'Karda Avcılar',
        artist: 'Pieter Bruegel',
        yearLabel: '1565',
        country: 'Flandra',
        aspect: 1.405,
        accent: '#5F7A8A',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Pieter Bruegel the Elder - Hunters in the Snow (Winter) - Google Art Project.jpg',
            license: 'Public domain',
            museum: 'Kunsthistorisches Museum, Viyana',
        },
        segments: [
            { text: "Bu tablonun adı Karda Avcılar. Pieter Bruegel adında bir ressam yapmış. Tablo, Viyana'daki bir müzede duruyor.", focus: null },
            { text: 'Tabloya bak. Kış mevsimi! Karların üstünde neler yapılıyor?', focus: null, pauseAfterMs: 5000 },
            { text: 'Avcılar kar üstünde yürüyor, yanlarında köpekleri var. Hepsi yorgun görünüyor.', focus: { x: 0.25, y: 0.8, scale: 2.2 } },
            { text: 'Aşağıda buz tutmuş bir gölet var. İnsanlar kayıyor, oyun oynuyor.', focus: { x: 0.78, y: 0.57, scale: 2.4 } },
            { text: 'Uzakta karlı dağlar ve küçük bir köy görünüyor. Kuşlar gökyüzünde uçuyor.', focus: { x: 0.75, y: 0.25, scale: 2.0 } },
            { text: 'Sen de karlı bir gün çizebilirsin. Karda ne yapmayı seversin?', focus: null, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'pazar-gunu-parkta',
        tier: 'fidan',
        title: 'Pazar Günü Parkta',
        artist: 'Georges Seurat',
        yearLabel: '1884 – 1886',
        country: 'Fransa',
        aspect: 1.488,
        accent: '#6B8E4E',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: "Georges Seurat - Un dimanche après-midi à l'île de la Grande Jatte.jpg",
            license: 'Public domain',
            museum: 'Art Institute of Chicago',
        },
        segments: [
            { text: "Bu tablonun adı Pazar Günü Parkta. Georges Seurat adında Fransız bir ressam yapmış. Tablo, Amerika'daki Şikago şehrinde duruyor.", focus: null },
            { text: 'Tabloya bak. İnsanlar parkta neler yapıyor? Sen de bul bakalım.', focus: null, pauseAfterMs: 5000 },
            { text: 'Bu tablo minicik noktalardan yapılmış! Yakından bak, noktaları görebilir misin?', focus: { x: 0.45, y: 0.46, scale: 3.0 } },
            { text: 'Seurat boyaları karıştırmak yerine, küçük noktaları yan yana koymuş. Uzaktan bakınca renkler birleşiyor.', focus: { x: 0.15, y: 0.45, scale: 2.4 } },
            { text: 'Parkta şemsiyeli bir hanım, küçük bir kız ve bir köpek var. Nehirde de yelkenliler gidiyor.', focus: { x: 0.45, y: 0.5, scale: 1.8 } },
            { text: 'Sen de küçük noktaları yan yana koyarak bir resim yapabilirsin!', focus: null, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'semsiyeler',
        tier: 'fidan',
        title: 'Şemsiyeler',
        artist: 'Pierre-Auguste Renoir',
        yearLabel: '1881 – 1886',
        country: 'Fransa',
        aspect: 0.636,
        accent: '#3F5F8A',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Pierre-Auguste Renoir, The Umbrellas, ca. 1881-86.jpg',
            license: 'Public domain',
            museum: 'The National Gallery, Londra',
        },
        segments: [
            { text: "Bu tablonun adı Şemsiyeler. Renuar adında Fransız bir ressam yapmış. Tablo, Londra'daki bir müzede duruyor.", focus: null },
            { text: 'Tabloya bak. Hava nasıl? Şemsiyeleri sen de say bakalım.', focus: null, pauseAfterMs: 5000 },
            { text: 'Yağmur yağıyor ve herkes şemsiyesini açmış. Sokak çok kalabalık!', focus: { x: 0.55, y: 0.25, scale: 1.6 } },
            { text: 'Önde bir anne ve küçük kızlar var. Küçük kızın elinde bir çember duruyor.', focus: { x: 0.79, y: 0.62, scale: 2.2 } },
            { text: 'Renuar renkleri yumuşacık sürmüş. Mavi şemsiyeler çok güzel görünüyor.', focus: { x: 0.45, y: 0.12, scale: 2.0 } },
            { text: 'Sen de yağmurlu bir gün çizebilirsin. Şemsiyen ne renk olurdu?', focus: null, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'japon-koprusu',
        tier: 'fidan',
        title: 'Japon Köprüsü',
        artist: 'Claude Monet',
        yearLabel: '1899',
        country: 'Fransa',
        aspect: 1.031,
        accent: '#5E8C61',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Claude Monet, The Water-Lily Pond (National Gallery, London).jpg',
            license: 'Public domain',
            museum: 'The National Gallery, Londra',
        },
        segments: [
            { text: "Bu tablonun adı Japon Köprüsü. Claude Monet adında Fransız bir ressam yapmış. Tablo, Londra'daki bir müzede duruyor.", focus: null },
            { text: 'Tabloya bak. Köprüyü ve gölü görebiliyor musun?', focus: null, pauseAfterMs: 5000 },
            { text: 'Yeşil, küçük bir köprü gölün üstünden geçiyor. Köprünün altında su zambakları yüzüyor.', focus: { x: 0.5, y: 0.48, scale: 1.8 } },
            { text: 'Monet bu köprüyü kendi bahçesine yaptırmış. Bahçesini ve gölünü çok severmiş.', focus: { x: 0.47, y: 0.67, scale: 2.0 } },
            { text: 'Etrafta ağaçlar, çiçekler ve otlar var. Her yer yemyeşil!', focus: { x: 0.18, y: 0.11, scale: 2.0 } },
            { text: 'Sen de hayalindeki bahçeyi çizebilirsin!', focus: null, pauseAfterMs: 2500 },
        ],
    },
    {
        id: 'elmali-naturmort',
        tier: 'fidan',
        title: 'Elmalı Natürmort',
        artist: 'Paul Cézanne',
        yearLabel: '1893 – 1894',
        country: 'Fransa',
        aspect: 1.251,
        accent: '#A5522E',
        credit: {
            source: 'Wikimedia Commons',
            commonsFile: 'Paul Cézanne - Still Life with Apples - Google Art Project.jpg',
            license: 'Public domain',
            museum: 'J. Paul Getty Museum, Los Angeles',
        },
        segments: [
            { text: "Bu tablonun adı Elmalı Natürmort. Paul Sezan adında Fransız bir ressam yapmış. Tablo, Amerika'da bir müzede duruyor.", focus: null },
            { text: 'Tabloya bak. Masanın üstünde neler var? Sen de say bakalım.', focus: null, pauseAfterMs: 5000 },
            { text: 'Natürmort, masanın üstündeki eşyaların resmi demek. Burada elmalar, bir vazo ve bir şişe var.', focus: { x: 0.4, y: 0.45, scale: 1.6 } },
            { text: 'Elmalar kırmızı, sarı ve yeşil renklerde. Bulabilir misin?', focus: { x: 0.62, y: 0.65, scale: 2.6 } },
            { text: 'Masa örtüsü kıvrım kıvrım duruyor. Sezan her şeye çok dikkatle bakıp çizmiş.', focus: { x: 0.78, y: 0.8, scale: 2.0 } },
            { text: 'Sen de evindeki meyvelere bakıp bir natürmort çizebilirsin!', focus: null, pauseAfterMs: 2500 },
        ],
    },
];

export const getPainting = (id: string): Painting | undefined => PAINTINGS.find((p) => p.id === id);

/** Anlatımda okunacak TÜM metinler (VoiceBox üretim listesi + test için). */
export const allMuseumTexts = (): string[] => [
    MUSEUM_INTRO,
    MUSEUM_DONE,
    MUSEUM_DRAW_INTRO,
    ...allHuntTexts(),
    ...allPuzzleTexts(),
    ...PAINTINGS.flatMap((p) => p.segments.map((s) => s.text)),
];
