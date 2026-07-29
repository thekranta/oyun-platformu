import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 🌊 YÜZER Mİ BATAR MI? - Tahmin/gözlem (Fen/FAB.3)
// Nesne suya atılınca yüzer mi batar mı? Çocuk tahmin eder. Bilimsel
// gözleme dayalı tahmin; ikili seçim. Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 10;

const FLOATS = ['🍎', '🍂', '🦆', '🏀', '🚤', '🧽', '🪵', '🛟', '🍊', '🪶'];
const SINKS = ['🪨', '🔑', '🥄', '🔩', '⚓', '🍶', '🪙', '🔨', '🧱'];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function YuzerBatar({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [emoji, setEmoji] = useState('🍎');
  const [floats, setFloats] = useState(true);
  const [locked, setLocked] = useState(false);
  const [wrongChoice, setWrongChoice] = useState<'yuzer' | 'batar' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const drop = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const willFloat = Math.random() < 0.5;
    setEmoji(willFloat ? pick(FLOATS) : pick(SINKS));
    setFloats(willFloat);
    setLocked(false);
    setWrongChoice(null);
    drop.setValue(0);
    speak('Bu suya atılınca yüzer mi, batar mı?', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('yuzer-batar', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Fen: Bilimsel Gözleme Dayalı Tahmin (yüzer/batar) (FAB.3)',
      correct_answers: correctRef.current,
    });
  };

  const handleAnswer = (choice: 'yuzer' | 'batar') => {
    if (locked) return;
    movesRef.current += 1;
    const correct = (choice === 'yuzer') === floats;
    if (correct) {
      setLocked(true);
      correctRef.current += 1;
      // batıyorsa aşağı, yüzüyorsa hafif yukarı
      Animated.timing(drop, { toValue: 1, duration: 500, useNativeDriver: USE_NATIVE }).start();
      setShowConfetti(true);
      speak(floats ? 'Doğru, yüzüyor!' : 'Doğru, batıyor!', { instructions: HAPPY_VOICE });
      const t = setTimeout(() => {
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      }, 1500);
      timersRef.current.push(t);
    } else {
      errorsRef.current += 1;
      setWrongChoice(choice);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongChoice(null), 450);
      timersRef.current.push(t);
    }
  };

  const objTranslate = drop.interpolate({ inputRange: [0, 1], outputRange: [0, floats ? -14 : 90] });

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Nesne suya düşünce ne olur? Yüzer mi, batar mı? Tahmin et!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#0277BD" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🌊 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Yüzer mi, batar mı?</Text>

      <View style={styles.tank}>
        <Animated.Text style={[styles.obj, { transform: [{ translateY: objTranslate }] }]}>{emoji}</Animated.Text>
        <View style={styles.water}>
          <Text style={styles.waveText}>≈≈≈≈≈≈≈≈≈≈≈≈</Text>
        </View>
      </View>

      <View style={styles.answers}>
        <Animated.View style={wrongChoice === 'yuzer' ? { transform: [{ translateX: shake }] } : undefined}>
          <TouchableOpacity style={[styles.ansBtn, styles.floatBtn, wrongChoice === 'yuzer' && styles.ansWrong]} onPress={() => handleAnswer('yuzer')} activeOpacity={0.85}>
            <Text style={styles.ansEmoji}>🛟</Text>
            <Text style={styles.ansLabel}>Yüzer</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={wrongChoice === 'batar' ? { transform: [{ translateX: shake }] } : undefined}>
          <TouchableOpacity style={[styles.ansBtn, styles.sinkBtn, wrongChoice === 'batar' && styles.ansWrong]} onPress={() => handleAnswer('batar')} activeOpacity={0.85}>
            <Text style={styles.ansEmoji}>⬇️</Text>
            <Text style={styles.ansLabel}>Batar</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E1F5FE', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#0277BD' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#0277BD', marginTop: 10 },
  tank: { width: '84%', maxWidth: 380, height: 200, marginTop: 14, borderRadius: 24, backgroundColor: '#B3E5FC', overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  obj: { fontSize: 70, zIndex: 2 },
  water: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 96, backgroundColor: '#4FC3F7', alignItems: 'center', paddingTop: 4 },
  waveText: { fontSize: 22, color: '#0288D1', fontWeight: '900', letterSpacing: -2 },

  answers: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 28 },
  ansBtn: { width: 130, height: 100, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 5 },
  floatBtn: { backgroundColor: '#4FC3F7' },
  sinkBtn: { backgroundColor: '#7E9BAA' },
  ansWrong: { opacity: 0.55 },
  ansEmoji: { fontSize: 38 },
  ansLabel: { fontSize: 18, fontWeight: '900', color: '#fff' },
});
