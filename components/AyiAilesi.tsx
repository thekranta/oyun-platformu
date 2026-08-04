import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🐻 AYI AİLESİ - Boyut sıralama (Matematik/MAB.3 karşılaştırma-sıralama)
// Farklı boyuttaki ayıları EN KÜÇÜKTEN EN BÜYÜĞE sırayla dokunarak diz.
// Boyut karşılaştırma/seriation; tamamen görsel, ses gerektirmez.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 6;

interface Bear { id: number; rank: number; size: number }

const bearCount = (round: number) => (round <= 2 ? 3 : round <= 4 ? 4 : 5);

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

export default function AyiAilesi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [bears, setBears] = useState<Bear[]>([]);
  const [expectedRank, setExpectedRank] = useState(0);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const roundDoneRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const n = bearCount(round);
    const items: Bear[] = Array.from({ length: n }, (_, rank) => ({ id: rank, rank, size: 40 + rank * 20 }));
    setBears(shuffle(items).map((b, i) => ({ ...b, id: i })));
    setExpectedRank(0);
    setWrongId(null);
    roundDoneRef.current = false;
    speak('En küçük ayıdan en büyüğe doğru sırala!', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('ayi-ailesi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Boyuta Göre Karşılaştırma ve Sıralama (MAB.3)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (bear: Bear) => {
    if (roundDoneRef.current || bear.rank < expectedRank) return; // yerleşmiş ayı
    movesRef.current += 1;
    if (bear.rank === expectedRank) {
      correctRef.current += 1;
      const next = expectedRank + 1;
      setExpectedRank(next);
      if (next >= bears.length) {
        roundDoneRef.current = true;
        const isLast = round >= TOTAL_ROUNDS;
        if (isLast) setShowConfetti(true);
        speakThenWait('Aferin! Hepsini sıraladın.', isLast ? 1500 : 900, { instructions: HAPPY_VOICE }).then(() => {
          if (!isMountedRef.current) return;
          if (isLast) finish();
          else setRound((r) => r + 1);
        });
      }
    } else {
      errorsRef.current += 1;
      setWrongId(bear.id);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongId(null), 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Ayı ailesini en küçükten en büyüğe sırayla dokunarak diz!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#795548" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🐻 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>En küçükten en büyüğe!</Text>
      <Text style={styles.hint}>Sıradaki: {expectedRank + 1}. ayı</Text>

      <View style={styles.field}>
        {bears.map((bear) => {
          const placed = bear.rank < expectedRank;
          const isWrong = wrongId === bear.id;
          return (
            <Animated.View key={bear.id} style={[styles.slot, isWrong ? { transform: [{ translateX: shake }] } : undefined]}>
              <TouchableOpacity
                style={[styles.bearBtn, placed && styles.bearPlaced]}
                onPress={() => handleTap(bear)}
                activeOpacity={0.85}
                disabled={placed}
              >
                <Text style={{ fontSize: bear.size }}>🐻</Text>
                {placed && (
                  <View style={styles.orderBadge}><Text style={styles.orderText}>{bear.rank + 1}</Text></View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF3EC', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#795548' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#795548', marginTop: 10 },
  hint: { fontSize: 15, fontWeight: '700', color: '#A1887F', marginTop: 4, marginBottom: 6 },

  field: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 40 },
  slot: { alignItems: 'center', justifyContent: 'flex-end' },
  bearBtn: { alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 16 },
  bearPlaced: { opacity: 0.45 },
  orderBadge: { position: 'absolute', top: -2, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#57D971', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  orderText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
