import React from 'react';
import { GameResultExtraData } from '../services/gameResults';

import AdaletHikayesi from './AdaletHikayesi';
import AileSepetiMacerasi from './AileSepetiMacerasi';
import AyiAilesi from './AyiAilesi';
import AyniFarkli from './AyniFarkli';
import BunuSoyle from './BunuSoyle';
import CevizMacera from './CevizMacera';
import CiftlikteSayalim from './CiftlikteSayalim';
import BuyukOrtaKucuk from './BuyukOrtaKucuk';
import HangisiFarkli from './HangisiFarkli';
import Neredeyim from './Neredeyim';
import OnceSonra from './OnceSonra';
import SayiyiBul from './SayiyiBul';
import EnUzun from './EnUzun';
import DogruKutu from './DogruKutu';
import IkizleriBul from './IkizleriBul';
import NeIseYarar from './NeIseYarar';
import RenkOruntusu from './RenkOruntusu';
import NoktaSay from './NoktaSay';
import CanliCansiz from './CanliCansiz';
import YuzerBatar from './YuzerBatar';
import DuyguEslestir from './DuyguEslestir';
import SirayiHatirla from './SirayiHatirla';
import AgirHafif from './AgirHafif';
import GunduzGece from './GunduzGece';
import KacOldu from './KacOldu';
import RenkleriKaristir from './RenkleriKaristir';
import SekilDeligi from './SekilDeligi';
import AzCokSirala from './AzCokSirala';
import IlkHarf from './IlkHarf';
import IyilikYap from './IyilikYap';
import NeDegisti from './NeDegisti';
import KacKaldi from './KacKaldi';
import BuyukSayi from './BuyukSayi';
import CizimSayfalari from './CizimSayfalari';
import SimetriCizim from './SimetriCizim';
import DamgaSanati from './DamgaSanati';
import BoyamaKitabi from './BoyamaKitabi';
import NoktaBirlestir from './NoktaBirlestir';
import SayiBoya from './SayiBoya';
import SayiBoya2 from './SayiBoya2';
import Mandala from './Mandala';
import NoktaBoyama from './NoktaBoyama';
import CizimiCanlandir from './CizimiCanlandir';
import YuzYap from './YuzYap';
import YarisiniTamamla from './YarisiniTamamla';
import KumBoyasi from './KumBoyasi';
import AdimAdim from './AdimAdim';
import Vucudum from './Vucudum';
import Duyularimiz from './Duyularimiz';
import SaglikliYiyecek from './SaglikliYiyecek';
import TemizlikZamani from './TemizlikZamani';
import GuvendeKal from './GuvendeKal';
import HavaKiyafet from './HavaKiyafet';
import Labirent from './Labirent';
import HayvanEvi from './HayvanEvi';
import Meslekler from './Meslekler';
import Buyuyunce from './Buyuyunce';
import GeriDonusum from './GeriDonusum';
import EsitPaylastir from './EsitPaylastir';
import AraclarNerede from './AraclarNerede';
import NeYer from './NeYer';
import NeNerede from './NeNerede';
import Gunum from './Gunum';
import RenkTonlari from './RenkTonlari';
import SicakSoguk from './SicakSoguk';
import DiziyiTamamla from './DiziyiTamamla';
import DuyguYuzleri from './DuyguYuzleri';
import EksikSayiBul from './EksikSayiBul';
import GruplamaOyunu from './GruplamaOyunu';
import HafizaOyunu from './HafizaOyunu';
import KodlamaOyunu from './KodlamaOyunu';
import KutuyuBul from './KutuyuBul';
import MutfakDedektifi from './MutfakDedektifi';
import MuzikCalar from './MuzikCalar';
import OnlukCerceve from './OnlukCerceve';
import QuantityComparison from './QuantityComparison';
import RakamYazma from './RakamYazma';
import RakamYazma2 from './RakamYazma2';
import RenkliBaglantalar from './RenkliBaglantalar';
import RenkSepetleri from './RenkSepetleri';
import SayiKomsulari from './SayiKomsulari';
import SevgiHikayesi from './SevgiHikayesi';
import SayilariBirlestir from './SayilariBirlestir';
import SekilTreni from './SekilTreni';
import ShadowDetective from './ShadowDetective';
import SihirliSiseler from './SihirliSiseler';
import SihirliTuval from './SihirliTuval';
import SiralamaOyunu from './SiralamaOyunu';
import TartiDengesi from './TartiDengesi';
import UzayBloklari from './UzayBloklari';
import ZitlariEslestir from './ZitlariEslestir';
import YapbozOyunu from './YapbozOyunu';
import YaraticiCizim from './YaraticiCizim';

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
  siralama: (c) => <SiralamaOyunu onGameEnd={c.onGameEnd} onExit={c.onExit} childName={c.ad} />,
  'eksik-sayi-bul': (c) => <EksikSayiBul onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  gruplama: (c) => <GruplamaOyunu onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'diziyi-tamamla': (c) => <DiziyiTamamla onGameEnd={c.onGameEnd} onLogout={c.onExit} />,
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
  'onluk-cerceve': (c) => <OnlukCerceve onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'sayi-komsulari': (c) => <SayiKomsulari onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'tarti-dengesi': (c) => <TartiDengesi onGameEnd={c.onGameEnd} onExit={c.onExit} />,
  'miktar-karsilastirma': (c) => <QuantityComparison onGameEnd={c.onGameEnd} onExit={c.onExit} />,
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
      onGameEnd={(data) => c.onGameEnd('sihirli-siseler', data.response_time, data.total_moves, 0)}
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
};
