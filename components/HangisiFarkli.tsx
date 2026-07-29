import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 🔎 HANGİSİ FARKLI? - Gruba uymayanı bul (Fen/FAB.2 benzerlik-farklılık)
// Aynılardan oluşan grupta TEK farklı olanı bul. Görsel ayırt etme;
// tamamen görsel, ses sadece destek.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 10;
const ITEMS = ['🍎', '🍌', '🐶', '🐱', '⭐', '🌸', '🚗', '🎈', '🐟', '🦋', '🍓', '🌈', '🐝', '🍉', '🚀', '🧸'];

const itemCount = (round: number) => (round <= 5 ? 4 : 6);

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface Cell { id: number; emoji: string; isOdd: boolean }

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

export default function HangisiFarkli({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [cells, setCells] = useState<Cell[]>([]);
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
    const n = itemCount(round);
    const shuffled = shuffle(ITEMS);
    const base = shuffled[0];
    const odd = shuffled[1];
    const arr: Cell[] = [];
    for (let i = 0; i < n - 1; i++) arr.push({ id: 0, emoji: base, isOdd: false });
    arr.push({ id: 0, emoji: odd, isOdd: true });
    setCells(shuffle(arr).map((c, i) => ({ ...c, id: i })));
    setLocked(false);
    setWrongId(null);
    speak('Hangisi farklı? Ötekilere benzemeyeni bul!', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('hangisi-farkli', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Fen: Benzerlik ve Farklılıkları Ayırt Etme (FAB.2)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (cell: Cell) => {
    if (locked) return;
    movesRef.current += 1;
    if (cell.isOdd) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speak('Aferin! Farklı olanı buldun.', { instructions: HAPPY_VOICE });
      const t = setTimeout(() => {
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      }, 1300);
      timersRef.current.push(t);
    } else {
      errorsRef.current += 1;
      setWrongId(cell.id);
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
          message="Bir tanesi ötekilere benzemiyor! Farklı olanı bul."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#00838F" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔎 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Hangisi farklı?</Text>

      <View style={styles.grid}>
        {cells.map((cell) => {
          const isWrong = wrongId === cell.id;
          return (
            <Animated.View key={cell.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.cell, isWrong && styles.cellWrong]} onPress={() => handleTap(cell)} activeOpacity={0.85}>
                <Text style={styles.cellEmoji}>{cell.emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECFBFC', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#00838F' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#00838F', marginTop: 12, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 6, maxWidth: 380, paddingHorizontal: 10 },
  cell: { width: 104, height: 104, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  cellWrong: { backgroundColor: '#FFE0E0' },
  cellEmoji: { fontSize: 58 },
});
