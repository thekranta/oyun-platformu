import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 📊 AZ → ÇOK SIRALA - Niceliğe göre sıralama (Matematik/MAB.3)
// Farklı sayıda nokta içeren grupları EN AZDAN EN ÇOĞA sırayla dokunarak diz.
// Nicelik karşılaştırma/seriation. Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 6;
const DOT_COLORS = ['#FF6B6B', '#4FACFE', '#66BB6A', '#FFA726', '#AB47BC'];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface Card { id: number; rank: number; count: number; color: string }

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function AzCokSirala({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [expected, setExpected] = useState(0);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
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
    const counts = shuffle([1, 2, 3, 4, 5]).slice(0, 3).sort((a, b) => a - b);
    const cols = shuffle(DOT_COLORS);
    const items: Card[] = counts.map((count, rank) => ({ id: rank, rank, count, color: cols[rank] }));
    setCards(shuffle(items).map((c, i) => ({ ...c, id: i })));
    setExpected(0);
    setWrongId(null);
    roundDoneRef.current = false;
    speak('En azdan en çoğa doğru sırala!', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('az-cok-sirala', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Niceliğe Göre Karşılaştırma ve Sıralama (az→çok) (MAB.3)',
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
        speakThenWait('Aferin! Doğru sıraladın.', isLast ? 1500 : 950, { instructions: HAPPY_VOICE }).then(() => {
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
          message="En az noktalıdan en çok noktalıya doğru sırayla dokun!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>📊 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>En azdan en çoğa!</Text>
      <Text style={styles.hint}>Sıradaki: {expected + 1}. (en az kalan)</Text>

      <View style={styles.row}>
        {cards.map((card) => {
          const placed = card.rank < expected;
          const isWrong = wrongId === card.id;
          return (
            <Animated.View key={card.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.card, placed && styles.cardPlaced]} onPress={() => handleTap(card)} activeOpacity={0.85} disabled={placed}>
                <View style={styles.dots}>
                  {Array.from({ length: card.count }).map((_, i) => (
                    <View key={i} style={[styles.dot, { backgroundColor: card.color }]} />
                  ))}
                </View>
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
  container: { flex: 1, backgroundColor: '#F1FBF0', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#2E7D32' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#2E7D32', marginTop: 10 },
  hint: { fontSize: 14, fontWeight: '700', color: '#66BB6A', marginTop: 4, marginBottom: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 10 },
  card: { width: 100, height: 120, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  cardPlaced: { backgroundColor: '#E8F5E9', opacity: 0.7 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, maxWidth: 84 },
  dot: { width: 22, height: 22, borderRadius: 11 },
  orderBadge: { position: 'absolute', top: -6, left: -6, width: 28, height: 28, borderRadius: 14, backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  orderText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
