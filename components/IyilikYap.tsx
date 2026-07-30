import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 💛 İYİLİK YAP - Nazik/yardımsever davranış seçimi (Sosyal-Duygusal)
// Bir durum gösterilir; çocuk nazik/yardımsever davranışı seçer. Empati ve
// olumlu değerler. Doğruda kutlama; yanlışta nazik yönlendirme (ceza yok).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const MOTHER_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm, gentle and encouraging.';

interface Scenario { scene: string; text: string; good: string; goodLabel: string; bad: string; badLabel: string }

const SCENARIOS: Scenario[] = [
  { scene: '😢🧸', text: 'Arkadaşın üzgün.', good: '🤗', goodLabel: 'Sarıl', bad: '🚶', badLabel: 'Uzaklaş' },
  { scene: '🧃', text: 'Arkadaşının içeceği yok.', good: '🤝', goodLabel: 'Paylaş', bad: '🙈', badLabel: 'Aldırma' },
  { scene: '🧹', text: 'Sınıf dağınık.', good: '🧺', goodLabel: 'Toplamaya yardım et', bad: '🤷', badLabel: 'Boşver' },
  { scene: '👵🛍️', text: 'Ninenin poşetleri ağır.', good: '💪', goodLabel: 'Taşımaya yardım et', bad: '🏃', badLabel: 'Kaç' },
  { scene: '😭', text: 'Kardeşin dizini incitti.', good: '🩹', goodLabel: 'Yardım et', bad: '😂', badLabel: 'Gül' },
  { scene: '🎂', text: 'Arkadaşının doğum günü.', good: '🎉', goodLabel: 'Sevindir', bad: '😒', badLabel: 'Umursama' },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface Opt { emoji: string; label: string; good: boolean }

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function IyilikYap({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);
  const [options, setOptions] = useState<Opt[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const orderRef = useRef<Scenario[]>([]);
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const TOTAL_ROUNDS = SCENARIOS.length;

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    if (orderRef.current.length === 0) orderRef.current = shuffle(SCENARIOS);
    const sc = orderRef.current[(round - 1) % orderRef.current.length];
    setScenario(sc);
    setOptions(shuffle([
      { emoji: sc.good, label: sc.goodLabel, good: true },
      { emoji: sc.bad, label: sc.badLabel, good: false },
    ]));
    setLocked(false);
    setWrong(null);
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(`${sc.text} Sence ne yapmalı?`, { instructions: MOTHER_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('iyilik-yap', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal-Duygusal: Empati ve Yardımsever/Nazik Davranış Seçimi (TADB.2)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (opt: Opt) => {
    if (locked) return;
    movesRef.current += 1;
    if (opt.good) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speak(`${opt.label}! Ne kadar naziksin.`, { instructions: MOTHER_VOICE });
      const t = setTimeout(() => {
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      }, 1600);
      timersRef.current.push(t);
    } else {
      errorsRef.current += 1;
      setWrong(opt.emoji);
      speak('Arkadaşımıza nasıl iyilik yaparız? Bir daha bakalım.', { instructions: MOTHER_VOICE });
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrong(null), 550);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={120} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Bir durum göstereceğim. En nazik, yardımsever davranışı sen seç!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#C2185B" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>💛 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Ne yapmalı?</Text>
      <Animated.View style={[styles.sceneCard, { transform: [{ scale: bounce }] }]}>
        <Text style={styles.sceneEmoji}>{scenario.scene}</Text>
        <Text style={styles.sceneText}>{scenario.text}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(`${scenario.text} Sence ne yapmalı?`, { instructions: MOTHER_VOICE })} activeOpacity={0.85}>
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
  container: { flex: 1, backgroundColor: '#FFF0F5', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#C2185B' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#C2185B', marginTop: 8 },
  sceneCard: { width: '86%', maxWidth: 420, minHeight: 140, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 14, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  sceneEmoji: { fontSize: 62 },
  sceneText: { fontSize: 18, fontWeight: '800', color: '#5A3A66', textAlign: 'center', marginTop: 8 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EC407A', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 20 },
  optCard: { width: 140, height: 128, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  optWrong: { backgroundColor: '#FFE0E0' },
  optEmoji: { fontSize: 56 },
  optLabel: { fontSize: 14, fontWeight: '800', color: '#5A3A66', textAlign: 'center' },
});
