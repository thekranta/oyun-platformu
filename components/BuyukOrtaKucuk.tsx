import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🔠 BÜYÜK-ORTA-KÜÇÜK - 3'lü boyut ayırt etme (Matematik/MAB.3)
// Hedefteki boyutu (büyük/orta/küçük) seçeneklerde bul. Hedef FARKLI bir
// nesnedir -> çocuk nesneyi değil BOYUTU eşler (boyut soyutlaması). Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

const SIZES = [
  { key: 'kucuk', name: 'Küçük', fs: 44 },
  { key: 'orta', name: 'Orta', fs: 74 },
  { key: 'buyuk', name: 'Büyük', fs: 106 },
];
const OBJECTS = ['🎈', '🐻', '🍎', '⭐', '🐱', '🌸', '🚗', '🎁', '🍓', '⚽'];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
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

export default function BuyukOrtaKucuk({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [refObj, setRefObj] = useState('🎈');
  const [optObj, setOptObj] = useState('🐻');
  const [targetKey, setTargetKey] = useState('buyuk');
  const [options, setOptions] = useState(SIZES);
  const [locked, setLocked] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const targetBounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const a = pick(OBJECTS);
    let b = pick(OBJECTS);
    while (b === a) b = pick(OBJECTS);
    const target = pick(SIZES);
    setRefObj(a);
    setOptObj(b);
    setTargetKey(target.key);
    setOptions(shuffle(SIZES));
    setLocked(false);
    setWrongKey(null);
    targetBounce.setValue(0.85);
    Animated.spring(targetBounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(`${target.name} olanı bul!`, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('buyuk-orta-kucuk', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Boyuta Göre Karşılaştırma (büyük/orta/küçük) (MAB.3)',
      correct_answers: correctRef.current,
    });
  };

  const targetSize = SIZES.find((s) => s.key === targetKey)!;

  const handlePick = (s: { key: string; name: string; fs: number }) => {
    if (locked) return;
    movesRef.current += 1;
    if (s.key === targetKey) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait('Harika! Doğru boyut.', 1300, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
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
          message="Sana bir boyut göstereceğim: büyük, orta ya da küçük. Aynı boyutu bul!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#5D4037" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔠 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Bu boyutu bul:</Text>
      <Animated.View style={[styles.targetCard, { transform: [{ scale: targetBounce }] }]}>
        <View style={styles.sizeBox}><Text style={{ fontSize: targetSize.fs }}>{refObj}</Text></View>
        <Text style={styles.targetName}>{targetSize.name}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(`${targetSize.name} olanı bul!`, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((s) => {
          const isWrong = wrongKey === s.key;
          return (
            <Animated.View key={s.key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optBox, isWrong && styles.optWrong]} onPress={() => handlePick(s)} activeOpacity={0.85}>
                <Text style={{ fontSize: s.fs }}>{optObj}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF6F0', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#5D4037' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#5D4037', marginTop: 8 },
  targetCard: { width: 170, height: 160, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  sizeBox: { height: 110, alignItems: 'center', justifyContent: 'center' },
  targetName: { fontSize: 20, fontWeight: '900', color: '#8D6E63', marginTop: 2 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8D6E63', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20, minHeight: 130 },
  optBox: { width: 108, height: 128, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  optWrong: { backgroundColor: '#FFE0E0' },
});
