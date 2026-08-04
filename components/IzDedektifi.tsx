import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🔍 İZ DEDEKTİFİ - Kanıta dayalı çıkarım (Fen, FAB.7)
// Bir İZ / KANIT sahnesi (emoji) gösterilir; çocuk "Burada ne oldu? Kim
// yaptı?" sorusuna, kanıta UYAN nedeni 3 seçenek arasından bulur.
// Görsel eşleme DEĞİL; kanıttan nedene geri akıl yürütme (tümdengelim/abduktif).
// Örn: çamurlu patiler 🐾 → köpek; kemirilmiş peynir 🧀 → fare.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

interface Cause { emoji: string; name: string }
interface Round {
  evidence: string;   // İz / kanıt sahnesi (emoji)
  correct: string;    // doğru nedenin emojisi
  options: Cause[];   // 3 neden: 1 uyan + 2 makul-yanlış
  confirm: string;    // doğru seçince söylenen SABİT onay cümlesi
}

// Küratörlü izler — her turda kanıttan nedene çıkarım. 10 iz havuzu, her
// oyunda karışıp 8'i gösterilir (tekrar oynayınca çeşitlilik).
const ROUNDS: Round[] = [
  {
    evidence: '🐾',
    correct: '🐕',
    options: [{ emoji: '🐕', name: 'Köpek' }, { emoji: '🐟', name: 'Balık' }, { emoji: '🦋', name: 'Kelebek' }],
    confirm: 'Aferin! Çamurlu patiler köpekten. Köpek buradan geçmiş.',
  },
  {
    evidence: '🥕',
    correct: '🐰',
    options: [{ emoji: '🐰', name: 'Tavşan' }, { emoji: '🐱', name: 'Kedi' }, { emoji: '🐟', name: 'Balık' }],
    confirm: 'Aferin! Kemirilmiş havuç tavşandan. Tavşan havucu yemiş.',
  },
  {
    evidence: '💧',
    correct: '🌧️',
    options: [{ emoji: '🌧️', name: 'Yağmur' }, { emoji: '☀️', name: 'Güneş' }, { emoji: '🌙', name: 'Ay' }],
    confirm: 'Aferin! Islak zemin yağmurdan. Demek ki yağmur yağmış.',
  },
  {
    evidence: '🧀',
    correct: '🐭',
    options: [{ emoji: '🐭', name: 'Fare' }, { emoji: '🦁', name: 'Aslan' }, { emoji: '🐘', name: 'Fil' }],
    confirm: 'Aferin! Kemirilmiş peynir fareden. Fare peyniri kemirmiş.',
  },
  {
    evidence: '🍯',
    correct: '🐝',
    options: [{ emoji: '🐝', name: 'Arı' }, { emoji: '🐧', name: 'Penguen' }, { emoji: '🐟', name: 'Balık' }],
    confirm: 'Aferin! Tatlı bal arıdan. Arı balı yapmış.',
  },
  {
    evidence: '🥚',
    correct: '🐔',
    options: [{ emoji: '🐔', name: 'Tavuk' }, { emoji: '🐷', name: 'Domuz' }, { emoji: '🐮', name: 'İnek' }],
    confirm: 'Aferin! Yumurtayı tavuk yapar. Tavuk yumurtlamış.',
  },
  {
    evidence: '🕸️',
    correct: '🕷️',
    options: [{ emoji: '🕷️', name: 'Örümcek' }, { emoji: '🐘', name: 'Fil' }, { emoji: '🐟', name: 'Balık' }],
    confirm: 'Aferin! Ağı örümcek örer. Örümcek buraya ağ yapmış.',
  },
  {
    evidence: '⛄',
    correct: '❄️',
    options: [{ emoji: '❄️', name: 'Kar' }, { emoji: '☀️', name: 'Güneş' }, { emoji: '🌈', name: 'Gökkuşağı' }],
    confirm: 'Aferin! Kardan adam kardan olur. Demek ki kar yağmış.',
  },
  {
    evidence: '🍌',
    correct: '🐒',
    options: [{ emoji: '🐒', name: 'Maymun' }, { emoji: '🐔', name: 'Tavuk' }, { emoji: '🐟', name: 'Balık' }],
    confirm: 'Aferin! Muzu maymun yer. Maymun muzu yemiş.',
  },
  {
    evidence: '🌰',
    correct: '🐿️',
    options: [{ emoji: '🐿️', name: 'Sincap' }, { emoji: '🐳', name: 'Balina' }, { emoji: '🐧', name: 'Penguen' }],
    confirm: 'Aferin! Palamutları sincap toplar. Sincap onları biriktirmiş.',
  },
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

export default function IzDedektifi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [current, setCurrent] = useState<Round>(ROUNDS[0]);
  const [options, setOptions] = useState<Cause[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const sequenceRef = useRef<Round[]>(shuffle(ROUNDS).slice(0, TOTAL_ROUNDS));
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
    const cur = sequenceRef.current[round - 1];
    setCurrent(cur);
    setOptions(shuffle(cur.options));
    setLocked(false);
    setWrong(null);
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak('Burada ne oldu? Kim yaptı? İpuçlarına bak!', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('iz-dedektifi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Fen: Gözleme Dayalı Bilimsel Çıkarım (FAB.7)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (emoji: string) => {
    if (locked) return;
    movesRef.current += 1;
    if (emoji === current.correct) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait(current.confirm, 1600, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrong(emoji);
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
          message="Dedektif ol! İzlere bak, burada ne olduğunu ya da kim yaptığını bul."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔍 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Ne oldu? Kim yaptı?</Text>
      <Animated.View style={[styles.evidenceCard, { transform: [{ scale: bounce }] }]}>
        <Text style={styles.evidenceEmoji}>{current.evidence}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak('Burada ne oldu? Kim yaptı? İpuçlarına bak!', { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((opt) => {
          const isWrong = wrong === opt.emoji;
          return (
            <Animated.View key={opt.emoji} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(opt.emoji)} activeOpacity={0.85}>
                <Text style={styles.optEmoji}>{opt.emoji}</Text>
                <Text style={styles.optName}>{opt.name}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F8E9', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#2E7D32' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#2E7D32', marginTop: 8 },
  evidenceCard: { width: 140, height: 140, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  evidenceEmoji: { fontSize: 90 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#43A047', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 20, flexWrap: 'wrap', maxWidth: 440, paddingHorizontal: 12 },
  optCard: { width: 116, height: 120, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  optWrong: { backgroundColor: '#FFE0E0' },
  optEmoji: { fontSize: 52 },
  optName: { fontSize: 14, fontWeight: '800', color: '#33691E' },
});
