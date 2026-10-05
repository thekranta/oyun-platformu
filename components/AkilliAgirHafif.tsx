
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';

// ============================================
// ⚖️ AKILLI EN AĞIR HANGİSİ - Ağırlık karşılaştırma, uyarlanır zorluk (Matematik/MAB.4)
// Zorluk çocuğun performansına göre değişir: kolayda 2 seçenek ve çok belirgin ağırlık farkı
// (fil-tüy); zorlaştıkça 3 seçenek ve birbirine yaklaşan ağırlıklar.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 9;

// Yaklaşık gerçek ağırlıklar (kg) — çocuğun günlük bilgisiyle doğru sıralanabilen nesneler.
const ITEMS = [
  { e: '🐋', kg: 30000 }, { e: '🚌', kg: 12000 }, { e: '🐘', kg: 5000 }, { e: '🚗', kg: 1500 },
  { e: '🐄', kg: 600 }, { e: '🐻', kg: 300 }, { e: '🐷', kg: 120 }, { e: '🐶', kg: 20 },
  { e: '🍉', kg: 6 }, { e: '🐱', kg: 4 }, { e: '🐇', kg: 2 }, { e: '🍎', kg: 0.2 },
  { e: '🐦', kg: 0.05 }, { e: '🎈', kg: 0.005 }, { e: '🪶', kg: 0.001 },
];

// Zorluk -> { seçenek sayısı, en ağırın diğerlerine oranı (en az) }
const CFG_BY_DIFF: Record<number, { n: number; ratio: number }> = {
  1: { n: 2, ratio: 300 },
  2: { n: 2, ratio: 60 },
  3: { n: 3, ratio: 20 },
  4: { n: 3, ratio: 8 },
  5: { n: 3, ratio: 3 },
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface Card { id: number; emoji: string; heavy: boolean }

// Aynı görseller arka arkaya gelmesin (docx #45): önceki turdaki nesneler mümkünse dışlanır.
const buildRound = (diff: number, prev: string[]): Card[] => {
  const { n, ratio } = CFG_BY_DIFF[diff] ?? CFG_BY_DIFF[1];
  for (const avoid of [prev, [] as string[]]) {
    const pool = ITEMS.filter((x) => !avoid.includes(x.e));
    for (const heavy of shuffle(pool)) {
      const lights = pool.filter((x) => x.kg * ratio <= heavy.kg);
      if (lights.length >= n - 1) {
        const picked = shuffle(lights).slice(0, n - 1);
        return shuffle([
          { id: 0, emoji: heavy.e, heavy: true },
          ...picked.map((p, i) => ({ id: i + 1, emoji: p.e, heavy: false })),
        ]);
      }
    }
  }
  return [];
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

export default function AkilliAgirHafif({ onGameEnd, onExit, childName }: Props) {
  const { difficulty, recordLevel } = useAdaptiveDifficulty({ minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3 });
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const diffRef = useRef(difficulty);
  const prevEmojisRef = useRef<string[]>([]);
  const levelStartRef = useRef(Date.now());
  const levelErrorsRef = useRef(0);
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); stopSpeech(); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const built = buildRound(diffRef.current, prevEmojisRef.current);
    prevEmojisRef.current = built.map((c) => c.emoji);
    setCards(built);
    setLocked(false);
    setWrongId(null);
    levelStartRef.current = Date.now();
    levelErrorsRef.current = 0;
    speak('En ağır olanı bul!', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = (lastDiff: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('akilli-agir-hafif', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: lastDiff,
      kazanimOdagi: 'Matematik: Ağırlığa Göre Karşılaştırma (uyarlanır zorluk) (MAB.4)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (card: Card) => {
    if (locked) return;
    movesRef.current += 1;
    if (card.heavy) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      const nextDiff = recordLevel({
        correct: 1, total: 1, errors: levelErrorsRef.current,
        timeMs: Date.now() - levelStartRef.current, targetMs: 5000,
      });
      diffRef.current = nextDiff;
      speakThenWait('Evet, bu daha ağır! Aferin.', 1300, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish(nextDiff);
      });
    } else {
      errorsRef.current += 1;
      levelErrorsRef.current += 1;
      setWrongId(card.id);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      timersRef.current.push(setTimeout(() => setWrongId(null), 450));
    }
  };

  const three = cards.length >= 3;

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Hangisi en ağır? En ağır olana dokun! Sen başardıkça oyun akıllanır 📈"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>⚖️ {round}/{TOTAL_ROUNDS}  📈</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>En ağır hangisi?</Text>
      <Text style={styles.scale}>⚖️</Text>

      <ListenButton onPress={() => speak('En ağır olanı bul!', { instructions: HAPPY_VOICE })} color="#4E342E" style={{ marginTop: 12 }} />

      <View style={[styles.cards, three && styles.cards3]}>
        {cards.map((card) => {
          const isWrong = wrongId === card.id;
          return (
            <Animated.View key={card.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.card, three && styles.card3, isWrong && styles.cardWrong]}
                onPress={() => handleTap(card)}
                activeOpacity={0.85}
              >
                <Text style={[styles.cardEmoji, three && styles.cardEmoji3]}>{card.emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0EC', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#4E342E' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#4E342E', marginTop: 12 },
  scale: { fontSize: 52, marginTop: 8 },
  cards: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 20 },
  cards3: { gap: 12 },
  card: { width: 140, height: 140, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 6 },
  card3: { width: 100, height: 100, borderRadius: 24 },
  cardWrong: { backgroundColor: '#FFE0E0' },
  cardEmoji: { fontSize: 84 },
  cardEmoji3: { fontSize: 58 },
});
