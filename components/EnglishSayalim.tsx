import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import { EN_SAYALIM_SORU } from '../constants/ingilizceKelimeler';
import { fitRow, useFitScale } from '../lib/fitLayout';
import {
  GIRIS_MESAJI,
  KAZANIM_ODAGI,
  TOTAL_ROUNDS,
  buildGame,
  pickAlkis,
  sayiSozcugu,
  tapObject,
  type SayalimRound,
} from '../lib/enSayalim';

export { TR_YONERGELER } from '../lib/enSayalim';

// ============================================
// 🔢 SAYALIM (Let's count) — İngilizce ek etkinlik (Maarif dışı)
// Ekranda N nesne var. Çocuk her nesneye DOKUNDUKÇA nesne canlanır ve sıradaki İngilizce sayı söylenir (one, two...).
// Hepsi sayılınca "How many?" sorulur; üç RAKAM kartından toplamı seçer. Yazı yok, puan/hata ekranda görünmez.
// Hedef sayı çocuğa yalnız SAYARAK çıkar (nesneler "N tane" diye etiketlenmez).
// Mantık: lib/enSayalim.ts. Kelime verisi: constants/ingilizceKelimeler.ts.
// ============================================

const USE_NATIVE = Platform.OS !== 'web';
const EN = { lang: 'en' } as const;
const OBJ_GAP = 8;
const OBJ_PAD = 12;
const OBJ_BASE = 104;
const OBJ_MIN = 64; // dokunma hedefi alt sınırı (dp)
const CARD_COLORS = ['#1E88E5', '#43A047', '#FB8C00'];

interface Props {
  onGameEnd: (
    oyunAdi: string,
    sure: number,
    finalHamle: number,
    finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
}

type Phase = 'count' | 'asking' | 'answer' | 'done';

/** Söz takılırsa oyun durmasın: en geç `ms` sonra devam (EksikSayiBul deseni). */
const cap = (p: Promise<void>, ms: number) =>
  Promise.race([p.catch(() => undefined), new Promise<void>((resolve) => setTimeout(resolve, ms))]);

const zeros = (n: number) => new Array<number>(n).fill(0);

interface CountItemProps {
  emoji: string;
  size: number;
  counted: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}

/** Tek sayılacak nesne: soluk -> canlı (renkli halka + büyüme). Yerel sürücülü ölçek dış görünümde, diğerleri düz stil. */
const CountItem = ({ emoji, size, counted, reduceMotion, onPress }: CountItemProps) => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!counted) return;
    if (reduceMotion) {
      scale.setValue(1.1);
      return;
    }
    Animated.spring(scale, { toValue: 1.1, friction: 4, useNativeDriver: USE_NATIVE }).start();
  }, [counted, reduceMotion, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        style={[styles.item, { width: size, height: size, borderRadius: size / 2 }, counted ? styles.itemOn : styles.itemOff]}
      >
        <View style={{ opacity: counted ? 1 : 0.45 }}>
          <Text style={{ fontSize: Math.round(size * 0.56) }} selectable={false}>{emoji}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function EnglishSayalim({ onGameEnd, onExit }: Props) {
  const { width: winW } = useWindowDimensions();
  const { scale, onContainerLayout, onContentLayout } = useFitScale();
  const S = (v: number) => Math.max(1, Math.round(v * scale));

  const plan = useRef<SayalimRound[]>(buildGame()).current;
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [assigned, setAssigned] = useState<number[]>(() => zeros(plan[0].n));
  const [phase, setPhaseState] = useState<Phase>('count');
  const [wrongOpt, setWrongOpt] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const startRef = useRef(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const firstTryRef = useRef(0);
  const wrongThisRoundRef = useRef(false);
  const finishedRef = useRef(false);
  const mountedRef = useRef(true);
  const tokenRef = useRef(0);
  const phaseRef = useRef<Phase>('count');
  const assignedRef = useRef<number[]>(zeros(plan[0].n));
  const lastAlkisRef = useRef<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
      // Oyun bittiyse (tebrik zaten bitti, onGameEnd çağrıldı) sesi kesme; çıkışta kalan konuşma menüde çalmasın.
      if (!finishedRef.current) stopSpeech();
    };
  }, []);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (active) setReduceMotion(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      sub?.remove?.();
    };
  }, []);

  const current = plan[round - 1];
  const alive = (token: number) => mountedRef.current && tokenRef.current === token;

  // ---------- yerleşim: dokunma hedefi >= 64 dp, 360x640'ta taşmasın ----------
  const contentW = Math.min(winW - 32, 520);
  const innerW = contentW - 2 * OBJ_PAD - 6;
  const objBase = Math.max(OBJ_MIN, Math.round(OBJ_BASE * Math.max(scale, 0.8)));
  const gap = S(OBJ_GAP);
  const maxN = useMemo(() => Math.max(...plan.map((r) => r.n)), [plan]);
  // Panel yüksekliği tüm turların en uzununa sabitlenir: tur değişince alttaki kartlar zıplamasın.
  let panelInnerH = 0;
  for (let n = 1; n <= maxN; n++) {
    const f = fitRow(innerW, n, gap, objBase, OBJ_MIN, OBJ_MIN);
    panelInnerH = Math.max(panelInnerH, f.rows * f.size + (f.rows - 1) * gap);
  }
  const panelH = panelInnerH + 2 * S(OBJ_PAD) + 6;
  const fit = fitRow(innerW, current.n, gap, objBase, OBJ_MIN, OBJ_MIN);
  const optGap = S(12);
  const optSize = Math.max(OBJ_MIN, Math.min(100, Math.floor((contentW - 2 * optGap) / 3)));
  const confettiX = winW / 2;

  // ---------- oyun akışı ----------
  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startRef.current) / 1000);
    onGameEnd('en-sayalim', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: KAZANIM_ODAGI,
      correct_answers: firstTryRef.current, // ilk denemede doğru bulunan tur sayısı (veli raporu; ekranda görünmez)
    });
  };

  const nextRound = (r: number) => {
    tokenRef.current += 1;
    wrongThisRoundRef.current = false;
    const fresh = zeros(plan[r - 1].n);
    assignedRef.current = fresh;
    setAssigned(fresh);
    setWrongOpt(null);
    setShowConfetti(false);
    setPhase('count');
    setRound(r);
  };

  const handleObject = (i: number) => {
    if (!gameReady || finishedRef.current) return;
    const ph = phaseRef.current;
    if (ph !== 'count' && ph !== 'answer') return;

    const already = assignedRef.current[i];
    if (already > 0) {
      // Aynı nesneye ikinci dokunuş sayıyı ARTIRMAZ; yalnız o nesnenin kendi sayısı yeniden söylenir.
      const w = sayiSozcugu(already);
      if (w) speak(w, EN);
      return;
    }
    if (ph !== 'count') return;

    const res = tapObject(assignedRef.current, i);
    if (res.newNumber === null) return;
    assignedRef.current = res.assigned;
    setAssigned(res.assigned);
    movesRef.current += 1;
    const word = sayiSozcugu(res.newNumber);

    if (!res.completed) {
      // Hızlı dokunuşlarda yeni söz öncekini keser (üst üste binmez).
      if (word) speak(word, EN);
      return;
    }

    // Son nesne: sayı söylenir, BİTİNCE "How many?" ve rakam kartları gelir.
    setPhase('asking');
    const token = tokenRef.current;
    (async () => {
      await cap(word ? speakThenWait(word, 700, EN) : new Promise<void>((resolve) => setTimeout(resolve, 700)), 3000);
      if (!alive(token)) return;
      setPhase('answer');
      speak(EN_SAYALIM_SORU, EN);
    })();
  };

  const handleOption = (n: number) => {
    if (!gameReady || phaseRef.current !== 'answer') return;
    movesRef.current += 1;

    if (n === current.n) {
      setPhase('done');
      if (!wrongThisRoundRef.current) firstTryRef.current += 1;
      setShowConfetti(true);
      const token = tokenRef.current;
      const isLast = round >= TOTAL_ROUNDS;
      const nextR = round + 1;
      const alkis = pickAlkis(lastAlkisRef.current);
      lastAlkisRef.current = alkis;
      const word = sayiSozcugu(n);
      (async () => {
        // Önce sayının adı, sonra alkış (biri ötekini kesmesin); ikisi de bitmeden tur değişmez.
        await cap(word ? speakThenWait(word, 700, EN) : new Promise<void>((resolve) => setTimeout(resolve, 700)), 3000);
        if (!alive(token)) return;
        await cap(speakThenWait(alkis, isLast ? 1500 : 1100, EN), 3500);
        if (!alive(token)) return;
        if (isLast) {
          setShowConfetti(false);
          finish();
        } else {
          nextRound(nextR);
        }
      })();
      return;
    }

    // Yanlış: ceza yok. Nazik sarsılma + soru yeniden; çocuk tekrar dener.
    errorsRef.current += 1;
    wrongThisRoundRef.current = true;
    setWrongOpt(n);
    if (!reduceMotion) {
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
    }
    const token = tokenRef.current;
    timersRef.current.push(setTimeout(() => { if (alive(token)) setWrongOpt(null); }, 450));
    timersRef.current.push(setTimeout(() => { if (alive(token) && phaseRef.current === 'answer') speak(EN_SAYALIM_SORU, EN); }, 350));
  };

  const answerVisible = phase === 'answer' || phase === 'done';

  return (
    <View style={styles.container}>
      {showConfetti && !reduceMotion && <ConfettiCannon count={110} origin={{ x: confettiX, y: 0 }} fadeOut />}
      {showConfetti && reduceMotion && (
        <View style={styles.starOverlay} pointerEvents="none">
          <Text style={styles.starBig} selectable={false}>⭐</Text>
        </View>
      )}

      <View style={{ flex: 1 }} onLayout={onContainerLayout}>
        <View style={{ paddingTop: S(40), paddingHorizontal: 16, alignItems: 'center', gap: S(14) }} onLayout={onContentLayout}>
          <View style={[styles.header, { width: contentW }]}>
            <GameExitButton onPress={() => { stopSpeech(); (onExit ?? (() => {}))(); }} />
            <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
                <View key={i} style={[styles.dot, i < round ? styles.dotOn : styles.dotOff]} />
              ))}
            </View>
            <View style={{ width: 44 }} />
          </View>

          <View style={[styles.panel, { width: contentW, height: panelH, padding: S(OBJ_PAD) }]}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap, width: innerW }}>
              {Array.from({ length: current.n }).map((_, i) => (
                <CountItem
                  key={`${round}-${i}`}
                  emoji={current.emoji}
                  size={fit.size}
                  counted={assigned[i] > 0}
                  reduceMotion={reduceMotion}
                  onPress={() => handleObject(i)}
                />
              ))}
            </View>
          </View>

          {/* Rakam kartları: yalnız rakam (yazı yok). Sayım bitene kadar görünmez ama yer tutar (düzen zıplamasın). */}
          <View
            style={{ alignItems: 'center', gap: S(12), opacity: answerVisible ? 1 : 0 }}
            pointerEvents={answerVisible ? 'auto' : 'none'}
          >
            <View style={{ flexDirection: 'row', gap: optGap }}>
              {current.options.map((n, idx) => {
                const isWrong = wrongOpt === n;
                return (
                  <Animated.View key={`${round}-${n}`} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                    <TouchableOpacity
                      onPress={() => handleOption(n)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      style={[
                        styles.optCard,
                        { width: optSize, height: optSize, borderRadius: Math.round(optSize * 0.26) },
                        isWrong && styles.optWrong,
                      ]}
                    >
                      <Text style={[styles.optText, { fontSize: Math.round(optSize * 0.6), color: CARD_COLORS[idx % CARD_COLORS.length] }]} selectable={false}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
            <ListenButton
              onPress={() => speak(EN_SAYALIM_SORU, EN)}
              color="#1E88E5"
              disabled={!answerVisible}
              style={{ minHeight: 56, paddingHorizontal: 22 }}
            />
          </View>
        </View>
      </View>

      {!gameReady && (
        <CountdownOverlay
          message={GIRIS_MESAJI}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotOn: { backgroundColor: '#FFB300' },
  dotOff: { backgroundColor: '#E6DCC3' },

  panel: {
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#FFE0A3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  item: { alignItems: 'center', justifyContent: 'center' },
  itemOff: { backgroundColor: '#F4F1EA', borderWidth: 3, borderColor: '#E3DDCF' },
  itemOn: { backgroundColor: '#FFF3C4', borderWidth: 4, borderColor: '#FFB300' },

  optCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 4,
  },
  optWrong: { backgroundColor: '#FFE0E0' },
  optText: { fontWeight: '900' },

  starOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  starBig: { fontSize: 110 },
});
