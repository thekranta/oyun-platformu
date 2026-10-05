
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import ListenButton from './ListenButton';

// ============================================
// ➖ KAÇ KALDI? - 5'e kadar çıkarma (Matematik/MAB.1)
// Nesneler önce hep birlikte görünür; birkaçı animasyonla kaybolur (soluk kalır),
// çocuk geriye kaç tane KALDIĞINI sayar. Sayı-nicelik/çıkarma sezgisi.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;
const MAX_OBJECTS = 5;
const OBJECTS = ['🍎', '🐤', '🎈', '🍪', '⭐', '🐟'];

const buildOptions = (correct: number): number[] => {
  const set = new Set<number>([correct]);
  let d = 1;
  while (set.size < 3) {
    if (correct - d >= 0) set.add(correct - d);
    if (set.size < 3 && correct + d <= 5) set.add(correct + d);
    d++;
    if (d > 6) break;
  }
  return Array.from(set).sort((a, b) => a - b);
};

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function KacKaldi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [total, setTotal] = useState(3);
  const [gone, setGone] = useState(1);
  const [obj, setObj] = useState('🍎');
  const [options, setOptions] = useState<number[]>([]);
  // 'watch': nesneler görünüyor/kayboluyor (sayma henüz başlamadı), 'count': sayma zamanı
  const [phase, setPhase] = useState<'watch' | 'count'>('watch');
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const runIdRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pop = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  // Her nesnenin kaybolma ilerlemesi: 0 = yerinde, 1 = gitti (soluk + küçük + hafif yukarıda)
  const vanish = useRef(Array.from({ length: MAX_OBJECTS }, () => new Animated.Value(0))).current;

  useEffect(() => () => {
    isMountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    stopSpeech();
  }, []);

  useEffect(() => {
    if (!gameReady) return;
    const myRun = ++runIdRef.current;
    const n = 2 + Math.floor(Math.random() * 4); // 2-5
    const g = 1 + Math.floor(Math.random() * (n - 1)); // 1..n-1
    setTotal(n);
    setGone(g);
    setObj(OBJECTS[Math.floor(Math.random() * OBJECTS.length)]);
    setOptions(buildOptions(n - g));
    setLocked(false);
    setWrong(null);
    setPhase('watch');
    vanish.forEach((v) => v.setValue(0));
    pop.setValue(0.85);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();

    // Önce tüm nesneler görünür; kısa bir bekleyişten sonra "gidecek" olanlar tek tek yok olur,
    // animasyon bitince soru sorulur (docx #49: "bazı nesneler gitti" demek yerine animasyon).
    const remainingNow = n - g;
    timersRef.current.push(setTimeout(() => {
      if (!isMountedRef.current || myRun !== runIdRef.current) return;
      const anims = [];
      for (let i = remainingNow; i < n; i++) {
        anims.push(Animated.timing(vanish[i], { toValue: 1, duration: 650, useNativeDriver: USE_NATIVE }));
      }
      Animated.stagger(400, anims).start(() => {
        if (!isMountedRef.current || myRun !== runIdRef.current) return;
        setPhase('count');
        speak('Kaç tane kaldı? Say bakalım!', { instructions: HAPPY_VOICE });
      });
    }, 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('kac-kaldi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Kalan Nesneleri Sayma (5e kadar çıkarma) (MAB.1)',
      correct_answers: correctRef.current,
    });
  };

  const remaining = total - gone;

  const handlePick = (n: number) => {
    if (locked || phase !== 'count') return;
    movesRef.current += 1;
    if (n === remaining) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait(`${remaining} kaldı! Aferin.`, 1300, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
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
          message="Nesnelere iyi bak! Birkaçı kaybolacak. Geriye kaç tane kaldı, say."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>➖ {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Kaç tane kaldı?</Text>

      <Animated.View style={[styles.card, { transform: [{ scale: pop }] }]}>
        {Array.from({ length: total }).map((_, i) => {
          const v = vanish[i];
          return (
            <Animated.Text
              key={i}
              style={[
                styles.obj,
                {
                  opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.18] }),
                  transform: [
                    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) },
                    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
                  ],
                },
              ]}
            >
              {obj}
            </Animated.Text>
          );
        })}
      </Animated.View>

      <ListenButton onPress={() => speak('Kaç tane kaldı? Say bakalım!', { instructions: HAPPY_VOICE })} color="#00897B" style={{ marginTop: 14 }} />

      <View style={styles.numbers}>
        {options.map((n) => {
          const isWrong = wrong === n;
          return (
            <Animated.View key={n} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.numBtn, isWrong && styles.numWrong, phase !== 'count' && styles.numWaiting]}
                onPress={() => handlePick(n)}
                activeOpacity={0.85}
                disabled={phase !== 'count'}
              >
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
  container: { flex: 1, backgroundColor: '#E8F6F3', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#00695C' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#00695C', marginTop: 10 },
  card: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 24, minHeight: 130, width: '86%', maxWidth: 400, marginTop: 10, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  obj: { fontSize: 46 },

  numbers: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 20 },
  numBtn: { width: 78, height: 78, borderRadius: 22, backgroundColor: '#26A69A', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 5 },
  numWrong: { backgroundColor: '#EF9A9A' },
  numWaiting: { opacity: 0.45 },
  numText: { fontSize: 38, fontWeight: '900', color: '#fff' },
});
