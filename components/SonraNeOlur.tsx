import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🔮 SONRA NE OLUR? - Bilimsel tahmin / neden-sonuç (Fen, FAB.4)
// Bir "neden" gösterilir (güneşteki buz, sulanan tohum, kaydıraktaki top);
// çocuk 3 sonuç arasından NE OLACAĞINI tahmin eder. Doğru tahminde kısa
// iki-kare (önce->sonra) animasyon gerçek sonucu gösterip tahmini doğrular
// (yerleşik hata kontrolü). Kopyalanacak özdeş öge yok; neden->sonuç akıl
// yürütmesi gerekir. NON-adaptif.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

interface Outcome { emoji: string; label: string }
interface Round {
  id: string;
  scene: string;        // ekran altı kısa başlık (seslendirilmez)
  cause: string[];      // uyaran kartındaki sahne emojileri
  subject: string;      // değişen nesne (sonuç animasyonunda "önce" karesi)
  setup: string;        // seslendirilen kurulum (statik)
  correct: Outcome;
  wrong: [Outcome, Outcome];
  confirm: string;      // seslendirilen doğrulama (statik)
}

// Her tur: net, tek, yaşa uygun fiziksel bir sonuç (erime, büyüme, düşme,
// yüzme/batma, donma, kuruma... -> burada erime, büyüme, düşme, batma, yüzme,
// donma, hava olayı ve ısıyla patlama).
const ROUNDS: Round[] = [
  {
    id: 'buz-erir',
    scene: 'Güneşteki buz',
    cause: ['🧊', '☀️'],
    subject: '🧊',
    setup: 'Buz güneşin altında. Sonra ne olur?',
    correct: { emoji: '💧', label: 'Su olur' },
    wrong: [{ emoji: '❄️', label: 'Kar olur' }, { emoji: '🌸', label: 'Çiçek olur' }],
    confirm: 'Doğru! Buz güneşte erir, suya döner. Aferin.',
  },
  {
    id: 'tohum-buyur',
    scene: 'Sulanan tohum',
    cause: ['🌱', '💧'],
    subject: '🌱',
    setup: 'Tohumu suladık, güneş de var. Sonra ne olur?',
    correct: { emoji: '🌸', label: 'Çiçek olur' },
    wrong: [{ emoji: '🍂', label: 'Kurur' }, { emoji: '🦋', label: 'Kelebek olur' }],
    confirm: 'Doğru! Tohum su ve güneşle büyür, çiçek açar. Aferin.',
  },
  {
    id: 'top-iner',
    scene: 'Kaydıraktaki top',
    cause: ['⚽', '🛝'],
    subject: '⚽',
    setup: 'Top kaydırağın tepesinde. Sonra ne olur?',
    correct: { emoji: '⬇️', label: 'Aşağı yuvarlanır' },
    wrong: [{ emoji: '⬆️', label: 'Yukarı çıkar' }, { emoji: '🎈', label: 'Uçup gider' }],
    confirm: 'Doğru! Top eğimden aşağı yuvarlanır. Aferin.',
  },
  {
    id: 'tas-batar',
    scene: 'Suya atılan taş',
    cause: ['🪨', '🌊'],
    subject: '🪨',
    setup: 'Taşı suya attık. Sonra ne olur?',
    correct: { emoji: '⬇️', label: 'Dibe batar' },
    wrong: [{ emoji: '🛟', label: 'Suda yüzer' }, { emoji: '💧', label: 'Erir' }],
    confirm: 'Doğru! Taş ağırdır, suda dibe batar. Aferin.',
  },
  {
    id: 'yaprak-yuzer',
    scene: 'Sudaki yaprak',
    cause: ['🍃', '🌊'],
    subject: '🍃',
    setup: 'Yaprağı suyun üstüne koyduk. Sonra ne olur?',
    correct: { emoji: '🛟', label: 'Suda yüzer' },
    wrong: [{ emoji: '⬇️', label: 'Dibe batar' }, { emoji: '💨', label: 'Uçup gider' }],
    confirm: 'Doğru! Yaprak hafiftir, suda yüzer. Aferin.',
  },
  {
    id: 'su-donar',
    scene: 'Buzluktaki su',
    cause: ['💧', '❄️'],
    subject: '💧',
    setup: 'Suyu buzluğa koyduk. Sonra ne olur?',
    correct: { emoji: '🧊', label: 'Buz olur' },
    wrong: [{ emoji: '💨', label: 'Buhar olur' }, { emoji: '🫧', label: 'Kaynar' }],
    confirm: 'Doğru! Su soğukta donar, buz olur. Aferin.',
  },
  {
    id: 'bulut-yagmur',
    scene: 'Kara bulutlar',
    cause: ['☁️', '⚡'],
    subject: '☁️',
    setup: 'Gökyüzünde kara bulutlar var. Sonra ne olur?',
    correct: { emoji: '🌧️', label: 'Yağmur yağar' },
    wrong: [{ emoji: '☀️', label: 'Güneş açar' }, { emoji: '🌈', label: 'Gökkuşağı olur' }],
    confirm: 'Doğru! Kara bulutlardan yağmur yağar. Aferin.',
  },
  {
    id: 'misir-patlar',
    scene: 'Tavadaki mısır',
    cause: ['🌽', '🔥'],
    subject: '🌽',
    setup: 'Mısırlar sıcak tavada. Sonra ne olur?',
    correct: { emoji: '🍿', label: 'Patlamış mısır olur' },
    wrong: [{ emoji: '🍞', label: 'Ekmek olur' }, { emoji: '🥔', label: 'Patates olur' }],
    confirm: 'Doğru! Mısır sıcakta patlar, patlamış mısır olur. Aferin.',
  },
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

export default function SonraNeOlur({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [order] = useState<Round[]>(() => shuffle(ROUNDS)); // 8 turun tamamı, rastgele sıra
  const [current, setCurrent] = useState<Round>(order[0]);
  const [options, setOptions] = useState<Outcome[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrongOpt, setWrongOpt] = useState<Outcome | null>(null);
  const [showResult, setShowResult] = useState(false);
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
  const outcomePop = useRef(new Animated.Value(0)).current; // 0 -> 1: sonuç emojisi belirir (2. kare)

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const r = order[round - 1];
    setCurrent(r);
    setOptions(shuffle<Outcome>([r.correct, ...r.wrong]));
    setLocked(false);
    setWrongOpt(null);
    setShowResult(false);
    outcomePop.setValue(0);
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(r.setup, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('sonra-ne-olur', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Fen: Bilimsel Veriye Dayalı Tahmin — Neden-Sonuç (FAB.4)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (opt: Outcome) => {
    if (locked) return;
    movesRef.current += 1;
    if (opt === current.correct) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      // 2-kare sonuç animasyonu: özne (önce) -> sonuç emojisi (sonra) belirir
      setShowResult(true);
      outcomePop.setValue(0);
      Animated.spring(outcomePop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: USE_NATIVE }).start();
      speakThenWait(current.confirm, 1600, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrongOpt(opt);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => { if (isMountedRef.current) setWrongOpt(null); }, 450);
      timersRef.current.push(t);
    }
  };

  const beforeOpacity = outcomePop.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4], extrapolate: 'clamp' });
  const afterOpacity = outcomePop.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const afterScale = outcomePop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Ne olacak, tahmin et! Nedenine bak, sonucunu seç."
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
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔮 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Sonra ne olur? 🤔</Text>

      <Animated.View style={[styles.stageCard, { transform: [{ scale: bounce }] }]}>
        {showResult ? (
          <View style={styles.resultRow}>
            <Animated.Text style={[styles.stageEmoji, { opacity: beforeOpacity }]}>{current.subject}</Animated.Text>
            <Text style={styles.resultArrow}>➡️</Text>
            <Animated.Text style={[styles.stageEmoji, { opacity: afterOpacity, transform: [{ scale: afterScale }] }]}>
              {current.correct.emoji}
            </Animated.Text>
          </View>
        ) : (
          <View style={styles.causeRow}>
            {current.cause.map((e, i) => <Text key={i} style={styles.stageEmoji}>{e}</Text>)}
          </View>
        )}
      </Animated.View>
      <Text style={styles.scene}>{current.scene}</Text>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(current.setup, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((opt, i) => {
          const isWrong = wrongOpt === opt;
          return (
            <Animated.View key={`${opt.emoji}-${i}`} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(opt)} activeOpacity={0.85} disabled={locked}>
                <Text style={styles.optEmoji}>{opt.emoji}</Text>
                <Text style={styles.optName}>{opt.label}</Text>
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

  prompt: { fontSize: 21, fontWeight: '900', color: '#4527A0', marginTop: 8 },

  stageCard: { minWidth: 200, height: 140, paddingHorizontal: 18, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  causeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  stageEmoji: { fontSize: 74 },
  resultArrow: { fontSize: 34, marginHorizontal: 2 },
  scene: { fontSize: 15, fontWeight: '700', color: '#7E57C2', marginTop: 10, fontStyle: 'italic' },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7E57C2', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 20, flexWrap: 'wrap', maxWidth: 440, paddingHorizontal: 12 },
  optCard: { width: 116, height: 124, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  optWrong: { backgroundColor: '#FFE0E0' },
  optEmoji: { fontSize: 50 },
  optName: { fontSize: 13, fontWeight: '800', color: '#4527A0', textAlign: 'center' },
});
