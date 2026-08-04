import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 👯 İKİZLERİ BUL - Birbirinin aynısını eşleme (Matematik/MAB.2)
// Karışık resimler arasında birbirinin AYNISI olan iki resmi bul.
// Görsel özellik çözümleme/eşleştirme; tüm kartlar açık (hafıza değil).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;
const ITEMS = ['🍎', '🍌', '🐶', '🐱', '⭐', '🌸', '🚗', '🎈', '🐟', '🦋', '🍓', '🌈', '🐝', '🍉', '🚀', '🧸', '🐸', '🍕'];

const cardCount = (round: number) => (round <= 4 ? 5 : 6);

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface Card { id: number; emoji: string; isTwin: boolean }

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

export default function IkizleriBul({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [firstId, setFirstId] = useState<number | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
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
    const n = cardCount(round);
    const pool = shuffle(ITEMS);
    const twin = pool[0];
    const distractors = pool.slice(1, n - 1); // n-2 farklı
    const built: Card[] = [
      { id: 0, emoji: twin, isTwin: true },
      { id: 0, emoji: twin, isTwin: true },
      ...distractors.map((emoji) => ({ id: 0, emoji, isTwin: false })),
    ];
    setCards(shuffle(built).map((c, i) => ({ ...c, id: i })));
    setFirstId(null);
    setMatchedIds([]);
    setWrongIds([]);
    setLocked(false);
    speak('Birbirinin aynısı iki resmi bul!', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('ikizleri-bul', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Görsel Özellik Çözümleme ve Aynı Olanı Eşleştirme (MAB.2)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (card: Card) => {
    if (locked || matchedIds.includes(card.id)) return;
    if (firstId === null) { setFirstId(card.id); return; }
    if (firstId === card.id) return;

    movesRef.current += 1;
    const first = cards.find((c) => c.id === firstId);
    if (!first) { setFirstId(null); return; }

    if (first.isTwin && card.isTwin) {
      correctRef.current += 1;
      setMatchedIds([first.id, card.id]);
      setFirstId(null);
      setLocked(true);
      const isLast = round >= TOTAL_ROUNDS;
      if (isLast) setShowConfetti(true);
      speakThenWait('Aferin! İkizleri buldun.', isLast ? 1500 : 1000, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        if (isLast) finish();
        else setRound((r) => r + 1);
      });
    } else {
      errorsRef.current += 1;
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

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Resimler arasında birbirinin tıpatıp aynısı olan iki tanesini bul!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#AD1457" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>👯 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>İkizleri bul!</Text>

      <View style={styles.grid}>
        {cards.map((card) => {
          const isSelected = firstId === card.id;
          const isMatched = matchedIds.includes(card.id);
          const isWrong = wrongIds.includes(card.id);
          return (
            <Animated.View key={card.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.card, isSelected && styles.cardSelected, isMatched && styles.cardMatched, isWrong && styles.cardWrong]}
                onPress={() => handleTap(card)}
                activeOpacity={0.85}
                disabled={isMatched}
              >
                <Text style={styles.cardEmoji}>{card.emoji}</Text>
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
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#AD1457' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#AD1457', marginTop: 12, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 6, maxWidth: 400, paddingHorizontal: 10 },
  card: { width: 100, height: 100, borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, borderColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  cardSelected: { borderColor: '#EC407A', backgroundColor: '#FCE4EC', transform: [{ scale: 1.05 }] },
  cardMatched: { borderColor: '#57D971', backgroundColor: '#EAFBEF' },
  cardWrong: { borderColor: '#FF6B6B' },
  cardEmoji: { fontSize: 54 },
});
