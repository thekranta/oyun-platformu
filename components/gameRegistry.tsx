import React from 'react';
import { GameResultExtraData } from '../services/gameResults';

const AdaletHikayesi = React.lazy(() => import('./AdaletHikayesi'));
const AileSepetiMacerasi = React.lazy(() => import('./AileSepetiMacerasi'));
const AyiAilesi = React.lazy(() => import('./AyiAilesi'));
const AyniFarkli = React.lazy(() => import('./AyniFarkli'));
const BunuSoyle = React.lazy(() => import('./BunuSoyle'));
const CevizMacera = React.lazy(() => import('./CevizMacera'));
const CiftlikteSayalim = React.lazy(() => import('./CiftlikteSayalim'));
const BuyukOrtaKucuk = React.lazy(() => import('./BuyukOrtaKucuk'));
const HangisiFarkli = React.lazy(() => import('./HangisiFarkli'));
const Neredeyim = React.lazy(() => import('./Neredeyim'));
const OnceSonra = React.lazy(() => import('./OnceSonra'));
const SayiyiBul = React.lazy(() => import('./SayiyiBul'));
const EnUzun = React.lazy(() => import('./EnUzun'));
const DogruKutu = React.lazy(() => import('./DogruKutu'));
const IkizleriBul = React.lazy(() => import('./IkizleriBul'));
const NeIseYarar = React.lazy(() => import('./NeIseYarar'));
const RenkOruntusu = React.lazy(() => import('./RenkOruntusu'));
const NoktaSay = React.lazy(() => import('./NoktaSay'));
const CanliCansiz = React.lazy(() => import('./CanliCansiz'));
const YuzerBatar = React.lazy(() => import('./YuzerBatar'));
const DuyguEslestir = React.lazy(() => import('./DuyguEslestir'));
const SirayiHatirla = React.lazy(() => import('./SirayiHatirla'));
const AgirHafif = React.lazy(() => import('./AgirHafif'));
const GunduzGece = React.lazy(() => import('./GunduzGece'));
const KacOldu = React.lazy(() => import('./KacOldu'));
const RenkleriKaristir = React.lazy(() => import('./RenkleriKaristir'));
const SekilDeligi = React.lazy(() => import('./SekilDeligi'));
const AzCokSirala = React.lazy(() => import('./AzCokSirala'));
const IlkHarf = React.lazy(() => import('./IlkHarf'));
const IyilikYap = React.lazy(() => import('./IyilikYap'));
const NeDegisti = React.lazy(() => import('./NeDegisti'));
const KacKaldi = React.lazy(() => import('./KacKaldi'));
const BuyukSayi = React.lazy(() => import('./BuyukSayi'));
const CizimSayfalari = React.lazy(() => import('./CizimSayfalari'));
const SimetriCizim = React.lazy(() => import('./SimetriCizim'));
const DamgaSanati = React.lazy(() => import('./DamgaSanati'));
const BoyamaKitabi = React.lazy(() => import('./BoyamaKitabi'));
const NoktaBirlestir = React.lazy(() => import('./NoktaBirlestir'));
const SayiBoya = React.lazy(() => import('./SayiBoya'));
const SayiBoya2 = React.lazy(() => import('./SayiBoya2'));
const Mandala = React.lazy(() => import('./Mandala'));
const NoktaBoyama = React.lazy(() => import('./NoktaBoyama'));
const CizimiCanlandir = React.lazy(() => import('./CizimiCanlandir'));
const YuzYap = React.lazy(() => import('./YuzYap'));
const YarisiniTamamla = React.lazy(() => import('./YarisiniTamamla'));
const KumBoyasi = React.lazy(() => import('./KumBoyasi'));
const AdimAdim = React.lazy(() => import('./AdimAdim'));
const Vucudum = React.lazy(() => import('./Vucudum'));
const Duyularimiz = React.lazy(() => import('./Duyularimiz'));
const SaglikliYiyecek = React.lazy(() => import('./SaglikliYiyecek'));
const TemizlikZamani = React.lazy(() => import('./TemizlikZamani'));
const GuvendeKal = React.lazy(() => import('./GuvendeKal'));
const HavaKiyafet = React.lazy(() => import('./HavaKiyafet'));
const Labirent = React.lazy(() => import('./Labirent'));
const HayvanEvi = React.lazy(() => import('./HayvanEvi'));
const Meslekler = React.lazy(() => import('./Meslekler'));
const Buyuyunce = React.lazy(() => import('./Buyuyunce'));
const GeriDonusum = React.lazy(() => import('./GeriDonusum'));
const EsitPaylastir = React.lazy(() => import('./EsitPaylastir'));
const AraclarNerede = React.lazy(() => import('./AraclarNerede'));
const NeYer = React.lazy(() => import('./NeYer'));
const NeNerede = React.lazy(() => import('./NeNerede'));
const Gunum = React.lazy(() => import('./Gunum'));
const RenkTonlari = React.lazy(() => import('./RenkTonlari'));
const SicakSoguk = React.lazy(() => import('./SicakSoguk'));
const DiziyiTamamla = React.lazy(() => import('./DiziyiTamamla'));
const DuyguYuzleri = React.lazy(() => import('./DuyguYuzleri'));
const EksikSayiBul = React.lazy(() => import('./EksikSayiBul'));
const GruplamaOyunu = React.lazy(() => import('./GruplamaOyunu'));
const HafizaOyunu = React.lazy(() => import('./HafizaOyunu'));
const KodlamaOyunu = React.lazy(() => import('./KodlamaOyunu'));
const KutuyuBul = React.lazy(() => import('./KutuyuBul'));
const MutfakDedektifi = React.lazy(() => import('./MutfakDedektifi'));
const MuzikCalar = React.lazy(() => import('./MuzikCalar'));
const OnlukCerceve = React.lazy(() => import('./OnlukCerceve'));
const QuantityComparison = React.lazy(() => import('./QuantityComparison'));
const RakamYazma = React.lazy(() => import('./RakamYazma'));
const RakamYazma2 = React.lazy(() => import('./RakamYazma2'));
const AkilliSayiAvi = React.lazy(() => import('./AkilliSayiAvi'));
const AkilliOruntu = React.lazy(() => import('./AkilliOruntu'));
const AkilliMiktar = React.lazy(() => import('./AkilliMiktar'));
const AkilliEksikSayi = React.lazy(() => import('./AkilliEksikSayi'));
const AkilliSiralama = React.lazy(() => import('./AkilliSiralama'));
const AkilliToplama = React.lazy(() => import('./AkilliToplama'));
const AkilliFarkli = React.lazy(() => import('./AkilliFarkli'));
const AkilliCikarma = React.lazy(() => import('./AkilliCikarma'));
const AkilliHafiza = React.lazy(() => import('./AkilliHafiza'));
const AkilliHarf = React.lazy(() => import('./AkilliHarf'));
const AkilliSiniflandir = React.lazy(() => import('./AkilliSiniflandir'));
const AkilliOnceSonra = React.lazy(() => import('./AkilliOnceSonra'));
const DunyaBayraklari = React.lazy(() => import('./DunyaBayraklari'));
const DunyaSelamlari = React.lazy(() => import('./DunyaSelamlari'));
import KulturEslestirme, { YAPILAR, YIYECEKLER } from './KulturEslestirme';
const BayrakBoya = React.lazy(() => import('./BayrakBoya'));
const RenkliBaglantalar = React.lazy(() => import('./RenkliBaglantalar'));
const RenkSepetleri = React.lazy(() => import('./RenkSepetleri'));
const SayiKomsulari = React.lazy(() => import('./SayiKomsulari'));
const SevgiHikayesi = React.lazy(() => import('./SevgiHikayesi'));
const SayilariBirlestir = React.lazy(() => import('./SayilariBirlestir'));
const SekilTreni = React.lazy(() => import('./SekilTreni'));
const ShadowDetective = React.lazy(() => import('./ShadowDetective'));
const SihirliSiseler = React.lazy(() => import('./SihirliSiseler'));
const SihirliTuval = React.lazy(() => import('./SihirliTuval'));
const SiralamaOyunu = React.lazy(() => import('./SiralamaOyunu'));
const TartiDengesi = React.lazy(() => import('./TartiDengesi'));
const UzayBloklari = React.lazy(() => import('./UzayBloklari'));
const ZitlariEslestir = React.lazy(() => import('./ZitlariEslestir'));
const YapbozOyunu = React.lazy(() => import('./YapbozOyunu'));
const YaraticiCizim = React.lazy(() => import('./YaraticiCizim'));
const KafiyeBahcesi = React.lazy(() => import('./KafiyeBahcesi'));
const ResimdeNeTers = React.lazy(() => import('./ResimdeNeTers'));
const SonraNeOlur = React.lazy(() => import('./SonraNeOlur'));
const MinikMarket = React.lazy(() => import('./MinikMarket'));
const HazineHaritasi = React.lazy(() => import('./HazineHaritasi'));
const GrafikUstasi = React.lazy(() => import('./GrafikUstasi'));
const ResimdeNeOluyor = React.lazy(() => import('./ResimdeNeOluyor'));
const IzDedektifi = React.lazy(() => import('./IzDedektifi'));
const MevsimBahcesi = React.lazy(() => import('./MevsimBahcesi'));
const ManzaraKasifi = React.lazy(() => import('./ManzaraKasifi'));
const MuzikDuruncaDon = React.lazy(() => import('./MuzikDuruncaDon'));
const SakinlesmeBahcesi = React.lazy(() => import('./SakinlesmeBahcesi'));
const KucukAnlatici = React.lazy(() => import('./KucukAnlatici'));
const SanatGozlugu = React.lazy(() => import('./SanatGozlugu'));
const TablodaNeVar = React.lazy(() => import('./TablodaNeVar'));
const RenkAtolyesi = React.lazy(() => import('./RenkAtolyesi'));
const HangiCalgiCaldi = React.lazy(() => import('./HangiCalgiCaldi'));
const SesNasil = React.lazy(() => import('./SesNasil'));
const DavulUstasi = React.lazy(() => import('./DavulUstasi'));
const OdaminKrokisi = React.lazy(() => import('./OdaminKrokisi'));
const HayvanJimnastigi = React.lazy(() => import('./HayvanJimnastigi'));

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
        { sequence: ['yildiz', 'daire', 'yildiz', 'daire', 'yildiz'], answer: 'daire', options: ['daire', 'yildiz', 'kare', 'ucgen'] },
        { sequence: ['kare', 'ucgen', 'yildiz', 'kare', 'ucgen'], answer: 'yildiz', options: ['yildiz', 'kare', 'ucgen', 'daire'] },
        { sequence: ['daire', 'daire', 'ucgen', 'daire', 'daire'], answer: 'ucgen', options: ['ucgen', 'daire', 'yildiz', 'kare'] },
        { sequence: ['ucgen', 'kare', 'yildiz', 'ucgen', 'kare'], answer: 'yildiz', options: ['yildiz', 'ucgen', 'kare', 'daire'] },
        { sequence: ['yildiz', 'kare', 'daire', 'yildiz', 'kare'], answer: 'daire', options: ['daire', 'yildiz', 'kare', 'ucgen'] },
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
