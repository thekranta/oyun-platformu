import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 📏 EN UZUN HANGİSİ? - Uzunluk karşılaştırma (Matematik/MAB.3)
// Farklı uzunlukta çubuklar; çocuk EN UZUN olanı seçer. Uzunluk (1B)
// karşılaştırma; tamamen görsel — en uzun bakışta bellidir.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;
const WIDTHS = [96, 150, 204, 258];
const COLORS = ['#FF6B6B', '#4FACFE', '#66BB6A', '#FFA726'];
const ENDS = ['🐛', '🚂', '🐍', '✏️', '🖍️'];

const barCount = (round: number) => (round <= 4 ? 3 : 4);

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface Bar { id: number; w: number; color: string }

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

export default function EnUzun({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [bars, setBars] = useState<Bar[]>([]);
  const [maxId, setMaxId] = useState(0);
  const [end, setEnd] = useState(ENDS[0]);
  const [locked, setLocked] = useState(false);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const n = barCount(round);
    const chosen = WIDTHS.slice(0, n); // farklı uzunluklar; en uzunu = son
    const cols = shuffle(COLORS).slice(0, n);
    const items: Bar[] = chosen.map((w, i) => ({ id: i, w, color: cols[i] }));
    const maxW = Math.max(...chosen);
    const display = shuffle(items);
    setBars(display);
    setMaxId(items.find((b) => b.w === maxW)!.id);
    setEnd(ENDS[Math.floor(Math.random() * ENDS.length)]);
    setLocked(false);
    setWrongId(null);
    speak('En uzun olanı bul!', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('en-uzun', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Uzunluğa Göre Karşılaştırma (en uzun) (MAB.3)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (bar: Bar) => {
    if (locked) return;
    movesRef.current += 1;
    if (bar.id === maxId) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait('Evet! En uzun bu. Aferin.', 1300, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrongId(bar.id);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongId(null), 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Çubuklardan EN UZUN olanına dokun!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#C2410C" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>📏 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>En uzun hangisi?</Text>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak('En uzun olanı bul!', { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.bars}>
        {bars.map((bar) => {
          const isWrong = wrongId === bar.id;
          return (
            <Animated.View key={bar.id} style={[styles.barRow, isWrong ? { transform: [{ translateX: shake }] } : undefined]}>
              <TouchableOpacity style={styles.barTouch} onPress={() => handleTap(bar)} activeOpacity={0.85}>
                <View style={[styles.bar, { width: bar.w, backgroundColor: bar.color }]}>
                  <Text style={styles.barEnd}>{end}</Text>
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
  container: { flex: 1, backgroundColor: '#FFF6EF', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#C2410C' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#C2410C', marginTop: 10 },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F97316', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  bars: { marginTop: 26, gap: 18, alignItems: 'flex-start', width: 280 },
  barRow: { justifyContent: 'flex-start' },
  barTouch: { justifyContent: 'center' },
  bar: { height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 4 },
  barEnd: { fontSize: 26 },
});
