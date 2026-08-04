import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 👀 DUYULARIMIZ - Duyu organları (Hareket/Sağlık, HSAB.4)
// Bir uyaran gösterilir (müzik, koku, tat...); çocuk onu HANGİ DUYU ORGANI
// ile algıladığımızı seçer. Duyu farkındalığı; uyaran-organ ilişkisi.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const ORGANS = ['👂', '👁️', '👃', '👅', '✋'];

interface Q { stimulus: string; text: string; organ: string }

const QUESTIONS: Q[] = [
  { stimulus: '🎵', text: 'Müziği ne ile duyarız?', organ: '👂' },
  { stimulus: '🌈', text: 'Renkleri ne ile görürüz?', organ: '👁️' },
  { stimulus: '🌸', text: 'Çiçeği ne ile koklarız?', organ: '👃' },
  { stimulus: '🍦', text: 'Tadına ne ile bakarız?', organ: '👅' },
  { stimulus: '🧊', text: 'Soğuğu ne ile hissederiz?', organ: '✋' },
  { stimulus: '🔔', text: 'Zili ne ile duyarız?', organ: '👂' },
  { stimulus: '🍋', text: 'Ekşiyi ne ile tadarız?', organ: '👅' },
  { stimulus: '☕', text: 'Kokuyu ne ile alırız?', organ: '👃' },
];

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

export default function Duyularimiz({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [q, setQ] = useState<Q>(QUESTIONS[0]);
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
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const TOTAL_ROUNDS = 8;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const pool = QUESTIONS.filter((x) => x.text !== prevRef.current);
    const cur = pool[Math.floor(Math.random() * pool.length)];
    prevRef.current = cur.text;
    const distract = shuffle(ORGANS.filter((o) => o !== cur.organ)).slice(0, 2);
    setQ(cur);
    setOptions(shuffle([cur.organ, ...distract]));
    setLocked(false);
    setWrong(null);
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(cur.text, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('duyularimiz', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Hareket/Sağlık: Duyu Farkındalığı - Uyaranı Doğru Duyu Organıyla Eşleme (HSAB.4)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (organ: string) => {
    if (locked) return;
    movesRef.current += 1;
    if (organ === q.organ) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait('Doğru! Aferin.', 1300, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrong(organ);
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
          message="Duyularımızı tanıyalım! Bunu hangi organımızla algılarız, onu seç."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#6A1B9A" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>👀 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Animated.View style={[styles.sceneCard, { transform: [{ scale: bounce }] }]}>
        <Text style={styles.sceneEmoji}>{q.stimulus}</Text>
        <Text style={styles.sceneText}>{q.text}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(q.text, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((organ) => {
          const isWrong = wrong === organ;
          return (
            <Animated.View key={organ} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(organ)} activeOpacity={0.85}>
                <Text style={styles.optEmoji}>{organ}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0FB', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#6A1B9A' },

  sceneCard: { width: '86%', maxWidth: 420, minHeight: 150, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 14, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  sceneEmoji: { fontSize: 68 },
  sceneText: { fontSize: 18, fontWeight: '800', color: '#4A148C', textAlign: 'center', marginTop: 8 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8E24AA', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 24, flexWrap: 'wrap', maxWidth: 420, paddingHorizontal: 12 },
  optCard: { width: 104, height: 104, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  optWrong: { backgroundColor: '#FFE0E0' },
  optEmoji: { fontSize: 60 },
});
