import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 💛 DUYGU YÜZLERİ - Duygu tanıma (Sosyal-Duygusal / SAB)
// Bir DURUM gösterilir (ör. 🎂 doğum günü); çocuk o durumda nasıl
// hissedildiğini yüzlerden bulur. Gerçek duygu tanıma; ses gelmese de
// sahne görseliyle anlaşılır (basit emoji eşleştirme DEĞİL).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const MOTHER_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm, gentle and encouraging.';
const TOTAL_ROUNDS = 8;

interface Emotion { key: string; emoji: string; name: string; color: string }
interface Situation { scene: string; text: string; emotion: string }

const EMOTIONS: Record<string, Emotion> = {
  mutlu: { key: 'mutlu', emoji: '😊', name: 'Mutlu', color: '#FFC93C' },
  uzgun: { key: 'uzgun', emoji: '😢', name: 'Üzgün', color: '#4FACFE' },
  kizgin: { key: 'kizgin', emoji: '😠', name: 'Kızgın', color: '#FF6B6B' },
  korkmus: { key: 'korkmus', emoji: '😨', name: 'Korkmuş', color: '#9B7BFF' },
  saskin: { key: 'saskin', emoji: '😲', name: 'Şaşkın', color: '#4ECDC4' },
  sevgi: { key: 'sevgi', emoji: '🥰', name: 'Sevgi Dolu', color: '#FF6AA9' },
  uykulu: { key: 'uykulu', emoji: '😴', name: 'Uykulu', color: '#90A4AE' },
};
const EMOTION_LIST = Object.values(EMOTIONS);

const SITUATIONS: Situation[] = [
  { scene: '🎂🎉', text: 'Doğum günü partisi var!', emotion: 'mutlu' },
  { scene: '🍦😋', text: 'Kocaman bir dondurma yiyor!', emotion: 'mutlu' },
  { scene: '🎈🎠', text: 'Lunaparka gitti!', emotion: 'mutlu' },
  { scene: '🧸💔', text: 'Sevdiği oyuncağı kırıldı.', emotion: 'uzgun' },
  { scene: '🍦⬇️', text: 'Dondurması yere düştü.', emotion: 'uzgun' },
  { scene: '👻🌑', text: 'Karanlıkta bir hayalet gördü!', emotion: 'korkmus' },
  { scene: '🐝😧', text: 'Bir arı peşine takıldı!', emotion: 'korkmus' },
  { scene: '⛈️😰', text: 'Gök gürledi, şimşek çaktı!', emotion: 'korkmus' },
  { scene: '🎁✨', text: 'Bir sürpriz hediye çıktı!', emotion: 'saskin' },
  { scene: '😾🧸', text: 'Biri oyuncağını izinsiz aldı.', emotion: 'kizgin' },
  { scene: '🤗❤️', text: 'Annesi ona sımsıkı sarıldı.', emotion: 'sevgi' },
  { scene: '🐶💕', text: 'Sevimli köpeğini kucakladı.', emotion: 'sevgi' },
  { scene: '🛏️🌙', text: 'Gece oldu, yatma vakti geldi.', emotion: 'uykulu' },
  { scene: '🥱😴', text: 'Çok yoruldu, gözleri kapanıyor.', emotion: 'uykulu' },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const optionCount = (round: number) => (round <= 2 ? 2 : round <= 5 ? 3 : 4);

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

export default function DuyguYuzleri({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [situation, setSituation] = useState<Situation>(SITUATIONS[0]);
  const [options, setOptions] = useState<Emotion[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const prevSceneRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const sceneBounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
  }, []);

  // Her tur: bir durum + secenek yuzleri uret, durumu seslendir
  useEffect(() => {
    if (!gameReady) return;
    const pool = SITUATIONS.filter((s) => s.scene !== prevSceneRef.current);
    const sit = pool[Math.floor(Math.random() * pool.length)];
    prevSceneRef.current = sit.scene;

    const correct = EMOTIONS[sit.emotion];
    const n = optionCount(round);
    const distractors = shuffle(EMOTION_LIST.filter((e) => e.key !== correct.key)).slice(0, n - 1);
    const opts = shuffle([correct, ...distractors]);

    setSituation(sit);
    setOptions(opts);
    setLocked(false);
    setWrongKey(null);

    sceneBounce.setValue(0.85);
    Animated.spring(sceneBounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();

    speak(`${sit.text} Sence nasıl hissediyor?`, { instructions: MOTHER_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('duygu-yuzleri', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal-Duygusal Gelişim: Duyguları Tanıma (SAB)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (emo: Emotion) => {
    if (locked) return;
    movesRef.current += 1;

    if (emo.key === situation.emotion) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speak(`Aferin! ${emo.name} hissediyor.`, { instructions: MOTHER_VOICE });
      const t = setTimeout(() => {
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      }, 1500);
      timersRef.current.push(t);
    } else {
      // Nazik geri bildirim: sallanma, ceza/kırmızı çarpı yok
      errorsRef.current += 1;
      setWrongKey(emo.key);
      Animated.sequence([
        Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongKey(null), 500);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}

      {!gameReady && (
        <CountdownOverlay
          message="Bir olay göstereceğim. Çocuk nasıl hissediyor, doğru yüzü bul!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#7A2B6E" />
        </TouchableOpacity>
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>💛 {round}/{TOTAL_ROUNDS}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Durum / sahne */}
      <Text style={styles.prompt}>Nasıl hissediyor?</Text>
      <Animated.View style={[styles.sceneCard, { transform: [{ scale: sceneBounce }] }]}>
        <Text style={styles.sceneEmoji}>{situation.scene}</Text>
        <Text style={styles.sceneText}>{situation.text}</Text>
      </Animated.View>

      <TouchableOpacity
        style={styles.listenBtn}
        onPress={() => speak(`${situation.text} Sence nasıl hissediyor?`, { instructions: MOTHER_VOICE })}
        activeOpacity={0.85}
      >
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      {/* Seçenek yüzleri */}
      <View style={styles.options}>
        {options.map((emo) => {
          const isWrong = wrongKey === emo.key;
          return (
            <Animated.View key={emo.key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: emo.color }, isWrong && styles.optionWrong]}
                onPress={() => handlePick(emo)}
                activeOpacity={0.85}
              >
                <Text style={styles.optionEmoji}>{emo.emoji}</Text>
                <Text style={styles.optionName}>{emo.name}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF6FB', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#7A2B6E' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#7A2B6E', marginTop: 8 },
  sceneCard: { width: '86%', maxWidth: 420, minHeight: 150, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 16, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  sceneEmoji: { fontSize: 68 },
  sceneText: { fontSize: 18, fontWeight: '800', color: '#5A3A66', textAlign: 'center', marginTop: 8 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF6AA9', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 22, maxWidth: 480, paddingHorizontal: 12 },
  optionCard: { width: 118, height: 128, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 6 },
  optionWrong: { opacity: 0.85 },
  optionEmoji: { fontSize: 56 },
  optionName: { fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.18)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
});
