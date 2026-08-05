import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🫧 SAKİNLEŞME BAHÇESİ - Öz düzenleme / sakinleşme stratejisi (Sosyal-Duygusal, TADB.2)
// Bir karakter BÜYÜK bir duygu yaşar (kızgın, korkmuş, üzgün, hayal kırıklığı, heyecan);
// çocuk sakinleşten yolu (derin nefes / beşe kadar say / sarıl / yardım iste) seçer.
// Doğruda karakter sakinleşir (surat değişir: 😤→🙂) + kutlama. Yanlışta nazik yönlendirme
// (ceza yok), tekrar dener. Tüm seslendirmeler SABİT metindir (hazır MP3 için).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const MOTHER_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm, gentle and encouraging.';

interface Opt { emoji: string; label: string; calming: boolean }
interface Scenario {
  emotion: string;   // duygunun adı (görsel etiket) — duygusal okuryazarlık
  face: string;      // büyük duygu suratı (😤 vb.)
  calm: string;      // sakinleşince dönüşeceği surat (🙂 vb.)
  scene: string;     // bağlam emojisi (görsel, seslendirilmez)
  text: string;      // durum metni (seslendirilir)
  options: Opt[];    // 3 seçenek — tam olarak biri sakinleştirici
  confirm: string;   // doğru seçimde SABİT onay/pekiştirme metni
}

const SCENARIOS: Scenario[] = [
  {
    emotion: 'Kızgın', face: '😤', calm: '🙂', scene: '🧱',
    text: 'Kulem yıkıldı, çok kızgınım!',
    options: [
      { emoji: '🫧', label: 'Derin nefes al', calming: true },
      { emoji: '😡', label: 'Bağır', calming: false },
      { emoji: '👊', label: 'Vur', calming: false },
    ],
    confirm: 'Aferin! Kızınca derin nefes almak seni sakinleştirir.',
  },
  {
    emotion: 'Kızgın', face: '😠', calm: '🙂', scene: '🧸',
    text: 'Oyuncağımı kaptılar, çok sinirlendim!',
    options: [
      { emoji: '✋', label: 'Beşe kadar say', calming: true },
      { emoji: '🗣️', label: 'Bağır', calming: false },
      { emoji: '🦵', label: 'Tekme at', calming: false },
    ],
    confirm: 'Harika! Sinirlenince beşe kadar saymak rahatlatır.',
  },
  {
    emotion: 'Korkmuş', face: '😨', calm: '🙂', scene: '⛈️',
    text: 'Gök gürledi, korktum!',
    options: [
      { emoji: '🧸', label: 'Oyuncağına sarıl', calming: true },
      { emoji: '🏃', label: 'Kaç', calming: false },
      { emoji: '😱', label: 'Çığlık at', calming: false },
    ],
    confirm: 'Aferin! Korkunca sevdiğine sarılmak güven verir.',
  },
  {
    emotion: 'Korkmuş', face: '😰', calm: '🙂', scene: '🌙',
    text: 'Oda çok karanlık, korkuyorum.',
    options: [
      { emoji: '🙋', label: 'Yardım iste', calming: true },
      { emoji: '🙈', label: 'Saklan', calming: false },
      { emoji: '😭', label: 'Bağırarak ağla', calming: false },
    ],
    confirm: 'Harika! Korkunca büyüğünden yardım istemek en iyisidir.',
  },
  {
    emotion: 'Üzgün', face: '😢', calm: '🙂', scene: '💭',
    text: 'Annemi özledim, çok üzgünüm.',
    options: [
      { emoji: '🧸', label: 'Oyuncağına sarıl', calming: true },
      { emoji: '😒', label: 'Somurt', calming: false },
      { emoji: '🚪', label: 'Odaya kaç', calming: false },
    ],
    confirm: 'Aferin! Üzülünce sevdiğin oyuncağa sarılmak iç açar.',
  },
  {
    emotion: 'Üzgün', face: '😔', calm: '🙂', scene: '🧍',
    text: 'Kimse benimle oynamıyor, üzgünüm.',
    options: [
      { emoji: '🙋', label: 'Öğretmenine söyle', calming: true },
      { emoji: '😾', label: 'Somurt', calming: false },
      { emoji: '😢', label: 'Köşede ağla', calming: false },
    ],
    confirm: 'Harika! Üzülünce ne hissettiğini söylemek rahatlatır.',
  },
  {
    emotion: 'Hayal kırıklığı', face: '😞', calm: '🙂', scene: '🌧️',
    text: 'Yağmur yağdı, parka gidemedik.',
    options: [
      { emoji: '✋', label: 'Beşe kadar say', calming: true },
      { emoji: '😡', label: 'Bağır', calming: false },
      { emoji: '🦶', label: 'Tepin', calming: false },
    ],
    confirm: 'Aferin! Hayal kırıklığında beşe kadar saymak sakinleştirir.',
  },
  {
    emotion: 'Heyecanlı', face: '🤩', calm: '😊', scene: '🎂',
    text: 'Doğum günüm! Heyecandan yerimde duramıyorum.',
    options: [
      { emoji: '🫧', label: 'Derin nefes al', calming: true },
      { emoji: '🏃', label: 'Koştur dur', calming: false },
      { emoji: '📣', label: 'Bağır çağır', calming: false },
    ],
    confirm: 'Aferin! Çok heyecanlanınca derin nefes almak sakinleştirir.',
  },
];

// Yanlış seçimde tek, SABİT nazik yönlendirme (ceza yok, tekrar dener).
const REDIRECT = 'Bu seni sakinleştirir mi? Sakinleşmek için bir daha bak.';

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

export default function SakinlesmeBahcesi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);
  const [options, setOptions] = useState<Opt[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [calmed, setCalmed] = useState(false);       // doğruda surat sakinleşir (😤→🙂)
  const [picked, setPicked] = useState<string | null>(null); // seçilen sakinleştirici kartı
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const orderRef = useRef<Scenario[]>([]);
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const facePop = useRef(new Animated.Value(1)).current; // surat değişince küçük ödül animasyonu

  const TOTAL_ROUNDS = 8;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    if (orderRef.current.length === 0) orderRef.current = shuffle(SCENARIOS);
    const sc = orderRef.current[(round - 1) % orderRef.current.length];
    setScenario(sc);
    setOptions(shuffle(sc.options));
    setLocked(false);
    setWrong(null);
    setCalmed(false);
    setPicked(null);
    facePop.setValue(1);
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(`${sc.text} Ne yapmalı?`, { instructions: MOTHER_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('sakinlesme-bahcesi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal-Duygusal: Öz Düzenleme — Sakinleşme Stratejisi (TADB.2)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (opt: Opt) => {
    if (locked) return;
    movesRef.current += 1;
    if (opt.calming) {
      setLocked(true);
      correctRef.current += 1;
      setPicked(opt.emoji);
      // Karakter sakinleşir: surat 😤→🙂 + küçük ödül "pop" animasyonu
      setCalmed(true);
      facePop.setValue(0.6);
      Animated.spring(facePop, { toValue: 1, friction: 4, tension: 90, useNativeDriver: USE_NATIVE }).start();
      setShowConfetti(true);
      speakThenWait(scenario.confirm, 1600, { instructions: MOTHER_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrong(opt.emoji);
      speak(REDIRECT, { instructions: MOTHER_VOICE });
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => { if (isMountedRef.current) setWrong(null); }, 550);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={120} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Büyük duygular olur! Sakinleşmek için doğru yolu seç."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#00796B" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🫧 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Sakinleşmek için ne yapmalı?</Text>

      <Animated.View style={[styles.sceneCard, calmed && styles.sceneCardCalm, { transform: [{ scale: bounce }] }]}>
        <Animated.Text style={[styles.faceEmoji, { transform: [{ scale: facePop }] }]}>
          {calmed ? scenario.calm : scenario.face}
        </Animated.Text>
        <View style={[styles.emotionPill, calmed && styles.emotionPillCalm]}>
          <Text style={[styles.emotionText, calmed && styles.emotionTextCalm]}>
            {calmed ? 'Sakinleştim! 😌' : scenario.emotion}
          </Text>
        </View>
        <Text style={styles.sceneText}>{scenario.scene}  {scenario.text}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(`${scenario.text} Ne yapmalı?`, { instructions: MOTHER_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((opt) => {
          const isWrong = wrong === opt.emoji;
          const isPicked = picked === opt.emoji;
          return (
            <Animated.View key={opt.emoji} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.optCard, isWrong && styles.optWrong, isPicked && styles.optCalm]}
                onPress={() => handlePick(opt)}
                activeOpacity={0.85}
                disabled={locked}
              >
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
  container: { flex: 1, backgroundColor: '#E0F2F1', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#00796B' },

  prompt: { fontSize: 19, fontWeight: '800', color: '#00796B', marginTop: 8, textAlign: 'center', paddingHorizontal: 16 },
  sceneCard: { width: '86%', maxWidth: 420, minHeight: 168, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 14, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  sceneCardCalm: { backgroundColor: '#E8F5E9' },
  faceEmoji: { fontSize: 72 },
  sceneText: { fontSize: 17, fontWeight: '800', color: '#26463F', textAlign: 'center', marginTop: 10 },

  emotionPill: { backgroundColor: '#B2DFDB', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, marginTop: 8 },
  emotionPillCalm: { backgroundColor: '#C8E6C9' },
  emotionText: { fontSize: 14, fontWeight: '900', color: '#00695C' },
  emotionTextCalm: { color: '#2E7D32' },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#26A69A', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 18, paddingHorizontal: 10 },
  optCard: { width: 106, height: 116, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  optWrong: { backgroundColor: '#FFE0E0' },
  optCalm: { backgroundColor: '#C8E6C9', borderWidth: 3, borderColor: '#43A047' },
  optEmoji: { fontSize: 44 },
  optLabel: { fontSize: 12.5, fontWeight: '800', color: '#26463F', textAlign: 'center' },
});
