import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 🐔 ÇİFTLİKTE SAYALIM - Sayma & sayı-nicelik (Matematik/MAB.1)
// Çiftlikteki hayvanları say, doğru rakama dokun (1-5). Sayı-nicelik
// ilişkisi; görsel (nesneler görünür), ses sadece destek.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;
const ANIMALS = ['🐔', '🐑', '🐄', '🐷', '🐰', '🐤', '🐥'];

const maxCount = (round: number) => (round <= 3 ? 3 : round <= 6 ? 4 : 5);

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

export default function CiftlikteSayalim({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [animal, setAnimal] = useState(ANIMALS[0]);
  const [count, setCount] = useState(1);
  const [options, setOptions] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const penBounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const cap = maxCount(round);
    const c = 1 + Math.floor(Math.random() * cap);
    setAnimal(ANIMALS[Math.floor(Math.random() * ANIMALS.length)]);
    setCount(c);
    setOptions(buildOptions(c, cap));
    setLocked(false);
    setWrong(null);
    penBounce.setValue(0.85);
    Animated.spring(penBounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak('Kaç tane var? Say bakalım!', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('ciftlikte-sayalim', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Ritmik/Algısal Sayma ve Sayı-Nicelik İlişkisi (MAB.1)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (n: number) => {
    if (locked) return;
    movesRef.current += 1;
    if (n === count) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speak(`${count} tane! Aferin.`, { instructions: HAPPY_VOICE });
      const t = setTimeout(() => {
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      }, 1300);
      timersRef.current.push(t);
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
          message="Çiftlikteki hayvanları say ve doğru sayıya dokun!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🐔 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Kaç tane var?</Text>

      <Animated.View style={[styles.pen, { transform: [{ scale: penBounce }] }]}>
        {Array.from({ length: count }).map((_, i) => (
          <Text key={i} style={styles.animal}>{animal}</Text>
        ))}
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak('Kaç tane var? Say bakalım!', { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.numbers}>
        {options.map((n) => {
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
  container: { flex: 1, backgroundColor: '#F1FBF0', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#2E7D32' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#2E7D32', marginTop: 10 },
  pen: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 28, borderWidth: 4, borderColor: '#C8E6C9', minHeight: 150, width: '86%', maxWidth: 420, marginTop: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  animal: { fontSize: 52 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#43A047', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  numbers: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 22 },
  numBtn: { width: 82, height: 82, borderRadius: 22, backgroundColor: '#66BB6A', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 5 },
  numWrong: { backgroundColor: '#EF9A9A' },
  numText: { fontSize: 40, fontWeight: '900', color: '#fff' },
});
