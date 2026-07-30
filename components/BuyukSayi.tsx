import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 🔢 BÜYÜK SAYI HANGİSİ? - Sayı karşılaştırma (Matematik/MAB.3)
// İki sayıdan büyük olanı seçer (altında nokta desteğiyle). Sayı-nicelik
// karşılaştırma. Görsel + sayı okuma.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const maxNum = (round: number) => (round <= 4 ? 5 : 9);

interface Card { id: number; n: number }

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function BuyukSayi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [bigId, setBigId] = useState(0);
  const [locked, setLocked] = useState(false);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const cap = maxNum(round);
    let a = 1 + Math.floor(Math.random() * cap);
    let b = 1 + Math.floor(Math.random() * cap);
    while (b === a) b = 1 + Math.floor(Math.random() * cap);
    const items: Card[] = shuffle([{ id: 0, n: a }, { id: 1, n: b }]);
    setCards(items);
    setBigId(a > b ? items.find((c) => c.n === a)!.id : items.find((c) => c.n === b)!.id);
    setLocked(false);
    setWrongId(null);
    speak('Hangi sayı daha büyük?', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('buyuk-sayi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Sayıları Karşılaştırma (hangisi daha büyük) (MAB.3)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (card: Card) => {
    if (locked) return;
    movesRef.current += 1;
    if (card.id === bigId) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speak(`Evet, ${card.n} daha büyük! Aferin.`, { instructions: HAPPY_VOICE });
      const t = setTimeout(() => {
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      }, 1300);
      timersRef.current.push(t);
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
          message="İki sayı var. Hangisi daha büyük? Ona dokun! (noktaları sayabilirsin)"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#1565C0" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔢 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Hangisi daha büyük?</Text>

      <View style={styles.cards}>
        {cards.map((card) => {
          const isWrong = wrongId === card.id;
          return (
            <Animated.View key={card.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.card, isWrong && styles.cardWrong]} onPress={() => handleTap(card)} activeOpacity={0.85}>
                <Text style={styles.num}>{card.n}</Text>
                <View style={styles.dots}>
                  {Array.from({ length: card.n }).map((_, i) => <View key={i} style={styles.dot} />)}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#1565C0' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#1565C0', marginTop: 12, marginBottom: 8 },
  cards: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 12 },
  card: { width: 150, minHeight: 190, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14, paddingBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 6 },
  cardWrong: { backgroundColor: '#FFE0E0' },
  num: { fontSize: 76, fontWeight: '900', color: '#1E88E5' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, maxWidth: 120, marginTop: 4 },
  dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#90CAF9' },
});
