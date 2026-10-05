
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';
import { speak, speakThenWait } from '../services/speechService';
import ListenButton from './ListenButton';

// ============================================
// 📈🐻 AKILLI AYI AİLESİ - Boyut sıralama, UYARLANIR (adaptif) zorluk
// (Matematik/MAB.4 karşılaştırma-sıralama)
// Farklı boyuttaki ayıları EN KÜÇÜKTEN EN BÜYÜĞE sırayla dokunarak diz.
// Zorluk arttıkça: ayı SAYISI artar VE boyutlar birbirine YAKINLAŞIR
// (ayırt etmesi zorlaşır). Her tur sonunda performans (hata+süre) motora
// bildirilir; her 3 turda bir (checkpointEvery) zorluk yeniden ayarlanır.
// Taban oyun: AyiAilesi.tsx (dokunarak diz mekaniği ve görünüm birebir korunur).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 6;
const TARGET_MS = 10000; // birden fazla ayıyı sırayla dokunmak icin makul hedef sure

interface Bear { id: number; rank: number; size: number }

// Zorluk 1..5: dusukte AZ ayı + boyut farkı BUYUK (kolay ayirt), yuksekte
// COK ayı + boyut farkı KUCUK (ayirt etmesi zor).
const CFG_BY_DIFF: Record<number, { count: number; sizeStep: number }> = {
  1: { count: 3, sizeStep: 26 },
  2: { count: 3, sizeStep: 20 },
  3: { count: 4, sizeStep: 16 },
  4: { count: 5, sizeStep: 13 },
  5: { count: 6, sizeStep: 10 },
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function buildRound(diff: number): Bear[] {
  const cfg = CFG_BY_DIFF[diff] || CFG_BY_DIFF[2];
  const items: Bear[] = Array.from({ length: cfg.count }, (_, rank) => ({ id: rank, rank, size: 40 + rank * cfg.sizeStep }));
  return shuffle(items).map((b, i) => ({ ...b, id: i }));
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

export default function AkilliAyiAilesi({ onGameEnd, onExit, childName }: Props) {
  const START_DIFF = 2;
  const { recordLevel } = useAdaptiveDifficulty({
    minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: START_DIFF,
  });

  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [bears, setBears] = useState<Bear[]>([]);
  const [expectedRank, setExpectedRank] = useState(0);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const startTimeRef = useRef(Date.now());
  const levelStartRef = useRef(Date.now());
  const levelErrorsRef = useRef(0);
  const totalMovesRef = useRef(0);
  const totalErrorsRef = useRef(0);
  const correctRef = useRef(0);
  const diffRef = useRef(START_DIFF);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const roundDoneRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    setBears(buildRound(diffRef.current));
    setExpectedRank(0);
    setWrongId(null);
    roundDoneRef.current = false;
    levelErrorsRef.current = 0;
    levelStartRef.current = Date.now();
    speak('Ayı ailesini en küçükten en büyüğe sırayla dokunarak diz!', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = (solvedInDiff: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    onGameEnd('akilli-ayi-ailesi', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
      zorlukSeviyesi: solvedInDiff,
      kazanimOdagi: 'Matematik: Boyuta Göre Karşılaştırma ve Sıralama (MAB.3) (uyarlanır zorluk)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (bear: Bear) => {
    if (roundDoneRef.current || bear.rank < expectedRank) return; // yerleşmiş ayı
    totalMovesRef.current += 1;
    if (bear.rank === expectedRank) {
      correctRef.current += 1;
      speak('Aferin!');
      const next = expectedRank + 1;
      setExpectedRank(next);
      if (next >= bears.length) {
        roundDoneRef.current = true;
        const timeMs = Date.now() - levelStartRef.current;
        const nextDiff = recordLevel({ correct: 1, total: 1, errors: levelErrorsRef.current, timeMs, targetMs: TARGET_MS });
        const solvedInDiff = diffRef.current;
        diffRef.current = nextDiff;
        const isLast = round >= TOTAL_ROUNDS;
        if (isLast) setShowConfetti(true);
        speakThenWait('Aferin! Hepsini sıraladın.', isLast ? 1500 : 900, { instructions: HAPPY_VOICE }).then(() => {
          if (!isMountedRef.current) return;
          if (isLast) finish(solvedInDiff);
          else setRound((r) => r + 1);
        });
      }
    } else {
      levelErrorsRef.current += 1;
      totalErrorsRef.current += 1;
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
          onComplete={() => { levelStartRef.current = Date.now(); startTimeRef.current = Date.now(); setGameReady(true); }}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>🐻 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.title}>📈 Akıllı Ayı Ailesi</Text>
      <Text style={styles.prompt}>En küçükten en büyüğe!</Text>

      <ListenButton onPress={() => speak('Ayı ailesini en küçükten en büyüğe sırayla dokunarak diz!', { instructions: HAPPY_VOICE })} color="#795548" style={{ marginTop: 4, marginBottom: 6 }} />

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
  container: { flex: 1, backgroundColor: '#FBF3EC', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#795548' },

  title: { fontSize: 18, fontWeight: '900', color: '#795548', marginTop: 4 },
  prompt: { fontSize: 22, fontWeight: '900', color: '#795548', marginTop: 6 },

  field: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 24, paddingBottom: 40 },
  slot: { alignItems: 'center', justifyContent: 'flex-end' },
  bearBtn: { alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 16 },
  bearPlaced: { opacity: 0.45 },
  orderBadge: { position: 'absolute', top: -2, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#57D971', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  orderText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
