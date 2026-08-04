import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🚗 ARAÇLAR NEREDE GİDER? - Taşıtları sınıflandırma (Bilişsel/Fen, FAB.2)
// Aracın nerede gittiğini seç: Kara / Deniz / Gökyüzü. Sınıflandırma + bilgi.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

const MEDIA: Record<string, { emoji: string; name: string; loc: string }> = {
  kara: { emoji: '🛣️', name: 'Kara', loc: 'Karada' },
  deniz: { emoji: '🌊', name: 'Deniz', loc: 'Denizde' },
  hava: { emoji: '☁️', name: 'Gökyüzü', loc: 'Gökyüzünde' },
};
const MED_KEYS = Object.keys(MEDIA);

const VEHICLES = [
  { v: '🚗', m: 'kara' }, { v: '🚌', m: 'kara' }, { v: '🚂', m: 'kara' }, { v: '🚜', m: 'kara' }, { v: '🏍️', m: 'kara' },
  { v: '⛵', m: 'deniz' }, { v: '🚤', m: 'deniz' }, { v: '🛶', m: 'deniz' }, { v: '🚢', m: 'deniz' },
  { v: '✈️', m: 'hava' }, { v: '🚁', m: 'hava' }, { v: '🚀', m: 'hava' },
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

export default function AraclarNerede({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [vehicle, setVehicle] = useState(VEHICLES[0]);
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

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const pool = VEHICLES.filter((x) => x.v !== prevRef.current);
    const cur = pool[Math.floor(Math.random() * pool.length)];
    prevRef.current = cur.v;
    setVehicle(cur);
    setOptions(shuffle([...MED_KEYS]));
    setLocked(false);
    setWrong(null);
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak('Bu araç nerede gider?', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('araclar', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Fen: Taşıtları Hareket Ettiği Yere Göre Sınıflandırma (kara/deniz/hava) (FAB.2)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (key: string) => {
    if (locked) return;
    movesRef.current += 1;
    if (key === vehicle.m) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait(`Doğru! ${MEDIA[key].loc} gider. Aferin.`, 1400, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrong(key);
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
          message="Araçlar farklı yerlerde gider! Bu araç karada mı, denizde mi, gökyüzünde mi?"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#1565C0" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🚗 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Nerede gider?</Text>
      <Animated.View style={[styles.card, { transform: [{ scale: bounce }] }]}>
        <Text style={styles.cardEmoji}>{vehicle.v}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak('Bu araç nerede gider?', { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((key) => {
          const isWrong = wrong === key;
          return (
            <Animated.View key={key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(key)} activeOpacity={0.85}>
                <Text style={styles.optEmoji}>{MEDIA[key].emoji}</Text>
                <Text style={styles.optName}>{MEDIA[key].name}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F2FD', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#1565C0' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#1565C0', marginTop: 8 },
  card: { width: 140, height: 140, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  cardEmoji: { fontSize: 88 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1E88E5', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 20, flexWrap: 'wrap', maxWidth: 440, paddingHorizontal: 12 },
  optCard: { width: 116, height: 120, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  optWrong: { backgroundColor: '#FFE0E0' },
  optEmoji: { fontSize: 52 },
  optName: { fontSize: 14, fontWeight: '800', color: '#0D47A1' },
});
