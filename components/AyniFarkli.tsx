import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🔍 AYNI MI FARKLI MI? - Görsel ayırt etme (Matematik/MAB.3 karşılaştırma)
// İki görsel yan yana; çocuk aynı mı farklı mı olduğunu söyler.
// Karşılaştırma/ayırt etme; ikili seçim, tamamen görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 10;
const ITEMS = ['🍎', '🍌', '🐶', '🐱', '⭐', '🌸', '🚗', '🎈', '🐟', '🦋', '🍓', '🌈'];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

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

export default function AyniFarkli({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [left, setLeft] = useState('🍎');
  const [right, setRight] = useState('🍎');
  const [isSame, setIsSame] = useState(true);
  const [locked, setLocked] = useState(false);
  const [wrongChoice, setWrongChoice] = useState<'ayni' | 'farkli' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cardsBounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const same = Math.random() < 0.5;
    const base = pick(ITEMS);
    setLeft(base);
    if (same) {
      setRight(base);
    } else {
      let other = pick(ITEMS);
      while (other === base) other = pick(ITEMS);
      setRight(other);
    }
    setIsSame(same);
    setLocked(false);
    setWrongChoice(null);
    cardsBounce.setValue(0.85);
    Animated.spring(cardsBounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak('Aynı mı, farklı mı?', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('ayni-farkli', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Görselleri Karşılaştırma, Aynı/Farklı Ayırt Etme (MAB.3)',
      correct_answers: correctRef.current,
    });
  };

  const handleAnswer = (choice: 'ayni' | 'farkli') => {
    if (locked) return;
    movesRef.current += 1;
    const correct = (choice === 'ayni') === isSame;
    if (correct) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait(isSame ? 'Doğru, ikisi de aynı!' : 'Doğru, farklılar!', 1300, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrongChoice(choice);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongChoice(null), 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="İki resme bak. Aynılar mı, farklılar mı? Doğru butona dokun!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#5E35B1" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔍 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Aynı mı, farklı mı?</Text>

      <Animated.View style={[styles.cards, { transform: [{ scale: cardsBounce }] }]}>
        <View style={styles.card}><Text style={styles.cardEmoji}>{left}</Text></View>
        <Text style={styles.vs}>?</Text>
        <View style={styles.card}><Text style={styles.cardEmoji}>{right}</Text></View>
      </Animated.View>

      <View style={styles.answers}>
        <Animated.View style={wrongChoice === 'ayni' ? { transform: [{ translateX: shake }] } : undefined}>
          <TouchableOpacity style={[styles.ansBtn, styles.sameBtn, wrongChoice === 'ayni' && styles.ansWrong]} onPress={() => handleAnswer('ayni')} activeOpacity={0.85}>
            <Text style={styles.ansSymbol}>=</Text>
            <Text style={styles.ansLabel}>Aynı</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={wrongChoice === 'farkli' ? { transform: [{ translateX: shake }] } : undefined}>
          <TouchableOpacity style={[styles.ansBtn, styles.diffBtn, wrongChoice === 'farkli' && styles.ansWrong]} onPress={() => handleAnswer('farkli')} activeOpacity={0.85}>
            <Text style={styles.ansSymbol}>≠</Text>
            <Text style={styles.ansLabel}>Farklı</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1FC', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#5E35B1' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#5E35B1', marginTop: 12 },
  cards: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 20 },
  card: { width: 130, height: 130, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 6 },
  cardEmoji: { fontSize: 78 },
  vs: { fontSize: 34, fontWeight: '900', color: '#B39DDB' },

  answers: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 34 },
  ansBtn: { width: 130, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 5 },
  sameBtn: { backgroundColor: '#66BB6A' },
  diffBtn: { backgroundColor: '#FF8A65' },
  ansWrong: { opacity: 0.6 },
  ansSymbol: { fontSize: 40, fontWeight: '900', color: '#fff' },
  ansLabel: { fontSize: 18, fontWeight: '900', color: '#fff' },
});
