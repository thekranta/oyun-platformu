import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { ACTIVITIES, BODY_CARDS, HEARTBEAT, REASON_CARDS, ROUND_PLAN, SPOR_KLIPLER as K, type Activity, type Intensity, type Place } from '../constants/sporGunu';
import { asset } from '../lib/assetMap';
import { useRoundGame, type RoundGameEnd } from '../lib/useRoundGame';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';

// ============================================
// 🏃 SPOR GÜNÜ - İç ve dış mekânda fiziksel aktivitelere katılabilme (Hareket ve Sağlık / HSAB.7)
// Çocuk mekânı (iç/dış) ve hareketi seçer, ekranın rehberliğinde 15 sn gerçekten hareket eder ve
// "Yaptım" der. Sonra elini KALBİNE koyar: hareketin yoğunluğuna göre yavaş/hızlı kalp atışı çalar
// (bedensel değişimi dille eşleştirme). 1-2. tur: "bedenin ne dedi?" (puansız). 3-4. tur (60-72 ay):
// neden-sonuç — "Kalbin neden hızlı attı?" (çünkü çok hareket ettim).
// Dürüstlük: ekran hareketi doğrulayamaz; "Yaptım" öz bildirimdir (6 sn dolmadan basılamaz).
// Dış mekânda "yanında bir büyüğün olsun" uyarısı; sağlık bilgisi verilmez.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = ROUND_PLAN.length;
const MOVE_MS = 15000;
const MIN_MOVE_MS = 6000;
const HEART_MS = 3800;

// Hareket temposu: hareket animasyonu ve tık sesi aralığı (ms)
const PACE: Record<Intensity, { bounceMs: number; tickMs: number; tick: 'tik' | 'tik-hizli' }> = {
  hafif: { bounceMs: 900, tickMs: 900, tick: 'tik' },
  orta: { bounceMs: 600, tickMs: 600, tick: 'tik' },
  hizli: { bounceMs: 380, tickMs: 380, tick: 'tik-hizli' },
};
const HEART_BEAT_MS: Record<'kalp-yavas' | 'kalp-hizli', number> = { 'kalp-yavas': 1000, 'kalp-hizli': 460 };

type SfxName = 'tik' | 'tik-hizli' | 'kalp-yavas' | 'kalp-hizli';
type Phase = 'place' | 'activity' | 'move' | 'heart' | 'body' | 'reason';

interface Props {
  onGameEnd: RoundGameEnd;
  onExit?: () => void;
  childName?: string;
}

export default function SporGunu({ onGameEnd, onExit, childName }: Props) {
  const game = useRoundGame({
    oyunAdi: 'spor-gunu',
    totalRounds: TOTAL_ROUNDS,
    kazanimOdagi: 'Hareket ve Sağlık: İç ve Dış Mekânda Fiziksel Aktivitelere Katılabilme (HSAB.7)',
    onGameEnd,
  });
  const { round, gameReady, showConfetti } = game;
  const plan = ROUND_PLAN[Math.min(round - 1, ROUND_PLAN.length - 1)];

  const [phase, setPhase] = useState<Phase>('place');
  const [place, setPlace] = useState<Place | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [canFinish, setCanFinish] = useState(false);
  const [heartBeating, setHeartBeating] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);

  const busyRef = useRef(false);
  const tokenRef = useRef(0);
  const soundsRef = useRef<Partial<Record<SfxName, Audio.Sound>>>({});
  const loadTokenRef = useRef(0);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;

  const stopTicks = () => { if (tickTimerRef.current) { clearInterval(tickTimerRef.current); tickTimerRef.current = null; } };

  useEffect(() => () => {
    tokenRef.current += 1;
    stopTicks();
    stopSpeech();
  }, []);

  // Sesleri bir kez önden yükle
  useEffect(() => {
    const myToken = ++loadTokenRef.current;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
      } catch {
        // ses modu ayarlanamazsa oynatma yine denenir
      }
      const clips: [SfxName, string, number][] = [
        ['tik', '/sounds/sfx/tik.wav', 0.7],
        ['tik-hizli', '/sounds/sfx/tik-hizli.wav', 0.7],
        ['kalp-yavas', '/sounds/sfx/kalp-yavas.wav', 1.0],
        ['kalp-hizli', '/sounds/sfx/kalp-hizli.wav', 1.0],
      ];
      for (const [name, path, volume] of clips) {
        try {
          const { sound } = await Audio.Sound.createAsync(asset(path), { shouldPlay: false, volume });
          if (loadTokenRef.current !== myToken) { await sound.unloadAsync().catch(() => {}); return; }
          soundsRef.current[name] = sound;
        } catch (e) {
          console.warn('🏃 Spor sesi yüklenemedi (sessiz geçildi):', e);
        }
      }
    })();
    return () => {
      loadTokenRef.current += 1;
      const loaded = soundsRef.current;
      soundsRef.current = {};
      (Object.keys(loaded) as SfxName[]).forEach((k) => {
        const s = loaded[k];
        if (s) { s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {}); }
      });
    };
  }, []);

  const play = (name: SfxName) => { soundsRef.current[name]?.replayAsync().catch(() => {}); };
  const bounce = () => {
    pop.setValue(0.88);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
  };
  const shakeIt = () => Animated.sequence([
    Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
    Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
    Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
  ]).start();

  const goActivity = async (p: Place, myToken: number) => {
    setPlace(p);
    if (p === 'dis') {
      await speakThenWait(K.disGuvenlik, 1500, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
    }
    setPhase('activity');
    bounce();
    await speakThenWait(K.hareketSec, 1000, { instructions: HAPPY_VOICE });
    if (tokenRef.current === myToken) busyRef.current = false;
  };

  // Tur başlangıcı
  useEffect(() => {
    if (!gameReady) return;
    const myToken = ++tokenRef.current;
    stopTicks();
    busyRef.current = true;
    setPlace(null);
    setActivity(null);
    setCanFinish(false);
    setHeartBeating(false);
    setWrongId(null);
    progress.setValue(0);
    bounce();
    (async () => {
      if (plan.forcedPlace) {
        setPhase('activity');
        setPlace(plan.forcedPlace);
        await speakThenWait(K.hareketSec, 1000, { instructions: HAPPY_VOICE });
        if (tokenRef.current === myToken) busyRef.current = false;
        return;
      }
      setPhase('place');
      await speakThenWait(K.mekanSor, 1200, { instructions: HAPPY_VOICE });
      if (tokenRef.current === myToken) busyRef.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const handlePlace = (p: Place) => {
    if (phase !== 'place' || busyRef.current) return;
    busyRef.current = true;
    game.markMove();
    goActivity(p, ++tokenRef.current);
  };

  const handleActivity = async (a: Activity) => {
    if (phase !== 'activity' || busyRef.current) return;
    busyRef.current = true;
    game.markMove();
    const myToken = ++tokenRef.current;
    setActivity(a);
    setPhase('move');
    setCanFinish(false);
    await speakThenWait(a.say, 1500, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    speak(K.yaptim, { instructions: HAPPY_VOICE });
    // Hareket animasyonu + tempo tıkı + ilerleme çubuğu
    const pace = PACE[a.intensity];
    bounceAnim.setValue(0);
    Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1, duration: pace.bounceMs / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE }),
      Animated.timing(bounceAnim, { toValue: 0, duration: pace.bounceMs / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE }),
    ])).start();
    stopTicks();
    tickTimerRef.current = setInterval(() => play(pace.tick), pace.tickMs);
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: MOVE_MS, easing: Easing.linear, useNativeDriver: false }).start();
    game.later(() => setCanFinish(true), MIN_MOVE_MS);
    busyRef.current = false;
  };

  const handleDone = async () => {
    if (phase !== 'move' || !canFinish || busyRef.current || !activity) return;
    busyRef.current = true;
    game.markMove();
    const myToken = ++tokenRef.current;
    stopTicks();
    bounceAnim.stopAnimation();
    progress.stopAnimation();
    await speakThenWait(K.harika, 1100, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    setPhase('heart');
    bounce();
    await speakThenWait(K.kalpHazir, 1800, { instructions: HAPPY_VOICE });
    if (tokenRef.current === myToken) busyRef.current = false;
  };

  const handleHeart = async () => {
    if (phase !== 'heart' || busyRef.current || !activity) return;
    busyRef.current = true;
    game.markMove();
    const myToken = ++tokenRef.current;
    const beat = HEARTBEAT[activity.intensity];
    play(beat);
    setHeartBeating(true);
    const period = HEART_BEAT_MS[beat];
    heartAnim.setValue(1);
    Animated.loop(Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1.28, duration: 110, useNativeDriver: USE_NATIVE }),
      Animated.timing(heartAnim, { toValue: 1, duration: 140, useNativeDriver: USE_NATIVE }),
      Animated.delay(Math.max(period - 250, 60)),
    ])).start();
    await new Promise<void>((r) => setTimeout(r, HEART_MS));
    if (tokenRef.current !== myToken) return;
    heartAnim.stopAnimation();
    heartAnim.setValue(1);
    setHeartBeating(false);
    setPhase(plan.reason ? 'reason' : 'body');
    bounce();
    await speakThenWait(plan.reason ? K.nedenSor : K.bedenSor, 1200, { instructions: HAPPY_VOICE });
    if (tokenRef.current === myToken) busyRef.current = false;
  };

  const finishRound = async (myToken: number) => {
    if (round === TOTAL_ROUNDS) {
      await speakThenWait(K.bitis, 1800, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
    }
    game.advance();
  };

  const handleBody = async (card: typeof BODY_CARDS[number]) => {
    if (phase !== 'body' || busyRef.current) return;
    busyRef.current = true;
    game.markMove();
    const myToken = ++tokenRef.current;
    await speakThenWait(card.say, 1200, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    await speakThenWait(K.bedenOk, 1400, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    await finishRound(myToken);
  };

  const handleReason = async (card: typeof REASON_CARDS[number]) => {
    if (phase !== 'reason' || busyRef.current) return;
    busyRef.current = true;
    const myToken = ++tokenRef.current;
    if (!card.correct) {
      game.markWrong();
      setWrongId(card.id);
      shakeIt();
      game.later(() => setWrongId(null), 500);
      await speakThenWait(card.say, 1300, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
      await speakThenWait(K.nedenYanlis, 1500, { instructions: HAPPY_VOICE });
      if (tokenRef.current === myToken) busyRef.current = false;
      return;
    }
    game.markCorrect();
    await speakThenWait(card.say, 1300, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    await speakThenWait(K.nedenOk, 1800, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    await finishRound(myToken);
  };

  const replayPrompt = () => {
    const line = phase === 'place' ? K.mekanSor : phase === 'activity' ? K.hareketSec : phase === 'move' ? (activity?.say ?? K.yaptim)
      : phase === 'heart' ? K.kalpHazir : phase === 'body' ? K.bedenSor : K.nedenSor;
    speak(line, { instructions: HAPPY_VOICE });
  };

  const cardW = Math.min(112, Math.floor((Math.min(SCREEN_W, 440) - 24 - 24) / 3));
  const list = ACTIVITIES.filter((a) => a.place === place);
  const bounceY = bounceAnim.interpolate({ inputRange: [0, 1], outputRange: [0, activity?.intensity === 'hafif' ? -10 : activity?.intensity === 'orta' ? -24 : -34] });
  const barW = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

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
        <View style={styles.roundBadge}><Text style={styles.roundText}>🏃 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.stage, { transform: [{ scale: pop }] }]}>
          {phase === 'move' && activity ? (
            <Animated.Text style={[styles.stageEmoji, { transform: [{ translateY: bounceY }] }]}>{activity.emoji}</Animated.Text>
          ) : phase === 'heart' || phase === 'body' || phase === 'reason' ? (
            <Animated.Text style={[styles.stageEmoji, { transform: [{ scale: heartAnim }] }]}>❤️</Animated.Text>
          ) : (
            <Text style={styles.stageEmoji}>{place === 'dis' ? '🌳' : place === 'ic' ? '🏠' : '⛅'}</Text>
          )}
        </Animated.View>
        <ListenButton onPress={replayPrompt} color="#EF5350" style={{ marginTop: 10 }} />

        {phase === 'place' && (
          <View style={styles.cards}>
            <TouchableOpacity style={[styles.card, { width: cardW + 16 }]} onPress={() => handlePlace('ic')} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="İçeride">
              <Text style={styles.cardEmoji}>🏠</Text>
              <Text style={styles.cardLabel}>içeride</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.card, { width: cardW + 16 }]} onPress={() => handlePlace('dis')} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Dışarıda">
              <Text style={styles.cardEmoji}>🌳</Text>
              <Text style={styles.cardLabel}>dışarıda</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'activity' && (
          <View style={styles.cards}>
            {list.map((a) => (
              <TouchableOpacity key={a.id} style={[styles.card, { width: cardW }]} onPress={() => handleActivity(a)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={a.label}>
                <Text style={styles.cardEmoji}>{a.emoji}</Text>
                <Text style={styles.cardLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {phase === 'move' && (
          <View style={styles.moveBox}>
            <View style={styles.barTrack}><Animated.View style={[styles.barFill, { width: barW }]} /></View>
            <TouchableOpacity
              style={[styles.doneBtn, !canFinish && styles.doneBtnOff]}
              onPress={handleDone}
              disabled={!canFinish}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Yaptım"
              accessibilityState={{ disabled: !canFinish }}
            >
              <Text style={styles.doneText}>✅ Yaptım!</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'heart' && (
          <TouchableOpacity style={[styles.heartBtn, heartBeating && styles.heartBtnOn]} onPress={handleHeart} disabled={heartBeating} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Kalbine dokun">
            <Text style={styles.heartBtnText}>🫶 Kalbine dokun</Text>
          </TouchableOpacity>
        )}

        {phase === 'body' && (
          <View style={styles.cards}>
            {BODY_CARDS.map((c) => (
              <TouchableOpacity key={c.id} style={[styles.card, { width: cardW }]} onPress={() => handleBody(c)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={c.say}>
                <Text style={styles.cardEmoji}>{c.emoji}</Text>
                <Text style={styles.cardLabel}>{c.say.replace(/\.$/, '')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {phase === 'reason' && (
          <View style={styles.cards}>
            {REASON_CARDS.map((c) => {
              const isWrong = wrongId === c.id;
              return (
                <Animated.View key={c.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                  <TouchableOpacity style={[styles.card, { width: cardW }, isWrong && styles.cardWrong]} onPress={() => handleReason(c)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={c.say}>
                    <Text style={styles.cardEmoji}>{c.emoji}</Text>
                    <Text style={styles.cardLabel}>{c.say.replace('Çünkü ', '').replace(/\.$/, '')}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFEBEE', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#C62828' },
  content: { alignItems: 'center', paddingHorizontal: 12, paddingBottom: 28 },

  stage: { minWidth: 210, minHeight: 150, paddingHorizontal: 28, paddingTop: 36, paddingBottom: 14, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  stageEmoji: { fontSize: 72 },

  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 20, maxWidth: 440 },
  card: { minHeight: 112, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 8, borderWidth: 3, borderColor: '#FFCDD2', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 2, elevation: 4 },
  cardWrong: { backgroundColor: '#FFCDD2', borderColor: '#E57373' },
  cardEmoji: { fontSize: 46 },
  cardLabel: { fontSize: 12, fontWeight: '800', color: '#B71C1C', textAlign: 'center', marginTop: 4 },

  moveBox: { alignItems: 'center', marginTop: 24, width: '100%', maxWidth: 380, gap: 22 },
  barTrack: { width: '100%', height: 18, borderRadius: 9, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 2, borderColor: '#FFCDD2' },
  barFill: { height: '100%', backgroundColor: '#EF5350', borderRadius: 9 },
  doneBtn: { backgroundColor: '#43A047', paddingVertical: 16, paddingHorizontal: 44, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  doneBtnOff: { backgroundColor: '#BDBDBD' },
  doneText: { fontSize: 24, fontWeight: '900', color: '#fff' },

  heartBtn: { marginTop: 28, backgroundColor: '#EF5350', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  heartBtnOn: { backgroundColor: '#E57373' },
  heartBtnText: { fontSize: 22, fontWeight: '900', color: '#fff' },
});
