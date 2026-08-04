import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🔗 NE İŞE YARAR? - İlişkili ikilileri eşleştir (Matematik/MAB.3 ilişki)
// Birbiriyle giden nesneleri eşle (şemsiye-yağmur, arı-bal). Günlük yaşam
// ilişkisi kurma; farklı ama İLİŞKİLİ öğeler (opposite/aynı değil). Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 4;
const PAIRS_PER_ROUND = 3;

interface Item { emoji: string; name: string }
interface Pair { a: Item; b: Item }

const PAIRS: Pair[] = [
  { a: { emoji: '☂️', name: 'Şemsiye' }, b: { emoji: '🌧️', name: 'Yağmur' } },
  { a: { emoji: '🐝', name: 'Arı' }, b: { emoji: '🍯', name: 'Bal' } },
  { a: { emoji: '🪥', name: 'Diş fırçası' }, b: { emoji: '🦷', name: 'Diş' } },
  { a: { emoji: '🔑', name: 'Anahtar' }, b: { emoji: '🔒', name: 'Kilit' } },
  { a: { emoji: '🧦', name: 'Çorap' }, b: { emoji: '👟', name: 'Ayakkabı' } },
  { a: { emoji: '🐄', name: 'İnek' }, b: { emoji: '🥛', name: 'Süt' } },
  { a: { emoji: '🌱', name: 'Fidan' }, b: { emoji: '💧', name: 'Su' } },
];

interface Card { cardId: number; pairId: number; emoji: string; name: string }

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildRound = (): Card[] => {
  const chosen = shuffle(PAIRS).slice(0, PAIRS_PER_ROUND);
  const cards: Card[] = [];
  chosen.forEach((p, pairId) => {
    cards.push({ cardId: 0, pairId, emoji: p.a.emoji, name: p.a.name });
    cards.push({ cardId: 0, pairId, emoji: p.b.emoji, name: p.b.name });
  });
  return shuffle(cards).map((c, i) => ({ ...c, cardId: i }));
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

export default function NeIseYarar({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [firstId, setFirstId] = useState<number | null>(null);
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
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
    setCards(buildRound());
    setMatched(new Set());
    setFirstId(null);
    setWrongIds([]);
    setLocked(false);
    speak('Birbiriyle giden ikilileri eşleştir!', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('ne-ise-yarar', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Nesneleri Günlük Yaşam İlişkilerine Göre Eşleştirme (MAB.3)',
      correct_answers: correctRef.current,
    });
  };

  const runShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
    ]).start();
  };

  const handleTap = (card: Card) => {
    if (locked || matched.has(card.cardId)) return;
    if (firstId === null) { setFirstId(card.cardId); return; }
    if (firstId === card.cardId) return;

    movesRef.current += 1;
    const firstCard = cards.find((c) => c.cardId === firstId);
    if (!firstCard) { setFirstId(null); return; }

    if (firstCard.pairId === card.pairId) {
      correctRef.current += 1;
      const next = new Set(matched);
      next.add(firstCard.cardId);
      next.add(card.cardId);
      setMatched(next);
      setFirstId(null);
      const fb = `${firstCard.name} ile ${card.name} birbirine gider!`;
      if (next.size >= cards.length) {
        const roundDone = round >= TOTAL_ROUNDS;
        if (roundDone) setShowConfetti(true);
        speakThenWait(fb, roundDone ? 1500 : 950, { instructions: HAPPY_VOICE }).then(() => {
          if (!isMountedRef.current) return;
          if (roundDone) finish();
          else setRound((r) => r + 1);
        });
      } else {
        speak(fb, { instructions: HAPPY_VOICE });
      }
    } else {
      errorsRef.current += 1;
      setWrongIds([firstId, card.cardId]);
      setLocked(true);
      runShake();
      const t = setTimeout(() => { setWrongIds([]); setFirstId(null); setLocked(false); }, 650);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={120} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Birbiriyle giden ikilileri bul! Şemsiye - yağmur gibi."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#00695C" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔗 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Birbirine gidenleri eşle!</Text>

      <View style={styles.grid}>
        {cards.map((card) => {
          const isMatched = matched.has(card.cardId);
          const isSelected = firstId === card.cardId;
          const isWrong = wrongIds.includes(card.cardId);
          return (
            <Animated.View key={card.cardId} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.card, isSelected && styles.cardSelected, isMatched && styles.cardMatched, isWrong && styles.cardWrong]}
                onPress={() => handleTap(card)}
                activeOpacity={0.85}
                disabled={isMatched}
              >
                <Text style={styles.cardEmoji}>{card.emoji}</Text>
                <Text style={[styles.cardName, isMatched && styles.cardNameMatched]}>{card.name}</Text>
                {isMatched && <View style={styles.checkBadge}><Ionicons name="checkmark" size={16} color="#fff" /></View>}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EAF7F4', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#00695C' },

  prompt: { fontSize: 21, fontWeight: '900', color: '#00695C', marginTop: 12, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 6, maxWidth: 400, paddingHorizontal: 8 },
  card: { width: 104, height: 116, borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, borderColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  cardSelected: { borderColor: '#26A69A', backgroundColor: '#E0F2F1', transform: [{ scale: 1.04 }] },
  cardMatched: { borderColor: '#57D971', backgroundColor: '#EAFBEF' },
  cardWrong: { borderColor: '#FF6B6B' },
  cardEmoji: { fontSize: 46 },
  cardName: { fontSize: 12, fontWeight: '800', color: '#00695C', textAlign: 'center' },
  cardNameMatched: { color: '#2E7D5B' },
  checkBadge: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#57D971', alignItems: 'center', justifyContent: 'center' },
});
