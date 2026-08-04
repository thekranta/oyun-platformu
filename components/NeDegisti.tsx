import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🔍 NE DEĞİŞTİ? - Görsel dikkat/bellek (Bilişsel/MAB.2)
// Resimlere iyi bak, ezberle; biri değişir, değişeni bul. Dikkat +
// çalışma belleği. Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 6;
const ITEMS = ['🍎', '🐶', '⭐', '🌸', '🚗', '🎈', '🐟', '🦋', '🍓', '🐝', '🍉', '🚀', '🧸', '🐸', '🍕', '🌈'];

const cardCount = (round: number) => (round <= 3 ? 3 : 4);

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

export default function NeDegisti({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'study' | 'cover' | 'guess' | 'done'>('study');
  const [origRow, setOrigRow] = useState<string[]>([]);
  const [guessRow, setGuessRow] = useState<string[]>([]);
  const [changedIndex, setChangedIndex] = useState(0);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
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
    const orig = pool.slice(0, n);
    const ci = Math.floor(Math.random() * n);
    const newEmoji = pool[n]; // havuzdaki bir sonraki (satırda yok)
    const guess = [...orig];
    guess[ci] = newEmoji;
    setOrigRow(orig);
    setGuessRow(guess);
    setChangedIndex(ci);
    setWrongIdx(null);
    setPhase('study');
    speak('İyi bak, ezberle!', { instructions: HAPPY_VOICE });
    timersRef.current.push(setTimeout(() => setPhase('cover'), 2600));
    timersRef.current.push(setTimeout(() => {
      setPhase('guess');
      speak('Ne değişti? Değişeni bul!', { instructions: HAPPY_VOICE });
    }, 3300));
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('ne-degisti', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Bilişsel: Görsel Dikkat ve Çalışma Belleği (değişeni fark etme) (MAB.2)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (i: number) => {
    if (phase !== 'guess') return;
    movesRef.current += 1;
    if (i === changedIndex) {
      setPhase('done');
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait('Aferin! İşte değişen buydu.', 1400, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrongIdx(i);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongIdx(null), 450);
      timersRef.current.push(t);
    }
  };

  const promptText = phase === 'study' ? 'İyi bak, ezberle!' : phase === 'cover' ? '...' : 'Ne değişti?';
  const row = phase === 'study' ? origRow : phase === 'cover' ? origRow.map(() => '❓') : guessRow;

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Resimlere iyi bak ve ezberle! Sonra biri değişecek, değişeni bulacaksın."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#00838F" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔍 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>{promptText}</Text>

      <View style={styles.row}>
        {row.map((emoji, i) => {
          const isWrong = wrongIdx === i;
          const cover = phase === 'cover';
          return (
            <Animated.View key={i} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.card, cover && styles.cardCover, isWrong && styles.cardWrong]}
                onPress={() => handleTap(i)}
                activeOpacity={phase === 'guess' ? 0.85 : 1}
                disabled={phase !== 'guess'}
              >
                <Text style={styles.cardEmoji}>{emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {phase === 'guess' && <Text style={styles.hint}>Değişen resme dokun</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E7FAFB', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#00838F' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#00838F', marginTop: 16, marginBottom: 22, minHeight: 30 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, maxWidth: 420, paddingHorizontal: 12 },
  card: { width: 92, height: 92, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  cardCover: { backgroundColor: '#B2EBF2' },
  cardWrong: { backgroundColor: '#FFE0E0' },
  cardEmoji: { fontSize: 50 },
  hint: { fontSize: 15, fontWeight: '700', color: '#0097A7', marginTop: 22 },
});
