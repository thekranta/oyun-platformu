import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🔎 RESİMDE NE OLUYOR? - Görsel materyalden anlam üretme (Türkçe, TAOB.2)
// Basit ama anlamlı bir SAHNE (emoji) gösterilir; "Ne oluyor?" ya da
// "Ona ne lazım?" sorulur. Çocuk sahneyi ANLAYARAK (bağlam/neden-sonuç)
// doğru yorumu/çözümü seçer — görsel eşleme değil, akıl yürütme.
// Çeldiriciler sahneye uygun-ama-yanlış olduğu için düşünmek gerekir.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

interface Opt { emoji: string; label: string; correct?: boolean }
interface Round { scene: string; caption: string; ask: string; confirm: string; options: Opt[] }

// Küratörlü sahneler. Her turda 3 seçenek: 1 doğru yorum/çözüm + 2 sahneye
// uygun-ama-yanlış çeldirici. Konuşulan metinlerin TAMAMI SABİT (statik).
const ROUNDS: Round[] = [
  {
    scene: '🧒📚',
    caption: 'Kitap rafta çok yüksekte, çocuk uzanıyor.',
    ask: 'Ona ne lazım?',
    confirm: 'Aferin! Rafa ulaşmak için sandalye lazım.',
    options: [
      { emoji: '🪑', label: 'Sandalye', correct: true },
      { emoji: '🔦', label: 'El feneri' },
      { emoji: '🎈', label: 'Balon' },
    ],
  },
  {
    scene: '🌧️👦',
    caption: 'Yağmur yağıyor, çocuğun şemsiyesi yok.',
    ask: 'Ona ne lazım?',
    confirm: 'Aferin! Yağmurda ıslanmamak için şemsiye lazım.',
    options: [
      { emoji: '☂️', label: 'Şemsiye', correct: true },
      { emoji: '🕶️', label: 'Gözlük' },
      { emoji: '🧢', label: 'Şapka' },
    ],
  },
  {
    scene: '🎨🧒',
    caption: 'Çocuğun elleri boyalı, elinde fırçası var.',
    ask: 'Ne oluyor?',
    confirm: 'Aferin! Fırça ve boyayla resim yapıyor.',
    options: [
      { emoji: '🖼️', label: 'Resim yapıyor', correct: true },
      { emoji: '🍽️', label: 'Yemek yiyor' },
      { emoji: '😴', label: 'Uyuyor' },
    ],
  },
  {
    scene: '🥀🪴',
    caption: 'Saksıdaki çiçek solmuş, toprağı kupkuru.',
    ask: 'Ona ne lazım?',
    confirm: 'Aferin! Solan çiçeğe su lazım.',
    options: [
      { emoji: '💧', label: 'Su', correct: true },
      { emoji: '🍬', label: 'Şeker' },
      { emoji: '🎵', label: 'Müzik' },
    ],
  },
  {
    scene: '😢🚲',
    caption: 'Çocuk bisikletten düştü, dizi acıyor.',
    ask: 'Ona ne lazım?',
    confirm: 'Aferin! Yaralanan dize yara bandı lazım.',
    options: [
      { emoji: '🩹', label: 'Yara bandı', correct: true },
      { emoji: '🍭', label: 'Şeker' },
      { emoji: '🧸', label: 'Oyuncak' },
    ],
  },
  {
    scene: '😴🛏️🌙',
    caption: 'Işıklar kapalı, çocuk yatağında gözleri kapalı.',
    ask: 'Ne oluyor?',
    confirm: 'Aferin! Gece oldu, çocuk uyuyor.',
    options: [
      { emoji: '💤', label: 'Uyuyor', correct: true },
      { emoji: '📖', label: 'Kitap okuyor' },
      { emoji: '🎮', label: 'Oyun oynuyor' },
    ],
  },
  {
    scene: '🍽️😋',
    caption: 'Çocuğun karnı acıktı, tabağı boş.',
    ask: 'Ona ne lazım?',
    confirm: 'Aferin! Karnı acıkan çocuğa yemek lazım.',
    options: [
      { emoji: '🍲', label: 'Yemek', correct: true },
      { emoji: '💧', label: 'Su' },
      { emoji: '🧸', label: 'Oyuncak' },
    ],
  },
  {
    scene: '🪥😁',
    caption: 'Çocuğun elinde diş fırçası, ağzında köpük var.',
    ask: 'Ne oluyor?',
    confirm: 'Aferin! Çocuk dişlerini fırçalıyor.',
    options: [
      { emoji: '🦷', label: 'Diş fırçalıyor', correct: true },
      { emoji: '🍔', label: 'Yemek yiyor' },
      { emoji: '💇', label: 'Saç tarıyor' },
    ],
  },
  {
    scene: '🥶❄️',
    caption: 'Hava çok soğuk, çocuk üşüyor ve titriyor.',
    ask: 'Ona ne lazım?',
    confirm: 'Aferin! Üşüyen çocuğa sıcak bir mont lazım.',
    options: [
      { emoji: '🧥', label: 'Mont', correct: true },
      { emoji: '🩳', label: 'Şort' },
      { emoji: '🍦', label: 'Dondurma' },
    ],
  },
  {
    scene: '🎂🎉',
    caption: 'Pastada mumlar yanıyor, herkes toplanmış.',
    ask: 'Ne oluyor?',
    confirm: 'Aferin! Bu bir doğum günü partisi.',
    options: [
      { emoji: '🥳', label: 'Doğum günü', correct: true },
      { emoji: '🍳', label: 'Yemek pişiriyor' },
      { emoji: '😴', label: 'Uyuyorlar' },
    ],
  },
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

export default function ResimdeNeOluyor({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [current, setCurrent] = useState<Round>(ROUNDS[0]);
  const [options, setOptions] = useState<Opt[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const orderRef = useRef<Round[]>([]);
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
    if (orderRef.current.length === 0) orderRef.current = shuffle(ROUNDS);
    const cur = orderRef.current[(round - 1) % orderRef.current.length];
    setCurrent(cur);
    setOptions(shuffle(cur.options));
    setLocked(false);
    setWrong(null);
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(`${cur.caption} ${cur.ask}`, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('resimde-ne-oluyor', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Türkçe: Görsel Materyalden Anlam Üretme (TAOB.2)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (opt: Opt) => {
    if (locked) return;
    movesRef.current += 1;
    if (opt.correct) {
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
      setWrong(opt.emoji);
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
          message="Resme iyi bak! Ne oluyor ya da ne gerekiyor, doğru olanı seç."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#5E35B1" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔎 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>{current.ask}</Text>
      <Animated.View style={[styles.sceneCard, { transform: [{ scale: bounce }] }]}>
        <Text style={styles.sceneEmoji}>{current.scene}</Text>
        <Text style={styles.sceneText}>{current.caption}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(`${current.caption} ${current.ask}`, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((opt) => {
          const isWrong = wrong === opt.emoji;
          return (
            <Animated.View key={opt.emoji} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(opt)} activeOpacity={0.85}>
                <Text style={styles.optEmoji}>{opt.emoji}</Text>
                <Text style={styles.optLabel}>{opt.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE7F6', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#5E35B1' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#5E35B1', marginTop: 8 },
  sceneCard: { width: '86%', maxWidth: 420, minHeight: 150, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 14, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  sceneEmoji: { fontSize: 64 },
  sceneText: { fontSize: 17, fontWeight: '800', color: '#4A148C', textAlign: 'center', marginTop: 10 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7E57C2', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap', maxWidth: 440, paddingHorizontal: 12 },
  optCard: { width: 108, minHeight: 118, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  optWrong: { backgroundColor: '#FFE0E0' },
  optEmoji: { fontSize: 46 },
  optLabel: { fontSize: 13, fontWeight: '800', color: '#4527A0', textAlign: 'center' },
});
