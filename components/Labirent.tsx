import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🐭 LABİRENT - Problem çözme / yol bulma (Bilişsel, MAB.7)
// Fareyi peynire ulaştır: yalnızca KOMŞU açık kareye dokunarak ilerle.
// Yol bulma, planlama, strateji. Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

// 'S' başlangıç, 'G' peynir(hedef), '.' açık, 'w' duvar
const MAZES: string[][][] = [
  [
    ['S', '.', '.', '.', '.'],
    ['w', 'w', 'w', 'w', '.'],
    ['.', '.', '.', '.', '.'],
    ['.', 'w', 'w', 'w', 'w'],
    ['.', '.', '.', '.', 'G'],
  ],
  [
    ['S', 'w', '.', '.', 'G'],
    ['.', 'w', '.', 'w', '.'],
    ['.', 'w', '.', 'w', '.'],
    ['.', 'w', '.', 'w', '.'],
    ['.', '.', '.', 'w', '.'],
  ],
  [
    ['.', '.', '.', '.', 'S'],
    ['.', 'w', 'w', 'w', 'w'],
    ['.', '.', '.', '.', '.'],
    ['w', 'w', 'w', 'w', '.'],
    ['G', '.', '.', '.', '.'],
  ],
];
const TOTAL_ROUNDS = MAZES.length;

const findCell = (maze: string[][], ch: string): { r: number; c: number } => {
  for (let r = 0; r < maze.length; r++) for (let c = 0; c < maze[r].length; c++) if (maze[r][c] === ch) return { r, c };
  return { r: 0, c: 0 };
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

export default function Labirent({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [pos, setPos] = useState({ r: 0, c: 0 });
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

  const maze = MAZES[(round - 1) % MAZES.length];
  const goal = findCell(maze, 'G');

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    setPos(findCell(MAZES[(round - 1) % MAZES.length], 'S'));
    setLocked(false);
    speak('Fareyi peynire ulaştır! Komşu kareye dokun.', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('labirent', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Bilişsel: Problem Çözme ve Yol Bulma / Planlama (MAB.7)',
      correct_answers: correctRef.current,
    });
  };

  const tapCell = (r: number, c: number) => {
    if (locked) return;
    if (maze[r][c] === 'w') { // duvara dokunma
      errorsRef.current += 1;
      Animated.sequence([
        Animated.timing(shake, { toValue: 6, duration: 50, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -6, duration: 50, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: USE_NATIVE }),
      ]).start();
      return;
    }
    const adjacent = Math.abs(r - pos.r) + Math.abs(c - pos.c) === 1;
    if (!adjacent) return; // sadece komşuya
    movesRef.current += 1;
    setPos({ r, c });
    if (r === goal.r && c === goal.c) {
      setLocked(true);
      correctRef.current += 1;
      const isLast = round >= TOTAL_ROUNDS;
      if (isLast) setShowConfetti(true);
      speakThenWait('Yaşasın! Peyniri buldun. Aferin!', isLast ? 1600 : 1100, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        if (isLast) finish();
        else setRound((x) => x + 1);
      });
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={120} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Fareye yardım et! Komşu açık karelere dokunarak peynire giden yolu bul."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#5D4037" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🐭 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Peyniri bul! 🧀</Text>

      <Animated.View style={[styles.grid, { transform: [{ translateX: shake }] }]}>
        {maze.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((cell, c) => {
              const isPlayer = pos.r === r && pos.c === c;
              const isGoal = cell === 'G';
              const isWall = cell === 'w';
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.cell, isWall ? styles.wall : styles.open]}
                  onPress={() => tapCell(r, c)}
                  activeOpacity={isWall ? 1 : 0.7}
                >
                  <Text style={styles.cellEmoji}>{isPlayer ? '🐭' : isGoal ? '🧀' : ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const CELL = Math.min(60, (SCREEN_W - 60) / 5);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE7', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#5D4037' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#5D4037', marginTop: 12, marginBottom: 14 },
  grid: { backgroundColor: '#8D6E63', padding: 6, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 6 },
  row: { flexDirection: 'row' },
  cell: { width: CELL, height: CELL, margin: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  open: { backgroundColor: '#FFF8E1' },
  wall: { backgroundColor: '#4E342E' },
  cellEmoji: { fontSize: CELL * 0.6 },
});
