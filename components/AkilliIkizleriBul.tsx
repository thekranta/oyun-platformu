
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';
import { speak, speakThenWait } from '../services/speechService';
import ListenButton from './ListenButton';

// ============================================
// 📈 AKILLI İKİZLERİ BUL — UYARLANIR (adaptif) zorluk versiyonu.
// Temel oyun: IkizleriBul.tsx (Matematik/MAB.10 — Matematiksel Temsil).
// Karışık resimler arasında birbirinin AYNISI olan iki resmi bul; tüm
// kartlar açık (hafıza değil). Zorlukla TOPLAM KART SAYISI artar (4 → 10),
// böylece çeldirici sayısı ve görsel tarama yükü büyür.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const INSTRUCTION_TEXT = 'Birbirinin aynısı iki resmi bul! Sen başardıkça zorlaşır 📈';
const TOTAL_ROUNDS = 9; // 3 checkpoint (her 3 turda bir uyarlama)
const TARGET_MS = 8000; // "hızlı" eşiği (hız değerlendirmesi için)
const ITEMS = ['🍎', '🍌', '🐶', '🐱', '⭐', '🌸', '🚗', '🎈', '🐟', '🦋', '🍓', '🌈', '🐝', '🍉', '🚀', '🧸', '🐸', '🍕'];

// Zorluğa göre TOPLAM kart sayısı (1 ikiz çifti + n-2 farklı çeldirici).
// 18 nesnelik havuz, en zor seviyede (10 kart → 8 çeldirici + 1 ikiz türü = 9 farklı emoji) yetiyor.
const CARD_COUNT_BY_DIFF: Record<number, number> = { 1: 4, 2: 5, 3: 6, 4: 8, 5: 10 };

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface Card { id: number; emoji: string; isTwin: boolean }

function buildRound(diff: number): Card[] {
  const n = CARD_COUNT_BY_DIFF[diff] || 5;
  const pool = shuffle(ITEMS);
  const twin = pool[0];
  const distractors = pool.slice(1, n - 1); // n-2 farklı
  const built: Card[] = [
    { id: 0, emoji: twin, isTwin: true },
    { id: 0, emoji: twin, isTwin: true },
    ...distractors.map((emoji) => ({ id: 0, emoji, isTwin: false })),
  ];
  return shuffle(built).map((c, i) => ({ ...c, id: i }));
}

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

export default function AkilliIkizleriBul({ onGameEnd, onExit, childName }: Props) {
  const START_DIFF = 2;
  const { recordLevel } = useAdaptiveDifficulty({
    minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: START_DIFF,
  });

  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [firstId, setFirstId] = useState<number | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const startTimeRef = useRef(Date.now());
  const levelStartRef = useRef(Date.now());
  const levelErrorsRef = useRef(0);
  const totalMovesRef = useRef(0);
  const totalErrorsRef = useRef(0);
  const correctRef = useRef(0);
  const diffRef = useRef(START_DIFF);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    setCards(buildRound(diffRef.current));
    setFirstId(null);
    setMatchedIds([]);
    setWrongIds([]);
    setLocked(false);
    levelStartRef.current = Date.now();
    speak(INSTRUCTION_TEXT, { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = (solvedInDiff: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    onGameEnd('akilli-ikizleri-bul', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
      zorlukSeviyesi: solvedInDiff,
      kazanimOdagi: 'Matematik: Görsel Özellik Çözümleme ve Aynı Olanı Eşleştirme (MAB.2) (uyarlanır zorluk)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (card: Card) => {
    if (locked || matchedIds.includes(card.id)) return;
    if (firstId === null) { setFirstId(card.id); return; }
    if (firstId === card.id) return;

    totalMovesRef.current += 1;
    const first = cards.find((c) => c.id === firstId);
    if (!first) { setFirstId(null); return; }

    if (first.isTwin && card.isTwin) {
      correctRef.current += 1;
      setMatchedIds([first.id, card.id]);
      setFirstId(null);
      setLocked(true);
      const isLast = round >= TOTAL_ROUNDS;
      const solvedInDiff = diffRef.current;
      if (isLast) setShowConfetti(true);
      speakThenWait('Aferin! İkizleri buldun.', isLast ? 1500 : 1000, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;

        // Seviye sonucu motora bildirilir; sıradaki zorluk döner
        const timeMs = Date.now() - levelStartRef.current;
        const nextDiff = recordLevel({ correct: 1, total: 1, errors: levelErrorsRef.current, timeMs, targetMs: TARGET_MS });
        levelErrorsRef.current = 0;

        if (isLast) { finish(solvedInDiff); return; }
        diffRef.current = nextDiff;
        setRound((r) => r + 1);
      });
    } else {
      levelErrorsRef.current += 1;
      totalErrorsRef.current += 1;
      setWrongIds([firstId, card.id]);
      setLocked(true);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => { setWrongIds([]); setFirstId(null); setLocked(false); }, 650);
      timersRef.current.push(t);
    }
  };

  const cardCount = cards.length;
  const cols = cardCount <= 4 ? 2 : cardCount <= 6 ? 3 : cardCount <= 8 ? 4 : 5;
  const cellSize = cols <= 3 ? 100 : cols === 4 ? 82 : 68;

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message={INSTRUCTION_TEXT}
          childName={childName}
          countdownSeconds={5}
          onComplete={() => { startTimeRef.current = Date.now(); setGameReady(true); }}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>👯 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>📈 Akıllı İkizleri Bul</Text>

      <ListenButton onPress={() => speak(INSTRUCTION_TEXT, { instructions: HAPPY_VOICE })} color="#EC407A" style={{ marginTop: 12 }} />

      <View style={[styles.grid, { maxWidth: cols * (cellSize + 14) + 8 }]}>
        {cards.map((card) => {
          const isSelected = firstId === card.id;
          const isMatched = matchedIds.includes(card.id);
          const isWrong = wrongIds.includes(card.id);
          return (
            <Animated.View key={card.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.card, { width: cellSize, height: cellSize }, isSelected && styles.cardSelected, isMatched && styles.cardMatched, isWrong && styles.cardWrong]}
                onPress={() => handleTap(card)}
                activeOpacity={0.85}
                disabled={isMatched}
              >
                <Text style={[styles.cardEmoji, { fontSize: cellSize * 0.54 }]}>{card.emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF0F6', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#AD1457' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#AD1457', marginTop: 12, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 6, paddingHorizontal: 10 },
  card: { borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, borderColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  cardSelected: { borderColor: '#EC407A', backgroundColor: '#FCE4EC', transform: [{ scale: 1.05 }] },
  cardMatched: { borderColor: '#57D971', backgroundColor: '#EAFBEF' },
  cardWrong: { borderColor: '#FF6B6B' },
  cardEmoji: {},
});
