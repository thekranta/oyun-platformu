import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🍂 MEVSİM BAHÇESİ - Mevsimleri tanıma (Sosyal/Zaman Kavramı, SAB.1)
// Gösterilen nesne/etkinlik HANGİ MEVSİMDE olur? (kartopu→kış). Görsel-öncelikli
// akıl yürütme: "kardan adam sadece kışın yapılır". Nesne emojisi mevsim
// etiketiyle birebir AYNI değildir (kopya-eşleme değil, kategori bilgisi).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

// Dört mevsim — her tur 4'ü de seçenek olarak gösterilir (emoji + ad).
const SEASONS: Record<string, { emoji: string; name: string }> = {
  ilkbahar: { emoji: '🌸', name: 'İlkbahar' },
  yaz: { emoji: '☀️', name: 'Yaz' },
  sonbahar: { emoji: '🍂', name: 'Sonbahar' },
  kis: { emoji: '❄️', name: 'Kış' },
};
const SEASON_KEYS = Object.keys(SEASONS);

// Küratörlü turlar: nesne/etkinlik emojisi + doğru mevsim + STATİK onay cümlesi.
// Her mevsim 2 kez geçer → 4 mevsimin tamamı kapsanır.
const ROUNDS = [
  { emoji: '⛄', season: 'kis', confirm: 'Aferin! Kardan adamı kışın yaparız. Kışın hava soğuk olur ve kar yağar.' },
  { emoji: '🧤', season: 'kis', confirm: 'Aferin! Eldiveni kışın giyeriz. Kışın hava çok soğuktur, ellerimiz üşür.' },
  { emoji: '🍦', season: 'yaz', confirm: 'Aferin! Dondurmayı yazın yeriz. Yazın hava çok sıcaktır, dondurma bizi serinletir.' },
  { emoji: '🏖️', season: 'yaz', confirm: 'Aferin! Denize yazın gireriz. Yazın hava sıcak olur, yüzmek çok eğlencelidir.' },
  { emoji: '🍁', season: 'sonbahar', confirm: 'Aferin! Yapraklar sonbaharda sararıp dökülür. Sonbaharda havalar serinler.' },
  { emoji: '🌰', season: 'sonbahar', confirm: 'Aferin! Kestaneyi sonbaharda toplarız. Sonbaharda yapraklar dökülür, hava serinler.' },
  { emoji: '🌷', season: 'ilkbahar', confirm: 'Aferin! Çiçekler ilkbaharda açar. İlkbaharda hava ısınır, her yer yeşerir.' },
  { emoji: '🐣', season: 'ilkbahar', confirm: 'Aferin! Civcivler ilkbaharda yumurtadan çıkar. İlkbaharda birçok yavru hayvan doğar.' },
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

export default function MevsimBahcesi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [order] = useState(() => shuffle(ROUNDS));
  const [current, setCurrent] = useState(ROUNDS[0]);
  const [options, setOptions] = useState<string[]>(SEASON_KEYS);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
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

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const cur = order[round - 1];
    setCurrent(cur);
    setOptions(shuffle(SEASON_KEYS));
    setLocked(false);
    setWrong(null);
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak('Bu hangi mevsimde olur? Doğru mevsimi bul!', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('mevsim-bahcesi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal: Zaman Kavramı — Mevsimler (SAB.1)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (key: string) => {
    if (locked) return;
    movesRef.current += 1;
    if (key === current.season) {
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
      setWrong(key);
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
          message="Mevsimleri tanıyalım! Bu hangi mevsimde olur, doğru mevsimi seç."
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
        <View style={styles.roundBadge}><Text style={styles.roundText}>🍂 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Hangi mevsimde olur?</Text>
      <Animated.View style={[styles.itemCard, { transform: [{ scale: bounce }] }]}>
        <Text style={styles.itemEmoji}>{current.emoji}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak('Bu hangi mevsimde olur? Doğru mevsimi bul!', { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((key) => {
          const isWrong = wrong === key;
          return (
            <Animated.View key={key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(key)} activeOpacity={0.85}>
                <Text style={styles.optEmoji}>{SEASONS[key].emoji}</Text>
                <Text style={styles.optName}>{SEASONS[key].name}</Text>
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
  itemCard: { width: 140, height: 140, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  itemEmoji: { fontSize: 90 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#43A047', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 20, flexWrap: 'wrap', maxWidth: 440, paddingHorizontal: 12 },
  optCard: { width: 116, height: 120, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  optWrong: { backgroundColor: '#FFE0E0' },
  optEmoji: { fontSize: 52 },
  optName: { fontSize: 14, fontWeight: '800', color: '#33691E' },
});
