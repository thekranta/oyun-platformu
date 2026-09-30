import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 📈 AKILLI NEREDEYİM? — Neredeyim'in UYARLANIR (adaptif) zorluk versiyonu.
// Maarif: Matematik / Matematiksel Muhakeme (MAB.3) — konum kavramları
// (içinde/üstünde/altında/yanında), bkz. base bileşen Neredeyim.tsx.
//
// Zorluk motoru performansa göre SEÇENEK SAYISINI (2→4) ayarlar. Yalnızca 4
// konum olduğundan seçenek sayısı 4'te doygunlaşır (5 farklı zorluk seviyesi
// için tek eksende yalnızca 3 farklı değer: 2/3/4). Bu doygunluğu telafi
// etmek için İKİNCİ bir eksen eklendi: zorluk arttıkça beklenen yanıt hızı
// (TARGET_MS) düşer — üst seviyelerde çocuğun AYNI 4 seçenek arasından DAHA
// HIZLI doğru seçmesi beklenir (performans skoruna hız bileşeni üzerinden
// yansır), 2/3/4 seçenek eksenini tüketen 4-5. seviyelerde "daha hızlı tempo"
// ile fark yaratan bir alt-zorluk sağlar.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 9; // 3 checkpoint (her 3 seviyede uyarlama) — akıllı oyun deseniyle uyumlu

const POSITIONS = [
  { key: 'icinde', name: 'İçinde' },
  { key: 'ustunde', name: 'Üstünde' },
  { key: 'altinda', name: 'Altında' },
  { key: 'yaninda', name: 'Yanında' },
];
const OBJECTS = ['🐱', '🐶', '🍎', '⚽', '🎈', '🐰', '🐤', '⭐'];

// Zorluğa göre seçenek sayısı (yalnızca 4 konum olduğundan 4'te sabitlenir)
const OPTIONS_BY_DIFF: Record<number, number> = { 1: 2, 2: 2, 3: 3, 4: 4, 5: 4 };
// Zorluğa göre beklenen yanıt süresi (hız değerlendirmesi) — bkz. yukarıdaki not
const TARGET_MS_BY_DIFF: Record<number, number> = { 1: 9000, 2: 8000, 3: 7000, 4: 6000, 5: 5000 };

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface RoundData {
  refObj: string;
  optObj: string;
  targetKey: string;
  options: typeof POSITIONS;
}

function buildRound(diff: number, prevKey: string | null): RoundData {
  const n = OPTIONS_BY_DIFF[diff] ?? 3;
  const targetPool = POSITIONS.filter((p) => p.key !== prevKey);
  const target = targetPool[Math.floor(Math.random() * targetPool.length)];
  const a = pick(OBJECTS);
  let b = pick(OBJECTS);
  while (b === a) b = pick(OBJECTS);
  const distractors = shuffle(POSITIONS.filter((p) => p.key !== target.key)).slice(0, n - 1);
  return { refObj: a, optObj: b, targetKey: target.key, options: shuffle([target, ...distractors]) };
}

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

export default function AkilliNeredeyim({ onGameEnd, onExit, childName }: Props) {
  const START_DIFF = 2;
  const { recordLevel } = useAdaptiveDifficulty({
    minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: START_DIFF,
  });

  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [current, setCurrent] = useState<RoundData>(() => buildRound(START_DIFF, null));
  const [locked, setLocked] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const prevKeyRef = useRef<string | null>(current.targetKey);
  const diffRef = useRef(START_DIFF);
  const startTimeRef = useRef(Date.now());
  const levelStartRef = useRef(Date.now());
  const levelErrorsRef = useRef(0);
  const totalMovesRef = useRef(0);
  const totalErrorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const targetBounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  const targetName = POSITIONS.find((p) => p.key === current.targetKey)?.name ?? '';

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    onGameEnd('akilli-neredeyim', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
      zorlukSeviyesi: diffRef.current,
      kazanimOdagi: 'Sosyal Bilgiler: Mekânsal Kavramlar / Konum (içinde-üstünde-altında-yanında) (SAB.5) (uyarlanır zorluk)',
      correct_answers: correctRef.current,
    });
  }, [onGameEnd]);

  const nextRound = useCallback(() => {
    // Seviye sonucu motora bildirilir; sıradaki zorluk döner
    const timeMs = Date.now() - levelStartRef.current;
    const errs = levelErrorsRef.current;
    const targetMs = TARGET_MS_BY_DIFF[diffRef.current] ?? 7000;
    const nextDiff = recordLevel({ correct: 1, total: 1, errors: errs, timeMs, targetMs });

    if (round >= TOTAL_ROUNDS) {
      finish();
      return;
    }
    levelErrorsRef.current = 0;
    levelStartRef.current = Date.now();
    diffRef.current = nextDiff;
    const data = buildRound(nextDiff, prevKeyRef.current);
    prevKeyRef.current = data.targetKey;

    setRound((r) => r + 1);
    setCurrent(data);
    setLocked(false);
    setWrongKey(null);
    targetBounce.setValue(0.85);
    Animated.spring(targetBounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    const newTargetName = POSITIONS.find((p) => p.key === data.targetKey)?.name ?? '';
    speak(`${newTargetName} olanı bul!`, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, recordLevel, finish]);

  const handlePick = (p: { key: string; name: string }) => {
    if (locked) return;
    totalMovesRef.current += 1;
    if (p.key === current.targetKey) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait(`Aferin! ${targetName} olanı buldun.`, 1300, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        nextRound();
      });
    } else {
      levelErrorsRef.current += 1;
      totalErrorsRef.current += 1;
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
          onComplete={() => {
            startTimeRef.current = Date.now();
            levelStartRef.current = Date.now();
            setGameReady(true);
            speak(`${targetName} olanı bul!`, { instructions: HAPPY_VOICE });
          }}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>📈 Akıllı Neredeyim? · {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Nesne nerede?</Text>
      <Animated.View style={[styles.targetCard, { transform: [{ scale: targetBounce }] }]}>
        <Scene object={current.refObj} pos={current.targetKey} size={150} />
        <Text style={styles.targetName}>{targetName}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(`${targetName} olanı bul!`, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {current.options.map((p) => {
          const isWrong = wrongKey === p.key;
          return (
            <Animated.View key={p.key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(p)} activeOpacity={0.85}>
                <Scene object={current.optObj} pos={p.key} size={104} />
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
