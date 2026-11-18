import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
// @ts-expect-error @types/react-test-renderer kurulu değil (lib/fontScaleCap.test.ts ile aynı yol); kullanılan arayüz aşağıda.
import renderer, { act } from 'react-test-renderer';
import { ACTIVITIES, HEARTBEAT, ROUND_PLAN, activitiesFor } from '../constants/sporGunu';
import MuzikDuruncaDon from '../components/MuzikDuruncaDon';
import { NEW_EMOJI_SINGLE } from './emojiNewCodepoints';

// Denetim 2026-11-18, içerik hataları 1 (W7a): Önce-Sonra, Spor Günü, Ne Yer?, Yüzer Batar, Müzik Durunca Don.
// Her bölüm düzeltmeyi geri alırsan kırılır. Konuşulan cümleler DEĞİŞMEDİ (her cümlenin hazır klibi var):
// bu dosya yeni cümle eklemez; ilgili bölümler cümlelerin hâlâ yerinde olduğunu da doğrular.

jest.mock('expo-av', () => {
  const makeSound = () => ({
    pauseAsync: jest.fn(() => Promise.resolve()),
    stopAsync: jest.fn(() => Promise.resolve()),
    unloadAsync: jest.fn(() => Promise.resolve()),
  });
  return {
    Audio: {
      setAudioModeAsync: jest.fn(() => Promise.resolve()),
      Sound: { createAsync: jest.fn(() => Promise.resolve({ sound: makeSound() })) },
    },
  };
});
jest.mock('../services/speechService', () => ({
  speak: jest.fn(() => Promise.resolve()),
  speakThenWait: jest.fn(() => Promise.resolve()),
  stopSpeech: jest.fn(),
}));
jest.mock('../lib/assetMap', () => ({ asset: jest.fn(() => 1) }));
jest.mock('../components/CountdownOverlay', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ onComplete }: { onComplete: () => void }) => {
      R.useEffect(() => { onComplete(); }, []);
      return null;
    },
  };
});
jest.mock('../components/GameExitButton', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/ListenButton', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-confetti-cannon', () => ({ __esModule: true, default: () => null }));

const KOK = path.resolve(__dirname, '..');
const oku = (rel: string) => fs.readFileSync(path.join(KOK, rel), 'utf8');
const tirnaklilar = (metin: string) => [...metin.matchAll(/'([^']+)'/g)].map((m) => m[1]);

// ---------------------------------------------------------------------------
// 1) Önce-Sonra: kelebek yumurtadan çıkar (yumurta -> tırtıl -> kelebek)
// ---------------------------------------------------------------------------
describe('Önce-Sonra: kelebek dizisi', () => {
  const kaynak = oku('components/OnceSonra.tsx');
  const diziler = [...kaynak.matchAll(/\{ emojis: \[([^\]]*)\], label: '([^']+)' \}/g)].map((m) => ({ emojis: tirnaklilar(m[1]), label: m[2] }));

  it('dizi listesi okunabiliyor (altı olay, etiketler yerinde)', () => {
    expect(diziler.map((d) => d.label)).toEqual([
      'Tohum çiçek olur', 'Yumurta tavuk olur', 'Tırtıl kelebek olur', 'Sabah, gündüz, gece', 'Kardan adam erir', 'Ev yapılır',
    ]);
  });

  it("kelebek: 🥚 -> 🐛 -> 🦋 (sıra dizinin indeksidir; etiket aynı kaldı)", () => {
    const kelebek = diziler.find((d) => d.label === 'Tırtıl kelebek olur')!;
    expect(kelebek.emojis).toEqual(['🥚', '🐛', '🦋']);
  });

  it('hiçbir dizide tırtıl yumurtadan önce gelmez; yumurta-tavuk satırı değişmedi', () => {
    diziler.forEach((d) => {
      const yumurta = d.emojis.indexOf('🥚');
      const tirtil = d.emojis.indexOf('🐛');
      if (tirtil !== -1) expect(yumurta).toBeGreaterThanOrEqual(0);
      if (tirtil !== -1 && yumurta !== -1) expect(yumurta).toBeLessThan(tirtil);
    });
    expect(diziler.find((d) => d.label === 'Yumurta tavuk olur')!.emojis).toEqual(['🥚', '🐣', '🐔']);
  });

  it('her dizide emojiler tekil (doğru sıra denetimi dizin üzerinden belirsiz kalmaz)', () => {
    diziler.forEach((d) => expect(new Set(d.emojis).size).toBe(d.emojis.length));
  });

  it('konuşulan cümleler aynı', () => {
    expect(kaynak).toContain("'Önce ne olur? En baştan sırayla dokun!'");
    expect(kaynak).toContain("'Harika sıraladın! Aferin.'");
  });
});

// ---------------------------------------------------------------------------
// 2) Spor Günü: neden turlarında "yürüyüş (yavaş kalp)" + "kalbin neden hızlı attı?" çelişkisi yok
// ---------------------------------------------------------------------------
describe('Spor Günü: neden-sonuç turlarında etkinlik seçimi', () => {
  const nedenTurlari = ROUND_PLAN.filter((r) => r.reason);

  it('neden turu vardır (bu testin boş geçmemesi için)', () => {
    expect(nedenTurlari.length).toBeGreaterThanOrEqual(1);
  });

  it.each(['ic', 'dis'] as const)('%s: neden turunda sunulan her etkinlik hızlı kalp atışı çalar, hafif olan sunulmaz', (mekan) => {
    const liste = activitiesFor(mekan, true);
    expect(liste.length).toBeGreaterThanOrEqual(2); // yerleşim 2 kartla da bozulmaz, seçim yine var
    liste.forEach((a) => {
      expect(a.intensity).not.toBe('hafif');
      expect(HEARTBEAT[a.intensity]).toBe('kalp-hizli');
    });
    expect(liste.map((a) => a.intensity).sort()).toEqual(['hizli', 'orta']);
  });

  it('hiçbir turun erişebildiği etkinlik "yavaş kalp + neden hızlı attı" çelişkisi doğurmaz', () => {
    nedenTurlari.forEach(() => {
      (['ic', 'dis'] as const).forEach((mekan) => {
        activitiesFor(mekan, true).forEach((a) => expect(HEARTBEAT[a.intensity]).not.toBe('kalp-yavas'));
      });
    });
  });

  it('beden turlarında (puansız) üç yoğunluk da sunulur; veri silinmedi', () => {
    (['ic', 'dis'] as const).forEach((mekan) => {
      expect(activitiesFor(mekan, false).map((a) => a.intensity).sort()).toEqual(['hafif', 'hizli', 'orta']);
    });
    expect(ACTIVITIES.filter((a) => a.intensity === 'hafif')).toHaveLength(2);
    expect(HEARTBEAT.hafif).toBe('kalp-yavas'); // eşleme değişmedi
  });

  it('mekân seçilmemişse etkinlik yok', () => {
    expect(activitiesFor(null, true)).toEqual([]);
    expect(activitiesFor(null, false)).toEqual([]);
  });

  it('bileşen listeyi activitiesFor(place, plan.reason) ile kurar (eski süzgeç geri gelirse kırılır)', () => {
    const kaynak = oku('components/SporGunu.tsx');
    expect(kaynak).toContain('const list = activitiesFor(place, plan.reason);');
    expect(kaynak).not.toMatch(/ACTIVITIES\.filter\(\(a\) => a\.place === place\)/);
  });
});

// ---------------------------------------------------------------------------
// 3) Ne Yer?: çeldirici havuzu hayvan başına küratörlü ve KESİN YANLIŞ
// ---------------------------------------------------------------------------
describe('Ne Yer?: küratörlü çeldiriciler', () => {
  const kaynak = oku('components/NeYer.tsx');
  const pairs = [...kaynak.matchAll(/\{ a: '([^']+)', f: '([^']+)', wrong: \[([^\]]*)\] \}/g)].map((m) => ({ a: m[1], f: m[2], wrong: tirnaklilar(m[3]) }));

  // Bağımsız bilgi tablosu: hayvanın yiyebileceği (veya tartışmalı sayılabilecek) yiyecekler, GENİŞ tutuldu.
  // Çeldirici havuzu bunlarla KESİŞMEMELİ.
  const GECERLI: Record<string, string[]> = {
    '🐰': ['🥕', '🍃', '🌾', '🌽', '🍌'],
    '🐵': ['🍌', '🥕', '🌽', '🍃', '🌾', '🎋', '🍯'],
    '🐱': ['🐟', '🧀', '🍃'],
    '🐶': ['🦴', '🐟', '🥕', '🍌', '🧀', '🌽', '🍯'],
    '🐻': ['🍯', '🐟', '🍌', '🍃', '🥕', '🌾', '🌽'],
    '🐭': ['🧀', '🌾', '🌽', '🥕', '🍌', '🍃'],
    '🐴': ['🌾', '🥕', '🍃', '🌽', '🍌'],
    '🐼': ['🎋', '🍃', '🥕', '🍌', '🍯'],
    '🐨': ['🍃'],
    '🐷': ['🌽', '🥕', '🍌', '🍃', '🌾', '🧀', '🐟', '🍯'],
  };

  it('on hayvan okunuyor ve bilgi tablosuyla aynı hayvanlar', () => {
    expect(pairs.map((p) => p.a).sort()).toEqual(Object.keys(GECERLI).sort());
  });

  it.each(Object.keys(GECERLI))('%s: doğru yiyecek bilinen yiyecekler arasında, çeldirici havuzu KESİN yanlış, ≥ 2 öğe, tekil', (hayvan) => {
    const p = pairs.find((x) => x.a === hayvan)!;
    expect(GECERLI[hayvan]).toContain(p.f);
    expect(p.wrong.length).toBeGreaterThanOrEqual(2);
    expect(new Set(p.wrong).size).toBe(p.wrong.length);
    expect(p.wrong).not.toContain(p.f);
    p.wrong.forEach((w) => expect(GECERLI[hayvan]).not.toContain(w));
  });

  it('her hayvan için olası her çeldirici ikilisi: seçenekler arasında doğru yiyecekten başka geçerli yiyecek yok', () => {
    pairs.forEach((p) => {
      for (let i = 0; i < p.wrong.length; i++) {
        for (let j = i + 1; j < p.wrong.length; j++) {
          const secenekler = [p.f, p.wrong[i], p.wrong[j]];
          const gecerliSayisi = secenekler.filter((s) => GECERLI[p.a].includes(s)).length;
          expect(gecerliSayisi).toBe(1);
        }
      }
    });
  });

  it('çeldiriciler yalnız hayvanın kendi havuzundan çekilir; 9 yiyecekten rastgele süzgeç ve sonsuz çekme döngüsü yok', () => {
    expect(kaynak).toContain('const distract = shuffle(cur.wrong).slice(0, 2);');
    expect(kaynak).not.toContain('ALL_FOODS');
    expect(kaynak).not.toMatch(/\bwhile\s*\(/);
  });

  it('konuşulan cümleler aynı', () => {
    expect(kaynak).toContain("'Bu hayvan ne yer?'");
    expect(kaynak).toContain("'Doğru! Aferin.'");
  });
});

// ---------------------------------------------------------------------------
// 4) Yüzer Batar: belirsiz öğe (🍶 şişe) yok
// ---------------------------------------------------------------------------
describe('Yüzer Batar: batan öğeler açık', () => {
  const kaynak = oku('components/YuzerBatar.tsx');
  const liste = (ad: string) => tirnaklilar(kaynak.match(new RegExp(`const ${ad} = \\[([^\\]]*)\\];`))![1]);
  const batanlar = liste('SINKS');
  const yuzenler = liste('FLOATS');

  it('🍶 (içi boş şişe yüzebilir) batanlar arasında değil', () => {
    expect(batanlar).not.toContain('🍶');
    expect(yuzenler).not.toContain('🍶');
  });

  it('yerine açıkça batan 🔧 kondu; liste uzunluğu ve diğer öğeler korundu', () => {
    expect(batanlar).toEqual(['🪨', '🔑', '🥄', '🔩', '⚓', '🔧', '🪙', '🔨', '🧱']);
  });

  it('içi boş/hava dolu kap benzeri belirsiz nesne batanlarda yok', () => {
    ['🍶', '🍾', '🥤', '🍼', '🫙', '🧴', '🥛', '🪣', '🧊', '🎈', '🪁'].forEach((e) => expect(batanlar).not.toContain(e));
  });

  it('yüzen ve batan listeler kesişmez', () => {
    batanlar.forEach((e) => expect(yuzenler).not.toContain(e));
  });

  it('yeni eklenen 🔧 Emoji 12+ değil (eski Android yedek resmi gerekmez)', () => {
    const cp = '🔧'.codePointAt(0)!;
    expect(cp).toBe(0x1f527);
    expect(NEW_EMOJI_SINGLE).not.toContain(cp);
  });

  it('konuşulan cümleler aynı', () => {
    expect(kaynak).toContain("'Bu suya atılınca yüzer mi, batar mı?'");
    expect(kaynak).toContain("'Doğru, yüzüyor! Aferin!'");
    expect(kaynak).toContain("'Doğru, batıyor! Aferin!'");
  });
});

// ---------------------------------------------------------------------------
// 5) Müzik Durunca Don: DON'a hiç basılmayan tur sonsuza dek tekrar etmez; hata tur başına en çok 1
// ---------------------------------------------------------------------------
describe('Müzik Durunca Don: kaynak korumaları', () => {
  const kaynak = oku('components/MuzikDuruncaDon.tsx');
  const blok = (bas: string, son: string) => kaynak.slice(kaynak.indexOf(bas), kaynak.indexOf(son));
  const timeoutBlok = blok('const handleFreezeTimeout = () => {', 'const handleDonTap = () => {');
  const donBlok = blok('const handleDonTap = () => {', 'const isFrozen = phase');

  it('üst sınır sabiti var (2-5 arası)', () => {
    const m = kaynak.match(/const MAX_FREEZE_MISSES = (\d+);/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(2);
    expect(Number(m![1])).toBeLessThanOrEqual(5);
  });

  it('kaçırma yolu: sayaç artar, sınıra varınca tur ilerler / son turda oyun biter, aksi hâlde aynı tur tekrar', () => {
    expect(timeoutBlok).toContain('missesRef.current += 1;');
    expect(timeoutBlok).toMatch(/missesRef\.current >= MAX_FREEZE_MISSES/);
    expect(timeoutBlok).toContain('setRound((r) => r + 1);');
    expect(timeoutBlok).toMatch(/round >= TOTAL_ROUNDS[\s\S]*finish\(\);/);
    expect(timeoutBlok).toContain('setRoundNonce((n) => n + 1);'); // sınıra varmadıysa nazik tekrar sürer
    expect(timeoutBlok.indexOf('MAX_FREEZE_MISSES')).toBeLessThan(timeoutBlok.indexOf('setRoundNonce'));
  });

  it('hata yalnız countRoundError() ile sayılır; bayrak tur başına bir kez; tur ilerleyince sıfırlanır', () => {
    expect(kaynak.match(/errorsRef\.current \+= 1/g)).toHaveLength(1);
    expect(kaynak).toMatch(/const countRoundError = \(\) => \{\s*if \(roundErrorRef\.current\) return;\s*roundErrorRef\.current = true;\s*errorsRef\.current \+= 1;/);
    expect(timeoutBlok).toContain('countRoundError();');
    expect(donBlok).toContain('countRoundError();'); // erken dokunuş da aynı kurala tabi
    expect(donBlok).toMatch(/resetRoundCounters\(\);\s*if \(round < TOTAL_ROUNDS\)/);
    expect(timeoutBlok).toContain('resetRoundCounters();');
    expect(kaynak).toMatch(/const resetRoundCounters = \(\) => \{\s*missesRef\.current = 0;\s*roundErrorRef\.current = false;/);
  });

  it('onGameEnd yalnız finish() içinde ve tek seferlik; konuşma dizisi eskisi gibi', () => {
    expect(kaynak.match(/onGameEnd\(/g)).toHaveLength(1);
    expect(kaynak).toMatch(/if \(finishedRef\.current\) return;\s*finishedRef\.current = true;/);
    // son tur bitişinde speak + onGameEnd ardışık YOK (bitiş tebriği kesilme kuralı): finish() doğrudan çağrılır
    expect(timeoutBlok).not.toMatch(/speak\([^)]*\);\s*finish\(\)/);
    expect(kaynak).toContain("'Müzik durunca donmalıyız! Tekrar deneyelim.'");
    expect(kaynak).toContain("'Aferin! Müzik durunca hemen dondun!'");
    expect(kaynak).toContain("'Müzik daha çalıyor, durmasını bekle!'");
    expect(kaynak).toContain("'Müzik durdu! DON!'");
  });

  it('JSX iskeleti ve zamanlayıcı temizliği korundu', () => {
    expect(kaynak).toContain("<ScrollView style={{ flex: 1, alignSelf: 'stretch' }} contentContainerStyle={{ flexGrow: 1, alignItems: 'center'");
    expect(kaynak).toMatch(/timersRef\.current\.forEach\(clearTimeout\);/);
  });
});

describe('Müzik Durunca Don: davranış (sahte zamanlayıcılarla)', () => {
  let tree: any; // react-test-renderer kök nesnesi (tür paketi kurulu değil)
  let randomSpy: jest.SpyInstance;
  const onGameEnd = jest.fn();

  const basliklar = (): string[] =>
    tree.root.findAllByType(Text).map((t: { props: { children: unknown } }) => [t.props.children].flat(3).join(''));
  const tur = () => {
    const m = basliklar().map((t) => t.match(/^🎵 (\d+)\/(\d+)$/)).find(Boolean);
    return m ? Number(m[1]) : -1;
  };
  const toplamTur = () => {
    const m = basliklar().map((t) => t.match(/^🎵 (\d+)\/(\d+)$/)).find(Boolean);
    return m ? Number(m[2]) : -1;
  };
  const ilerle = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
      for (let i = 0; i < 6; i++) await Promise.resolve();
    });
  };
  // Dans 3000 ms (Math.random = 0) → müzik durur; donma penceresi 3500 ms.
  const dansBitir = () => ilerle(3000);
  const pencereBos = () => ilerle(3500);
  const donaBas = async () => {
    await act(async () => {
      tree.root.findAllByType(TouchableOpacity)[0].props.onPress();
      for (let i = 0; i < 6; i++) await Promise.resolve();
    });
    await ilerle(10); // speakThenWait çözülür → tur ilerler
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    onGameEnd.mockClear();
    await act(async () => {
      tree = renderer.create(React.createElement(MuzikDuruncaDon, { onGameEnd }));
      for (let i = 0; i < 6; i++) await Promise.resolve();
    });
  });

  afterEach(async () => {
    await act(async () => { tree.unmount(); });
    randomSpy.mockRestore();
    jest.useRealTimers();
  });

  it('başlangıç: 1. tur, toplam tur 6', () => {
    expect(tur()).toBe(1);
    expect(toplamTur()).toBe(6);
  });

  it("DON'a hiç basılmazsa: iki kaçırmada aynı tur sürer, üçüncüde sonraki tura geçer (tur sayacı tutarlı)", async () => {
    await dansBitir(); await pencereBos(); // 1. kaçırma
    expect(tur()).toBe(1);
    await dansBitir(); await pencereBos(); // 2. kaçırma
    expect(tur()).toBe(1);
    await dansBitir(); await pencereBos(); // 3. kaçırma → sıradaki tur
    expect(tur()).toBe(2);
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it("hiç basmayan çocukta oyun SONLANIR; onGameEnd tek kez; hata tur başına 1 (6 tur → 6), doğru 0", async () => {
    for (let kacirma = 0; kacirma < 6 * 3; kacirma++) {
      await dansBitir(); await pencereBos();
    }
    expect(onGameEnd).toHaveBeenCalledTimes(1);
    const [oyun, , hamle, hata, , ekstra] = onGameEnd.mock.calls[0];
    expect(oyun).toBe('muzik-durunca-don');
    expect(hamle).toBe(0);
    expect(hata).toBe(6);
    expect(ekstra.correct_answers).toBe(0);
    // bitişten sonra zaman akmaya devam etse de ikinci çağrı olmaz
    await ilerle(60000);
    expect(onGameEnd).toHaveBeenCalledTimes(1);
  });

  it('erken dokunuş + kaçırma aynı turda tek hata; doğru basışlı turlar hata eklemez', async () => {
    // 1. tur: müzik çalarken 3 kez erken dokun, sonra 3 kez penceresiz geçir
    for (let i = 0; i < 3; i++) await donaBas();
    expect(tur()).toBe(1); // erken dokunuş ilerletmez
    for (let kacirma = 0; kacirma < 3; kacirma++) { await dansBitir(); await pencereBos(); }
    expect(tur()).toBe(2);
    // 2-6. tur: zamanında don
    for (let t = 2; t <= 6; t++) {
      expect(tur()).toBe(t);
      await dansBitir();
      await donaBas();
    }
    expect(onGameEnd).toHaveBeenCalledTimes(1);
    const [, , hamle, hata, , ekstra] = onGameEnd.mock.calls[0];
    expect(hata).toBe(1);
    expect(ekstra.correct_answers).toBe(5);
    expect(hamle).toBe(3 + 5);
  });

  it('tur ilerleyince kaçırma sayacı sıfırlanır: doğru basıştan sonra yeni turda yine üç kaçırma gerekir', async () => {
    await dansBitir(); await pencereBos(); // 1. turda 1 kaçırma
    await dansBitir(); await pencereBos(); // 2 kaçırma
    await dansBitir(); await donaBas();    // sonunda zamanında don → 2. tur
    expect(tur()).toBe(2);
    await dansBitir(); await pencereBos(); // 2. turda 1. kaçırma
    await dansBitir(); await pencereBos(); // 2. kaçırma
    expect(tur()).toBe(2);                 // sızan sayaç olsaydı 3. tura geçerdi
    await dansBitir(); await pencereBos(); // 3. kaçırma
    expect(tur()).toBe(3);
  });
});
