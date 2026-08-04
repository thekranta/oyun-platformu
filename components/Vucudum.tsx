import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 🧒 VÜCUDUM - Beden farkındalığı (Hareket/Sağlık, HSAB.4)
// Yüzdeki organı BUL: söylenen/gösterilen organı (göz/burun/ağız/kulak)
// yüzün üzerinde doğru yere dokunarak göster. Beden farkındalığı; yer bilme.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

const PARTS = [
  { key: 'goz', emoji: '👁️', name: 'Göz', acc: 'Gözü' },
  { key: 'burun', emoji: '👃', name: 'Burun', acc: 'Burnu' },
  { key: 'agiz', emoji: '👄', name: 'Ağız', acc: 'Ağzı' },
  { key: 'kulak', emoji: '👂', name: 'Kulak', acc: 'Kulağı' },
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

export default function Vucudum({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState(PARTS[0]);
  const [locked, setLocked] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [okKey, setOkKey] = useState<string | null>(null);
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
    const pool = PARTS.filter((p) => p.key !== prevRef.current);
    const t = pool[Math.floor(Math.random() * pool.length)];
    prevRef.current = t.key;
    setTarget(t);
    setLocked(false);
    setWrongKey(null);
    setOkKey(null);
    bounce.setValue(0.8);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(`${t.name} nerede? Göster bakalım!`, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('vucudum', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Hareket/Sağlık: Beden Farkındalığı - Organları Tanıma ve Gösterme (HSAB.4)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (key: string) => {
    if (locked) return;
    movesRef.current += 1;
    if (key === target.key) {
      setLocked(true);
      setOkKey(key);
      correctRef.current += 1;
      setShowConfetti(true);
      speak(`Aferin! İşte ${target.name.toLowerCase()}.`, { instructions: HAPPY_VOICE });
      const t = setTimeout(() => {
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      }, 1400);
      timersRef.current.push(t);
    } else {
      errorsRef.current += 1;
      setWrongKey(key);
      Animated.sequence([
        Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongKey(null), 450);
      timersRef.current.push(t);
    }
  };

  const zoneStyle = (key: string) => [
    styles.zone,
    okKey === key && styles.zoneOk,
    wrongKey === key && styles.zoneWrong,
  ];

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Yüzdeki organları öğrenelim! Söylediğim organı yüzde bul ve dokun."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#C62828" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🧒 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Animated.View style={[styles.targetPill, { transform: [{ scale: bounce }] }]}>
        <Text style={styles.targetText}>{target.emoji}  {target.acc} göster!</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(`${target.name} nerede?`, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      {/* Yüz */}
      <Animated.View style={[styles.faceWrap, { transform: [{ translateX: shake }] }]}>
        {/* Kulaklar (baş arkasında) */}
        <TouchableOpacity style={[styles.earL, ...zoneStyle('kulak')]} onPress={() => handlePick('kulak')} activeOpacity={0.7} />
        <TouchableOpacity style={[styles.earR, ...zoneStyle('kulak')]} onPress={() => handlePick('kulak')} activeOpacity={0.7} />
        {/* Baş */}
        <View style={styles.head} />
        {/* Gözler */}
        <TouchableOpacity style={[styles.eyesZone, ...zoneStyle('goz')]} onPress={() => handlePick('goz')} activeOpacity={0.7}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </TouchableOpacity>
        {/* Burun */}
        <TouchableOpacity style={[styles.noseZone, ...zoneStyle('burun')]} onPress={() => handlePick('burun')} activeOpacity={0.7}>
          <View style={styles.nose} />
        </TouchableOpacity>
        {/* Ağız */}
        <TouchableOpacity style={[styles.mouthZone, ...zoneStyle('agiz')]} onPress={() => handlePick('agiz')} activeOpacity={0.7}>
          <View style={styles.mouth} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF3F0', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#C62828' },

  targetPill: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 22, borderRadius: 22, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  targetText: { fontSize: 22, fontWeight: '900', color: '#C62828' },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EF5350', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  faceWrap: { width: 260, height: 260, marginTop: 24 },
  head: { position: 'absolute', left: 30, top: 30, width: 200, height: 200, borderRadius: 100, backgroundColor: '#FFD9B3', borderWidth: 3, borderColor: '#EBB98C' },
  zone: { position: 'absolute', borderRadius: 16, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  zoneOk: { borderColor: '#43A047', backgroundColor: 'rgba(76,175,80,0.25)' },
  zoneWrong: { borderColor: '#E53935', backgroundColor: 'rgba(229,57,53,0.18)' },
  earL: { left: 6, top: 118, width: 40, height: 52, backgroundColor: '#FFD9B3', borderRadius: 20 },
  earR: { left: 214, top: 118, width: 40, height: 52, backgroundColor: '#FFD9B3', borderRadius: 20 },
  eyesZone: { left: 78, top: 96, width: 104, height: 48, flexDirection: 'row', gap: 26 },
  eye: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#3E2723' },
  noseZone: { left: 108, top: 128, width: 44, height: 44 },
  nose: { width: 18, height: 26, borderRadius: 9, backgroundColor: '#E8A87C' },
  mouthZone: { left: 85, top: 168, width: 90, height: 40 },
  mouth: { width: 56, height: 26, borderBottomWidth: 7, borderColor: '#C0392B', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
});
