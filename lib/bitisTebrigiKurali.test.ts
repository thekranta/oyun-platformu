import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Test listesi notu (Simetri Çizim, 2026-10-29): "Kaydet tuşuna bastım, ses çıkmadı."
// Kaydet yolunda `speak(tebrik); onGameEnd(...)` ardışık çağrılırsa ana ekran oyunu hemen sonuç ekranına geçirir
// (index.tsx oyunuBitir -> setAsama('sonuc')) ve bileşenin unmount temizliğindeki stopSpeech() tebriği daha başlamadan keser
// (tarayıcıda ölçüldü: play() 245 ms, 16 ms sonra pause(); düzeltmeden sonra klip 2,42 sn'nin sonuna kadar çaldı).
// Desen: bitiş bayrağı (endedRef / finishedRef) kalkmışsa temizlik stopSpeech() çağırmaz (OnlukCerceve, Simetri Çizim, Mandala...).
// Bu test, tebrikten hemen sonra onGameEnd çağıran her bileşenin o korumayı taşıdığını doğrular.

const KOK = join(__dirname, '..', 'components');

const tsxDosyalari = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? tsxDosyalari(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : [],
  );

// `speak(...)` satırını hemen `onGameEnd(` satırı izliyor (speakThenWait / await edilen speak sayılmaz).
const tebrikHemenArdindanBitiyor = (satirlar: string[]) =>
  satirlar.some((s, i) => /^\s*speak\(.*\);\s*$/.test(s) && /^\s*onGameEnd\(/.test(satirlar[i + 1] ?? ''));

// unmount temizliğinde stopSpeech() var mı (tek satırlık ya da çok satırlık useEffect temizliği)
const temizlikKonusmayiDurduruyor = (kaynak: string) =>
  /useEffect\(\(\) => \(\) => \{[^}]*stopSpeech\(\)/.test(kaynak) || /return \(\) => \{[^}]*stopSpeech\(\)/.test(kaynak);

const korumaVar = (kaynak: string) => /if \(!\w*(ended|finished)\w*\.current\) stopSpeech\(\)/i.test(kaynak);

describe('bitiş tebriği kuralı', () => {
  it("tebrik + onGameEnd çağıran bileşenler unmount'ta stopSpeech() ile tebriği kesmez", () => {
    const ihlal: string[] = [];
    for (const dosya of tsxDosyalari(KOK)) {
      const kaynak = readFileSync(dosya, 'utf8');
      if (!tebrikHemenArdindanBitiyor(kaynak.split(/\r?\n/))) continue;
      if (temizlikKonusmayiDurduruyor(kaynak) && !korumaVar(kaynak)) ihlal.push(dosya.replace(KOK, 'components'));
    }
    expect(ihlal).toEqual([]);
  });

  it('desen en az on iki bileşende bulunuyor (tarama boş geçmesin)', () => {
    const adet = tsxDosyalari(KOK).filter((d) => tebrikHemenArdindanBitiyor(readFileSync(d, 'utf8').split(/\r?\n/))).length;
    expect(adet).toBeGreaterThanOrEqual(12);
  });

  it('korunan bileşenlerde bayrak kaydet yolunda gerçekten kaldırılıyor', () => {
    const korunan = ['SimetriCizim', 'Mandala', 'CizimSayfalari', 'CizimiCanlandir', 'DamgaSanati', 'KumBoyasi', 'NoktaBoyama', 'YarisiniTamamla', 'YuzYap', 'BoyamaKitabi'];
    for (const ad of korunan) {
      const kaynak = readFileSync(join(KOK, `${ad}.tsx`), 'utf8');
      expect(kaynak).toMatch(/endedRef\.current = true;\s*\r?\n\s*speak\(/);
    }
    // RenkAtolyesi: finish() başında finishedRef kalkar, temizlik onu okur
    const renk = readFileSync(join(KOK, 'RenkAtolyesi.tsx'), 'utf8');
    expect(renk).toMatch(/finishedRef\.current = true;/);
    expect(renk).toMatch(/if \(!finishedRef\.current\) stopSpeech\(\)/);
  });
});
