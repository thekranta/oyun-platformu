import React from 'react';
import { GameResultExtraData } from '../services/gameResults';
import { lazyWithReload } from '../lib/lazyWithReload';

const AdaletHikayesi = lazyWithReload(() => import('./AdaletHikayesi'));
const AileSepetiMacerasi = lazyWithReload(() => import('./AileSepetiMacerasi'));
const AyiAilesi = lazyWithReload(() => import('./AyiAilesi'));
const AyniFarkli = lazyWithReload(() => import('./AyniFarkli'));
const BunuSoyle = lazyWithReload(() => import('./BunuSoyle'));
const CevizMacera = lazyWithReload(() => import('./CevizMacera'));
const CiftlikteSayalim = lazyWithReload(() => import('./CiftlikteSayalim'));
const BuyukOrtaKucuk = lazyWithReload(() => import('./BuyukOrtaKucuk'));
const HangisiFarkli = lazyWithReload(() => import('./HangisiFarkli'));
const Neredeyim = lazyWithReload(() => import('./Neredeyim'));
const OnceSonra = lazyWithReload(() => import('./OnceSonra'));
const SayiyiBul = lazyWithReload(() => import('./SayiyiBul'));
const EnUzun = lazyWithReload(() => import('./EnUzun'));
const DogruKutu = lazyWithReload(() => import('./DogruKutu'));
const IkizleriBul = lazyWithReload(() => import('./IkizleriBul'));
const NeIseYarar = lazyWithReload(() => import('./NeIseYarar'));
const RenkOruntusu = lazyWithReload(() => import('./RenkOruntusu'));
const NoktaSay = lazyWithReload(() => import('./NoktaSay'));
const CanliCansiz = lazyWithReload(() => import('./CanliCansiz'));
const YuzerBatar = lazyWithReload(() => import('./YuzerBatar'));
const DuyguEslestir = lazyWithReload(() => import('./DuyguEslestir'));
const SirayiHatirla = lazyWithReload(() => import('./SirayiHatirla'));
const AgirHafif = lazyWithReload(() => import('./AgirHafif'));
const GunduzGece = lazyWithReload(() => import('./GunduzGece'));
const KacOldu = lazyWithReload(() => import('./KacOldu'));
const RenkleriKaristir = lazyWithReload(() => import('./RenkleriKaristir'));
const SekilDeligi = lazyWithReload(() => import('./SekilDeligi'));
const AzCokSirala = lazyWithReload(() => import('./AzCokSirala'));
const IlkHarf = lazyWithReload(() => import('./IlkHarf'));
const IyilikYap = lazyWithReload(() => import('./IyilikYap'));
const NeDegisti = lazyWithReload(() => import('./NeDegisti'));
const KacKaldi = lazyWithReload(() => import('./KacKaldi'));
const BuyukSayi = lazyWithReload(() => import('./BuyukSayi'));
const CizimSayfalari = lazyWithReload(() => import('./CizimSayfalari'));
const SimetriCizim = lazyWithReload(() => import('./SimetriCizim'));
const DamgaSanati = lazyWithReload(() => import('./DamgaSanati'));
const BoyamaKitabi = lazyWithReload(() => import('./BoyamaKitabi'));
const NoktaBirlestir = lazyWithReload(() => import('./NoktaBirlestir'));
const SayiBoya = lazyWithReload(() => import('./SayiBoya'));
const SayiBoya2 = lazyWithReload(() => import('./SayiBoya2'));
const Mandala = lazyWithReload(() => import('./Mandala'));
const NoktaBoyama = lazyWithReload(() => import('./NoktaBoyama'));
const CizimiCanlandir = lazyWithReload(() => import('./CizimiCanlandir'));
const YuzYap = lazyWithReload(() => import('./YuzYap'));
const YarisiniTamamla = lazyWithReload(() => import('./YarisiniTamamla'));
const KumBoyasi = lazyWithReload(() => import('./KumBoyasi'));
const AdimAdim = lazyWithReload(() => import('./AdimAdim'));
const Vucudum = lazyWithReload(() => import('./Vucudum'));
const Duyularimiz = lazyWithReload(() => import('./Duyularimiz'));
const SaglikliYiyecek = lazyWithReload(() => import('./SaglikliYiyecek'));
const TemizlikZamani = lazyWithReload(() => import('./TemizlikZamani'));
const GuvendeKal = lazyWithReload(() => import('./GuvendeKal'));
const HavaKiyafet = lazyWithReload(() => import('./HavaKiyafet'));
const Labirent = lazyWithReload(() => import('./Labirent'));
const HayvanEvi = lazyWithReload(() => import('./HayvanEvi'));
const Meslekler = lazyWithReload(() => import('./Meslekler'));
const Buyuyunce = lazyWithReload(() => import('./Buyuyunce'));
const GeriDonusum = lazyWithReload(() => import('./GeriDonusum'));
const EsitPaylastir = lazyWithReload(() => import('./EsitPaylastir'));
const AraclarNerede = lazyWithReload(() => import('./AraclarNerede'));
const NeYer = lazyWithReload(() => import('./NeYer'));
const NeNerede = lazyWithReload(() => import('./NeNerede'));
const Gunum = lazyWithReload(() => import('./Gunum'));
const RenkTonlari = lazyWithReload(() => import('./RenkTonlari'));
const SicakSoguk = lazyWithReload(() => import('./SicakSoguk'));
const DiziyiTamamla = lazyWithReload(() => import('./DiziyiTamamla'));
const DuyguYuzleri = lazyWithReload(() => import('./DuyguYuzleri'));
const EksikSayiBul = lazyWithReload(() => import('./EksikSayiBul'));
const GruplamaOyunu = lazyWithReload(() => import('./GruplamaOyunu'));
const HafizaOyunu = lazyWithReload(() => import('./HafizaOyunu'));
const KodlamaOyunu = lazyWithReload(() => import('./KodlamaOyunu'));
const KutuyuBul = lazyWithReload(() => import('./KutuyuBul'));
const MutfakDedektifi = lazyWithReload(() => import('./MutfakDedektifi'));
const MuzikCalar = lazyWithReload(() => import('./MuzikCalar'));
const OnlukCerceve = lazyWithReload(() => import('./OnlukCerceve'));
const QuantityComparison = lazyWithReload(() => import('./QuantityComparison'));
const RakamYazma = lazyWithReload(() => import('./RakamYazma'));
const RakamYazma2 = lazyWithReload(() => import('./RakamYazma2'));
const AkilliSayiAvi = lazyWithReload(() => import('./AkilliSayiAvi'));
const AkilliOruntu = lazyWithReload(() => import('./AkilliOruntu'));
const AkilliMiktar = lazyWithReload(() => import('./AkilliMiktar'));
const AkilliEksikSayi = lazyWithReload(() => import('./AkilliEksikSayi'));
const AkilliSiralama = lazyWithReload(() => import('./AkilliSiralama'));
const AkilliToplama = lazyWithReload(() => import('./AkilliToplama'));
const AkilliFarkli = lazyWithReload(() => import('./AkilliFarkli'));
const AkilliCikarma = lazyWithReload(() => import('./AkilliCikarma'));
const AkilliHafiza = lazyWithReload(() => import('./AkilliHafiza'));
const AkilliHarf = lazyWithReload(() => import('./AkilliHarf'));
const AkilliSiniflandir = lazyWithReload(() => import('./AkilliSiniflandir'));
const AkilliOnceSonra = lazyWithReload(() => import('./AkilliOnceSonra'));
const DunyaBayraklari = lazyWithReload(() => import('./DunyaBayraklari'));
const DunyaSelamlari = lazyWithReload(() => import('./DunyaSelamlari'));
import KulturEslestirme, { YAPILAR, YIYECEKLER } from './KulturEslestirme';
const BayrakBoya = lazyWithReload(() => import('./BayrakBoya'));
const RenkliBaglantalar = lazyWithReload(() => import('./RenkliBaglantalar'));
const RenkSepetleri = lazyWithReload(() => import('./RenkSepetleri'));
const SayiKomsulari = lazyWithReload(() => import('./SayiKomsulari'));
const SevgiHikayesi = lazyWithReload(() => import('./SevgiHikayesi'));
const SayilariBirlestir = lazyWithReload(() => import('./SayilariBirlestir'));
const SekilTreni = lazyWithReload(() => import('./SekilTreni'));
const ShadowDetective = lazyWithReload(() => import('./ShadowDetective'));
const SihirliSiseler = lazyWithReload(() => import('./SihirliSiseler'));
const SihirliTuval = lazyWithReload(() => import('./SihirliTuval'));
const SiralamaOyunu = lazyWithReload(() => import('./SiralamaOyunu'));
const TartiDengesi = lazyWithReload(() => import('./TartiDengesi'));
const UzayBloklari = lazyWithReload(() => import('./UzayBloklari'));
const ZitlariEslestir = lazyWithReload(() => import('./ZitlariEslestir'));
const YapbozOyunu = lazyWithReload(() => import('./YapbozOyunu'));
const YaraticiCizim = lazyWithReload(() => import('./YaraticiCizim'));
const KafiyeBahcesi = lazyWithReload(() => import('./KafiyeBahcesi'));
const ResimdeNeTers = lazyWithReload(() => import('./ResimdeNeTers'));
const SonraNeOlur = lazyWithReload(() => import('./SonraNeOlur'));
const MinikMarket = lazyWithReload(() => import('./MinikMarket'));
const HazineHaritasi = lazyWithReload(() => import('./HazineHaritasi'));
const GrafikUstasi = lazyWithReload(() => import('./GrafikUstasi'));
const ResimdeNeOluyor = lazyWithReload(() => import('./ResimdeNeOluyor'));
const IzDedektifi = lazyWithReload(() => import('./IzDedektifi'));
const MevsimBahcesi = lazyWithReload(() => import('./MevsimBahcesi'));
const ManzaraKasifi = lazyWithReload(() => import('./ManzaraKasifi'));
const MuzikDuruncaDon = lazyWithReload(() => import('./MuzikDuruncaDon'));
const SakinlesmeBahcesi = lazyWithReload(() => import('./SakinlesmeBahcesi'));
const KucukAnlatici = lazyWithReload(() => import('./KucukAnlatici'));
const SanatGozlugu = lazyWithReload(() => import('./SanatGozlugu'));
const TablodaNeVar = lazyWithReload(() => import('./TablodaNeVar'));
const RenkAtolyesi = lazyWithReload(() => import('./RenkAtolyesi'));
const HangiCalgiCaldi = lazyWithReload(() => import('./HangiCalgiCaldi'));
const SesNasil = lazyWithReload(() => import('./SesNasil'));
const DavulUstasi = lazyWithReload(() => import('./DavulUstasi'));
const OdaminKrokisi = lazyWithReload(() => import('./OdaminKrokisi'));
const HayvanJimnastigi = lazyWithReload(() => import('./HayvanJimnastigi'));

/**
 * Oyun sonucu bildirimi. index.tsx'teki oyunuBitir ile ayni imza.
 */
export type OnGameEnd = (
  oyunAdi: string,
  sure: number,
  finalHamle: number,
  finalHata: number,
  algilananKelime?: string,
  extraData?: GameResultExtraData,
) => void;

/**
 * Bir oyunu render etmek icin gereken baglamsal degerler. index.tsx bunlari saglar;
 * her oyun kendine ozel prop'larini bu baglamdan turetir.
 */
export interface GameRenderContext {
  onGameEnd: OnGameEnd;
  onExit: () => void;
  ad: string;
  yas: string;
  email: string;
  selectedSongIndex: number;
}

/**
 * routeKey -> render fonksiyonu haritasi. Yeni oyun eklemek icin:
 *  1) components/ altinda bilesenini olustur,
 *  2) constants/gameCatalog.ts'e katalog kaydini ekle,
 *  3) buraya routeKey -> render satirini ekle.
 * index.tsx'e dokunmaya gerek yok.
 */
export const GAME_RENDERERS: Record<string, (ctx: GameRenderContext) => React.ReactNode> = {
  hafiza: (c) => <HafizaOyunu onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'hafiza-2': (c) => (
    <HafizaOyunu
      onGameEnd={c.onGameEnd}
      onExit={c.onExit}
      emojiSet={['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨']}
      oyunAdi="hafiza-2"
      title="🐾 Hayvan Çiftleri"
      introMessage="Hayvan Çiftlerine hoş geldin! Kartların çiftlerini bulmaya çalış!"
    />
  ),
  siralama: (c) => <SiralamaOyunu onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'eksik-sayi-bul': (c) => <EksikSayiBul onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'eksik-sayi-bul-2': (c) => <EksikSayiBul onGameEnd={c.onGameEnd} onExit={c.onExit} numbers={[6, 7, 8, 9, 10]} oyunAdi="eksik-sayi-bul-2" />,
  'akilli-sayi-avi': (c) => <AkilliSayiAvi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'akilli-oruntu': (c) => <AkilliOruntu onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'akilli-miktar': (c) => <AkilliMiktar onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'akilli-eksik-sayi': (c) => <AkilliEksikSayi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'akilli-siralama': (c) => <AkilliSiralama onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'akilli-toplama': (c) => <AkilliToplama onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'akilli-farkli': (c) => <AkilliFarkli onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'akilli-cikarma': (c) => <AkilliCikarma onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'akilli-hafiza': (c) => <AkilliHafiza onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'akilli-harf': (c) => <AkilliHarf onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'akilli-siniflandir': (c) => <AkilliSiniflandir onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'akilli-once-sonra': (c) => <AkilliOnceSonra onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'dunya-bayraklari': (c) => <DunyaBayraklari onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'bayrak-boya': (c) => <BayrakBoya onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'dunya-selamlari': (c) => <DunyaSelamlari onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'dunya-yapilari': (c) => (
    <KulturEslestirme
      onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad}
      items={YAPILAR} oyunAdi="dunya-yapilari" title="🏛️ Dünya Yapıları"
      kazanimOdagi="SAB.2 Kültürel yapıları tanıma (Montessori)"
      introMessage="Dünyanın farklı yapıları ve anıtları! Aynısını sakince bul."
      doneText="Aferin! Tüm yapıları keşfettin."
    />
  ),
  'dunya-yiyecekleri': (c) => (
    <KulturEslestirme
      onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad}
      items={YIYECEKLER} oyunAdi="dunya-yiyecekleri" title="🍽️ Dünya Yiyecekleri"
      kazanimOdagi="SAB.2 Kültürel yiyecekleri tanıma (Montessori)"
      introMessage="Dünyanın farklı lezzetleri! Aynısını sakince bul."
      doneText="Aferin! Tüm lezzetleri keşfettin."
    />
  ),
  gruplama: (c) => <GruplamaOyunu onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'diziyi-tamamla': (c) => <DiziyiTamamla onGameEnd={c.onGameEnd} onLogout={c.onExit} />,
  'diziyi-tamamla-2': (c) => (
    <DiziyiTamamla
      onGameEnd={c.onGameEnd}
      onLogout={c.onExit}
      oyunAdi="diziyi-tamamla-2"
      title="Örüntü Ustası 🌟"
      patterns={[
        // Basit giriş sahneleri: yalnızca 2 şekil, düz "ABAB" tekrarı — zorluk buradan kademeli artar.
        { sequence: ['kare', 'ucgen', 'kare', 'ucgen', 'kare'], answer: 'ucgen', options: ['ucgen', 'kare', 'daire', 'yildiz'] },
        { sequence: ['daire', 'yildiz', 'daire', 'yildiz', 'daire'], answer: 'yildiz', options: ['yildiz', 'daire', 'kare', 'ucgen'] },
        { sequence: ['yildiz', 'daire', 'yildiz', 'daire', 'yildiz'], answer: 'daire', options: ['daire', 'yildiz', 'kare', 'ucgen'] },
        { sequence: ['kare', 'ucgen', 'yildiz', 'kare', 'ucgen'], answer: 'yildiz', options: ['yildiz', 'kare', 'ucgen', 'daire'] },
        { sequence: ['daire', 'daire', 'ucgen', 'daire', 'daire'], answer: 'ucgen', options: ['ucgen', 'daire', 'yildiz', 'kare'] },
        { sequence: ['ucgen', 'kare', 'yildiz', 'ucgen', 'kare'], answer: 'yildiz', options: ['yildiz', 'ucgen', 'kare', 'daire'] },
        { sequence: ['yildiz', 'kare', 'daire', 'yildiz', 'kare'], answer: 'daire', options: ['daire', 'yildiz', 'kare', 'ucgen'] },
      ]}
    />
  ),
  'diziyi-tamamla-3': (c) => (
    <DiziyiTamamla
      onGameEnd={c.onGameEnd}
      onLogout={c.onExit}
      oyunAdi="diziyi-tamamla-3"
      title="İlk Örüntüm 🔰"
      introMessage="Sırada hangi şekil var, hep beraber bulalım!"
      patterns={[
        { sequence: ['kare', 'daire', 'kare'], answer: 'daire', options: ['daire', 'kare'] },
        { sequence: ['daire', 'yildiz', 'daire'], answer: 'yildiz', options: ['yildiz', 'daire'] },
        { sequence: ['yildiz', 'ucgen', 'yildiz'], answer: 'ucgen', options: ['ucgen', 'yildiz'] },
        { sequence: ['ucgen', 'kare', 'ucgen'], answer: 'kare', options: ['kare', 'ucgen'] },
        { sequence: ['kare', 'yildiz', 'kare'], answer: 'yildiz', options: ['yildiz', 'kare'] },
      ]}
    />
  ),
  'bunu-soyle': (c) => <BunuSoyle onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  kodlama: (c) => <KodlamaOyunu onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'rakam-yazma': (c) => <RakamYazma onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'rakam-yazma-2': (c) => <RakamYazma2 onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'kutuyu-bul': (c) => <KutuyuBul onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'sayilari-birlestir': (c) => <SayilariBirlestir onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  yapboz: (c) => <YapbozOyunu onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'golge-dedektifi': (c) => (
    <ShadowDetective
      config={{ level: 1, itemCount: 3, hasDistractors: false, assets: { objects: [], shadows: [] } }}
      onGameEnd={c.onGameEnd}
      onExit={c.onExit}
    />
  ),
  'golge-dedektifi-2': (c) => (
    <ShadowDetective
      config={{
        level: 2,
        oyunAdi: 'golge-dedektifi-2',
        roundConfigs: [
          { count: 4, distractors: 1 },
          { count: 4, distractors: 1 },
          { count: 5, distractors: 2 },
          { count: 5, distractors: 2 },
          { count: 6, distractors: 2 },
          { count: 6, distractors: 3 },
        ],
        assets: { objects: [], shadows: [] },
      }}
      onGameEnd={c.onGameEnd}
      onExit={c.onExit}
    />
  ),
  'onluk-cerceve': (c) => <OnlukCerceve onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'onluk-cerceve-2': (c) => (
    <OnlukCerceve
      onGameEnd={c.onGameEnd}
      onExit={c.onExit}
      fruitEmoji="🌟"
      fruitWord="yıldız"
      oyunAdi="onluk-cerceve-2"
      targetRange={[6, 10]}
      introMessage="Söylenen sayı kadar yıldızı çerçeveye koy!"
    />
  ),
  'sayi-komsulari': (c) => <SayiKomsulari onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'tarti-dengesi': (c) => <TartiDengesi onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'miktar-karsilastirma': (c) => <QuantityComparison onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'miktar-avcisi-2': (c) => (
    <QuantityComparison
      onGameEnd={c.onGameEnd}
      onExit={c.onExit}
      fruits={{ left: '🐟', right: '🐙' }}
      oyunAdi="miktar-avcisi-2"
      introMessage="Deniz Avcısına hoş geldin! Hangisi daha çok veya az, bul!"
    />
  ),
  'ceviz-macera': (c) => <CevizMacera onExit={c.onExit} userId={c.ad} userEmail={c.email} userAge={parseInt(c.yas)} />,
  'aile-sepeti-macerasi': (c) => (
    <AileSepetiMacerasi onExit={c.onExit} onGameEnd={c.onGameEnd} userId={c.ad} userEmail={c.email} userAge={parseInt(c.yas)} />
  ),
  'adalet-hikayesi': (c) => (
    <AdaletHikayesi onExit={c.onExit} onGameEnd={c.onGameEnd} userId={c.ad} userEmail={c.email} userAge={parseInt(c.yas)} />
  ),
  'sevgi-hikayesi': (c) => (
    <SevgiHikayesi onExit={c.onExit} onGameEnd={c.onGameEnd} userId={c.ad} userEmail={c.email} userAge={parseInt(c.yas)} />
  ),
  'yaratici-cizim': (c) => <YaraticiCizim onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'muzik-calar': (c) => <MuzikCalar onExit={c.onExit} initialSongIndex={c.selectedSongIndex} />,
  'sihirli-siseler': (c) => (
    <SihirliSiseler
      childName={c.ad}
      childAge={parseInt(c.yas) || 48}
      email={c.email}
      onClose={c.onExit}
      onGameEnd={(data) =>
        // data.sure = saniye (dogru), data.response_time = ms (Dakika istatistigini sisiriyordu).
        // Analitik alanlar (correct_answers, cognitive_speed_score, response_time, zorluk, round_history)
        // diger oyunlardaki gibi extraData ile iletilir; onceden tamamen dusuyordu.
        c.onGameEnd('sihirli-siseler', data.sure, data.total_moves ?? 0, data.hata_sayisi ?? 0, undefined, {
          zorlukSeviyesi: data.zorluk_seviyesi,
          response_time: data.response_time,
          correct_answers: data.correct_answers,
          cognitive_speed_score: data.cognitive_speed_score,
          round_history: data.round_history,
        })
      }
    />
  ),
  'sihirli-tuval': (c) => <SihirliTuval onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'uzay-bloklari': (c) => <UzayBloklari onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'renkli-baglantalar': (c) => <RenkliBaglantalar onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'mutfak-dedektifi': (c) => <MutfakDedektifi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'duygu-yuzleri': (c) => <DuyguYuzleri onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'renk-sepetleri': (c) => <RenkSepetleri onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'zitlari-eslestir': (c) => <ZitlariEslestir onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'sekil-treni': (c) => <SekilTreni onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'ayi-ailesi': (c) => <AyiAilesi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'ciftlikte-sayalim': (c) => <CiftlikteSayalim onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'ayni-farkli': (c) => <AyniFarkli onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'hangisi-farkli': (c) => <HangisiFarkli onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'buyuk-orta-kucuk': (c) => <BuyukOrtaKucuk onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'neredeyim': (c) => <Neredeyim onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'once-sonra': (c) => <OnceSonra onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'sayiyi-bul': (c) => <SayiyiBul onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'en-uzun': (c) => <EnUzun onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'dogru-kutu': (c) => <DogruKutu onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'ikizleri-bul': (c) => <IkizleriBul onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'ne-ise-yarar': (c) => <NeIseYarar onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'renk-oruntusu': (c) => <RenkOruntusu onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'nokta-say': (c) => <NoktaSay onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'canli-cansiz': (c) => <CanliCansiz onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'yuzer-batar': (c) => <YuzerBatar onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'duygu-eslestir': (c) => <DuyguEslestir onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'sirayi-hatirla': (c) => <SirayiHatirla onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'agir-hafif': (c) => <AgirHafif onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'gunduz-gece': (c) => <GunduzGece onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'kac-oldu': (c) => <KacOldu onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'renkleri-karistir': (c) => <RenkleriKaristir onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'sekil-deligi': (c) => <SekilDeligi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'az-cok-sirala': (c) => <AzCokSirala onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'ilk-harf': (c) => <IlkHarf onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'iyilik-yap': (c) => <IyilikYap onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'ne-degisti': (c) => <NeDegisti onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'kac-kaldi': (c) => <KacKaldi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'buyuk-sayi': (c) => <BuyukSayi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'cizim-sayfalari': (c) => <CizimSayfalari onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'simetri-cizim': (c) => <SimetriCizim onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'damga-sanati': (c) => <DamgaSanati onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'boyama-kitabi': (c) => <BoyamaKitabi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'nokta-birlestir': (c) => <NoktaBirlestir onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'sayi-boya': (c) => <SayiBoya onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'sayi-boya-2': (c) => <SayiBoya2 onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'mandala': (c) => <Mandala onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'nokta-boyama': (c) => <NoktaBoyama onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'cizimi-canlandir': (c) => <CizimiCanlandir onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'yuz-yap': (c) => <YuzYap onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'yarisini-tamamla': (c) => <YarisiniTamamla onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'kum-boyasi': (c) => <KumBoyasi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'adim-adim': (c) => <AdimAdim onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'vucudum': (c) => <Vucudum onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'duyularimiz': (c) => <Duyularimiz onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'saglikli-yiyecek': (c) => <SaglikliYiyecek onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'temizlik-zamani': (c) => <TemizlikZamani onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'guvende-kal': (c) => <GuvendeKal onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'hava-kiyafet': (c) => <HavaKiyafet onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'labirent': (c) => <Labirent onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'hayvan-evi': (c) => <HayvanEvi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'meslekler': (c) => <Meslekler onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'buyuyunce': (c) => <Buyuyunce onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'geri-donusum': (c) => <GeriDonusum onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'esit-paylastir': (c) => <EsitPaylastir onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'araclar': (c) => <AraclarNerede onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'ne-yer': (c) => <NeYer onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'ne-nerede': (c) => <NeNerede onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'gunum': (c) => <Gunum onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'renk-tonlari': (c) => <RenkTonlari onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'sicak-soguk': (c) => <SicakSoguk onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'kafiye-bahcesi': (c) => <KafiyeBahcesi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'resimde-ne-ters': (c) => <ResimdeNeTers onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'sonra-ne-olur': (c) => <SonraNeOlur onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'minik-market': (c) => <MinikMarket onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'hazine-haritasi': (c) => <HazineHaritasi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'grafik-ustasi': (c) => <GrafikUstasi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'resimde-ne-oluyor': (c) => <ResimdeNeOluyor onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'iz-dedektifi': (c) => <IzDedektifi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'mevsim-bahcesi': (c) => <MevsimBahcesi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'manzara-kasifi': (c) => <ManzaraKasifi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'muzik-durunca-don': (c) => <MuzikDuruncaDon onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'sakinlesme-bahcesi': (c) => <SakinlesmeBahcesi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'kucuk-anlatici': (c) => <KucukAnlatici onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'sanat-gozlugu': (c) => <SanatGozlugu onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'tabloda-ne-var': (c) => <TablodaNeVar onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'renk-atolyesi': (c) => <RenkAtolyesi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'hangi-calgi-caldi': (c) => <HangiCalgiCaldi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'ses-nasil': (c) => <SesNasil onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'davul-ustasi': (c) => <DavulUstasi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'odamin-krokisi': (c) => <OdaminKrokisi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'hayvan-jimnastigi': (c) => <HayvanJimnastigi onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
};
