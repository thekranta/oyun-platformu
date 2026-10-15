import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { asset } from '../lib/assetMap';
import { useRoundGame, type RoundGameEnd } from '../lib/useRoundGame';
import { speak, speakThenWait } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';

// ============================================
// 🎹 ZİLOFON USTASI - Duyduğu sesleri çalgıyla çalabilme (Müzik / MÇB.1)
// Uygulama renkli zilofon çubuklarında kısa bir ezgi ÇALAR ama hangi çubukların
// çalındığını ASLA göstermez (çubuklar yanmaz). Çocuk duyduğu sesleri çubuklara
// dokunarak çalar: model görsel olmadığından gözle kopyalanamaz, kulakla yapılır.
// Ölçüt yalnız NOTA SIRASI; zamanlama ölçülmez, ceza yoktur. 3 yanlış denemeden
// sonra "birlikte çalalım": sıradaki çubuk parlar (rehberli).
// Basamak: 3 çubuk/2 nota → 5 çubuk/3 nota → 8 çubuk/4 nota.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 6;
const NOTE_MS = 650;
const MAX_ATTEMPTS = 3;

const BAR_COLORS = ['#E53935', '#FB8C00', '#FDD835', '#7CB342', '#00ACC1', '#1E88E5', '#5E35B1', '#D81B60'];

// Her tur: kullanılacak çubuk numaraları (1=en alçak … 8=en tiz) ve çalınacak ezgi.
interface RoundDef { bars: number[]; melody: number[] }
const LEVEL_1: RoundDef[] = [
  { bars: [1, 5, 8], melody: [1, 8] },
  { bars: [1, 5, 8], melody: [8, 5] },
];
const LEVEL_2: RoundDef[] = [
  { bars: [1, 3, 5, 6, 8], melody: [1, 3, 5] },
  { bars: [1, 3, 5, 6, 8], melody: [8, 6, 5] },
];
const LEVEL_3: RoundDef[] = [
  { bars: [1, 2, 3, 4, 5, 6, 7, 8], melody: [1, 3, 5, 3] },
  { bars: [1, 2, 3, 4, 5, 6, 7, 8], melody: [8, 6, 5, 3] },
];

const SAY_LISTEN = 'Dinle bakalım!';
const SAY_YOUR_TURN = 'Şimdi sıra sende! Duyduğun sesleri çal.';
const SAY_AGAIN = 'Bir daha dinleyelim.';
const SAY_TOGETHER = 'Bu sefer birlikte çalalım. Parlayan çubuğa dokun.';
const SAY_SUCCESS = [
  'Harika! Ezgiyi kulağınla yakaladın.',
  'Aferin! Aynı sesleri çaldın.',
  'Çok güzel çaldın!',
];

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

export default function ZilofonUstasi({ onGameEnd, onExit, childName }: Props) {
  const game = useRoundGame({
    oyunAdi: 'zilofon-ustasi',
    totalRounds: TOTAL_ROUNDS,
    kazanimOdagi: 'Müzik: Duyduğu Sesleri / Müzik Eserlerini Çalabilme — Tuşlu Çalgı (MÇB.1)',
    onGameEnd,
  });
  const { round, gameReady, showConfetti } = game;

  const [order] = useState<RoundDef[]>(() => [...shuffle(LEVEL_1), ...shuffle(LEVEL_2), ...shuffle(LEVEL_3)]);
  const def = order[Math.min(round - 1, order.length - 1)];

  const [phase, setPhase] = useState<'listen' | 'play' | 'done'>('listen');
  const [taps, setTaps] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [guided, setGuided] = useState(false);

  const phaseRef = useRef<'listen' | 'play' | 'done'>('listen');
  const tapsRef = useRef<number[]>([]);
  const attemptRef = useRef(0);
  const guidedRef = useRef(false);
  const tokenRef = useRef(0);
  const soundsRef = useRef<Audio.Sound[]>([]);
  const loadTokenRef = useRef(0);
  const successIdxRef = useRef(0);
  const pop = useRef(new Animated.Value(1)).current;

  const setPhaseBoth = (p: 'listen' | 'play' | 'done') => { phaseRef.current = p; setPhase(p); };
  const setGuidedBoth = (g: boolean) => { guidedRef.current = g; setGuided(g); };

  // Notaları BİR KEZ önden yükle: dokunuşta replayAsync ile anında çalsın.
  useEffect(() => {
    const myToken = ++loadTokenRef.current;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
      } catch {
        // ses modu ayarlanamazsa oynatma yine denenir
      }
      for (let n = 1; n <= 8; n++) {
        try {
          const { sound } = await Audio.Sound.createAsync(asset(`/sounds/sfx/zilo-${n}.wav`), { shouldPlay: false, volume: 1.0 });
          if (loadTokenRef.current !== myToken) { await sound.unloadAsync().catch(() => {}); return; }
          soundsRef.current[n] = sound;
        } catch (e) {
          console.warn('🎹 Zilofon sesi yüklenemedi (sessiz geçildi):', e);
        }
      }
    })();
    return () => {
      loadTokenRef.current += 1;
      tokenRef.current += 1;
      const loaded = soundsRef.current;
      soundsRef.current = [];
      loaded.forEach((s) => { if (s) { s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {}); } });
    };
  }, []);

  const playNote = (n: number) => { soundsRef.current[n]?.replayAsync().catch(() => {}); };

  // Ezgiyi çalar (çubuk YANMAZ). Bitince onDone.
  const playMelody = (notes: number[], onDone: () => void) => {
    const myToken = ++tokenRef.current;
    setPhaseBoth('listen');
    notes.forEach((n, i) => {
      game.later(() => { if (tokenRef.current === myToken) playNote(n); }, i * NOTE_MS);
    });
    game.later(() => { if (tokenRef.current === myToken) onDone(); }, notes.length * NOTE_MS + 250);
  };

  const startTurn = () => {
    tapsRef.current = [];
    setTaps([]);
    setPhaseBoth('play');
    setLit(guidedRef.current ? def.melody[0] : null);
  };

  // Tur başlangıcı: dinle → sıra sende
  useEffect(() => {
    if (!gameReady) return;
    const cur = order[Math.min(round - 1, order.length - 1)];
    attemptRef.current = 0;
    setGuidedBoth(false);
    tapsRef.current = [];
    setTaps([]);
    setLit(null);
    setPhaseBoth('listen');
    pop.setValue(0.9);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    const myToken = ++tokenRef.current;
    speakThenWait(SAY_LISTEN, 900, { instructions: HAPPY_VOICE }).then(() => {
      if (tokenRef.current !== myToken) return;
      playMelody(cur.melody, () => {
        speak(SAY_YOUR_TURN, { instructions: HAPPY_VOICE });
        startTurn();
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const handleBar = (n: number) => {
    if (phaseRef.current !== 'play') return;
    const expected = def.melody[tapsRef.current.length];
    // Rehberli kipte yalnız parlayan çubuk kabul edilir (diğerleri sadece ses verir).
    if (guidedRef.current && n !== expected) { playNote(n); return; }
    playNote(n);
    game.markMove();
    const next = [...tapsRef.current, n];
    tapsRef.current = next;
    setTaps(next);
    if (guidedRef.current) setLit(next.length < def.melody.length ? def.melody[next.length] : null);
    if (next.length < def.melody.length) return;

    // Ezgi tamamlandı → değerlendir
    setPhaseBoth('done');
    setLit(null);
    const ok = next.every((v, i) => v === def.melody[i]);
    if (ok) {
      game.markCorrect();
      const say = SAY_SUCCESS[successIdxRef.current++ % SAY_SUCCESS.length];
      game.later(() => {
        speakThenWait(say, 1500, { instructions: HAPPY_VOICE }).then(game.advance);
      }, 500);
    } else {
      game.markWrong();
      attemptRef.current += 1;
      game.later(() => {
        if (attemptRef.current >= MAX_ATTEMPTS && !guidedRef.current) {
          setGuidedBoth(true);
          speakThenWait(SAY_TOGETHER, 1800, { instructions: HAPPY_VOICE }).then(startTurn);
        } else {
          speakThenWait(SAY_AGAIN, 1200, { instructions: HAPPY_VOICE }).then(() => {
            playMelody(def.melody, () => { speak(SAY_YOUR_TURN, { instructions: HAPPY_VOICE }); startTurn(); });
          });
        }
      }, 700);
    }
  };

  const replay = () => {
    if (phaseRef.current === 'done') return;
    tapsRef.current = [];
    setTaps([]);
    playMelody(def.melody, startTurn);
  };

  const barAreaW = Math.min(SCREEN_W - 32, 440);
  const gap = 8;
  const barW = (barAreaW - gap * (def.bars.length - 1)) / def.bars.length;

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Önce ben çalacağım, sen dinle. Sonra sen de aynı sesleri çalacaksın."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => game.setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>🎹 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.contentArea}>
        <Animated.View style={[styles.statusCard, { transform: [{ scale: pop }] }]}>
          <Text style={styles.statusEmoji}>{phase === 'listen' ? '👂' : guided ? '✨' : '🎵'}</Text>
          <View style={styles.dots}>
            {def.melody.map((_, i) => (
              <View key={i} style={[styles.dot, i < taps.length && styles.dotFilled]} />
            ))}
          </View>
        </Animated.View>

        <ListenButton onPress={replay} color="#8E24AA" disabled={phase === 'done'} style={{ marginTop: 12 }} />

        <View style={[styles.barRow, { width: barAreaW, gap }]}>
          {def.bars.map((n) => {
            const isLit = lit === n;
            const height = 250 - (n - 1) * 17;
            return (
              <TouchableOpacity
                key={n}
                activeOpacity={0.8}
                onPress={() => handleBar(n)}
                disabled={phase !== 'play'}
                accessibilityRole="button"
                accessibilityLabel={`Zilofon çubuğu ${n}`}
                style={[
                  styles.bar,
                  { width: barW, height, backgroundColor: BAR_COLORS[n - 1] },
                  isLit && styles.barLit,
                  phase !== 'play' && styles.barIdle,
                ]}
              >
                <View style={styles.boltTop} />
                <View style={styles.boltBottom} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3E5F5', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#6A1B9A' },
  contentArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingBottom: 24 },

  statusCard: { minWidth: 150, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  statusEmoji: { fontSize: 56 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#E1BEE7' },
  dotFilled: { backgroundColor: '#8E24AA' },

  barRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginTop: 22 },
  bar: { borderRadius: 14, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.22, shadowRadius: 3, elevation: 5 },
  barLit: { borderColor: '#FFFFFF', borderWidth: 5, transform: [{ scale: 1.06 }], shadowOpacity: 0.5, shadowRadius: 12 },
  barIdle: { opacity: 0.85 },
  boltTop: { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.8)' },
  boltBottom: { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.8)' },
});
