import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 🌗 GÜNDÜZ MÜ GECE Mİ? - Zaman/doğa eşleştirme (Sosyal Bilgiler/SAB.1)
// Nesneyi gündüze mi geceye mi ait olduğuna göre ayırır. Zaman kavramı;
// 2 kutulu sınıflandırma. Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ITEMS = 10;

const DAY = ['☀️', '🌻', '🏖️', '🐓', '🌈', '🕶️', '🪁', '🌅'];
const NIGHT = ['🌙', '⭐', '🦉', '🛏️', '🕯️', '🌌', '😴', '🔦'];

const BINS = [
  { key: 'gunduz', name: 'Gündüz', icon: '☀️', color: '#FFB300' },
  { key: 'gece', name: 'Gece', icon: '🌙', color: '#5C6BC0' },
];

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

export default function GunduzGece({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [itemIndex, setItemIndex] = useState(0);
  const [emoji, setEmoji] = useState('☀️');
  const [cat, setCat] = useState('gunduz');
  const [locked, setLocked] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pop = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const isDay = Math.random() < 0.5;
    setEmoji(isDay ? pick(DAY) : pick(NIGHT));
    setCat(isDay ? 'gunduz' : 'gece');
    setLocked(false);
    setWrongKey(null);
    pop.setValue(0.7);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak('Bu gündüz mü, gece mi?', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIndex, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('gunduz-gece', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal Bilgiler: Zaman Kavramı - Gündüz/Gece Ayrımı (SAB.1)',
      correct_answers: correctRef.current,
    });
  };

  const handleBin = (binKey: string) => {
    if (locked) return;
    movesRef.current += 1;
    if (binKey === cat) {
      setLocked(true);
      correctRef.current += 1;
      Animated.timing(pop, { toValue: 0, duration: 280, useNativeDriver: USE_NATIVE }).start();
      const isLast = itemIndex + 1 >= TOTAL_ITEMS;
      if (isLast) setShowConfetti(true);
      const t = setTimeout(() => {
        if (isLast) finish();
        else setItemIndex((i) => i + 1);
      }, isLast ? 1400 : 500);
      timersRef.current.push(t);
    } else {
      errorsRef.current += 1;
      setWrongKey(binKey);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongKey(null), 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={120} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Bu şey gündüz mü olur, gece mi? Doğru kutuya koy!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#3949AB" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🌗 {Math.min(itemIndex + 1, TOTAL_ITEMS)}/{TOTAL_ITEMS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Gündüz mü, gece mi?</Text>

      <View style={styles.itemZone}>
        <Animated.Text style={[styles.item, { transform: [{ scale: pop }] }]}>{emoji}</Animated.Text>
      </View>

      <View style={styles.bins}>
        {BINS.map((b) => {
          const isWrong = wrongKey === b.key;
          return (
            <Animated.View key={b.key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.bin, { backgroundColor: b.color, borderColor: isWrong ? '#fff' : 'rgba(0,0,0,0.1)' }]} onPress={() => handleBin(b.key)} activeOpacity={0.85}>
                <Text style={styles.binIcon}>{b.icon}</Text>
                <Text style={styles.binName}>{b.name}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDEFFB', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#3949AB' },

  prompt: { fontSize: 21, fontWeight: '900', color: '#3949AB', marginTop: 10 },
  itemZone: { height: 150, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  item: { fontSize: 96 },

  bins: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 10 },
  bin: { width: 140, height: 120, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 5 },
  binIcon: { fontSize: 44 },
  binName: { fontSize: 16, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
});
