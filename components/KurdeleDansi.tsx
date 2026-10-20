import { Audio } from 'expo-av';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, { Line } from 'react-native-svg';
import {
  DANCE_MOVES, DANCE_MOVE_MS, DANCE_PICK_COUNT, GHOST, KURDELE_KLIPLER as K, LOOP_GAP_MS, MOTIFS, PAIRS, windowMsFor,
  type DanceMove, type MotifKey,
} from '../constants/kurdeleDansi';
import { asset } from '../lib/assetMap';
import { ghostPoint, judge, summarize, type Sample, type Summary } from '../lib/kurdeleTelemetry';
import { useRoundGame, type RoundGameEnd } from '../lib/useRoundGame';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';

// ============================================
// 🎀 KURDELE DANSI - Müziğin özelliklerini hareketle ifade (Müzik / MHB.1) + müzikle hareket örüntüsü (HSAB.3)
// Tur 1-4: çocuk parmağıyla kurdeleyi sürükleyerek çalan müziğe eşlik eder. Her turda aynı ezginin iki hâli
// çalınır (yavaş/hızlı · kısık/yüksek · kalın/ince · çıkan/inen); özellik ekranda ASLA gösterilmez.
// Çocuğun iki hareketi KARŞILAŞTIRILIR (kendi hareketi referans → cihaz/çocuk farkından bağımsız,
// lib/kurdeleTelemetry.ts). Yanlışta ceza yok: "bir daha dinleyelim"; 2 denemeden sonra soluk kurdele
// rehberlik eder ve oyun geçer. Tur 5 "Kendi Dansım": 3 hareket kartı sırala, dansçı sergilesin.
// Dürüstlük: parmak hareketi gerçek beden dansı değil, müzikogram (parmakla ritim çizgisi) düzeyidir.
// ============================================

const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const DANCE_ROUND = PAIRS.length + 1;
const TOTAL_ROUNDS = DANCE_ROUND;
const MAX_ATTEMPTS = 2;           // bu kadar başarısız denemeden sonra rehberli (soluk kurdele) kip
const TRAIL_MS = 800;             // kurdele izinin ekranda kalma süresi
const TICK_MS = 40;
const RIBBON_COLORS = ['#EC407A', '#FF7043', '#FFCA28', '#66BB6A', '#29B6F6', '#7E57C2'];

type Phase = 'prep' | 'dance' | 'result' | 'compose' | 'show';
interface Pt { x: number; y: number; t: number }

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface Props {
  onGameEnd: RoundGameEnd;
  onExit?: () => void;
  childName?: string;
}

export default function KurdeleDansi({ onGameEnd, onExit, childName }: Props) {
  const game = useRoundGame({
    oyunAdi: 'kurdele-dansi',
    totalRounds: TOTAL_ROUNDS,
    kazanimOdagi: 'Müzik: Müziğin Temel Özelliklerini Hareketle İfade Etme (MHB.1) · Müzikle Hareket Örüntüsü (HSAB.3)',
    onGameEnd,
  });
  const { round, gameReady, showConfetti } = game;
  const isDanceRound = round === DANCE_ROUND;

  const { width: winW, height: winH } = useWindowDimensions();
  const padW = Math.min(winW - 24, 420);
  const padH = Math.round(Math.min(Math.max(winH * 0.4, 230), 340));

  const [phase, setPhase] = useState<Phase>('prep');
  const [step, setStep] = useState(0);
  const [trail, setTrail] = useState<Pt[]>([]);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [moves, setMoves] = useState<DanceMove['id'][]>([]);
  const [showIdx, setShowIdx] = useState(-1);

  const padSizeRef = useRef({ w: padW, h: padH });
  const ptsRef = useRef<Pt[]>([]);
  const recRef = useRef<{ active: boolean; t0: number; samples: Sample[] }>({ active: false, t0: 0, samples: [] });
  const ghostRef = useRef<{ key: MotifKey; t0: number; windowMs: number } | null>(null);
  const tokenRef = useRef(0);
  const busyRef = useRef(false);
  const attemptRef = useRef(0);
  const soundsRef = useRef<Partial<Record<MotifKey, Audio.Sound>>>({});
  const loadTokenRef = useRef(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const dScale = useRef(new Animated.Value(1)).current;
  const dY = useRef(new Animated.Value(0)).current;
  const dRot = useRef(new Animated.Value(0)).current;
  const dTilt = useRef(new Animated.Value(0)).current;

  useEffect(() => { padSizeRef.current = { w: padW, h: padH }; }, [padW, padH]);

  useEffect(() => () => { tokenRef.current += 1; stopSpeech(); }, []);

  // Motif seslerini bir kez önden yükle
  useEffect(() => {
    const myToken = ++loadTokenRef.current;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
      } catch {
        // ses modu ayarlanamazsa oynatma yine denenir
      }
      for (const key of Object.keys(MOTIFS) as MotifKey[]) {
        try {
          const { sound } = await Audio.Sound.createAsync(asset(MOTIFS[key].path), { shouldPlay: false, volume: 1.0 });
          if (loadTokenRef.current !== myToken) { await sound.unloadAsync().catch(() => {}); return; }
          soundsRef.current[key] = sound;
        } catch (e) {
          console.warn('🎀 Motif yüklenemedi (sessiz geçildi):', e);
        }
      }
    })();
    return () => {
      loadTokenRef.current += 1;
      const loaded = soundsRef.current;
      soundsRef.current = {};
      (Object.keys(loaded) as MotifKey[]).forEach((k) => {
        const s = loaded[k];
        if (s) { s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {}); }
      });
    };
  }, []);

  const playMotif = (key: MotifKey) => { soundsRef.current[key]?.replayAsync().catch(() => {}); };

  // ---- Parmak girişi (kurdele izi + ölçüm penceresi) ----
  const addPoint = (x: number, y: number) => {
    const now = Date.now();
    ptsRef.current.push({ x, y, t: now });
    const rec = recRef.current;
    if (rec.active) {
      const { w, h } = padSizeRef.current;
      rec.samples.push({ x: x / w, y: y / h, t: now - rec.t0 });
    }
  };
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderMove: (e) => addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderRelease: (e) => addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY),
  }), []);

  // İz çizimi + soluk kurdele (rehber) güncellemesi
  useEffect(() => {
    if (!gameReady) return;
    const id = setInterval(() => {
      const now = Date.now();
      const pts = ptsRef.current;
      while (pts.length && now - pts[0].t > TRAIL_MS) pts.shift();
      setTrail((prev) => (pts.length === 0 && prev.length === 0 ? prev : pts.slice()));
      const g = ghostRef.current;
      if (g) {
        const p = ghostPoint(GHOST[g.key], Math.min(now - g.t0, g.windowMs), g.windowMs);
        const { w, h } = padSizeRef.current;
        setGhost({ x: p.x * w, y: p.y * h });
      } else {
        setGhost((prev) => (prev ? null : prev));
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameReady]);

  // Müzik açıkken nota simgesi nabız gibi atar
  useEffect(() => {
    if (phase !== 'dance' && phase !== 'show') { pulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.25, duration: 320, useNativeDriver: USE_NATIVE }),
      Animated.timing(pulse, { toValue: 1, duration: 320, useNativeDriver: USE_NATIVE }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  const bounce = () => {
    pop.setValue(0.9);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
  };

  // Bir motifi dans penceresi boyunca (tekrarlarıyla) çalar
  const scheduleMotif = (key: MotifKey, myToken: number) => {
    const m = MOTIFS[key];
    for (let i = 0; i < m.loops; i++) {
      game.later(() => { if (tokenRef.current === myToken) playMotif(key); }, i * (m.durMs + LOOP_GAP_MS));
    }
  };

  const confirmAndAdvance = async (text: string, myToken: number, celebrate: boolean) => {
    if (celebrate) game.markCorrect();
    await speakThenWait(text, 2000, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    if (!celebrate) { game.advance(); return; }
    await sleep(500);
    if (tokenRef.current !== myToken) return;
    game.advance();
  };

  // Bir deneme: iki müzik (rastgele sırayla) → her birinde dans penceresi → karşılaştır
  const runAttempt = async (guided: boolean) => {
    const myToken = ++tokenRef.current;
    const def = PAIRS[round - 1];
    const order = shuffle([0, 1]);
    const summaries: Summary[] = [];
    busyRef.current = true;
    for (let k = 0; k < 2; k++) {
      const mi = order[k];
      const key = def.motifs[mi];
      setStep(k);
      setPhase('prep');
      await speakThenWait(k === 0 ? K.birinci : K.ikinci, 800, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
      const windowMs = windowMsFor(key);
      ptsRef.current = [];
      recRef.current = { active: true, t0: Date.now(), samples: [] };
      ghostRef.current = guided ? { key, t0: Date.now(), windowMs } : null;
      setPhase('dance');
      scheduleMotif(key, myToken);
      await sleep(windowMs);
      if (tokenRef.current !== myToken) return;
      recRef.current.active = false;
      ghostRef.current = null;
      summaries[mi] = summarize(recRef.current.samples, windowMs);
    }
    setPhase('result');
    const verdict = judge(def.key, summaries[0], summaries[1]);
    if (guided) {
      // Rehberli denemede ne olursa olsun nazikçe geçilir (yalnız başarıyla çıkan tur "doğru" sayılmaz).
      await confirmAndAdvance(def.confirm, myToken, false);
      return;
    }
    if (verdict === 'ok') {
      await confirmAndAdvance(def.confirm, myToken, true);
      return;
    }
    game.markWrong();
    attemptRef.current += 1;
    if (attemptRef.current >= MAX_ATTEMPTS) {
      await speakThenWait(K.birlikte, 1800, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
      runAttempt(true);
    } else {
      await speakThenWait(K.tekrar, 1500, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
      runAttempt(false);
    }
  };

  // Tur başlangıcı
  useEffect(() => {
    if (!gameReady) return;
    const myToken = ++tokenRef.current;
    ptsRef.current = [];
    recRef.current = { active: false, t0: 0, samples: [] };
    ghostRef.current = null;
    attemptRef.current = 0;
    busyRef.current = true;
    setStep(0);
    setMoves([]);
    setShowIdx(-1);
    bounce();
    if (round === DANCE_ROUND) {
      setPhase('compose');
      (async () => {
        await speakThenWait(K.dansKur, 1500, { instructions: HAPPY_VOICE });
        if (tokenRef.current === myToken) busyRef.current = false;
      })();
      return;
    }
    setPhase('prep');
    (async () => {
      await speakThenWait(K.muzikDinle, 1500, { instructions: HAPPY_VOICE });
      if (tokenRef.current !== myToken) return;
      runAttempt(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  // ---- Tur 5: Kendi Dansım ----
  const tm = (v: Animated.Value, to: number, ms: number) => Animated.timing(v, {
    toValue: to, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE,
  });
  const performMove = (id: DanceMove['id']) => new Promise<void>((resolve) => {
    dScale.setValue(1); dY.setValue(0); dRot.setValue(0); dTilt.setValue(0);
    let anim: Animated.CompositeAnimation;
    switch (id) {
      case 'alkis': anim = Animated.loop(Animated.sequence([tm(dScale, 1.3, 130), tm(dScale, 1, 130)]), { iterations: 4 }); break;
      case 'zipla': anim = Animated.loop(Animated.sequence([tm(dY, -44, 260), tm(dY, 0, 260)]), { iterations: 2 }); break;
      case 'don': anim = tm(dRot, 1, DANCE_MOVE_MS); break;
      default: anim = Animated.loop(Animated.sequence([tm(dTilt, 1, 130), tm(dTilt, -1, 260), tm(dTilt, 0, 130)]), { iterations: 2 }); break;
    }
    anim.start(() => resolve());
  });

  const startShow = async (picked: DanceMove['id'][]) => {
    const myToken = ++tokenRef.current;
    busyRef.current = true;
    await sleep(500);
    if (tokenRef.current !== myToken) return;
    setPhase('show');
    await speakThenWait(K.dansSerg, 1500, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    playMotif('yavas');
    for (let i = 0; i < picked.length; i++) {
      setShowIdx(i);
      await performMove(picked[i]);
      if (tokenRef.current !== myToken) return;
    }
    setShowIdx(-1);
    game.markCorrect();
    await speakThenWait(K.dansBitis, 1800, { instructions: HAPPY_VOICE });
    if (tokenRef.current !== myToken) return;
    await sleep(600);
    if (tokenRef.current !== myToken) return;
    game.advance();
  };

  const handleMove = (m: DanceMove) => {
    if (phase !== 'compose' || busyRef.current || moves.length >= DANCE_PICK_COUNT) return;
    game.markMove();
    const next = [...moves, m.id];
    setMoves(next);
    if (next.length === DANCE_PICK_COUNT) startShow(next);
  };
  const handleUndo = () => {
    if (phase !== 'compose' || busyRef.current) return;
    setMoves((p) => p.slice(0, -1));
  };

  // ---- Görünüm ----
  const segs = [];
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1];
    const b = trail[i];
    const frac = i / trail.length;
    segs.push(
      <Line
        key={i}
        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        stroke={RIBBON_COLORS[Math.floor(b.t / 140) % RIBBON_COLORS.length]}
        strokeWidth={2 + 11 * frac}
        strokeLinecap="round"
        opacity={0.25 + 0.75 * frac}
      />,
    );
  }
  const head = trail.length ? trail[trail.length - 1] : null;
  const moveCardW = Math.floor((Math.min(winW, 440) - 24 - 36) / 4);
  const emojiOf = (id: DanceMove['id']) => DANCE_MOVES.find((m) => m.id === id)!.emoji;
  const webNoScroll = (Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as object) : null);

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: winW / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message={K.giris}
          childName={childName}
          countdownSeconds={5}
          interaction="draw"
          onComplete={() => game.setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>🎀 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <Animated.View style={[styles.status, { transform: [{ scale: pop }] }]}>
          {isDanceRound ? (
            <Animated.Text style={[styles.statusEmoji, phase === 'show' && { transform: [{ scale: pulse }] }]}>{phase === 'show' ? '🎵' : '💃'}</Animated.Text>
          ) : (
            <>
              <Animated.Text style={[styles.statusEmoji, phase === 'dance' && { transform: [{ scale: pulse }] }]}>
                {phase === 'dance' ? '🎵' : phase === 'result' ? '✨' : '👂'}
              </Animated.Text>
              <View style={styles.dots}>
                {[0, 1].map((i) => <View key={i} style={[styles.dot, i <= step && phase !== 'prep' && styles.dotOn, i < step && styles.dotOn]} />)}
              </View>
            </>
          )}
        </Animated.View>

        {!isDanceRound && (
          <View
            style={[styles.pad, { width: padW, height: padH }, webNoScroll]}
            {...panResponder.panHandlers}
          >
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg width={padW} height={padH}>{segs}</Svg>
              {head ? (
                <Text style={[styles.ribbonHead, { left: head.x - 18, top: head.y - 20 }]}>🎀</Text>
              ) : (
                <Text style={[styles.ribbonHint, { left: padW / 2 - 24, top: padH / 2 - 28 }]}>🎀</Text>
              )}
              {ghost && (
                <View style={[styles.ghost, { left: ghost.x - 24, top: ghost.y - 24 }]}>
                  <Text style={styles.ghostEmoji}>🎀</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {isDanceRound && (
          <>
            <View style={[styles.danceStage, { width: padW }]}>
              <Animated.Text
                style={[styles.dancer, {
                  transform: [
                    { translateY: dY },
                    { scale: dScale },
                    { rotate: dRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                    { rotate: dTilt.interpolate({ inputRange: [-1, 1], outputRange: ['-20deg', '20deg'] }) },
                  ],
                }]}
              >💃</Animated.Text>
              <View style={styles.slots}>
                {Array.from({ length: DANCE_PICK_COUNT }).map((_, i) => (
                  <View key={i} style={[styles.slot, !!moves[i] && styles.slotOn, showIdx === i && styles.slotNow]}>
                    <Text style={styles.slotEmoji}>{moves[i] ? emojiOf(moves[i]) : ''}</Text>
                  </View>
                ))}
                {phase === 'compose' && moves.length > 0 && (
                  <TouchableOpacity style={styles.undo} onPress={handleUndo} accessibilityRole="button" accessibilityLabel="Son hareketi geri al">
                    <Text style={styles.undoText}>↩</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <ListenButton onPress={() => speak(K.dansKur, { instructions: HAPPY_VOICE })} color="#EC407A" style={{ marginTop: 10 }} />
            <View style={styles.cards}>
              {DANCE_MOVES.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.card, { width: moveCardW }]}
                  onPress={() => handleMove(m)}
                  disabled={phase !== 'compose' || moves.length >= DANCE_PICK_COUNT}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={m.label}
                >
                  <Text style={styles.cardEmoji}>{m.emoji}</Text>
                  <Text style={styles.cardLabel}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCE4EC', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#AD1457' },
  content: { flex: 1, width: '100%', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 20 },

  status: { minWidth: 150, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 5 },
  statusEmoji: { fontSize: 48 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 4 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#F8BBD0' },
  dotOn: { backgroundColor: '#EC407A' },

  pad: { marginTop: 16, borderRadius: 28, backgroundColor: '#fff', borderWidth: 4, borderColor: '#F48FB1', overflow: 'hidden' },
  ribbonHead: { position: 'absolute', fontSize: 34 },
  ribbonHint: { position: 'absolute', fontSize: 46, opacity: 0.35 },
  ghost: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(236,64,122,0.12)', borderWidth: 2, borderColor: 'rgba(236,64,122,0.35)', alignItems: 'center', justifyContent: 'center' },
  ghostEmoji: { fontSize: 26, opacity: 0.45 },

  danceStage: { marginTop: 16, minHeight: 200, borderRadius: 28, backgroundColor: '#fff', borderWidth: 4, borderColor: '#F48FB1', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 14 },
  dancer: { fontSize: 84 },
  slots: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  slot: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#FCE4EC', borderWidth: 3, borderColor: '#F8BBD0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  slotOn: { backgroundColor: '#fff', borderStyle: 'solid', borderColor: '#EC407A' },
  slotNow: { borderColor: '#43A047', backgroundColor: '#E8F5E9' },
  slotEmoji: { fontSize: 30 },
  undo: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8BBD0', alignItems: 'center', justifyContent: 'center' },
  undoText: { fontSize: 22, fontWeight: '900', color: '#AD1457' },

  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 16, maxWidth: 440 },
  card: { minHeight: 96, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 6, borderWidth: 3, borderColor: '#F8BBD0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 2, elevation: 4 },
  cardEmoji: { fontSize: 38 },
  cardLabel: { fontSize: 12, fontWeight: '800', color: '#AD1457', marginTop: 2 },
});
