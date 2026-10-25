// Akıllı Örüntü (akilli-oruntu) tur üretimi. Beş zorluk seviyesinin HEPSİ birbirinden farklıdır (eskiden 1=2 ve 3=4 aynı ayardı: kolaylaştırma fiilen yoktu).
// Seviye -> [örüntü birimi uzunluğu, görünen tekrar sayısı, seçenek sayısı]. Birim uzunluğu ve seçenek sayısı yükselir; en kolay seviyede örüntü
// üç kez gösterilir (çocuk kuralı daha çok örnekten görür), diğerlerinde iki kez.
export type Rng = () => number;

export const PALETTE = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'];

export const LEVELS: Record<number, { unitLen: number; reps: number; options: number }> = {
  1: { unitLen: 2, reps: 3, options: 2 },
  2: { unitLen: 2, reps: 2, options: 3 },
  3: { unitLen: 3, reps: 2, options: 3 },
  4: { unitLen: 3, reps: 2, options: 4 },
  5: { unitLen: 4, reps: 2, options: 4 },
};

export interface OruntuRound { shown: string[]; answer: string; options: string[] }

const shuffle = <T,>(arr: T[], rng: Rng): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function buildOruntuRound(diff: number, rng: Rng = Math.random): OruntuRound {
  const { unitLen, reps, options: optionCount } = LEVELS[Math.min(5, Math.max(1, Math.round(diff)))];
  const colors = shuffle(PALETTE, rng);
  const unit = colors.slice(0, unitLen);                 // örüntü birimi (sırası karışık paletten)
  const p = Math.floor(rng() * unitLen);                 // kısmi tekrar -> cevap değişkenliği
  const shownCount = reps * unitLen + p;
  const shown = Array.from({ length: shownCount }, (_, i) => unit[i % unitLen]);
  const answer = unit[shownCount % unitLen];
  // Çeldiriciler: önce örüntüdeki diğer renkler (en ayartıcı olanlar), sonra paletteki öteki renkler.
  const distractPool = [...unit.filter((c) => c !== answer), ...PALETTE.filter((c) => !unit.includes(c))];
  const distractors = shuffle(distractPool.slice(0, unitLen - 1), rng).concat(shuffle(distractPool.slice(unitLen - 1), rng)).slice(0, optionCount - 1);
  return { shown, answer, options: shuffle([answer, ...distractors], rng) };
}
