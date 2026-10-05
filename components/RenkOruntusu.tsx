
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import ListenButton from './ListenButton';

// ============================================
// 🎨 RENK ÖRÜNTÜSÜ - Örüntüyü sürdür (Matematik/MAB.3)
// Renk dizisindeki örüntüye bakıp SIRADAKİ rengi seçer. Örüntü becerisi
// (Diziyi Tamamla'nın renk varyasyonu). Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

const PALETTE = [
  { key: 'kirmizi', c: '#FF5A5A' },
  { key: 'mavi', c: '#4FA3FF' },
  { key: 'sari', c: '#FFCE3A' },
  { key: 'yesil', c: '#57D971' },
  { key: 'mor', c: '#B77BFF' },
];
type Col = { key: string; c: string };

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildRound = (round: number) => {
  const colors = shuffle(PALETTE);
  let unit: Col[];
  if (round <= 3) unit = [colors[0], colors[1]];            // AB
  else if (round <= 6) unit = [colors[0], colors[0], colors[1]]; // AAB
  else unit = [colors[0], colors[1], colors[2]];            // ABC
  const showN = unit.length * 2 - 1;
  const shown = Array.from({ length: showN }, (_, i) => unit[i % unit.length]);
  const answer = unit[showN % unit.length];
  const distract = shuffle(PALETTE.filter((p) => p.key !== answer.key)).slice(0, 2);
  const options = shuffle([answer, ...distract]);
  return { shown, answer, options };
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

export default function RenkOruntusu({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [shown, setShown] = useState<Col[]>([]);
  const [answer, setAnswer] = useState<Col>(PALETTE[0]);
  const [options, setOptions] = useState<Col[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  // Doğru bulununca cevap rengi "?" kutusunda görünür (docx #42: çocuk örüntünün devamını
  // görüp algılasın, sonra diğer örüntüye geçilsin).
  const [revealed, setRevealed] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const qBounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); stopSpeech(); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const r = buildRound(round);
    setShown(r.shown);
    setAnswer(r.answer);
    setOptions(r.options);
    setLocked(false);
    setWrongKey(null);
    setRevealed(false);
    qBounce.setValue(0.8);
    Animated.spring(qBounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak('Sırada hangi renk var?', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('renk-oruntusu', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Örüntüyü Kurala Uygun Sürdürme (MAB.3)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (col: Col) => {
    if (locked) return;
    movesRef.current += 1;
    if (col.key === answer.key) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      setRevealed(true);
      qBounce.setValue(0.6);
      Animated.spring(qBounce, { toValue: 1, friction: 4, useNativeDriver: USE_NATIVE }).start();
      // Ses bitse bile cevap en az 3 sn görünür kalır (en son turda konfeti için biraz daha).
      speakThenWait('Doğru! Örüntüyü buldun. Aferin!', round < TOTAL_ROUNDS ? 3000 : 3500, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrongKey(col.key);
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
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Renk sırasına bak! Sırada hangi renk gelmeli? Onu bul."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>🎨 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.contentArea}>
        <Text style={styles.prompt}>Sırada ne var?</Text>

        <ListenButton onPress={() => speak('Sırada hangi renk var?', { instructions: HAPPY_VOICE })} color="#8E24AA" style={{ marginTop: 12, marginBottom: 12 }} />

        {/* Örüntü şeridi — beyaz tepside, "?" ile biter */}
        <View style={styles.patternTray}>
          {shown.map((col, i) => (
            <View key={i} style={[styles.bead, { backgroundColor: col.c }]} />
          ))}
          <Animated.View
            style={[
              styles.qBox,
              revealed && { borderStyle: 'solid', borderColor: '#fff', backgroundColor: answer.c, width: 56, height: 56, borderRadius: 28 },
              { transform: [{ scale: qBounce }] },
            ]}
          >
            {!revealed && <Text style={styles.qMark}>?</Text>}
          </Animated.View>
        </View>

        {/* Seçenekler — beyaz buton karolar */}
        <View style={styles.optionsPanel}>
          {options.map((col) => {
            const isWrong = wrongKey === col.key;
            return (
              <Animated.View key={col.key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                <TouchableOpacity style={[styles.optTile, isWrong && styles.optWrong]} onPress={() => handlePick(col)} activeOpacity={0.85}>
                  <View style={[styles.optBead, { backgroundColor: col.c }]} />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F0FB', alignItems: 'center' },
  // Header sabit en üstte kalsın; geri kalan içerik altındaki boş alanda dikey ortalanır
  // (önceden container'da justifyContent olmadığından hepsi ekranın üstüne yığılıyordu).
  contentArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#6A1B9A' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#6A1B9A', marginTop: 12, marginBottom: 18 },
  // Örüntü şeridi (beyaz tepsi)
  patternTray: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10,
    maxWidth: 440, paddingVertical: 16, paddingHorizontal: 18, backgroundColor: '#fff', borderRadius: 24,
    borderWidth: 2, borderColor: '#E1BEE7', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  bead: { width: 44, height: 44, borderRadius: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 1, elevation: 1 },
  qBox: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, borderColor: '#B39DDB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F0FB' },
  qMark: { fontSize: 26, fontWeight: '900', color: '#8E24AA' },

  // Seçenekler paneli
  optionsPanel: {
    flexDirection: 'row', justifyContent: 'center', gap: 16, backgroundColor: '#EDE7F6', borderRadius: 24,
    borderWidth: 2, borderColor: '#B39DDB', paddingVertical: 16, paddingHorizontal: 20, marginTop: 26,
  },
  optTile: {
    width: 82, height: 82, borderRadius: 41, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#D1C4E9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 2, elevation: 5,
  },
  optBead: { width: 54, height: 54, borderRadius: 27 },
  optWrong: { borderColor: '#EF5350', borderWidth: 4 },
});
