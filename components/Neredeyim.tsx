import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 📦 NEREDEYİM? - Konum/mekânsal kavramlar (Sosyal Bilgiler/SAB.5)
// Hedef sahnede nesne kutunun içinde/üstünde/altında/yanında. Çocuk AYNI
// KONUMU seçeneklerde bulur. Seçenekler FARKLI nesne kullanır -> çocuk
// nesneyi değil KONUM İLİŞKİSİNİ eşler (mekânsal soyutlama). Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

const POSITIONS = [
  { key: 'icinde', name: 'İçinde' },
  { key: 'ustunde', name: 'Üstünde' },
  { key: 'altinda', name: 'Altında' },
  { key: 'yaninda', name: 'Yanında' },
];
const OBJECTS = ['🐱', '🐶', '🍎', '⚽', '🎈', '🐰', '🐤', '⭐'];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const optionCount = (round: number) => (round <= 2 ? 2 : round <= 5 ? 3 : 4);

function Scene({ object, pos, size }: { object: string; pos: string; size: number }) {
  const boxW = size * 0.42;
  const boxH = size * 0.36;
  const boxTop = size * 0.34;
  const boxLeft = (size - boxW) / 2;
  const objFs = size * 0.26;

  let oStyle: any;
  if (pos === 'icinde') oStyle = { top: boxTop + (boxH - objFs) / 2 + 2, left: 0, right: 0, alignItems: 'center' };
  else if (pos === 'ustunde') oStyle = { top: boxTop - objFs, left: 0, right: 0, alignItems: 'center' };
  else if (pos === 'altinda') oStyle = { top: boxTop + boxH + 2, left: 0, right: 0, alignItems: 'center' };
  else oStyle = { top: boxTop + (boxH - objFs) / 2, left: boxLeft + boxW - 2 };

  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: boxTop, left: boxLeft, width: boxW, height: boxH, borderWidth: 3, borderColor: '#B98A5A', backgroundColor: '#F3D9B8', borderRadius: 8 }} />
      <View style={[{ position: 'absolute' }, oStyle]}>
        <Text style={{ fontSize: objFs }}>{object}</Text>
      </View>
    </View>
  );
}

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

export default function Neredeyim({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [refObj, setRefObj] = useState('🐱');
  const [optObj, setOptObj] = useState('🐶');
  const [targetKey, setTargetKey] = useState('icinde');
  const [options, setOptions] = useState<typeof POSITIONS>([]);
  const [locked, setLocked] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const prevKeyRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const targetBounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const targetPool = POSITIONS.filter((p) => p.key !== prevKeyRef.current);
    const target = targetPool[Math.floor(Math.random() * targetPool.length)];
    prevKeyRef.current = target.key;
    const a = pick(OBJECTS);
    let b = pick(OBJECTS);
    while (b === a) b = pick(OBJECTS);
    const n = optionCount(round);
    const distractors = shuffle(POSITIONS.filter((p) => p.key !== target.key)).slice(0, n - 1);
    setRefObj(a);
    setOptObj(b);
    setTargetKey(target.key);
    setOptions(shuffle([target, ...distractors]));
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
    onGameEnd('neredeyim', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal Bilgiler: Mekânsal Kavramlar / Konum (içinde-üstünde-altında-yanında) (SAB.5)',
      correct_answers: correctRef.current,
    });
  };

  const targetName = POSITIONS.find((p) => p.key === targetKey)?.name ?? '';

  const handlePick = (p: { key: string; name: string }) => {
    if (locked) return;
    movesRef.current += 1;
    if (p.key === targetKey) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speak(`Aferin! ${targetName} olanı buldun.`, { instructions: HAPPY_VOICE });
      const t = setTimeout(() => {
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      }, 1300);
      timersRef.current.push(t);
    } else {
      errorsRef.current += 1;
      setWrongKey(p.key);
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
          message="Nesne kutunun neresinde? Aynı yerde olanı seçeneklerde bul!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#6D4C41" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>📦 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Nesne nerede?</Text>
      <Animated.View style={[styles.targetCard, { transform: [{ scale: targetBounce }] }]}>
        <Scene object={refObj} pos={targetKey} size={150} />
        <Text style={styles.targetName}>{targetName}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(`${targetName} olanı bul!`, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((p) => {
          const isWrong = wrongKey === p.key;
          return (
            <Animated.View key={p.key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(p)} activeOpacity={0.85}>
                <Scene object={optObj} pos={p.key} size={104} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#6D4C41' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#6D4C41', marginTop: 8 },
  targetCard: { borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  targetName: { fontSize: 20, fontWeight: '900', color: '#8D6E63' },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8D6E63', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 18, maxWidth: 470, paddingHorizontal: 10 },
  optCard: { borderRadius: 20, backgroundColor: '#fff', padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  optWrong: { backgroundColor: '#FFE0E0' },
});
