import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// ⏰ GÜNÜM - Günlük rutini zaman sırasına koyma (Sosyal Bilgiler, SAB.1)
// Günün olaylarını sabahtan akşama doğru sırala. Zaman/kronoloji + günlük
// yaşam düzeni. Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 5;

const SEQUENCES: { emojis: string[]; label: string }[] = [
  { emojis: ['🌅', '☀️', '🌙'], label: 'Sabah, gündüz, gece' },
  { emojis: ['🥣', '🍽️', '🍲'], label: 'Kahvaltı, öğle, akşam yemeği' },
  { emojis: ['😴', '🪥', '🎒'], label: 'Uyan, dişini fırçala, okula git' },
  { emojis: ['🏫', '🎨', '🛏️'], label: 'Okul, oyun, uyku' },
  { emojis: ['👕', '🍎', '🛁'], label: 'Giyin, ye, yıkan' },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

interface Card { id: number; order: number; emoji: string }

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function Gunum({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [label, setLabel] = useState('');
  const [expected, setExpected] = useState(0);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const prevRef = useRef<string | null>(null);
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
    const pool = SEQUENCES.filter((s) => s.label !== prevRef.current);
    const seq = pool[Math.floor(Math.random() * pool.length)];
    prevRef.current = seq.label;
    const built: Card[] = seq.emojis.map((emoji, order) => ({ id: order, order, emoji }));
    setCards(shuffle(built).map((c, i) => ({ ...c, id: i })));
    setLabel(seq.label);
    setExpected(0);
    setWrongId(null);
    roundDoneRef.current = false;
    speak('Günün sırasını yap! Önce ne olur, en baştan dokun.', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('gunum', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal Bilgiler: Günlük Rutini Zaman Sırasına Koyma (sabah-akşam) (SAB.1)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (card: Card) => {
    if (roundDoneRef.current || card.order < expected) return;
    movesRef.current += 1;
    if (card.order === expected) {
      correctRef.current += 1;
      const next = expected + 1;
      setExpected(next);
      if (next >= cards.length) {
        roundDoneRef.current = true;
        const isLast = round >= TOTAL_ROUNDS;
        if (isLast) setShowConfetti(true);
        speakThenWait('Harika sıraladın! Aferin.', isLast ? 1500 : 1000, { instructions: HAPPY_VOICE }).then(() => {
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
          message="Günümüzü sıraya koyalım! En baştan (sabah) sona (gece) doğru sırayla dokun."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#00695C" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>⏰ {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Günü sıraya koy!</Text>
      <Text style={styles.hint}>Sıradaki: {expected + 1}.</Text>

      <View style={styles.row}>
        {cards.map((card) => {
          const placed = card.order < expected;
          const isWrong = wrongId === card.id;
          return (
            <Animated.View key={card.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.card, placed && styles.cardPlaced]} onPress={() => handleTap(card)} activeOpacity={0.85} disabled={placed}>
                <Text style={styles.cardEmoji}>{card.emoji}</Text>
                {placed && <View style={styles.orderBadge}><Text style={styles.orderText}>{card.order + 1}</Text></View>}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EAF7F4', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#00695C' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#00695C', marginTop: 12 },
  hint: { fontSize: 15, fontWeight: '700', color: '#4DB6AC', marginTop: 2, marginBottom: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 10 },
  card: { width: 100, height: 110, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  cardPlaced: { backgroundColor: '#D8F3EC', opacity: 0.7 },
  cardEmoji: { fontSize: 58 },
  orderBadge: { position: 'absolute', top: -6, left: -6, width: 28, height: 28, borderRadius: 14, backgroundColor: '#26A69A', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  orderText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  label: { fontSize: 15, fontWeight: '700', color: '#4DB6AC', marginTop: 18, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 16 },
});
