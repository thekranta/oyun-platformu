import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 🧠 SIRAYI HATIRLA - Çalışma belleği/dikkat (Bilişsel)
// Renkli tuşlar sırayla yanar; çocuk aynı sırayla tekrarlar. Dizi her turda
// uzar. Bellek ve dikkat sürdürülebilirliği. Görsel + ses desteği.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 6;

const PADS = [
  { on: '#FF5A5A', off: '#E39B9B' },
  { on: '#4FA3FF', off: '#A6CBEF' },
  { on: '#57D971', off: '#AEE6BD' },
  { on: '#FFCE3A', off: '#F0E0A0' },
];

const seqLen = (round: number) => Math.min(1 + round, 5); // r1:2 ... r4+:5

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function SirayiHatirla({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'showing' | 'input' | 'done'>('showing');
  const [activePad, setActivePad] = useState<number | null>(null);
  const [wrongPad, setWrongPad] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const seqRef = useRef<number[]>([]);
  const inputRef = useRef(0);
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  const playSequence = (sequence: number[]) => {
    setPhase('showing');
    setActivePad(null);
    inputRef.current = 0;
    const step = 720;
    sequence.forEach((pad, i) => {
      timersRef.current.push(setTimeout(() => setActivePad(pad), i * step + 150));
      timersRef.current.push(setTimeout(() => setActivePad(null), i * step + 150 + 420));
    });
    timersRef.current.push(setTimeout(() => setPhase('input'), sequence.length * step + 300));
  };

  useEffect(() => {
    if (!gameReady) return;
    const len = seqLen(round);
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 4));
    seqRef.current = seq;
    setWrongPad(null);
    speak('İzle ve aynı sırayla tekrarla!', { instructions: HAPPY_VOICE });
    playSequence(seq);
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('sirayi-hatirla', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Bilişsel: Çalışma Belleği ve Dikkat Sürdürülebilirliği (sıra hatırlama)',
      correct_answers: correctRef.current,
    });
  };

  const flashPad = (pad: number) => {
    setActivePad(pad);
    timersRef.current.push(setTimeout(() => setActivePad(null), 220));
  };

  const handlePad = (pad: number) => {
    if (phase !== 'input') return;
    movesRef.current += 1;
    const seq = seqRef.current;
    if (pad === seq[inputRef.current]) {
      flashPad(pad);
      inputRef.current += 1;
      if (inputRef.current >= seq.length) {
        // tur tamam
        setPhase('done');
        correctRef.current += 1;
        const isLast = round >= TOTAL_ROUNDS;
        if (isLast) setShowConfetti(true);
        speak('Harika! Doğru hatırladın.', { instructions: HAPPY_VOICE });
        timersRef.current.push(setTimeout(() => {
          if (isLast) finish();
          else setRound((r) => r + 1);
        }, isLast ? 1500 : 1100));
      }
    } else {
      // yanlış - nazik: diziyi tekrar göster
      errorsRef.current += 1;
      setPhase('done');
      setWrongPad(pad);
      speak('Tekrar izle bakalım.', { instructions: HAPPY_VOICE });
      timersRef.current.push(setTimeout(() => {
        setWrongPad(null);
        playSequence(seqRef.current);
      }, 900));
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Renkli tuşlar sırayla yanacak. İyi izle, sonra aynı sırayla sen dokun!"
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#4527A0" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🧠 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>{phase === 'input' ? 'Şimdi sen tekrarla!' : phase === 'showing' ? 'İyi izle...' : 'Aferin!'}</Text>

      <View style={styles.board}>
        {PADS.map((p, i) => {
          const isActive = activePad === i;
          const isWrong = wrongPad === i;
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.pad,
                { backgroundColor: isActive ? p.on : p.off },
                isActive && styles.padActive,
                isWrong && styles.padWrong,
              ]}
              onPress={() => handlePad(i)}
              activeOpacity={0.9}
              disabled={phase !== 'input'}
            />
          );
        })}
      </View>

      <Text style={styles.hint}>{phase === 'showing' ? 'Sıra yanıyor' : phase === 'input' ? 'Sıra sende' : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F0FB', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#4527A0' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#4527A0', marginTop: 12, marginBottom: 16, textAlign: 'center', paddingHorizontal: 20 },
  board: { width: 280, height: 280, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between' },
  pad: { width: 132, height: 132, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 4 },
  padActive: { transform: [{ scale: 1.06 }], shadowOpacity: 0.35 },
  padWrong: { borderWidth: 4, borderColor: '#D32F2F' },
  hint: { fontSize: 15, fontWeight: '800', color: '#7E57C2', marginTop: 22 },
});
