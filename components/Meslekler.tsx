import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 👷 MESLEKLER - Meslek-araç ilişkisi (Sosyal, SAB.3)
// Meslek sahibinin ne kullandığını seç (doktor→stetoskop). Toplumsal roller,
// meslekleri tanıma; nesne-iş ilişkisi. Görsel bilgi.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

const JOBS = [
  { p: '👨‍⚕️', tool: '🩺', name: 'Doktor' },
  { p: '👨‍🚒', tool: '🚒', name: 'İtfaiyeci' },
  { p: '👩‍🏫', tool: '📚', name: 'Öğretmen' },
  { p: '👨‍🍳', tool: '🍳', name: 'Aşçı' },
  { p: '👮', tool: '🚓', name: 'Polis' },
  { p: '👨‍🌾', tool: '🚜', name: 'Çiftçi' },
  { p: '👷', tool: '🔨', name: 'İnşaatçı' },
  { p: '👩‍🎨', tool: '🎨', name: 'Ressam' },
];
const ALL_TOOLS = JOBS.map((j) => j.tool);

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
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

export default function Meslekler({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [job, setJob] = useState(JOBS[0]);
  const [options, setOptions] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const prevRef = useRef<string | null>(null);
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const pool = JOBS.filter((x) => x.name !== prevRef.current);
    const cur = pool[Math.floor(Math.random() * pool.length)];
    prevRef.current = cur.name;
    const distract = shuffle(ALL_TOOLS.filter((t) => t !== cur.tool)).slice(0, 2);
    setJob(cur);
    setOptions(shuffle([cur.tool, ...distract]));
    setLocked(false);
    setWrong(null);
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(`${cur.name} ne kullanır?`, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('meslekler', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal: Meslekleri Tanıma - Meslek ve Araç İlişkisi (SAB.3)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (tool: string) => {
    if (locked) return;
    movesRef.current += 1;
    if (tool === job.tool) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speak(`Doğru! ${job.name} bunu kullanır. Aferin.`, { instructions: HAPPY_VOICE });
      const t = setTimeout(() => {
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      }, 1400);
      timersRef.current.push(t);
    } else {
      errorsRef.current += 1;
      setWrong(tool);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrong(null), 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Meslekleri tanıyalım! Bu kişi işinde ne kullanır, doğru olanı seç."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#5E35B1" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>👷 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Ne kullanır?</Text>
      <Animated.View style={[styles.jobCard, { transform: [{ scale: bounce }] }]}>
        <Text style={styles.jobEmoji}>{job.p}</Text>
        <Text style={styles.jobName}>{job.name}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(`${job.name} ne kullanır?`, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((tool) => {
          const isWrong = wrong === tool;
          return (
            <Animated.View key={tool} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(tool)} activeOpacity={0.85}>
                <Text style={styles.optEmoji}>{tool}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F0FB', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#5E35B1' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#5E35B1', marginTop: 8 },
  jobCard: { width: 150, height: 150, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  jobEmoji: { fontSize: 78 },
  jobName: { fontSize: 17, fontWeight: '900', color: '#4527A0' },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7E57C2', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 20, flexWrap: 'wrap', maxWidth: 420, paddingHorizontal: 12 },
  optCard: { width: 104, height: 104, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  optWrong: { backgroundColor: '#FFE0E0' },
  optEmoji: { fontSize: 58 },
});
