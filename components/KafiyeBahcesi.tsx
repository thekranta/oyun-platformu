import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🌸 KAFİYE BAHÇESİ - Okuma öncesi / fonolojik farkındalık (Türkçe, TAEOB.5)
// Bir sözcük seslendirilir ve resmi gösterilir ('muz' 🍌); altta 3 resim çıkar.
// Çocuk SONU AYNI SESLE biten (kafiyeli) resmi bulur (muz → buz 🧊).
// Cevap görselde YOK — yalnızca ses örüntüsünde; "aynısını bul" DEĞİL.
// Kafiye grupları elle küratörlenmiştir (gerçek Türkçe kafiyeler, net emoji).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

interface Word { emoji: string; name: string }
interface RhymeRound { target: Word; correct: Word; distractors: [Word, Word] }

// Her tur: hedef + SONU aynı biten tek doğru (kafiyeli) + kafiyesiz 2 çeldirici.
// Kafiyeler bilerek güçlü tutuldu (ortak son hece/ses); emoji tek anlamlı seçildi.
const ROUNDS: RhymeRound[] = [
  // -uz : muz / buz (minimal çift)
  { target: { emoji: '🍌', name: 'Muz' }, correct: { emoji: '🧊', name: 'Buz' },
    distractors: [{ emoji: '🐶', name: 'Köpek' }, { emoji: '🦁', name: 'Aslan' }] },
  // -ek : çiçek / köpek
  { target: { emoji: '🌸', name: 'Çiçek' }, correct: { emoji: '🐶', name: 'Köpek' },
    distractors: [{ emoji: '🍌', name: 'Muz' }, { emoji: '🐯', name: 'Kaplan' }] },
  // -lan : aslan / kaplan
  { target: { emoji: '🦁', name: 'Aslan' }, correct: { emoji: '🐯', name: 'Kaplan' },
    distractors: [{ emoji: '🐟', name: 'Balık' }, { emoji: '🍌', name: 'Muz' }] },
  // -eş : güneş / ateş
  { target: { emoji: '☀️', name: 'Güneş' }, correct: { emoji: '🔥', name: 'Ateş' },
    distractors: [{ emoji: '🐯', name: 'Kaplan' }, { emoji: '🍓', name: 'Çilek' }] },
  // -ut : armut / bulut
  { target: { emoji: '🍐', name: 'Armut' }, correct: { emoji: '☁️', name: 'Bulut' },
    distractors: [{ emoji: '🐶', name: 'Köpek' }, { emoji: '🐝', name: 'Arı' }] },
  // -ık : balık / kaşık
  { target: { emoji: '🐟', name: 'Balık' }, correct: { emoji: '🥄', name: 'Kaşık' },
    distractors: [{ emoji: '☀️', name: 'Güneş' }, { emoji: '🍌', name: 'Muz' }] },
  // -ek : çilek / inek
  { target: { emoji: '🍓', name: 'Çilek' }, correct: { emoji: '🐄', name: 'İnek' },
    distractors: [{ emoji: '🧊', name: 'Buz' }, { emoji: '🦁', name: 'Aslan' }] },
  // -at : saat / at  (hedef 'Saat' seslenir; 'At' tek heceli, TTS üretemiyor → cevap yaptık)
  { target: { emoji: '⌚', name: 'Saat' }, correct: { emoji: '🐴', name: 'At' },
    distractors: [{ emoji: '🌸', name: 'Çiçek' }, { emoji: '🐟', name: 'Balık' }] },
  // -ay : çay / ay  (hedef 'Çay' seslenir; 'Ay' tek heceli → cevap)
  { target: { emoji: '🍵', name: 'Çay' }, correct: { emoji: '🌙', name: 'Ay' },
    distractors: [{ emoji: '🐶', name: 'Köpek' }, { emoji: '🍌', name: 'Muz' }] },
  // -ük : yüzük / gözlük
  { target: { emoji: '💍', name: 'Yüzük' }, correct: { emoji: '👓', name: 'Gözlük' },
    distractors: [{ emoji: '🦁', name: 'Aslan' }, { emoji: '🧊', name: 'Buz' }] },
];

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

export default function KafiyeBahcesi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [current, setCurrent] = useState<RhymeRound>(ROUNDS[0]);
  const [options, setOptions] = useState<Word[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Oturum başında sabit karışık tur sırası (her oynayışta farklı, kafiyeler garantili doğru)
  const [order] = useState(() => shuffle(ROUNDS));

  const [startTime] = useState(Date.now());
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
    const rd = order[(round - 1) % order.length];
    setCurrent(rd);
    setOptions(shuffle([rd.correct, ...rd.distractors]));
    setLocked(false);
    setWrong(null);
    setChosen(null);
    bounce.setValue(0.8);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    // Uyaran sözcüğü seslendir (tek dinamik metin — hedef sözcük).
    speak(rd.target.name, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('kafiye-bahcesi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Türkçe: Okuma Öncesi / Fonolojik Farkındalık — Kafiye (TAEOB.5)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (w: Word) => {
    if (locked) return;
    movesRef.current += 1;
    const isCorrect = w.emoji === current.correct.emoji && w.name === current.correct.name;
    if (isCorrect) {
      setLocked(true);
      setChosen(w.emoji);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait('Aferin! Kafiyeyi buldun.', 1400, { instructions: HAPPY_VOICE }).then(() => {
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
      const t = setTimeout(() => { if (isMountedRef.current) setWrong(null); }, 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Kelimeyi dinle! Sonu aynı biten, kafiyeli olan resmi bul."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#558B2F" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🌸 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Sonu aynı biten hangisi?</Text>
      <Animated.View style={[styles.targetCard, { transform: [{ scale: bounce }] }]}>
        <Text style={styles.targetEmoji}>{current.target.emoji}</Text>
        <Text style={styles.targetName}>{current.target.name}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(current.target.name, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((w) => {
          const isWrong = wrong === w.emoji;
          const isChosen = chosen === w.emoji;
          return (
            <Animated.View key={w.emoji} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.optCard, isWrong && styles.optWrong, isChosen && styles.optCorrect]}
                onPress={() => handlePick(w)}
                activeOpacity={0.85}
                disabled={locked}
              >
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
  container: { flex: 1, backgroundColor: '#F1F8E9', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#558B2F' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#558B2F', marginTop: 8, textAlign: 'center', paddingHorizontal: 16 },
  targetCard: { minWidth: 150, paddingHorizontal: 22, paddingVertical: 16, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  targetEmoji: { fontSize: 90 },
  targetName: { fontSize: 26, fontWeight: '900', color: '#33691E', marginTop: 4 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7CB342', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 22, maxWidth: 460, paddingHorizontal: 12 },
  optCard: { width: 120, height: 128, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  optWrong: { backgroundColor: '#FFE0E0' },
  optCorrect: { backgroundColor: '#DCEDC8', borderWidth: 3, borderColor: '#7CB342' },
  optEmoji: { fontSize: 62 },
  optName: { fontSize: 15, fontWeight: '800', color: '#33691E' },
});
