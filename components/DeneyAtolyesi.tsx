import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { DENEY_KLIPLER as K, EXPERIMENTS, ICE_TEST, type EffectKind, type Material } from '../constants/deneyAtolyesi';
import { useRoundGame, type RoundGameEnd } from '../lib/useRoundGame';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';

// ============================================
// 🔬 DENEY ATÖLYESİ - Merak ettiği konu hakkında deney yapabilme (Fen / FAB.7)
// Tur 1-3 (mıknatıs · ışık · su): merak sorusu → soruya uygun ALETİ seç (ilk turda hazır) →
// raftan 3 malzeme SEÇ → her birini DENE (gerçek sonuç animasyonla gelir) → sonucu DEFTERE yaz.
// Tur 4: adil deney — iki AYNI boyda buz, biri güneşte biri gölgede; hangisi daha çok erimiş?
// Sonuç hep çocuğun yaptığı denemeden çıkar (hedefi gösterip aynısını buldurma yok); malzeme seçimi
// serbest olduğundan her oyunda farklı veri oluşur. Defterde yanlış işaret → deney o satırda tekrar.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const PICK_COUNT = 3;
const TOTAL_ROUNDS = EXPERIMENTS.length + 1;
const ICE_ROUND = TOTAL_ROUNDS;

// Deney sonucu görseli (✔/✖ ile karışmasın diye olay-özel simgeler)
const RESULT_BADGE: Record<EffectKind, { yes: string; no: string }> = {
  magnet: { yes: '🧲', no: '💨' },
  light: { yes: '🌟', no: '🌑' },
  water: { yes: '💦', no: '💧' },
};

type Phase = 'tool' | 'pick' | 'test' | 'record' | 'icePick' | 'icePlace' | 'iceWait' | 'iceAsk';

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** Ekranda gösterilen kısa soru: ilk cümle ("Işık hangi şeylerin içinden geçer?"); "Birlikte deneyelim." gibi devamı düşer. */
const firstSentence = (text: string): string => {
  const m = text.match(/^[^.?!]*[.?!]/);
  return m ? m[0].trim() : text;
};

interface Props {
  onGameEnd: RoundGameEnd;
  onExit?: () => void;
  childName?: string;
}

export default function DeneyAtolyesi({ onGameEnd, onExit, childName }: Props) {
  const game = useRoundGame({
    oyunAdi: 'deney-atolyesi',
    totalRounds: TOTAL_ROUNDS,
    kazanimOdagi: 'Fen: Merak Ettiği Konu Hakkında Deney Yapabilme (FAB.7)',
    onGameEnd,
  });
  const { round, gameReady, showConfetti } = game;
  const isIce = round === ICE_ROUND;
  const exp = EXPERIMENTS[Math.min(round - 1, EXPERIMENTS.length - 1)];

  const [phase, setPhase] = useState<Phase>('tool');
  const [toolEmoji, setToolEmoji] = useState<string | null>(null);
  const [shelf, setShelf] = useState<Material[]>([]);
  const [picked, setPicked] = useState<string[]>([]);          // seçilen malzeme emojileri
  const [tested, setTested] = useState<string[]>([]);          // denenenler
  const [marks, setMarks] = useState<Record<string, boolean>>({}); // deftere yazılanlar
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  // buz turu
  const [iceOrder, setIceOrder] = useState<number[]>([]);       // ICE_TEST.sizes indeks karışımı
  const [icePicked, setIcePicked] = useState<number[]>([]);
  const [iceSun, setIceSun] = useState<number | null>(null);    // güneşe konan buz (boyut indeksi)
  const [iceShade, setIceShade] = useState<number | null>(null);

  const busyRef = useRef(false);
  const tokenRef = useRef(0);
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const sunScale = useRef(new Animated.Value(1)).current;
  const shadeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => () => { tokenRef.current += 1; stopSpeech(); }, []);

  const bounce = () => {
    pop.setValue(0.88);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
  };
  const shakeIt = () => Animated.sequence([
    Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
    Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
    Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
  ]).start();
  const flashWrong = (key: string) => { setWrongKey(key); shakeIt(); game.later(() => setWrongKey(null), 500); };

  // Tur başlangıcı
  useEffect(() => {
    if (!gameReady) return;
    const myToken = ++tokenRef.current;
    busyRef.current = false;
    setPicked([]); setTested([]); setMarks({}); setFlashKey(null); setWrongKey(null);
    setIcePicked([]); setIceSun(null); setIceShade(null);
    sunScale.setValue(1); shadeScale.setValue(1);
    bounce();
    if (round === ICE_ROUND) {
      setIceOrder(shuffle([0, 1, 2]));
      setPhase('icePick');
      (async () => {
        await speakThenWait(ICE_TEST.question, 1200, { instructions: HAPPY_VOICE });
        if (tokenRef.current !== myToken) return;
        speak(K.ice.adil, { instructions: HAPPY_VOICE });
      })();
      return;
    }
    const e = EXPERIMENTS[round - 1];
    setShelf(shuffle([...e.materials]));
    const firstRound = round === 1;
    setToolEmoji(firstRound ? e.tools.find((t) => t.correct)!.emoji : null);
    setPhase(firstRound ? 'pick' : 'tool');
    (async () => {
      await speakThenWait(e.question, 1200, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
      speak(firstRound ? K.malzemeSec : K.aletSec, { instructions: HAPPY_VOICE });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  // ---- Alet seçimi ----
  const handleTool = (t: { emoji: string; correct?: true }) => {
    if (phase !== 'tool' || busyRef.current) return;
    if (!t.correct) {
      game.markWrong();
      flashWrong('tool-' + t.emoji);
      // 'Soruya tekrar bak' diyorduk ama soru ne ekranda ne seste kalıyordu (kullanıcı notu 2026-10-25): soru yeniden okunur.
      const myToken = ++tokenRef.current;
      (async () => {
        await speakThenWait(K.aletYanlis, 1300, { instructions: HAPPY_VOICE });
        if (tokenRef.current !== myToken) return;
        speak(exp.question, { instructions: HAPPY_VOICE });
      })();
      return;
    }
    game.markMove();
    setToolEmoji(t.emoji);
    setPhase('pick');
    bounce();
    speak(K.malzemeSec, { instructions: HAPPY_VOICE });
  };

  // ---- Malzeme seçimi ----
  const handlePick = async (m: Material) => {
    if (phase !== 'pick' || busyRef.current) return;
    if (picked.includes(m.emoji)) { setPicked((p) => p.filter((x) => x !== m.emoji)); return; }
    speak(m.say, { instructions: HAPPY_VOICE });
    const next = [...picked, m.emoji];
    setPicked(next);
    game.markMove();
    if (next.length === PICK_COUNT) {
      busyRef.current = true;
      const myToken = ++tokenRef.current;
      await new Promise<void>((r) => setTimeout(r, 1500));
      if (tokenRef.current !== myToken) return;
      setPhase('test');
      bounce();
      await speakThenWait(K.dene, 1000, { instructions: HAPPY_VOICE });
      if (tokenRef.current === myToken) busyRef.current = false;
    }
  };

  // ---- Deneme ----
  const handleTest = async (m: Material) => {
    if (phase !== 'test' || busyRef.current || tested.includes(m.emoji)) return;
    busyRef.current = true;
    game.markMove();
    const myToken = ++tokenRef.current;
    const next = [...tested, m.emoji];
    setTested(next);
    setFlashKey('test-' + m.emoji);
    bounce();
    await speakThenWait(m.yes ? exp.yesSay : exp.noSay, 1300, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    setFlashKey(null);
    if (next.length === PICK_COUNT) {
      setPhase('record');
      bounce();
      speak(K.defter, { instructions: HAPPY_VOICE });
    }
    busyRef.current = false;
  };

  // ---- Deftere yazma ----
  const handleMark = async (m: Material, value: boolean) => {
    if (phase !== 'record' || busyRef.current || marks[m.emoji] !== undefined) return;
    if (value !== m.yes) {
      game.markWrong();
      flashWrong('mark-' + m.emoji);
      busyRef.current = true;
      const myToken = ++tokenRef.current;
      setFlashKey('test-' + m.emoji);
      await speakThenWait(K.defterYanlis, 1500, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
      await speakThenWait(m.yes ? exp.yesSay : exp.noSay, 1100, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
      setFlashKey(null);
      busyRef.current = false;
      return;
    }
    game.markMove();
    const next = { ...marks, [m.emoji]: value };
    setMarks(next);
    if (Object.keys(next).length === PICK_COUNT) {
      busyRef.current = true;
      game.markCorrect();
      const myToken = ++tokenRef.current;
      await speakThenWait(K.defterDogru, 1100, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
      await speakThenWait(K.deneyBitti, 1500, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
      game.advance();
    }
  };

  // ---- Buz turu ----
  const handleIcePick = async (sizeIdx: number) => {
    if (phase !== 'icePick' || busyRef.current || icePicked.includes(sizeIdx)) return;
    const next = [...icePicked, sizeIdx];
    setIcePicked(next);
    if (next.length < 2) return;
    busyRef.current = true;
    const myToken = ++tokenRef.current;
    if (ICE_TEST.sizes[next[0]] !== ICE_TEST.sizes[next[1]]) {
      game.markWrong();
      flashWrong('ice-' + next[1]);
      await speakThenWait(K.ice.boyutYanlis, 1500, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
      setIcePicked([]);
      busyRef.current = false;
      return;
    }
    game.markMove();
    await new Promise<void>((r) => setTimeout(r, 500));
    if (tokenRef.current !== myToken) return;
    setPhase('icePlace');
    bounce();
    await speakThenWait(K.ice.yerlestir, 1200, { instructions: HAPPY_VOICE });
    if (tokenRef.current === myToken) busyRef.current = false;
  };

  const handleIcePlace = async (sizeIdx: number) => {
    if (phase !== 'icePlace' || busyRef.current) return;
    busyRef.current = true;
    game.markMove();
    const myToken = ++tokenRef.current;
    const other = icePicked.find((i) => i !== sizeIdx) ?? icePicked[0];
    setIceSun(sizeIdx);
    setIceShade(other);
    setPhase('iceWait');
    await speakThenWait(K.ice.bekle, 900, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    Animated.parallel([
      Animated.timing(sunScale, { toValue: 0.3, duration: 2600, useNativeDriver: USE_NATIVE }),
      Animated.timing(shadeScale, { toValue: 0.82, duration: 2600, useNativeDriver: USE_NATIVE }),
    ]).start();
    await new Promise<void>((r) => setTimeout(r, 3000));
    if (tokenRef.current !== myToken) return;
    setPhase('iceAsk');
    await speakThenWait(K.ice.sor, 1200, { instructions: HAPPY_VOICE });
    if (tokenRef.current === myToken) busyRef.current = false;
  };

  const handleIceAnswer = async (sun: boolean) => {
    if (phase !== 'iceAsk' || busyRef.current) return;
    if (!sun) {
      game.markWrong();
      flashWrong('iceans-shade');
      speak(K.ice.yanlis, { instructions: HAPPY_VOICE });
      return;
    }
    busyRef.current = true;
    game.markCorrect();
    const myToken = ++tokenRef.current;
    await speakThenWait(K.ice.dogru, 1600, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    await speakThenWait(K.kapanis, 1300, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    game.advance();
  };

  const replayPrompt = () => {
    if (isIce) {
      const line = phase === 'icePick' ? K.ice.adil : phase === 'icePlace' ? K.ice.yerlestir : phase === 'iceAsk' ? K.ice.sor : ICE_TEST.question;
      speak(line, { instructions: HAPPY_VOICE });
      return;
    }
    if (phase === 'tool') {
      // Çocuk soruyu unutmuş olabilir: önce soru, sonra komut (eskiden yalnız 'Soruya uygun aleti seç.' okunuyordu).
      const myToken = ++tokenRef.current;
      (async () => {
        await speakThenWait(exp.question, 1200, { instructions: HAPPY_VOICE });
        if (tokenRef.current !== myToken) return;
        speak(K.aletSec, { instructions: HAPPY_VOICE });
      })();
      return;
    }
    const line = phase === 'pick' ? K.malzemeSec : phase === 'test' ? K.dene : K.defter;
    speak(line, { instructions: HAPPY_VOICE });
  };

  const questionLine = firstSentence(isIce ? ICE_TEST.question : exp.question);
  const cardW = Math.min(112, Math.floor((Math.min(SCREEN_W, 440) - 24 - 24) / 3));
  const chosen = shelf.filter((m) => picked.includes(m.emoji));
  const badge = (m: Material) => (m.yes ? RESULT_BADGE[exp.effect].yes : RESULT_BADGE[exp.effect].no);
  const iceSize = (idx: number) => ICE_TEST.sizes[idx];

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message={K.giris}
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => game.setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔬 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.stage, { transform: [{ scale: pop }] }]}>
          {isIce ? (
            <Text style={styles.stageEmoji}>{iceSun === null ? '🧊' : '☀️  🌳'}</Text>
          ) : (
            <View style={styles.toolRow}>
              <Text style={styles.stageEmoji}>{toolEmoji ?? '❓'}</Text>
            </View>
          )}
        </Animated.View>
        {/* Soru ekranda kalır: alet seçerken ve deneyde çocuk neyi denediğini hatırlasın */}
        <Text style={styles.questionText}>{questionLine}</Text>
        <ListenButton onPress={replayPrompt} color="#00897B" style={{ marginTop: 10 }} />

        {/* ---- Alet seçimi ---- */}
        {phase === 'tool' && (
          <View style={styles.cards}>
            {exp.tools.map((t) => {
              const isWrong = wrongKey === 'tool-' + t.emoji;
              return (
                <Animated.View key={t.emoji} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                  <TouchableOpacity
                    style={[styles.card, { width: cardW }, isWrong && styles.cardWrong]}
                    onPress={() => handleTool(t)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={t.label}
                  >
                    <Text style={styles.cardEmoji}>{t.emoji}</Text>
                    <Text style={styles.cardLabel}>{t.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* ---- Malzeme rafı ---- */}
        {phase === 'pick' && (
          <View style={styles.cards}>
            {shelf.map((m) => {
              const on = picked.includes(m.emoji);
              return (
                <TouchableOpacity
                  key={m.emoji}
                  style={[styles.card, { width: cardW }, on && styles.cardOn]}
                  onPress={() => handlePick(m)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={m.label}
                >
                  <Text style={styles.cardEmoji}>{m.emoji}</Text>
                  <Text style={styles.cardLabel}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ---- Deneme ---- */}
        {phase === 'test' && (
          <View style={styles.cards}>
            {chosen.map((m) => {
              const done = tested.includes(m.emoji);
              return (
                <TouchableOpacity
                  key={m.emoji}
                  style={[styles.card, { width: cardW }, done && styles.cardDone]}
                  onPress={() => handleTest(m)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={m.label}
                >
                  <Text style={styles.cardEmoji}>{m.emoji}</Text>
                  <Text style={styles.badge}>{done ? badge(m) : '❔'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ---- Deney defteri ---- */}
        {phase === 'record' && (
          <View style={styles.notebook}>
            <Text style={styles.notebookTitle}>📓</Text>
            {chosen.map((m) => {
              const mark = marks[m.emoji];
              const isWrong = wrongKey === 'mark-' + m.emoji;
              return (
                <Animated.View key={m.emoji} style={[styles.row, flashKey === 'test-' + m.emoji && styles.rowFlash, isWrong && { transform: [{ translateX: shake }] }]}>
                  <Text style={styles.rowEmoji}>{m.emoji}</Text>
                  <Text style={styles.rowBadge}>{badge(m)}</Text>
                  <View style={styles.markBtns}>
                    <TouchableOpacity
                      style={[styles.markBtn, mark === true && styles.markBtnYes]}
                      onPress={() => handleMark(m, true)}
                      disabled={mark !== undefined}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.label}: ${exp.yesSay}`}
                    >
                      <Text style={styles.markText}>✔</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.markBtn, mark === false && styles.markBtnNo]}
                      onPress={() => handleMark(m, false)}
                      disabled={mark !== undefined}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.label}: ${exp.noSay}`}
                    >
                      <Text style={styles.markText}>✖</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* ---- Buz deneyi ---- */}
        {phase === 'icePick' && (
          <View style={styles.cards}>
            {iceOrder.map((idx) => {
              const on = icePicked.includes(idx);
              const isWrong = wrongKey === 'ice-' + idx;
              return (
                <Animated.View key={idx} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                  <TouchableOpacity
                    style={[styles.card, { width: cardW }, on && styles.cardOn, isWrong && styles.cardWrong]}
                    onPress={() => handleIcePick(idx)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Buz"
                  >
                    <Text style={[styles.cardEmoji, { fontSize: 50 * iceSize(idx) }]}>🧊</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}

        {phase === 'icePlace' && (
          <View style={styles.cards}>
            {icePicked.map((idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.card, { width: cardW + 10 }]}
                onPress={() => handleIcePlace(idx)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Buzu güneşe koy"
              >
                <Text style={[styles.cardEmoji, { fontSize: 56 * iceSize(idx) }]}>🧊</Text>
                <Text style={styles.sunLabel}>☀️</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(phase === 'iceWait' || phase === 'iceAsk') && iceSun !== null && iceShade !== null && (
          <View style={styles.iceStage}>
            <TouchableOpacity
              style={[styles.iceBox, { backgroundColor: '#FFF3C4' }]}
              onPress={() => handleIceAnswer(true)}
              disabled={phase !== 'iceAsk'}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Güneşteki buz"
            >
              <Text style={styles.iceSky}>☀️</Text>
              <Animated.Text style={[styles.iceCube, { transform: [{ scale: sunScale }] }]}>🧊</Animated.Text>
            </TouchableOpacity>
            <Animated.View style={wrongKey === 'iceans-shade' ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.iceBox, { backgroundColor: '#DCEFD8' }, wrongKey === 'iceans-shade' && styles.cardWrong]}
                onPress={() => handleIceAnswer(false)}
                disabled={phase !== 'iceAsk'}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Gölgedeki buz"
              >
                <Text style={styles.iceSky}>🌳</Text>
                <Animated.Text style={[styles.iceCube, { transform: [{ scale: shadeScale }] }]}>🧊</Animated.Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#2E7D32' },
  content: { alignItems: 'center', paddingHorizontal: 12, paddingBottom: 28 },

  stage: { minWidth: 200, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageEmoji: { fontSize: 64 },
  questionText: { marginTop: 10, fontSize: 17, fontWeight: '800', color: '#00695C', textAlign: 'center', maxWidth: 320, paddingHorizontal: 12 },

  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 20, maxWidth: 440 },
  card: { minHeight: 112, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 8, borderWidth: 3, borderColor: '#C8E6C9', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 2, elevation: 4 },
  cardOn: { borderColor: '#43A047', backgroundColor: '#F1F8E9' },
  cardDone: { borderColor: '#26A69A', backgroundColor: '#E0F2F1' },
  cardWrong: { backgroundColor: '#FFCDD2', borderColor: '#E57373' },
  cardEmoji: { fontSize: 50 },
  cardLabel: { fontSize: 12, fontWeight: '800', color: '#1B5E20', textAlign: 'center', marginTop: 4 },
  badge: { fontSize: 30, marginTop: 4 },
  sunLabel: { fontSize: 28, marginTop: 4 },

  notebook: { marginTop: 18, width: '100%', maxWidth: 400, backgroundColor: '#FFFDE7', borderRadius: 22, padding: 14, borderWidth: 3, borderColor: '#FFE082', gap: 10 },
  notebookTitle: { fontSize: 26, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 2, borderColor: '#FFF176' },
  rowFlash: { borderColor: '#43A047', backgroundColor: '#F1F8E9' },
  rowEmoji: { fontSize: 38 },
  rowBadge: { fontSize: 28, flex: 1 },
  markBtns: { flexDirection: 'row', gap: 10 },
  markBtn: { width: 58, height: 52, borderRadius: 14, backgroundColor: '#ECEFF1', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#B0BEC5' },
  markBtnYes: { backgroundColor: '#C8E6C9', borderColor: '#43A047' },
  markBtnNo: { backgroundColor: '#CFD8DC', borderColor: '#607D8B' },
  markText: { fontSize: 26, fontWeight: '900', color: '#37474F' },

  iceStage: { flexDirection: 'row', gap: 14, marginTop: 22 },
  iceBox: { width: 150, height: 170, borderRadius: 24, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 3, elevation: 4 },
  iceSky: { fontSize: 38 },
  iceCube: { fontSize: 70 },
});
