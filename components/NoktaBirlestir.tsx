import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🔢 NOKTA BİRLEŞTİR - Noktaları sırayla birleştir (Çizim + sayı sırası)
// Numaralı noktalara 1'den başlayarak sırayla dokun; çizgiler oluşur ve
// bir resim ortaya çıkar. Çizgi çalışması + sayı sırası. Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const SIZE = Math.min(SCREEN_W - 40, 340);
const SCALE = SIZE / 300;

interface Pic { key: string; name: string; emoji: string; dots: [number, number][] }

const PICTURES: Pic[] = [
  { key: 'ucgen', name: 'üçgen', emoji: '🔺', dots: [[150, 70], [232, 225], [68, 225]] },
  { key: 'kare', name: 'kare', emoji: '🟦', dots: [[85, 85], [215, 85], [215, 215], [85, 215]] },
  { key: 'ev', name: 'ev', emoji: '🏠', dots: [[85, 250], [85, 140], [150, 85], [215, 140], [215, 250]] },
  { key: 'yildiz', name: 'yıldız', emoji: '⭐', dots: [[150, 55], [195, 190], [75, 110], [225, 110], [105, 190]] },
];

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function NoktaBirlestir({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [next, setNext] = useState(0);
  const [done, setDone] = useState(false);
  const [wrongDot, setWrongDot] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;

  const pic = PICTURES[(round - 1) % PICTURES.length];
  const TOTAL_ROUNDS = PICTURES.length;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    setNext(0);
    setDone(false);
    setWrongDot(null);
    speak('1 rakamından başla, noktaları sırayla birleştir!', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('nokta-birlestir', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik/Çizim: Sayıları Sırayla İzleme ve Çizgi ile Birleştirme (MAB.1)',
      correct_answers: correctRef.current,
    });
  };

  const tapDot = (i: number) => {
    if (done) return;
    if (i === next) {
      movesRef.current += 1;
      correctRef.current += 1;
      const nn = next + 1;
      setNext(nn);
      if (nn >= pic.dots.length) {
        setDone(true);
        const isLast = round >= TOTAL_ROUNDS;
        if (isLast) setShowConfetti(true);
        else setShowConfetti(true);
        speakThenWait(`Bak, bir ${pic.name} oldu! Aferin.`, 1800, { instructions: HAPPY_VOICE }).then(() => {
          if (!isMountedRef.current) return;
          setShowConfetti(false);
          if (isLast) finish();
          else setRound((r) => r + 1);
        });
      }
    } else {
      errorsRef.current += 1;
      setWrongDot(i);
      Animated.sequence([
        Animated.timing(shake, { toValue: 6, duration: 50, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -6, duration: 50, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongDot(null), 400);
      timersRef.current.push(t);
    }
  };

  // Çizilecek çizgiler: 0-1, 1-2, ... (next-1). Tamamlandıysa son->ilk (kapanış).
  const lines: [number, number][] = [];
  for (let i = 1; i < next; i++) lines.push([i - 1, i]);
  if (done) lines.push([pic.dots.length - 1, 0]);

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Noktalara 1'den başlayarak sırayla dokun. Bak bakalım hangi resim çıkacak!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#00695C" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔢 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>{done ? `Bir ${pic.name} oldu! ${pic.emoji}` : `Sıradaki: ${next + 1}`}</Text>

      <Animated.View style={[styles.canvas, { width: SIZE, height: SIZE, transform: [{ translateX: shake }] }]}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 300 300" pointerEvents="none" style={StyleSheet.absoluteFill}>
          {lines.map(([a, b], i) => (
            <Line key={i} x1={pic.dots[a][0]} y1={pic.dots[a][1]} x2={pic.dots[b][0]} y2={pic.dots[b][1]} stroke="#26A69A" strokeWidth={5} strokeLinecap="round" />
          ))}
        </Svg>
        {done && <Text style={styles.revealEmoji}>{pic.emoji}</Text>}
        {pic.dots.map(([x, y], i) => {
          const connected = i < next;
          const isWrong = wrongDot === i;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dot, { left: x * SCALE - 22, top: y * SCALE - 22 }, connected && styles.dotOn, isWrong && styles.dotWrong, i === next && !done && styles.dotNext]}
              onPress={() => tapDot(i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dotNum, connected && styles.dotNumOn]}>{i + 1}</Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F6F3', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#00695C' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#00695C', marginVertical: 12, minHeight: 30 },
  canvas: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 3, borderColor: '#B2DFDB', marginTop: 4 },
  revealEmoji: { position: 'absolute', alignSelf: 'center', top: SIZE / 2 - 44, fontSize: 80, opacity: 0.5 },
  dot: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, borderColor: '#B0BEC5', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 1, elevation: 2 },
  dotOn: { backgroundColor: '#26A69A', borderColor: '#00897B' },
  dotNext: { borderColor: '#FF7043', borderWidth: 4, transform: [{ scale: 1.12 }] },
  dotWrong: { borderColor: '#E53935' },
  dotNum: { fontSize: 18, fontWeight: '900', color: '#546E7A' },
  dotNumOn: { color: '#fff' },
});
