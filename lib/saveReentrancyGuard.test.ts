import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Denetim 2026-11-18 (W3): çizim oyunlarında Kaydet çift dokunuşu.
// save fonksiyonu önce `await toPng/captureRef` yapıp sonra onGameEnd çağırıyor; düğme yalnız boş içerikte kapalıydı.
// Yakalama sürerken ikinci dokunuş save'i yeniden başlatır: onGameEnd iki kez (iki skor satırı, iki görsel yükleme, iki AI analizi, iki tebrik).
// Yakalama sırasında çıkış/geri olursa geç gelen onGameEnd menüden 'sonuç' ekranına atardı (index.tsx oyunuBitir -> setAsama('sonuc')).
//
// Desen (RenkAtolyesi.finishedRef ile aynı mantık): savingRef kilidi İLK await'ten ÖNCE kapanır (ref anında; state gecikmeli),
// onGameEnd oyunu bitirdiği için kaydedilince AÇILMAZ; yalnız onGameEnd çağrılmadan dönülen yolda (bileşen sökülmüş) açılır.
// Sökülmüşse (mountedRef) ne speak ne onGameEnd çağrılır ve endedRef kalkmaz (tebrik menüde çalmasın).
// endedRef -> speak -> onGameEnd bitişikliği lib/bitisTebrigiKurali.test.ts'in konusu; bu test ona dokunmaz, yalnız araya mountedRef kontrolünün
// ENDEDREF'ten ÖNCE girdiğini doğrular.

const KOK = join(__dirname, '..', 'components');

// [bileşen, kaydet fonksiyonunun adı]
const CIZIM_OYUNLARI: ReadonlyArray<readonly [string, string]> = [
  ['AdimAdim', 'save'],
  ['BoyamaKitabi', 'save'],
  ['CizimiCanlandir', 'saveDrawing'],
  ['CizimSayfalari', 'saveDrawing'],
  ['DamgaSanati', 'save'],
  ['KumBoyasi', 'save'],
  ['Mandala', 'saveDrawing'],
  ['NoktaBoyama', 'save'],
  ['SimetriCizim', 'saveDrawing'],
  ['YaraticiCizim', 'saveDrawing'],
  ['YarisiniTamamla', 'save'],
  ['YuzYap', 'save'],
];

const oku = (ad: string) => readFileSync(join(KOK, `${ad}.tsx`), 'utf8').replace(/\r\n/g, '\n');

// Kaydet fonksiyonunun gövdesi: `  const save = async () => {` ile ilk `\n  };\n` arası (iç bloklar daha derin girintili).
const kaydetGovdesi = (kaynak: string, fn: string): string => {
  const bas = kaynak.indexOf(`  const ${fn} = async () => {\n`);
  if (bas < 0) throw new Error(`${fn} bulunamadı`);
  const son = kaynak.indexOf('\n  };\n', bas);
  if (son < 0) throw new Error(`${fn} gövdesi kapanmıyor`);
  return kaynak.slice(bas, son);
};

describe('çizim oyunları: Kaydet çift dokunuş kilidi', () => {
  it('12 çizim oyunu da listede (liste sessizce kısalmasın)', () => {
    expect(CIZIM_OYUNLARI).toHaveLength(12);
  });

  describe.each(CIZIM_OYUNLARI)('%s', (ad, fn) => {
    const kaynak = oku(ad);
    const govde = kaydetGovdesi(kaynak, fn);

    it('kilit ilk await öncesinde kapanıyor (savingRef kontrolü + kapatma)', () => {
      const ilkAwait = govde.indexOf('await ');
      const kontrol = govde.indexOf('if (savingRef.current) return;');
      const kilit = govde.indexOf('savingRef.current = true;');
      expect(ilkAwait).toBeGreaterThan(-1);
      expect(kontrol).toBeGreaterThan(-1);
      expect(kilit).toBeGreaterThan(kontrol);
      expect(kilit).toBeLessThan(ilkAwait);
    });

    it('kilit onGameEnd çağrıldıktan sonra AÇILMIYOR (oyun biter; ikinci kayıt çift skor satırı olur)', () => {
      const bitis = govde.indexOf('onGameEnd(');
      expect(bitis).toBeGreaterThan(-1);
      expect(govde.slice(bitis)).not.toContain('savingRef.current = false');
      // Kilidi açan tek yer, sökülmüş bileşenin erken dönüşü
      expect(kaynak.match(/savingRef\.current = false/g)).toHaveLength(1);
    });

    it('sökülmüş bileşende geç speak/onGameEnd çağrılmıyor (son await ile speak/endedRef/onGameEnd arasında)', () => {
      expect(govde).toContain('if (!mountedRef.current) { savingRef.current = false; return; }');
      const kontrol = govde.indexOf('if (!mountedRef.current)');
      expect(kontrol).toBeGreaterThan(govde.lastIndexOf('await '));
      expect(kontrol).toBeLessThan(govde.indexOf('onGameEnd('));
      const speak = govde.indexOf('speak(');
      if (speak >= 0) expect(kontrol).toBeLessThan(speak);
      // Sökülmüşse endedRef kalkmaz: temizlik stopSpeech() çağırır, tebrik menüde çalmaz
      const ended = govde.indexOf('endedRef.current = true;');
      if (ended >= 0) expect(kontrol).toBeLessThan(ended);
    });

    it('mountedRef kurulumda true, söküldüğünde false (Fast Refresh/StrictMode: yalnız useRef(true) yetmez)', () => {
      expect(kaynak).toMatch(/const mountedRef = useRef\(true\);/);
      expect(kaynak).toMatch(/useEffect\(\(\) => \{ mountedRef\.current = true; return \(\) => \{ mountedRef\.current = false; \}; \}, \[\]\);/);
    });

    it('Kaydet düğmesi kaydederken kapalı (saving durumu disabled içinde)', () => {
      if (ad === 'AdimAdim') {
        // Tek düğme hem 'Sonraki Adım' hem 'Bitti': yalnız son adımda kapanır
        expect(kaynak).toMatch(/const doneBlocked = isLast && \(!hasContent \|\| saving\);/);
        expect(kaynak).toMatch(/disabled=\{doneBlocked\}/);
        return;
      }
      const i = kaynak.indexOf(`onPress={${fn}}`);
      expect(i).toBeGreaterThan(-1);
      expect(kaynak.slice(i, i + 160)).toMatch(/disabled=\{[^}]*\|\| saving\}/);
    });
  });

  describe('AdimAdim: boş çizimle Bitti kaydetmez', () => {
    const kaynak = oku('AdimAdim');
    const govde = kaydetGovdesi(kaynak, 'save');

    it('save içinde boş içerik erken dönüşü, kilitten ve ilk await öncesinde', () => {
      const bos = govde.indexOf('if (bundle.length === 0) return;');
      expect(bos).toBeGreaterThan(-1);
      expect(bos).toBeLessThan(govde.indexOf('savingRef.current = true;'));
      expect(bos).toBeLessThan(govde.indexOf('await '));
    });

    it('düğme boş çizimde kapalı (diğer oyunlardaki disabled={!hasContent} gibi)', () => {
      expect(kaynak).toMatch(/const doneBlocked = isLast && \(!hasContent \|\| saving\);/);
    });
  });

  describe('tarama: resim yakalayıp oyunu bitiren her bileşen kilit taşır', () => {
    const tsx = readdirSync(KOK).filter((d) => d.endsWith('.tsx'));
    const yakalayanlar = tsx.filter((d) => {
      const k = readFileSync(join(KOK, d), 'utf8');
      return k.includes("import('html-to-image')") && k.includes('onGameEnd(');
    });

    it('yakalayan bileşenler en az 13 (12 çizim oyunu + RenkAtolyesi); tarama boş geçmesin', () => {
      expect(yakalayanlar.length).toBeGreaterThanOrEqual(13);
      for (const [ad] of CIZIM_OYUNLARI) expect(yakalayanlar).toContain(`${ad}.tsx`);
    });

    it('her biri savingRef (ya da RenkAtolyesi gibi finishedRef) kilidi taşıyor', () => {
      const kilitsiz = yakalayanlar.filter((d) => {
        const k = readFileSync(join(KOK, d), 'utf8');
        return !/savingRef\.current/.test(k) && !/finishedRef\.current/.test(k);
      });
      expect(kilitsiz).toEqual([]);
    });
  });
});
