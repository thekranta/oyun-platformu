import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🔤 İLK HARF - İlk ses/harf farkındalığı (Dil / Erken Okuryazarlık, TAEOB)
// Bir harf gösterilir; çocuk O HARFLE BAŞLAYAN resmi bulur (A → Arı).
// Gerçek okuryazarlık becerisi (harf-ses ilişkisi), "aynısını bul" DEĞİL.
// Resim adları etiketli; ses de harfi söyler.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

interface Word { emoji: string; letter: string; name: string }

const WORDS: Word[] = [
  { emoji: '🐝', letter: 'A', name: 'Arı' },
  { emoji: '🐻', letter: 'A', name: 'Ayı' },
  { emoji: '🚗', letter: 'A', name: 'Araba' },
  { emoji: '🌙', letter: 'A', name: 'Ay' },
  { emoji: '🐟', letter: 'B', name: 'Balık' },
  { emoji: '🎈', letter: 'B', name: 'Balon' },
  { emoji: '🌸', letter: 'Ç', name: 'Çiçek' },
  { emoji: '🍓', letter: 'Ç', name: 'Çilek' },
  { emoji: '🍎', letter: 'E', name: 'Elma' },
  { emoji: '🏠', letter: 'E', name: 'Ev' },
  { emoji: '🐱', letter: 'K', name: 'Kedi' },
  { emoji: '🐶', letter: 'K', name: 'Köpek' },
  { emoji: '🦋', letter: 'K', name: 'Kelebek' },
  { emoji: '🍌', letter: 'M', name: 'Muz' },
  { emoji: '🐵', letter: 'M', name: 'Maymun' },
  { emoji: '🍕', letter: 'P', name: 'Pizza' },
  { emoji: '🐧', letter: 'P', name: 'Penguen' },
  { emoji: '⚽', letter: 'T', name: 'Top' },
  { emoji: '🐰', letter: 'T', name: 'Tavşan' },
  { emoji: '🚂', letter: 'T', name: 'Tren' },
  { emoji: '⭐', letter: 'Y', name: 'Yıldız' },
  { emoji: '🐍', letter: 'Y', name: 'Yılan' },
  { emoji: '🥚', letter: 'Y', name: 'Yumurta' },
  { emoji: '☀️', letter: 'G', name: 'Güneş' },
];
const LETTERS = Array.from(new Set(WORDS.map((w) => w.letter)));

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function IlkHarf({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [letter, setLetter] = useState('A');
  const [options, setOptions] = useState<Word[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const prevRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const pool = LETTERS.filter((l) => l !== prevRef.current);
    const target = pick(pool);
    prevRef.current = target;
    const correct = pick(WORDS.filter((w) => w.letter === target));
    // Farklı ilk harfli 2 çeldirici (tek doğru cevap olsun)
    const distractors: Word[] = [];
    const used = new Set<string>([target]);
    for (const w of shuffle(WORDS)) {
      if (!used.has(w.letter)) { distractors.push(w); used.add(w.letter); }
      if (distractors.length === 2) break;
    }
    setLetter(target);
    setOptions(shuffle([correct, ...distractors]));
    setLocked(false);
    setWrong(null);
    bounce.setValue(0.8);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(`${target} ile başlayan resmi bul!`, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('ilk-harf', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Türkçe: Erken Okuryazarlık - Harf-Ses İlişkisi / İlk Ses Farkındalığı (TAEOB.6)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (w: Word) => {
    if (locked) return;
    movesRef.current += 1;
    if (w.letter === letter) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait(`Aferin! ${w.name}, ${letter} ile başlar.`, 1500, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrong(w.emoji);
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
          message="Bir harf göstereceğim. O harfle BAŞLAYAN resmi bul!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#C2185B" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔤 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Bu harfle başlayan?</Text>
      <Animated.View style={[styles.letterCard, { transform: [{ scale: bounce }] }]}>
        <Text style={styles.letterBig}>{letter}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(`${letter} ile başlayan resmi bul!`, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((w) => {
          const isWrong = wrong === w.emoji;
          return (
            <Animated.View key={w.emoji} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(w)} activeOpacity={0.85}>
                <Text style={styles.optEmoji}>{w.emoji}</Text>
                <Text style={styles.optName}>{w.name}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#C2185B' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#C2185B', marginTop: 8 },
  letterCard: { width: 130, height: 130, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  letterBig: { fontSize: 88, fontWeight: '900', color: '#EC407A' },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EC407A', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 22, maxWidth: 460, paddingHorizontal: 12 },
  optCard: { width: 120, height: 128, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  optWrong: { backgroundColor: '#FFE0E0' },
  optEmoji: { fontSize: 62 },
  optName: { fontSize: 15, fontWeight: '800', color: '#5A3A66' },
});
