import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🚂 ŞEKİL TRENİ - Geometrik şekil tanıma (Matematik/MAB.2)
// Üstte hedef şekil; çocuk aynı şekilli vagonu bulur. Şekil ayırt etme
// becerisinin kendisi = eşleştirme (geçerli). Bir turda tüm şekiller
// AYNI renkte -> renk kısayolu yok, sadece ŞEKİL ayırt edilir.
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
// Tur başına tek tema rengi (renk kısayolunu engeller)
const ROUND_COLORS = ['#FF7043', '#42A5F5', '#66BB6A', '#AB47BC', '#FFA726', '#26C6DA'];

function ShapeSvg({ type, size, color }: { type: string; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {type === 'daire' && <Circle cx={50} cy={50} r={40} fill={color} />}
      {type === 'kare' && <Rect x={12} y={12} width={76} height={76} rx={10} fill={color} />}
      {type === 'ucgen' && <Polygon points="50,10 90,86 10,86" fill={color} />}
      {type === 'yildiz' && <Polygon points="50,5 61,38 98,38 68,60 79,95 50,72 21,95 32,60 2,38 39,38" fill={color} />}
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

const optionCount = (round: number) => (round <= 2 ? 2 : round <= 5 ? 3 : 4);

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

export default function SekilTreni({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState(SHAPES[0]);
  const [options, setOptions] = useState<typeof SHAPES>([]);
  const [color, setColor] = useState(ROUND_COLORS[0]);
  const [locked, setLocked] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const prevKeyRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const targetBounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const pool = SHAPES.filter((s) => s.key !== prevKeyRef.current);
    const t = pool[Math.floor(Math.random() * pool.length)];
    prevKeyRef.current = t.key;
    const n = optionCount(round);
    const distractors = shuffle(SHAPES.filter((s) => s.key !== t.key)).slice(0, n - 1);
    setTarget(t);
    setOptions(shuffle([t, ...distractors]));
    setColor(ROUND_COLORS[(round - 1) % ROUND_COLORS.length]);
    setLocked(false);
    setWrongKey(null);
    targetBounce.setValue(0.8);
    Animated.spring(targetBounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(`${t.name} nerede? Vagonda bul!`, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('sekil-treni', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Geometrik Şekilleri Tanıma ve Ayırt Etme (MAB.2)',
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
      speakThenWait('Harika! Doğru şekil.', 1300, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrongKey(s.key);
      Animated.sequence([
        Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: USE_NATIVE }),
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
          message="Trenin vagonlarında şekiller var! Söylediğim şekli bul."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#B54708" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🚂 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Bu şekli bul:</Text>
      <Animated.View style={[styles.targetCard, { transform: [{ scale: targetBounce }] }]}>
        <ShapeSvg type={target.key} size={96} color={color} />
        <Text style={[styles.targetName, { color }]}>{target.name}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(`${target.name} nerede?`, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      {/* Tren */}
      <View style={styles.train}>
        <Text style={styles.loco}>🚂</Text>
        {options.map((s) => {
          const isWrong = wrongKey === s.key;
          return (
            <Animated.View key={s.key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.wagon, isWrong && styles.wagonWrong]} onPress={() => handlePick(s)} activeOpacity={0.85}>
                <ShapeSvg type={s.key} size={58} color={color} />
                <View style={styles.wheels}><View style={styles.wheel} /><View style={styles.wheel} /></View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#B54708' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#B54708', marginTop: 8 },
  targetCard: { width: 160, height: 160, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  targetName: { fontSize: 20, fontWeight: '900', marginTop: 2 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF8A00', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  train: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24, maxWidth: 480, paddingHorizontal: 10 },
  loco: { fontSize: 52 },
  wagon: { width: 92, height: 92, borderRadius: 16, backgroundColor: '#FFE0B2', borderWidth: 3, borderColor: '#EFB47A', alignItems: 'center', justifyContent: 'center', paddingTop: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 4 },
  wagonWrong: { borderColor: '#FF6B6B' },
  wheels: { flexDirection: 'row', gap: 22, marginTop: 2 },
  wheel: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#5A3A1E' },
});
