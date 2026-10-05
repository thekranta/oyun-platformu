
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';
import { speak, speakThenWait } from '../services/speechService';
import ListenButton from './ListenButton';

// ============================================
// 📈 AKILLI ÇİFTLİK SAYMA — "Çiftlikte Sayalım"ın UYARLANIR (adaptif) zorluk
// sürümü. Maarif: MAB.1 (Ritmik/algısal sayma; sayı-nicelik ilişkisi).
// Çiftlikteki hayvanları say, doğru rakama dokun. Base oyundaki tur-bazlı
// maxCount(round) yerine, performansa göre her 3 turda bir ayarlanan bir
// azami-sayı (RANGE_BY_DIFF) kullanılır — çocuk başardıkça sayılar büyür,
// zorlanırsa küçülür.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 9;        // 3 checkpoint (her 3 turda bir uyarlama)
const TARGET_MS = 7000;        // "hızlı" eşiği (hız değerlendirmesi için)
const ANIMALS = ['🐔', '🐑', '🐄', '🐷', '🐰', '🐤', '🐥'];

// Zorluğa göre azami sayı (base oyundaki maxCount(round) yerine difficulty-driven)
const RANGE_BY_DIFF: Record<number, number> = {
  1: 3, 2: 4, 3: 5, 4: 7, 5: 9,
};

const buildOptions = (correct: number, cap: number): number[] => {
  const set = new Set<number>([correct]);
  let d = 1;
  while (set.size < 3) {
    if (correct - d >= 1) set.add(correct - d);
    if (set.size < 3 && correct + d <= cap) set.add(correct + d);
    d++;
    if (d > cap) break;
  }
  return Array.from(set).sort((a, b) => a - b);
};

function buildRound(diff: number): { animal: string; count: number; options: number[] } {
  const cap = RANGE_BY_DIFF[diff] || 5;
  const count = 1 + Math.floor(Math.random() * cap);
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return { animal, count, options: buildOptions(count, cap) };
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

export default function AkilliCiftlikSayma({ onGameEnd, onExit, childName }: Props) {
  const START_DIFF = 2;
  const { recordLevel } = useAdaptiveDifficulty({
    minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: START_DIFF,
  });

  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [current, setCurrent] = useState(() => buildRound(START_DIFF));
  const [displayDiff, setDisplayDiff] = useState(START_DIFF);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const startTimeRef = useRef(Date.now());
  const levelStartRef = useRef(Date.now());
  const levelErrorsRef = useRef(0);
  const totalMovesRef = useRef(0);
  const totalErrorsRef = useRef(0);
  const correctRef = useRef(0);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const penBounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    penBounce.setValue(0.85);
    Animated.spring(penBounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak('Kaç tane var? Say bakalım!', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const nextRound = useCallback((solvedInDiff: number) => {
    // Tur sonucu motora bildirilir; sıradaki zorluk döner
    const timeMs = Date.now() - levelStartRef.current;
    const errs = levelErrorsRef.current;
    const nextDiff = recordLevel({ correct: 1, total: 1, errors: errs, timeMs, targetMs: TARGET_MS });

    if (round >= TOTAL_ROUNDS) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      onGameEnd('akilli-ciftlik-sayma', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
        zorlukSeviyesi: solvedInDiff,
        kazanimOdagi: 'Matematik: Ritmik/Algısal Sayma ve Sayı-Nicelik İlişkisi (MAB.1) (uyarlanır zorluk)',
        correct_answers: correctRef.current,
      });
      return;
    }
    levelErrorsRef.current = 0;
    levelStartRef.current = Date.now();
    setRound(r => r + 1);
    setCurrent(buildRound(nextDiff));
    setDisplayDiff(nextDiff);
    setLocked(false);
    setWrong(null);
  }, [round, recordLevel, onGameEnd]);

  const handlePick = (n: number) => {
    if (locked) return;
    totalMovesRef.current += 1;
    if (n === current.count) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      const solvedInDiff = displayDiff;
      speakThenWait(`${current.count} tane! Aferin.`, 1300, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        nextRound(solvedInDiff);
      });
    } else {
      levelErrorsRef.current += 1;
      totalErrorsRef.current += 1;
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
          message="Çiftlikteki hayvanları say ve doğru sayıya dokun! Sen başardıkça oyun akıllanır 📈"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => { levelStartRef.current = Date.now(); startTimeRef.current = Date.now(); setGameReady(true); }}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>🐔 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.title}>📈 Akıllı Çiftlikte Sayalım</Text>
      <Text style={styles.prompt}>Kaç tane var?</Text>

      <Animated.View style={[styles.pen, { transform: [{ scale: penBounce }] }]}>
        {Array.from({ length: current.count }).map((_, i) => (
          <Text key={i} style={styles.animal}>{current.animal}</Text>
        ))}
      </Animated.View>

      <ListenButton onPress={() => speak('Kaç tane var? Say bakalım!', { instructions: HAPPY_VOICE })} color="#43A047" style={{ marginTop: 14 }} />

      <View style={styles.numbers}>
        {current.options.map((n) => {
          const isWrong = wrong === n;
          return (
            <Animated.View key={n} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.numBtn, isWrong && styles.numWrong]} onPress={() => handlePick(n)} activeOpacity={0.85}>
                <Text style={styles.numText}>{n}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1FBF0', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#2E7D32' },

  title: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginTop: 2 },
  prompt: { fontSize: 22, fontWeight: '900', color: '#2E7D32', marginTop: 6 },
  pen: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 28, borderWidth: 4, borderColor: '#C8E6C9', minHeight: 150, width: '86%', maxWidth: 420, marginTop: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  animal: { fontSize: 52 },

  numbers: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 22 },
  numBtn: { width: 82, height: 82, borderRadius: 22, backgroundColor: '#66BB6A', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 5 },
  numWrong: { backgroundColor: '#EF9A9A' },
  numText: { fontSize: 40, fontWeight: '900', color: '#fff' },
});
