import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 🎨 RENK SEPETLERİ - Renk eşleştirme/ayırma (2-4 yaş)
// Yukarıda renkli bir top belirir; çocuk onu AYNI renkteki sepete koyar.
// Renk ayırt etme becerisinin kendisi = eşleştirme (geçerli), ses gelmese
// de görsel olarak çalışır; renk adı seslendirilir.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ITEMS = 12;

interface ColorDef { key: string; name: string; hex: string }

const COLORS: ColorDef[] = [
  { key: 'kirmizi', name: 'Kırmızı', hex: '#FF5A5A' },
  { key: 'mavi', name: 'Mavi', hex: '#4FA3FF' },
  { key: 'sari', name: 'Sarı', hex: '#FFCE3A' },
  { key: 'yesil', name: 'Yeşil', hex: '#57D971' },
];

// Sepet sayısı oyun ilerledikçe artar (renk seti hep baştan büyür, yer değiştirmez)
const basketSet = (index: number): ColorDef[] => COLORS.slice(0, index < 4 ? 2 : index < 8 ? 3 : 4);

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

export default function RenkSepetleri({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [itemIndex, setItemIndex] = useState(0);
  const [ballColor, setBallColor] = useState<ColorDef>(COLORS[0]);
  const [baskets, setBaskets] = useState<ColorDef[]>(basketSet(0));
  const [locked, setLocked] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const ballDrop = useRef(new Animated.Value(0)).current; // 0=üstte, 1=düştü
  const ballPop = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
  }, []);

  // Her top: renk seti + top rengini uret, rengi seslendir
  useEffect(() => {
    if (!gameReady) return;
    const set = basketSet(itemIndex);
    const color = pick(set);
    setBaskets(set);
    setBallColor(color);
    setLocked(false);
    setWrongKey(null);

    ballDrop.setValue(0);
    ballPop.setValue(0.6);
    Animated.spring(ballPop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();

    speak(`${color.name}!`, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIndex, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('renk-sepetleri', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Bilişsel Gelişim: Renkleri Ayırt Etme ve Eşleştirme',
      correct_answers: correctRef.current,
    });
  };

  const handleBasket = (color: ColorDef) => {
    if (locked) return;
    movesRef.current += 1;

    if (color.key === ballColor.key) {
      setLocked(true);
      correctRef.current += 1;
      // top sepete düşer
      Animated.timing(ballDrop, { toValue: 1, duration: 350, useNativeDriver: USE_NATIVE }).start();
      const isLast = itemIndex + 1 >= TOTAL_ITEMS;
      if (isLast) setShowConfetti(true);
      const t = setTimeout(() => {
        if (isLast) finish();
        else setItemIndex((i) => i + 1);
      }, isLast ? 1400 : 550);
      timersRef.current.push(t);
    } else {
      errorsRef.current += 1;
      setWrongKey(color.key);
      Animated.sequence([
        Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongKey(null), 450);
      timersRef.current.push(t);
    }
  };

  const ballTranslateY = ballDrop.interpolate({ inputRange: [0, 1], outputRange: [0, 220] });
  const ballOpacity = ballDrop.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={120} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}

      {!gameReady && (
        <CountdownOverlay
          message="Renkli topları doğru renkteki sepete koyalım!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#2E7D5B" />
        </TouchableOpacity>
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>🎨 {Math.min(itemIndex + 1, TOTAL_ITEMS)}/{TOTAL_ITEMS}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Bu topu doğru sepete koy!</Text>

      {/* Top */}
      <View style={styles.ballZone}>
        <Animated.View
          style={[
            styles.ball,
            { backgroundColor: ballColor.hex, transform: [{ translateY: ballTranslateY }, { scale: ballPop }], opacity: ballOpacity },
          ]}
        />
      </View>

      {/* Sepetler */}
      <View style={styles.baskets}>
        {baskets.map((c) => {
          const isWrong = wrongKey === c.key;
          return (
            <Animated.View key={c.key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.basket, { backgroundColor: c.hex, borderColor: isWrong ? '#fff' : 'rgba(0,0,0,0.12)' }]}
                onPress={() => handleBasket(c)}
                activeOpacity={0.85}
              >
                <Ionicons name="basket" size={40} color="rgba(255,255,255,0.95)" />
                <Text style={styles.basketName}>{c.name}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1FBF5', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#2E7D5B' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#2E7D5B', marginTop: 10 },
  ballZone: { height: 150, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  ball: { width: 96, height: 96, borderRadius: 48, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 1, elevation: 8 },

  baskets: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 10, maxWidth: 480, paddingHorizontal: 12 },
  basket: { width: 104, height: 104, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 5 },
  basketName: { fontSize: 14, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
});
