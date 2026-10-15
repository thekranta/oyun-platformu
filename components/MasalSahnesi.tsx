import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { MASAL_GENEL_KLIPLER as G, TALES, type SlotKind, type SlotOption } from '../constants/masalSahnesi';
import { useRoundGame, type RoundGameEnd } from '../lib/useRoundGame';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';

// ============================================
// 🎭 MASAL SAHNESİ - Dinlediği materyali çözümleme + anlam oluşturma (Türkçe / TADB.3, TADB.2)
// Masalın kapağına bakıp TAHMİN eder (puanlanmaz → TADB.2), masalı DİNLER, sonra masalın
// sahnesini KİM / NEREDE / NE ZAMAN / NE OLDU yuvalarına doğru resmi seçerek KURAR (TADB.3).
// Masal ekranda yazılı/gösterili değildir: cevap yalnız dinlenen metinde. Yanlış seçimde
// ilgili masal cümlesi yeniden çalınır (ceza yok); 2 yanlıştan sonra doğru seçenek parlar.
// Çeldiriciler masalda hiç geçmeyen öğelerdir (constants/masalSahnesi.test.ts korur).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = TALES.length;
const SENTENCE_GAP_MS = 350;
const HINT_AFTER_WRONG = 2;

const SLOT_ICON: Record<SlotKind, string> = { kim: '🧒', nerede: '📍', zaman: '🕐', olay: '⭐' };
const MOOD_BG = { gunduz: '#BBDEFB', gece: '#283593', aksam: '#FFCC80' } as const;
const DEFAULT_STAGE_BG = '#E1F5FE';

type Phase = 'predict' | 'listen' | 'build' | 'check';

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

interface Props {
  onGameEnd: RoundGameEnd;
  onExit?: () => void;
  childName?: string;
}

export default function MasalSahnesi({ onGameEnd, onExit, childName }: Props) {
  const game = useRoundGame({
    oyunAdi: 'masal-sahnesi',
    totalRounds: TOTAL_ROUNDS,
    kazanimOdagi: 'Türkçe: Dinleme — Materyali Çözümleme ve Anlam Oluşturma (TADB.3, TADB.2)',
    onGameEnd,
  });
  const { round, gameReady, showConfetti } = game;
  const tale = TALES[Math.min(round - 1, TALES.length - 1)];

  const [phase, setPhase] = useState<Phase>('predict');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [slotIdx, setSlotIdx] = useState(0);
  const [filled, setFilled] = useState<Partial<Record<SlotKind, SlotOption>>>({});
  const [options, setOptions] = useState<SlotOption[]>([]);
  const [wrongEmoji, setWrongEmoji] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [listening, setListening] = useState(false);

  const tokenRef = useRef(0);
  const busyRef = useRef(false);
  const wrongCountRef = useRef(0);
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => () => { tokenRef.current += 1; stopSpeech(); }, []);

  const bounce = () => {
    pop.setValue(0.88);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
  };

  // Masalı cümle cümle okur; iptal edilirse (token değişirse) false döner.
  const tellTale = async (myToken: number): Promise<boolean> => {
    setListening(true);
    for (const sentence of tale.sentences) {
      if (tokenRef.current !== myToken) return false;
      await speak(sentence, { instructions: HAPPY_VOICE });
      await new Promise<void>((r) => setTimeout(r, SENTENCE_GAP_MS));
    }
    setListening(false);
    return tokenRef.current === myToken;
  };

  const askSlot = (idx: number) => {
    const slot = tale.slots[idx];
    setSlotIdx(idx);
    setOptions(shuffle([...slot.options]));
    setWrongEmoji(null);
    setHint(false);
    wrongCountRef.current = 0;
    bounce();
    speak(G.soru[slot.kind], { instructions: HAPPY_VOICE });
  };

  // Tur başlangıcı: kapaktan tahmin
  useEffect(() => {
    if (!gameReady) return;
    tokenRef.current += 1;
    setPhase('predict');
    setPrediction(null);
    setFilled({});
    setSlotIdx(0);
    setOptions([]);
    setWrongEmoji(null);
    setHint(false);
    setListening(false);
    busyRef.current = false;
    bounce();
    speak(G.tahmin, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const handlePredict = async (i: number) => {
    if (phase !== 'predict' || busyRef.current) return;
    busyRef.current = true;
    setPrediction(i);
    const myToken = ++tokenRef.current;
    await new Promise<void>((r) => setTimeout(r, 600));
    if (tokenRef.current !== myToken) return;
    setPhase('listen');
    await speakThenWait(G.dinle, 700, { instructions: HAPPY_VOICE });
    if (!(await tellTale(myToken))) return;
    setPhase('build');
    await speakThenWait(G.sahneKur, 900, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    busyRef.current = false;
    askSlot(0);
  };

  // Sahne kurulurken masalı baştan dinlet.
  const replayTale = async () => {
    if (phase === 'predict' || listening) return;
    const myToken = ++tokenRef.current;
    busyRef.current = true;
    const back = phase;
    setPhase('listen');
    if (await tellTale(myToken)) {
      setPhase(back);
      busyRef.current = false;
      if (back === 'build') speak(G.soru[tale.slots[slotIdx].kind], { instructions: HAPPY_VOICE });
    }
  };

  const handleOption = async (opt: SlotOption) => {
    if (phase !== 'build' || busyRef.current) return;
    const slot = tale.slots[slotIdx];
    if (!opt.correct) {
      game.markWrong();
      wrongCountRef.current += 1;
      setWrongEmoji(opt.emoji);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      game.later(() => setWrongEmoji(null), 500);
      if (wrongCountRef.current >= HINT_AFTER_WRONG) setHint(true);
      busyRef.current = true;
      const myToken = ++tokenRef.current;
      await speakThenWait(G.yanlis, 1200, { instructions: HAPPY_VOICE });
      if (tokenRef.current === myToken) await speak(tale.sentences[slot.sentenceIdx], { instructions: HAPPY_VOICE });
      if (tokenRef.current === myToken) busyRef.current = false;
      return;
    }

    game.markMove();
    busyRef.current = true;
    const myToken = ++tokenRef.current;
    setFilled((f) => ({ ...f, [slot.kind]: opt }));
    bounce();
    await speakThenWait(G.dogru, 900, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    if (slotIdx + 1 < tale.slots.length) {
      busyRef.current = false;
      askSlot(slotIdx + 1);
    } else {
      setPhase('check');
      await speakThenWait(G.bitis, 1500, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
      speak(G.tahminKontrol, { instructions: HAPPY_VOICE });
      busyRef.current = false;
    }
  };

  const handleCheck = async () => {
    if (phase !== 'check' || busyRef.current) return;
    busyRef.current = true;
    game.markCorrect();
    const myToken = ++tokenRef.current;
    await speakThenWait(G.tahminCevap, 1500, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    game.advance();
  };

  const stageBg = filled.zaman && tale.mood ? MOOD_BG[tale.mood] : DEFAULT_STAGE_BG;
  const dark = filled.zaman && tale.mood === 'gece';
  const replayPrompt = () => {
    if (phase === 'predict') speak(G.tahmin, { instructions: HAPPY_VOICE });
    else if (phase === 'build') speak(G.soru[tale.slots[slotIdx].kind], { instructions: HAPPY_VOICE });
    else if (phase === 'check') speak(G.tahminKontrol, { instructions: HAPPY_VOICE });
  };
  const cardW = Math.min(112, Math.floor((Math.min(SCREEN_W, 440) - 24 - 24) / 3));

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message={G.giris}
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => game.setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>🎭 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.stage, { backgroundColor: stageBg, transform: [{ scale: pop }] }]}>
          {phase === 'build' || phase === 'check' ? (
            <View style={styles.slotRow}>
              {tale.slots.map((s, i) => {
                const f = filled[s.kind];
                const current = phase === 'build' && i === slotIdx;
                return (
                  <View key={s.kind} style={[styles.slotChip, current && styles.slotChipCurrent, !!f && styles.slotChipFilled]}>
                    <Text style={styles.slotIcon}>{f ? f.emoji : SLOT_ICON[s.kind]}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.cover}>{tale.cover}</Text>
          )}
          {phase === 'listen' && (
            <Text style={[styles.listenEmoji, dark && styles.onDark]}>👂</Text>
          )}
        </Animated.View>

        {phase !== 'listen' && (
          <ListenButton onPress={replayPrompt} color="#5E35B1" style={{ marginTop: 10 }} />
        )}
        {phase === 'build' && (
          <TouchableOpacity style={styles.retell} onPress={replayTale} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Masalı baştan dinle">
            <Text style={styles.retellText}>🔁 Masalı baştan dinle</Text>
          </TouchableOpacity>
        )}

        {phase === 'predict' && (
          <View style={styles.cards}>
            {tale.predictions.map((p, i) => (
              <TouchableOpacity
                key={p.emoji + i}
                style={[styles.card, { width: cardW }, prediction === i && styles.cardPicked]}
                onPress={() => handlePredict(i)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={p.label}
              >
                <Text style={styles.cardEmoji}>{p.emoji}</Text>
                <Text style={styles.cardLabel}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {phase === 'build' && (
          <View style={styles.cards}>
            {options.map((o) => {
              const isWrong = wrongEmoji === o.emoji;
              const isHint = hint && !!o.correct;
              return (
                <Animated.View key={o.emoji} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                  <TouchableOpacity
                    style={[styles.card, { width: cardW }, isWrong && styles.cardWrong, isHint && styles.cardHint]}
                    onPress={() => handleOption(o)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={o.label}
                  >
                    <Text style={styles.cardEmoji}>{o.emoji}</Text>
                    <Text style={styles.cardLabel}>{o.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}

        {phase === 'check' && (
          <View style={styles.cards}>
            <TouchableOpacity style={[styles.card, { width: cardW + 10 }]} onPress={handleCheck} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Tuttu">
              <Text style={styles.cardEmoji}>👍</Text>
              <Text style={styles.cardLabel}>Tuttu</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.card, { width: cardW + 10 }]} onPress={handleCheck} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Şaşırdım">
              <Text style={styles.cardEmoji}>😮</Text>
              <Text style={styles.cardLabel}>Şaşırdım</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE7F6', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#4527A0' },
  content: { alignItems: 'center', paddingHorizontal: 12, paddingBottom: 28 },

  stage: { minWidth: 250, minHeight: 170, paddingHorizontal: 24, paddingVertical: 18, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 6 },
  cover: { fontSize: 74 },
  listenEmoji: { fontSize: 40, marginTop: 6 },
  onDark: { color: '#fff' },
  slotRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  slotChip: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.65)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  slotChipCurrent: { borderColor: '#7E57C2', backgroundColor: '#fff' },
  slotChipFilled: { borderStyle: 'solid', borderColor: '#7E57C2', backgroundColor: '#fff' },
  slotIcon: { fontSize: 34 },

  retell: { marginTop: 10, backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, borderWidth: 2, borderColor: '#B39DDB' },
  retellText: { fontSize: 14, fontWeight: '800', color: '#4527A0' },

  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 20, maxWidth: 440 },
  card: { minHeight: 118, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 8, borderWidth: 3, borderColor: '#D1C4E9', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 2, elevation: 4 },
  cardPicked: { borderColor: '#7E57C2', backgroundColor: '#F3E5F5' },
  cardWrong: { backgroundColor: '#FFCDD2', borderColor: '#E57373' },
  cardHint: { borderColor: '#43A047', backgroundColor: '#E8F5E9', shadowOpacity: 0.4, shadowRadius: 8 },
  cardEmoji: { fontSize: 50 },
  cardLabel: { fontSize: 12, fontWeight: '800', color: '#4527A0', textAlign: 'center', marginTop: 4 },
});
