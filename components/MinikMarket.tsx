import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🛒 MİNİK MARKET - Para/Ekonomi farkındalığı (Sosyal, SAB.22)
// Ürünün FİYATI kadar (N jeton) parası olan keseyi seç. İhtiyaçların
// karşılanabilmesi için paraya ihtiyaç olduğu + fiyat↔nicelik + sayma.
// SAYILAR SESLENDİRİLMEZ — nicelik yalnızca GÖRSEL olarak (🪙 jetonlar)
// verilir; tüm konuşma statiktir (sabit klipler).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

// Tur yönergesi (round useEffect + "Tekrar Dinle") — STATİK, sayı içermez.
const PROMPT = 'Kaç para? Say ve aynı sayıda parası olan keseyi bul!';

interface Round { product: string; name: string; price: number; options: number[]; }

// Küratörlü 8 tur: fiyat N=2..6; her turda üç FARKLI jeton sayısı; biri == fiyat,
// iki çeldirici fiyata 1-2 uzaklıkta ama net sayılabilir biçimde farklı.
const ROUNDS: Round[] = [
  { product: '🍎', name: 'Elma', price: 2, options: [2, 3, 4] },
  { product: '🍌', name: 'Muz', price: 3, options: [3, 2, 5] },
  { product: '🥛', name: 'Süt', price: 4, options: [4, 6, 3] },
  { product: '🍞', name: 'Ekmek', price: 5, options: [5, 4, 6] },
  { product: '🧸', name: 'Oyuncak Ayı', price: 6, options: [6, 4, 5] },
  { product: '🎈', name: 'Balon', price: 2, options: [2, 4, 3] },
  { product: '🍪', name: 'Kurabiye', price: 5, options: [5, 3, 6] },
  { product: '🧃', name: 'Meyve Suyu', price: 4, options: [4, 2, 5] },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// N adet jetonu (🪙) net sayılabilir bir ızgarada (satır başına 3) gösterir.
function CoinRow({ count, size }: { count: number; size: number }) {
  return (
    <View style={[styles.coinWrap, { width: (size + 6) * 3 + 2 }]}>
      {Array.from({ length: count }).map((_, i) => (
        <Text key={i} style={[styles.coin, { fontSize: size, width: size + 6, lineHeight: size + 8 }]}>🪙</Text>
      ))}
    </View>
  );
}

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function MinikMarket({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [options, setOptions] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const cur = ROUNDS[round - 1];

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const data = ROUNDS[round - 1];
    setOptions(shuffle(data.options));
    setLocked(false);
    setWrongIdx(null);
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(PROMPT, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('minik-market', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal: Para/Ekonomi — İhtiyaçlar İçin Gelir Gerekir (SAB.22)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (count: number, idx: number) => {
    if (locked) return;
    movesRef.current += 1;
    if (count === cur.price) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait('Aferin! Doğru parayı verdin.', 1400, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrongIdx(idx);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => { if (isMountedRef.current) setWrongIdx(null); }, 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Alışveriş yapalım! Fiyattaki para kadar parası olan keseyi seç."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#EF6C00" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🛒 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Fiyat kadar para seç!</Text>

      {/* Ürün + fiyatı (jeton sayısı = fiyat) */}
      <Animated.View style={[styles.priceRow, { transform: [{ scale: bounce }] }]}>
        <View style={styles.productCard}>
          <Text style={styles.productEmoji}>{cur.product}</Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>FİYAT</Text>
          <CoinRow count={cur.price} size={26} />
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(PROMPT, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>Hangi kesede aynı sayıda para var?</Text>

      <View style={styles.options}>
        {options.map((count, idx) => {
          const isWrong = wrongIdx === idx;
          return (
            <Animated.View key={idx} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(count, idx)} activeOpacity={0.85}>
                <Text style={styles.purseEmoji}>👛</Text>
                <CoinRow count={count} size={20} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#EF6C00' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#E65100', marginTop: 8 },

  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12 },
  productCard: { width: 104, height: 104, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  productEmoji: { fontSize: 64 },
  priceBox: { minWidth: 116, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, borderColor: '#FFB300', alignItems: 'center', justifyContent: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 5 },
  priceLabel: { fontSize: 14, fontWeight: '900', color: '#E65100', letterSpacing: 1 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FB8C00', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  hint: { fontSize: 15, fontWeight: '700', color: '#EF6C00', marginTop: 14, textAlign: 'center', paddingHorizontal: 16 },

  options: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap', maxWidth: 440, paddingHorizontal: 10 },
  optCard: { width: 108, minHeight: 132, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  optWrong: { backgroundColor: '#FFE0E0' },
  purseEmoji: { fontSize: 40 },

  coinWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  coin: { textAlign: 'center', marginVertical: 1 },
});
