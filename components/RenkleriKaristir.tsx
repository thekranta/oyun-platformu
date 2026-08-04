import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🎨 RENKLERİ KARIŞTIR - Renk karışımı gözlem/tahmin (Fen/FAB.3)
// İki renk karışınca ne olur? Çocuk sonucu tahmin eder (kırmızı+sarı=turuncu).
// Bilimsel gözleme dayalı tahmin. Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 6;

const C = {
  kirmizi: '#FF5A5A', sari: '#FFCE3A', mavi: '#4FA3FF',
  turuncu: '#FF9F45', yesil: '#57D971', mor: '#B77BFF',
};
const MIXES = [
  { a: C.kirmizi, b: C.sari, r: C.turuncu, rk: 'turuncu' },
  { a: C.mavi, b: C.sari, r: C.yesil, rk: 'yesil' },
  { a: C.kirmizi, b: C.mavi, r: C.mor, rk: 'mor' },
];
const ALL_RESULTS = [
  { k: 'turuncu', c: C.turuncu }, { k: 'yesil', c: C.yesil }, { k: 'mor', c: C.mor },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

export default function RenkleriKaristir({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [mix, setMix] = useState(MIXES[0]);
  const [options, setOptions] = useState<{ k: string; c: string }[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const prevRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pop = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const pool = MIXES.filter((m) => m.rk !== prevRef.current);
    const m = pool[Math.floor(Math.random() * pool.length)];
    prevRef.current = m.rk;
    const distract = ALL_RESULTS.filter((o) => o.k !== m.rk);
    setMix(m);
    setOptions(shuffle([{ k: m.rk, c: m.r }, ...distract]));
    setLocked(false);
    setWrongKey(null);
    pop.setValue(0.85);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak('Bu iki renk karışınca ne olur?', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('renkleri-karistir', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Fen: Renk Karışımını Gözleme Dayalı Tahmin (FAB.3)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (o: { k: string; c: string }) => {
    if (locked) return;
    movesRef.current += 1;
    if (o.k === mix.rk) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait('Doğru! İşte karışım rengi.', 1300, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrongKey(o.k);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongKey(null), 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="İki boyayı karıştırınca yeni bir renk olur! Hangi renk olur, tahmin et."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#6A1B9A" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🎨 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Karışınca ne olur?</Text>

      <Animated.View style={[styles.mixRow, { transform: [{ scale: pop }] }]}>
        <View style={[styles.blob, { backgroundColor: mix.a }]} />
        <Text style={styles.op}>+</Text>
        <View style={[styles.blob, { backgroundColor: mix.b }]} />
        <Text style={styles.op}>=</Text>
        <View style={styles.qBlob}><Text style={styles.qMark}>?</Text></View>
      </Animated.View>

      <View style={styles.options}>
        {options.map((o) => {
          const isWrong = wrongKey === o.k;
          return (
            <Animated.View key={o.k} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optBlob, { backgroundColor: o.c }, isWrong && styles.optWrong]} onPress={() => handlePick(o)} activeOpacity={0.85} />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F0FB', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#6A1B9A' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#6A1B9A', marginTop: 12, marginBottom: 20 },
  mixRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  blob: { width: 62, height: 62, borderRadius: 31, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 3 },
  op: { fontSize: 30, fontWeight: '900', color: '#8E24AA' },
  qBlob: { width: 62, height: 62, borderRadius: 31, borderWidth: 3, borderStyle: 'dashed', borderColor: '#B39DDB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  qMark: { fontSize: 30, fontWeight: '900', color: '#8E24AA' },

  options: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 44 },
  optBlob: { width: 78, height: 78, borderRadius: 39, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 5 },
  optWrong: { opacity: 0.5 },
});
