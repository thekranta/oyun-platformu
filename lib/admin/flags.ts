import { isValidCikti } from '../../constants/maarifCurriculum';
import { AyrisikAnaliz } from './parseAnalysis';

export type BayrakSeviye = 'hata' | 'danisma';

export interface Bayrak {
  id: string;
  seviye: BayrakSeviye;
  metin: string;
  /** İlgili bölüm başlığı — tıklanınca oraya kaydırılır (varsa). */
  hedefBolum?: string;
}

/**
 * Analiz kalitesi kontrolleri. Bayrak OY VERMEZ, yalnız gözü yönlendirir — bu yüzden
 * eşikler kasıtlı gevşek: yanlış pozitifin maliyeti düşük, yanlış negatifin maliyeti
 * (uzmanın gerçek bir hatayı atlaması) yüksek.
 *
 * ÖNEMLİ (R3): AI'nin farklı ama yaşa uygun bir kod seçmesi meşru olabilir (kodlar yaş
 * bandına göre değişebilir — bkz. constants/maarifCurriculum.ts yasaGoreDegisir).
 * Bu yüzden "AI'nin yazdığı kod ≠ beklenen kod" HATA değil, turuncu DANIŞMA'dır.
 */
export function hesaplaBayraklar(params: {
  analiz: AyrisikAnaliz | null;
  beklenenKod: string;
  gelisimGecmisiVarMi: boolean;
}): Bayrak[] {
  const { analiz, beklenenKod, gelisimGecmisiVarMi } = params;
  const bayraklar: Bayrak[] = [];

  if (!analiz) return bayraklar;

  if (!analiz.bicimTam) {
    bayraklar.push({ id: 'bicim', seviye: 'hata', metin: '🚩 Biçim ihlali — beklenen bölümler bulunamadı' });
    return bayraklar; // biçim bozuksa diğer kontroller anlamsız (ham metne düşülecek)
  }

  // 1) Kod danışması — AI'nin yazdığı kod beklenenden farklı mı?
  if (analiz.metindekiKodlar.length > 0 && !analiz.metindekiKodlar.includes(beklenenKod)) {
    bayraklar.push({
      id: 'kod-danisma',
      seviye: 'danisma',
      metin: `⚠ Kod danışması: AI "${analiz.metindekiKodlar[0]}" yazmış, beklenen ${beklenenKod}`,
      hedefBolum: analiz.bolumler[0]?.baslik,
    });
  }

  // 2) Uydurma kod — müfredatta hiç var olmayan bir kod mu?
  for (const kod of analiz.metindekiKodlar) {
    if (!isValidCikti(kod)) {
      bayraklar.push({ id: 'uydurma-kod', seviye: 'hata', metin: `🚩 Uydurma kod: "${kod}" müfredatta yok` });
      break;
    }
  }

  // 3) Yasak giriş cümlesi (prompt'ta açıkça yasaklanmış ama AI bazen yine de yazıyor)
  if (/^\s*(Harika|İşte|Tabii|Elbette)/i.test(analiz.ham)) {
    bayraklar.push({ id: 'giris-cumlesi', seviye: 'danisma', metin: '⚠ Yasak giriş cümlesiyle başlıyor' });
  }

  // 4) Dayanaksız seyir — metin "Gelişim Seyri" diyor ama geçmiş veri yoksa bu en
  //    zararlı halüsinasyon türü: veliye "ilerliyor/geriliyor" diye YOK veriye dayanarak söylüyor.
  const seyirBolumu = analiz.bolumler.find((b) => /gelişim seyri/i.test(b.baslik));
  if (seyirBolumu && !gelisimGecmisiVarMi) {
    bayraklar.push({
      id: 'dayanaksiz-seyir',
      seviye: 'hata',
      metin: '🚩 Dayanaksız seyir: geçmiş veri metinde yok',
      hedefBolum: seyirBolumu.baslik,
    });
  }

  return bayraklar;
}

// ---------------------------------------------------------------------------
// Oylama / eşik mantığı
// ---------------------------------------------------------------------------

export type OySonucu = 'onay' | 'revize' | 'reddet';

/** Tek bir uzman oyu — zengin biçim (eski kayıtlarda bare string de olabilir, bkz. normalizeVotes). */
export interface UzmanOyu {
  oy: OySonucu;
  gerekce?: string;
  tarih: string;
}

export type OyHaritasi = Record<string, UzmanOyu | OySonucu>;

/** Eski ({ad: 'onay'}) ve yeni ({ad: {oy:'onay', tarih}}) kayıt biçimlerini tek tipe indirger. */
export function normalizeVotes(votes: OyHaritasi | null | undefined): Record<string, UzmanOyu> {
  const out: Record<string, UzmanOyu> = {};
  if (!votes) return out;
  for (const [ad, v] of Object.entries(votes)) {
    if (typeof v === 'string') out[ad] = { oy: v, tarih: '' };
    else if (v && typeof v === 'object') out[ad] = v;
  }
  return out;
}

export type EsikDurumu =
  | { tur: 'kilitli'; revizeVeren: string; gerekce?: string }
  | { tur: 'beklemede'; kalan: number; toplamOy: number }
  | { tur: 'onaylandi' }
  | { tur: 'reddedildi' };

/**
 * KURAL (kullanıcı kararı — standart 2/3 eşiğinden FARKLI):
 * Panelin TAMAMI (3 uzman) oy vermeden sonuç kesinleşmez — "ilk 2 anlaşan kazanır"
 * değil, her uzmana söz hakkı tanınır. Bir uzman REVİZE derse (gerekçesiyle) kayıt
 * o anda kilitlenir — kaç onay gelmiş olursa olsun; gerekçe olmadan revize kabul
 * edilmez (bkz. DecisionBar composer'daki zorunlu alan).
 */
export function esikDurumu(votes: OyHaritasi | null | undefined, gerekliOySayisi = 3): EsikDurumu {
  const normal = normalizeVotes(votes);
  const girisler = Object.entries(normal);

  const revizeGiris = girisler.find(([, v]) => v.oy === 'revize');
  if (revizeGiris) {
    return { tur: 'kilitli', revizeVeren: revizeGiris[0], gerekce: revizeGiris[1].gerekce };
  }

  if (girisler.length < gerekliOySayisi) {
    return { tur: 'beklemede', kalan: gerekliOySayisi - girisler.length, toplamOy: girisler.length };
  }

  const onay = girisler.filter(([, v]) => v.oy === 'onay').length;
  const reddet = girisler.filter(([, v]) => v.oy === 'reddet').length;
  return onay > reddet ? { tur: 'onaylandi' } : { tur: 'reddedildi' };
}
