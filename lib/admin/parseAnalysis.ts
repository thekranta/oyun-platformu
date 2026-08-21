/**
 * AI analiz metnini (yapay_zeka_yorumu) bölümlere ayırır ve doğru/beklenen Maarif
 * kodunu çıkarır.
 *
 * ÖNEMLİ: analyzeGame'in dört farklı prompt dalı (standart / sihirli-tuval /
 * uzay-bloklari / değer hikayesi) FARKLI başlık isimleri üretiyor:
 *   standart      → Öğrenme Çıktısı / Süreç Analizi / Gelişimsel Değerlendirme / Gelişim Seyri
 *   sihirli-tuval → Akademik Karşılık / Beceri Karşılığı / Görsel Tarama Analizi / Performans Değerlendirmesi
 *   uzay-bloklari → Akademik Karşılık / Beceri Karşılığı / Parça-Bütün Analizi / Problem Çözme Stratejisi
 * Sabit 4-başlık varsayımı YANLIŞ olur — bu yüzden ayrıştırıcı GENEL: metinde
 * bulduğu HER "**Başlık:**" desenini bir bölüm sayar.
 */

export interface AnalizBolum {
  baslik: string;
  govde: string;
}

export interface AyrisikAnaliz {
  bolumler: AnalizBolum[];
  veliMetni: string | null;
  bicimTam: boolean; // iki '---' bloğu + VELİ BİLGİLENDİRME NOTU bulundu mu
  /** Metindeki HER Maarif kod deseni (AI'nin fiilen yazdığı kodlar, çoğunlukla 1 tane). */
  metindekiKodlar: string[];
  ham: string;
}

const KOD_DESENI = /\b([A-ZÇĞİÖŞÜ]{2,6}\.\d{1,2})\b/g;
const BASLIK_DESENI = /\*\*([^*:\n]+):\*\*\s*/g;

export function ayristirAnaliz(metin: string | null | undefined): AyrisikAnaliz | null {
  if (!metin || !metin.trim()) return null;

  const parcalar = metin.split(/\n-{3,}\n/);
  const bicimTam = parcalar.length >= 2 && /VELİ BİLGİLENDİRME NOTU/i.test(metin);

  // Bölüm gövdesi: '**Başlık:**' → sonraki '**Başlık:**' ya da metin sonuna kadar.
  const anaBlok = parcalar[0] || metin;
  const bolumler: AnalizBolum[] = [];
  const eslesmeler = [...anaBlok.matchAll(BASLIK_DESENI)];
  for (let i = 0; i < eslesmeler.length; i++) {
    const baslik = eslesmeler[i][1].trim();
    const baslangic = (eslesmeler[i].index ?? 0) + eslesmeler[i][0].length;
    const bitis = i + 1 < eslesmeler.length ? eslesmeler[i + 1].index : anaBlok.length;
    const govde = anaBlok.slice(baslangic, bitis).trim();
    if (govde) bolumler.push({ baslik, govde });
  }

  // Veli metni: 'VELİ BİLGİLENDİRME NOTU' başlığından sonraki blok.
  let veliMetni: string | null = null;
  const veliBlok = parcalar.find((p) => /VELİ BİLGİLENDİRME NOTU/i.test(p));
  if (veliBlok) {
    veliMetni = veliBlok.replace(/\*\*VELİ BİLGİLENDİRME NOTU\*\*/i, '').trim();
  }

  const metindekiKodlar = Array.from(new Set([...metin.matchAll(KOD_DESENI)].map((m) => m[1])));

  return { bolumler, veliMetni, bicimTam, metindekiKodlar, ham: metin };
}

/** '**kalın**' → düz metin parçalarına ayırır (React'te ayrı Text ile kalınlaştırmak için). */
export function boldParcala(text: string): { text: string; bold: boolean }[] {
  if (!text) return [];
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p) => {
    if (p.startsWith('**') && p.endsWith('**')) return { text: p.slice(2, -2), bold: true };
    return { text: p, bold: false };
  });
}
