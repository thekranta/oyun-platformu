
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';
import { speak, speakThenWait } from '../services/speechService';
import ListenButton from './ListenButton';

// ============================================
// 📈 AKILLI SAYIYI BUL - Rakam → nicelik (Matematik/MAB.1) — UYARLANIR (adaptif) zorluk
// Sayıyı Bul'un adaptif sürümü: büyük bir rakam gösterilir, çocuk O KADAR nokta
// içeren grubu seçer. Performansa (doğruluk + hız) göre her 3 turda bir nokta
// sayısı aralığı (zorluk) ayarlanır — çocuk başardıkça oyun akıllanır.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 9;        // 3 checkpoint (her 3 turda bir uyarlama)
const TARGET_MS = 6000;        // "hızlı" eşiği (hız değerlendirmesi için)
const DOT_COLORS = ['#FF6B6B', '#4FACFE', '#66BB6A', '#FFA726', '#AB47BC'];

// Zorluğa göre nokta/nicelik üst sınırı (cap) aralığı — düşük zorlukta küçük ve
// dar, yüksek zorlukta büyük sayılara ve daha yakın çeldiricilere çıkar.
const RANGE_BY_DIFF: Record<number, [number, number]> = {
  1: [1, 3], 2: [2, 5], 3: [3, 6], 4: [4, 8], 5: [6, 10],
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildCounts = (correct: number, cap: number): number[] => {
  const set = new Set<number>([correct]);
  let d = 1;
  while (set.size < 3) {
    if (correct - d >= 1) set.add(correct - d);
    if (set.size < 3 && correct + d <= cap) set.add(correct + d);
    d++;
    if (d > cap) break;
  }
  return shuffle(Array.from(set));
};

function buildRound(diff: number): { target: number; cap: number } {
  const [lo, hi] = RANGE_BY_DIFF[diff] || [1, 5];
  const cap = lo + Math.floor(Math.random() * (hi - lo + 1));
  const target = 1 + Math.floor(Math.random() * cap);
  return { target, cap };
}

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
  childName?: string;
}

export default function AkilliSayiyiBul({ onGameEnd, onExit, childName }: Props) {
  const START_DIFF = 2;
  const { recordLevel } = useAdaptiveDifficulty({
    minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: START_DIFF,
  });

  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [current, setCurrent] = useState(() => buildRound(START_DIFF));
  const [color, setColor] = useState(DOT_COLORS[0]);
  const [options, setOptions] = useState<number[]>(() => buildCounts(current.target, current.cap));
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const numBounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  // Adaptif motor bağlamı: bu turun hangi zorlukta üretildiğini + tur içi hata
  // sayısını / başlangıç zamanını stale-closure'a düşmeden takip etmek için ref'ler.
  const displayDiffRef = useRef(START_DIFF);
  const levelStartRef = useRef(Date.now());
  const levelErrorsRef = useRef(0);

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    setColor(DOT_COLORS[(round - 1) % DOT_COLORS.length]);
    numBounce.setValue(0.8);
    Animated.spring(numBounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(`${current.target}! ${current.target} tane olanı bul.`, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = (solvedInDiff: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('akilli-sayiyi-bul', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: solvedInDiff,
      kazanimOdagi: 'Matematik: Rakam-Nicelik İlişkisi (MAB.1) (uyarlanır zorluk)',
      correct_answers: correctRef.current,
    });
  };

  const nextRound = (solvedInDiff: number) => {
    // Tur sonucu adaptif motora bildirilir; sıradaki zorluk döner.
    const timeMs = Date.now() - levelStartRef.current;
    const errs = levelErrorsRef.current;
    const nextDiff = recordLevel({ correct: 1, total: 1, errors: errs, timeMs, targetMs: TARGET_MS });

    if (round >= TOTAL_ROUNDS) {
      finish(solvedInDiff);
      return;
    }

    levelErrorsRef.current = 0;
    levelStartRef.current = Date.now();
    const nextContent = buildRound(nextDiff);
    displayDiffRef.current = nextDiff;
    setCurrent(nextContent);
    setOptions(buildCounts(nextContent.target, nextContent.cap));
    setLocked(false);
    setWrong(null);
    setRound((r) => r + 1);
  };

  const handlePick = (n: number) => {
    if (locked) return;
    movesRef.current += 1;
    if (n === current.target) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      const solvedInDiff = displayDiffRef.current;
      speakThenWait('Doğru! Aferin.', 1300, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        nextRound(solvedInDiff);
      });
    } else {
      errorsRef.current += 1;
      levelErrorsRef.current += 1;
      setWrong(n);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrong(null), 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Büyük sayıya bak! O kadar nokta olan kutuyu bul. Sen başardıkça oyun akıllanır."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => { levelStartRef.current = Date.now(); setGameReady(true); }}
        />
      )}

      <Text style={styles.gameTitle}>📈 Akıllı Sayıyı Bul</Text>

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔢 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Bu sayıyı bul:</Text>
      <Animated.View style={[styles.numCard, { transform: [{ scale: numBounce }] }]}>
        <Text style={[styles.numBig, { color }]}>{current.target}</Text>
      </Animated.View>

      <ListenButton onPress={() => speak(`${current.target} tane olanı bul.`, { instructions: HAPPY_VOICE })} color="#1E88E5" style={{ marginTop: 12 }} />

      <View style={styles.options}>
        {options.map((n) => {
          const isWrong = wrong === n;
          return (
            <Animated.View key={n} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(n)} activeOpacity={0.85}>
                <View style={styles.dots}>
                  {Array.from({ length: n }).map((_, i) => (
                    <View key={i} style={[styles.dot, { backgroundColor: color }]} />
                  ))}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF5FF', alignItems: 'center' },
  gameTitle: { fontSize: 18, fontWeight: '900', color: '#1565C0', marginTop: 44, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#1565C0' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#1565C0', marginTop: 10 },
  numCard: { width: 130, height: 130, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  numBig: { fontSize: 88, fontWeight: '900' },

  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 22, maxWidth: 460, paddingHorizontal: 12 },
  optCard: { width: 118, height: 118, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  optWrong: { backgroundColor: '#FFE0E0' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: 96 },
  dot: { width: 26, height: 26, borderRadius: 13 },
});
