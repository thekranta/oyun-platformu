import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🎨 RENK TONLARI - Ton sıralama (açık→koyu) (Matematik, MAB.3)
// Aynı rengin tonlarını EN AÇIKTAN EN KOYUYA sırayla dokunarak diz.
// Görsel ayırt etme + sıralama (seriation). Tamamen görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 6;

// Her set: en açıktan en koyuya
const SHADE_SETS = [
  ['#BBDEFB', '#42A5F5', '#1565C0', '#0D47A1'],
  ['#C8E6C9', '#81C784', '#43A047', '#1B5E20'],
  ['#FFCDD2', '#EF5350', '#C62828', '#8E1111'],
  ['#FFE0B2', '#FFB74D', '#FB8C00', '#E65100'],
  ['#E1BEE7', '#BA68C8', '#8E24AA', '#4A148C'],
];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

interface Card { id: number; rank: number; color: string }

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function RenkTonlari({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [expected, setExpected] = useState(0);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const prevRef = useRef<number | null>(null);
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const roundDoneRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    // 3-4 ton (tur ilerledikçe artar)
    const n = round <= 3 ? 3 : 4;
    let idx = Math.floor(Math.random() * SHADE_SETS.length);
    if (idx === prevRef.current) idx = (idx + 1) % SHADE_SETS.length;
    prevRef.current = idx;
    const shades = SHADE_SETS[idx].slice(0, n);
    const items: Card[] = shades.map((color, rank) => ({ id: rank, rank, color }));
    setCards(shuffle(items).map((c, i) => ({ ...c, id: i })));
    setExpected(0);
    setWrongId(null);
    roundDoneRef.current = false;
    speak('En açık tondan en koyuya sırala!', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('renk-tonlari', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Renk Tonlarını Açıktan Koyuya Sıralama (seriation) (MAB.3)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (card: Card) => {
    if (roundDoneRef.current || card.rank < expected) return;
    movesRef.current += 1;
    if (card.rank === expected) {
      correctRef.current += 1;
      const next = expected + 1;
      setExpected(next);
      if (next >= cards.length) {
        roundDoneRef.current = true;
        const isLast = round >= TOTAL_ROUNDS;
        if (isLast) setShowConfetti(true);
        speakThenWait('Aferin! Tonları doğru sıraladın.', isLast ? 1500 : 950, { instructions: HAPPY_VOICE }).then(() => {
          if (!isMountedRef.current) return;
          if (isLast) finish();
          else setRound((r) => r + 1);
        });
      }
    } else {
      errorsRef.current += 1;
      setWrongId(card.id);
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
          message="Aynı rengin açık ve koyu tonları var! En açıktan en koyuya sırayla dokun."
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

      <Text style={styles.prompt}>En açıktan en koyuya!</Text>
      <Text style={styles.hint}>Sıradaki: {expected + 1}. (en açık kalan)</Text>

      <View style={styles.row}>
        {cards.map((card) => {
          const placed = card.rank < expected;
          const isWrong = wrongId === card.id;
          return (
            <Animated.View key={card.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.swatch, { backgroundColor: card.color }, placed && styles.placed]}
                onPress={() => handleTap(card)}
                activeOpacity={0.85}
                disabled={placed}
              >
                {placed && <View style={styles.orderBadge}><Text style={styles.orderText}>{card.rank + 1}</Text></View>}
              </TouchableOpacity>
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

  prompt: { fontSize: 22, fontWeight: '900', color: '#6A1B9A', marginTop: 12 },
  hint: { fontSize: 14, fontWeight: '700', color: '#AB47BC', marginTop: 4, marginBottom: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 12 },
  swatch: { width: 74, height: 100, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 5 },
  placed: { opacity: 0.5 },
  orderBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  orderText: { color: '#333', fontSize: 15, fontWeight: '900' },
});
