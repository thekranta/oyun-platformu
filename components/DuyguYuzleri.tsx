import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 💛 DUYGU YÜZLERİ - Duygu tanıma (Sosyal-Duygusal / SAB)
// Hedef duygu üstte (büyük emoji + isim, sesli okunur); çocuk alttaki
// yüzlerden aynı duyguyu bulur. Ses gelmese de görsel olarak anlaşılır.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const MOTHER_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm, gentle and encouraging.';
const TOTAL_ROUNDS = 8;

interface Emotion { key: string; emoji: string; name: string; color: string }

const EMOTIONS: Emotion[] = [
  { key: 'mutlu', emoji: '😊', name: 'Mutlu', color: '#FFC93C' },
  { key: 'uzgun', emoji: '😢', name: 'Üzgün', color: '#4FACFE' },
  { key: 'kizgin', emoji: '😠', name: 'Kızgın', color: '#FF6B6B' },
  { key: 'korkmus', emoji: '😨', name: 'Korkmuş', color: '#9B7BFF' },
  { key: 'saskin', emoji: '😲', name: 'Şaşkın', color: '#4ECDC4' },
  { key: 'sevgi', emoji: '🥰', name: 'Sevgi Dolu', color: '#FF6AA9' },
  { key: 'uykulu', emoji: '😴', name: 'Uykulu', color: '#90A4AE' },
];

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

export default function DuyguYuzleri({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState<Emotion>(EMOTIONS[0]);
  const [options, setOptions] = useState<Emotion[]>([]);
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

  // Unmount temizligi
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
  }, []);

  // Her tur: hedef + secenekleri uret, hedefi seslendir
  useEffect(() => {
    if (!gameReady) return;
    const pool = EMOTIONS.filter((e) => e.key !== prevKeyRef.current);
    const newTarget = pool[Math.floor(Math.random() * pool.length)];
    prevKeyRef.current = newTarget.key;

    const n = optionCount(round);
    const distractors = shuffle(EMOTIONS.filter((e) => e.key !== newTarget.key)).slice(0, n - 1);
    const opts = shuffle([newTarget, ...distractors]);

    setTarget(newTarget);
    setOptions(opts);
    setLocked(false);
    setWrongKey(null);

    // hedef kart hafif zıplasın
    targetBounce.setValue(0.8);
    Animated.spring(targetBounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();

    speak(`${newTarget.name} yüzü bul!`, { instructions: MOTHER_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('duygu-yuzleri', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal-Duygusal Gelişim: Duyguları Tanıma (SAB)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (emo: Emotion) => {
    if (locked) return;
    movesRef.current += 1;

    if (emo.key === target.key) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speak('Aferin! Doğru buldun.', { instructions: MOTHER_VOICE });
      const t = setTimeout(() => {
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      }, 1400);
      timersRef.current.push(t);
    } else {
      // Nazik geri bildirim: sallanma, kısa uyarı; ceza/kırmızı çarpı yok
      errorsRef.current += 1;
      setWrongKey(emo.key);
      Animated.sequence([
        Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongKey(null), 500);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}

      {!gameReady && (
        <CountdownOverlay
          message="Yüzlere bak! Söylenen duyguyu bul. Mutlu, üzgün, kızgın... hangisi?"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      {/* Üst bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#7A2B6E" />
        </TouchableOpacity>
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>💛 {round}/{TOTAL_ROUNDS}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Hedef duygu */}
      <Text style={styles.prompt}>Bu duyguyu bul:</Text>
      <Animated.View style={[styles.targetCard, { backgroundColor: target.color, transform: [{ scale: targetBounce }] }]}>
        <Text style={styles.targetEmoji}>{target.emoji}</Text>
        <Text style={styles.targetName}>{target.name}</Text>
      </Animated.View>

      <TouchableOpacity
        style={styles.listenBtn}
        onPress={() => speak(`${target.name} yüzü bul!`, { instructions: MOTHER_VOICE })}
        activeOpacity={0.85}
      >
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      {/* Seçenekler */}
      <View style={styles.options}>
        {options.map((emo) => {
          const isWrong = wrongKey === emo.key;
          return (
            <Animated.View key={emo.key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: emo.color }, isWrong && styles.optionWrong]}
                onPress={() => handlePick(emo)}
                activeOpacity={0.85}
              >
                <Text style={styles.optionEmoji}>{emo.emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF6FB', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#7A2B6E' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#7A2B6E', marginTop: 10 },
  targetCard: { width: 180, height: 180, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 1, elevation: 8 },
  targetEmoji: { fontSize: 92 },
  targetName: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF6AA9', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 24, maxWidth: 460, paddingHorizontal: 12 },
  optionCard: { width: 110, height: 110, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 6 },
  optionWrong: { opacity: 0.85 },
  optionEmoji: { fontSize: 62 },
});
