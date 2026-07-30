import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 🕳️ ŞEKİL DELİĞİ - Şekil-delik eşleme (Matematik/MAB.2)
// Renkli şekli doğru şekilli deliğe (oyuncak şekil ayırıcı gibi) yerleştir.
// Geometrik şekil özelliği çözümleme. Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

const SHAPES = [
  { key: 'daire', name: 'Daire' },
  { key: 'kare', name: 'Kare' },
  { key: 'ucgen', name: 'Üçgen' },
  { key: 'yildiz', name: 'Yıldız' },
];
const FILL_COLORS = ['#FF7043', '#42A5F5', '#66BB6A', '#AB47BC', '#FFA726'];

function ShapeSvg({ type, size, fill, hole }: { type: string; size: number; fill: string; hole?: boolean }) {
  const props = hole
    ? { fill: '#ECEFF1', stroke: '#90A4AE', strokeWidth: 4, strokeDasharray: '6 5' }
    : { fill };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {type === 'daire' && <Circle cx={50} cy={50} r={40} {...props} />}
      {type === 'kare' && <Rect x={12} y={12} width={76} height={76} rx={10} {...props} />}
      {type === 'ucgen' && <Polygon points="50,10 90,86 10,86" {...props} />}
      {type === 'yildiz' && <Polygon points="50,5 61,38 98,38 68,60 79,95 50,72 21,95 32,60 2,38 39,38" {...props} />}
    </Svg>
  );
}

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

export default function SekilDeligi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState(SHAPES[0]);
  const [fill, setFill] = useState(FILL_COLORS[0]);
  const [options, setOptions] = useState<typeof SHAPES>([]);
  const [locked, setLocked] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const prevRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const pool = SHAPES.filter((s) => s.key !== prevRef.current);
    const t = pool[Math.floor(Math.random() * pool.length)];
    prevRef.current = t.key;
    const n = round <= 3 ? 2 : 3;
    const distract = shuffle(SHAPES.filter((s) => s.key !== t.key)).slice(0, n - 1);
    setTarget(t);
    setFill(FILL_COLORS[(round - 1) % FILL_COLORS.length]);
    setOptions(shuffle([t, ...distract]));
    setLocked(false);
    setWrongKey(null);
    bounce.setValue(0.8);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(`${t.name} hangi deliğe girer?`, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('sekil-deligi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Geometrik Şekli Özelliğine Göre Eşleme (MAB.2)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (s: { key: string; name: string }) => {
    if (locked) return;
    movesRef.current += 1;
    if (s.key === target.key) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speak('Harika! Tam oturdu.', { instructions: HAPPY_VOICE });
      const t = setTimeout(() => {
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      }, 1300);
      timersRef.current.push(t);
    } else {
      errorsRef.current += 1;
      setWrongKey(s.key);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongKey(null), 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Renkli şekli, kendi şeklindeki deliğe yerleştir!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#455A64" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🕳️ {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Bu şekil hangi deliğe girer?</Text>
      <Animated.View style={[styles.targetCard, { transform: [{ scale: bounce }] }]}>
        <ShapeSvg type={target.key} size={96} fill={fill} />
      </Animated.View>

      <View style={styles.holes}>
        {options.map((s) => {
          const isWrong = wrongKey === s.key;
          return (
            <Animated.View key={s.key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.hole, isWrong && styles.holeWrong]} onPress={() => handlePick(s)} activeOpacity={0.85}>
                <ShapeSvg type={s.key} size={70} fill="#000" hole />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECEFF1', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#455A64' },

  prompt: { fontSize: 19, fontWeight: '800', color: '#455A64', marginTop: 10, textAlign: 'center', paddingHorizontal: 16 },
  targetCard: { width: 150, height: 150, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 6 },

  holes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 30, maxWidth: 420, paddingHorizontal: 12 },
  hole: { width: 104, height: 104, borderRadius: 20, backgroundColor: '#CFD8DC', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 1, elevation: 3 },
  holeWrong: { backgroundColor: '#EF9A9A' },
});
