
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import ListenButton from './ListenButton';

// ============================================
// 🍪 EŞİT PAYLAŞTIR - Eşit paylaşım / bölme sezgisi (Matematik, MAB.4)
// 1) PAYLAŞ: Çocuk bir tabağa dokundukça yığından o tabağa birer nesne gider.
//    Yığın bitince iki tabak EŞİT değilse "Eşit olmadı" denir ve baştan paylaştırılır.
// 2) SAY: Eşit paylaşıldıktan sonra "Her tabağa kaç düştü?" sorulur (bölmeye giriş).
// Önceden nesneler hazır duruyor, çocuk sadece bölmeyi kafadan yapıyordu; artık
// paylaşma eylemini kendisi yapıyor (somut → soyut).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
// Toplamlar hep çift (eşit paylaşılabilir); tabak başına en fazla 4 → doğru cevap 1..4.
const TOTAL_BY_ROUND = [2, 4, 4, 6, 6, 8, 6, 8];
const TOTAL_ROUNDS = TOTAL_BY_ROUND.length;
const OBJECTS = ['🍪', '🍎', '🍓', '⭐', '🎈'];
const SHARE_PROMPT = 'Hepsini iki tabağa eşit paylaştır. Tabağa dokun, birer tane ver!';
const COUNT_PROMPT = 'Her tabağa kaç düştü?';
const PLATE_W = Math.min((SCREEN_W - 56) / 2, 160);

const buildOptions = (answer: number): number[] => {
  const set = new Set<number>([answer]);
  let d = 1;
  while (set.size < 3) {
    if (answer - d >= 1) set.add(answer - d);
    if (set.size < 3 && answer + d <= 5) set.add(answer + d);
    d++;
    if (d > 6) break;
  }
  return Array.from(set).sort((a, b) => a - b);
};

type Side = 'left' | 'right';

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function EsitPaylastir({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'share' | 'count'>('share');
  const [pile, setPile] = useState(0);
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const popLeft = useRef(new Animated.Value(1)).current;
  const popRight = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const total = TOTAL_BY_ROUND[round - 1];
  const answer = total / 2;
  const obj = OBJECTS[(round - 1) % OBJECTS.length];

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); stopSpeech(); }, []);

  useEffect(() => {
    if (!gameReady) return;
    setPhase('share');
    setPile(total);
    setLeft(0);
    setRight(0);
    setBusy(false);
    setOptions(buildOptions(total / 2));
    setLocked(false);
    setWrong(null);
    speak(SHARE_PROMPT, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('esit-paylastir', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Eşit Paylaşım / Eşit Gruplara Ayırma (bölmeye giriş) (MAB.4)',
      correct_answers: correctRef.current,
    });
  };

  const bump = (side: Side) => {
    const av = side === 'left' ? popLeft : popRight;
    av.setValue(0.92);
    Animated.spring(av, { toValue: 1, friction: 4, useNativeDriver: USE_NATIVE }).start();
  };

  // AŞAMA 1 — tabağa dokun: yığından o tabağa bir nesne.
  const handlePlate = (side: Side) => {
    if (phase !== 'share' || busy || pile <= 0) return;
    movesRef.current += 1;
    const nl = left + (side === 'left' ? 1 : 0);
    const nr = right + (side === 'right' ? 1 : 0);
    const np = pile - 1;
    setLeft(nl);
    setRight(nr);
    setPile(np);
    bump(side);
    if (np > 0) return;
    if (nl === nr) {
      setPhase('count');
      speak(`Harika, eşit paylaştın! Şimdi say. ${COUNT_PROMPT}`, { instructions: HAPPY_VOICE });
    } else {
      errorsRef.current += 1;
      setBusy(true);
      speakThenWait('Eşit olmadı. Tekrar paylaştıralım!', 1200, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setLeft(0);
        setRight(0);
        setPile(total);
        setBusy(false);
      });
    }
  };

  // AŞAMA 2 — her tabakta kaç tane var?
  const handlePick = (n: number) => {
    if (phase !== 'count' || locked) return;
    movesRef.current += 1;
    if (n === answer) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait(`Doğru! Her tabağa ${answer} düşer. Aferin.`, 1400, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrong(n);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrong(null), 450);
      timersRef.current.push(t);
    }
  };

  const sharing = phase === 'share' && !busy && pile > 0;
  const listenText = phase === 'share' ? SHARE_PROMPT : COUNT_PROMPT;

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Nesneleri iki tabağa eşit paylaştıralım! Tabağa dokun, birer tane ver. Sonra her tabağa kaç düştüğünü say."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>{obj} {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>{phase === 'share' ? 'Eşit paylaştır!' : COUNT_PROMPT}</Text>

      <ListenButton onPress={() => speak(listenText, { instructions: HAPPY_VOICE })} color="#8D6E63" style={{ marginTop: 8, marginBottom: 14 }} />

      {/* Paylaşılacak yığın */}
      <View style={styles.pile}>
        {pile > 0
          ? Array.from({ length: pile }).map((_, i) => <Text key={i} style={styles.obj}>{obj}</Text>)
          : <Text style={styles.pileEmpty}>{phase === 'share' ? '…' : '✓'}</Text>}
      </View>

      {/* İki tabak: dokununca birer nesne gelir */}
      <View style={styles.plates}>
        {(['left', 'right'] as Side[]).map((side) => {
          const n = side === 'left' ? left : right;
          return (
            <Animated.View key={side} style={{ transform: [{ scale: side === 'left' ? popLeft : popRight }] }}>
              <TouchableOpacity
                style={[styles.plate, sharing && styles.plateActive]}
                onPress={() => handlePlate(side)}
                disabled={!sharing}
                activeOpacity={0.85}
              >
                <View style={styles.plateItems}>
                  {Array.from({ length: n }).map((_, i) => <Text key={i} style={styles.plateObj}>{obj}</Text>)}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
      {phase === 'share' && <Text style={styles.hint}>{sharing ? 'Tabağa dokun 👆' : ' '}</Text>}

      {phase === 'count' && (
        <View style={styles.numbers}>
          {options.map((n) => {
            const isWrong = wrong === n;
            return (
              <Animated.View key={n} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                <TouchableOpacity style={[styles.numBtn, isWrong && styles.numWrong]} onPress={() => handlePick(n)} activeOpacity={0.85}>
                  <Text style={styles.numText}>{n}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF6F0', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#6D4C41' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#6D4C41', marginTop: 6, textAlign: 'center', paddingHorizontal: 16 },
  pile: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 22, minHeight: 84, width: '86%', maxWidth: 380, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 5 },
  obj: { fontSize: 34 },
  pileEmpty: { fontSize: 30, fontWeight: '900', color: '#A1887F' },

  plates: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 18 },
  plate: { width: PLATE_W, height: PLATE_W * 0.82, borderRadius: PLATE_W, backgroundColor: '#fff', borderWidth: 6, borderColor: '#D7CCC8', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 4 },
  plateActive: { borderColor: '#8D6E63' },
  plateItems: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 2, width: PLATE_W * 0.7 },
  plateObj: { fontSize: 30 },
  hint: { fontSize: 15, fontWeight: '800', color: '#8D6E63', marginTop: 12, minHeight: 20 },

  numbers: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 18 },
  numBtn: { width: 78, height: 78, borderRadius: 22, backgroundColor: '#8D6E63', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 5 },
  numWrong: { backgroundColor: '#EF9A9A' },
  numText: { fontSize: 38, fontWeight: '900', color: '#fff' },
});
