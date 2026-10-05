
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import ListenButton from './ListenButton';

// ============================================
// ➕ KAÇ OLDU? - 5'e kadar toplama (Matematik/MAB.1)
// İki grubu birleştirip hepsini sayar, toplam rakamı seçer. Sayı-nicelik
// birleştirme (erken toplama). Görsel: nesneler görünür, çocuk sayar.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;
const OBJECTS = ['🍎', '🍓', '🐤', '⭐', '🎈', '🍪'];

const buildOptions = (correct: number): number[] => {
  const set = new Set<number>([correct]);
  let d = 1;
  while (set.size < 3) {
    if (correct - d >= 1) set.add(correct - d);
    if (set.size < 3 && correct + d <= 5) set.add(correct + d);
    d++;
    if (d > 5) break;
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

export default function KacOldu({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const [obj, setObj] = useState('🍎');
  const [options, setOptions] = useState<number[]>([]);
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
  const pop = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => {
    isMountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    stopSpeech();
  }, []);

  useEffect(() => {
    if (!gameReady) return;
    // a+b <= 5, her ikisi de >=1
    const na = 1 + Math.floor(Math.random() * 3); // 1-3
    const maxB = Math.min(3, 5 - na);
    const nb = 1 + Math.floor(Math.random() * maxB);
    setA(na);
    setB(nb);
    setObj(OBJECTS[Math.floor(Math.random() * OBJECTS.length)]);
    setOptions(buildOptions(na + nb));
    setLocked(false);
    setWrong(null);
    pop.setValue(0.85);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak('Hepsi kaç etti? Say bakalım!', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('kac-oldu', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Grupları Birleştirip Sayma (5e kadar toplama) (MAB.1)',
      correct_answers: correctRef.current,
    });
  };

  const total = a + b;

  const handlePick = (n: number) => {
    if (locked) return;
    movesRef.current += 1;
    if (n === total) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait(`${total} oldu! Aferin.`, 1300, { instructions: HAPPY_VOICE }).then(() => {
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
          message="İki grubu birleştir, hepsini say! Toplam kaç ediyor?"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>➕ {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.contentArea}>
        <Text style={styles.prompt}>Hepsi kaç etti?</Text>

        <Animated.View style={[styles.equation, { transform: [{ scale: pop }] }]}>
          <View style={styles.group}>
            {Array.from({ length: a }).map((_, i) => <Text key={i} style={styles.obj}>{obj}</Text>)}
          </View>
          <Text style={styles.op}>+</Text>
          <View style={styles.group}>
            {Array.from({ length: b }).map((_, i) => <Text key={i} style={styles.obj}>{obj}</Text>)}
          </View>
        </Animated.View>

        <ListenButton onPress={() => speak('Hepsi kaç etti? Say bakalım!', { instructions: HAPPY_VOICE })} color="#00897B" style={{ marginTop: 14 }} />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F6F3', alignItems: 'center' },
  // Header sabit en üstte kalsın; geri kalan içerik altındaki boş alanda dikey ortalanır
  // (önceden container'da justifyContent olmadığından hepsi ekranın üstüne yığılıyordu).
  contentArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#00695C' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#00695C', marginTop: 10 },
  equation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 24, paddingVertical: 16, paddingHorizontal: 14, marginTop: 14, minHeight: 110, width: '88%', maxWidth: 420, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  group: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 2, maxWidth: 150 },
  obj: { fontSize: 34 },
  op: { fontSize: 36, fontWeight: '900', color: '#00897B' },

  numbers: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 20 },
  numBtn: { width: 78, height: 78, borderRadius: 22, backgroundColor: '#26A69A', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 5 },
  numWrong: { backgroundColor: '#EF9A9A' },
  numText: { fontSize: 38, fontWeight: '900', color: '#fff' },
});
