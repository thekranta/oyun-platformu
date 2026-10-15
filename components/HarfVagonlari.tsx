import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';
import { speak, speakThenWait } from '../services/speechService';
import { useRoundGame, type RoundGameEnd } from '../lib/useRoundGame';

// ============================================
// 🚂 HARF VAGONLARI - Sözcük-harf ilişkisi (Türkçe / TAEOB.3)
// Resimli lokomotifin arkasında sözcüğü oluşturan harf vagonları bağlıdır.
// Çocuk vagonları AYIRIR, sonra harfleri doğru sıraya dizerek treni yeniden kurar:
// "kelimeler harflerden oluşur" fikrini eylemle yaşar.
// İlk 2 turda sözcük vagonlarda görünür (model); sonraki turlarda gizlidir —
// çocuk resme ve sese bakıp harfleri kendisi dizer (2 çeldirici harf havuzda).
// Tek tek harf SESİ seslendirilmez (TTS güvenilir değil); yalnız sözcük söylenir.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 6;
const MODEL_ROUNDS = 2;
const ALPHABET = Array.from('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ');

interface Word { emoji: string; text: string; say: string }

// say: "Bu bir ..." cümlesindeki seslendirme (klip anahtarı).
const SHORT: Word[] = [
  { emoji: '🐻', text: 'AYI', say: 'Bu bir ayı! Harfleri sırayla vagonlara koy.' },
  { emoji: '🐝', text: 'ARI', say: 'Bu bir arı! Harfleri sırayla vagonlara koy.' },
];
const MEDIUM: Word[] = [
  { emoji: '🍎', text: 'ELMA', say: 'Bu bir elma! Harfleri sırayla vagonlara koy.' },
  { emoji: '🐱', text: 'KEDİ', say: 'Bu bir kedi! Harfleri sırayla vagonlara koy.' },
];
const LONG: Word[] = [
  { emoji: '🚗', text: 'ARABA', say: 'Bu bir araba! Harfleri sırayla vagonlara koy.' },
  { emoji: '🎈', text: 'BALON', say: 'Bu bir balon! Harfleri sırayla vagonlara koy.' },
  { emoji: '✏️', text: 'KALEM', say: 'Bu bir kalem! Harfleri sırayla vagonlara koy.' },
  { emoji: '📖', text: 'KİTAP', say: 'Bu bir kitap! Harfleri sırayla vagonlara koy.' },
  { emoji: '🌸', text: 'ÇİÇEK', say: 'Bu bir çiçek! Harfleri sırayla vagonlara koy.' },
  { emoji: '🐟', text: 'BALIK', say: 'Bu bir balık! Harfleri sırayla vagonlara koy.' },
];

const PROMPT_AYIR = 'Bu trenin vagonları harf! Ayır düğmesine bas.';
const PROMPT_DIZ = 'Şimdi vagonları doğru sıraya diz.';
const SAY_WRONG = 'Olsun! Başka vagonu dene.';
const SAY_DONE = 'Aferin! Tren yola çıktı.';
const SAY_LESSON = 'Kelimeler harflerden oluşur!';

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Oturum sırası: kısa (model) → orta (model) → kalan orta + 3 uzun (gizli).
const buildOrder = (): Word[] => {
  const s = shuffle(SHORT);
  const m = shuffle(MEDIUM);
  return [s[0], m[0], m[1], ...shuffle(LONG).slice(0, 3)];
};

interface Tile { id: number; ch: string; used: boolean }

interface Props {
  onGameEnd: RoundGameEnd;
  onExit?: () => void;
  childName?: string;
}

export default function HarfVagonlari({ onGameEnd, onExit, childName }: Props) {
  const game = useRoundGame({
    oyunAdi: 'harf-vagonlari',
    totalRounds: TOTAL_ROUNDS,
    kazanimOdagi: 'Türkçe: Erken Okuryazarlık — Sözcük-Harf İlişkisi (TAEOB.3)',
    onGameEnd,
  });
  const { round, gameReady, locked, showConfetti } = game;

  const [order] = useState<Word[]>(buildOrder);
  const word = order[Math.min(round - 1, order.length - 1)];
  const letters = Array.from(word.text);
  const isModelRound = round <= MODEL_ROUNDS;

  const [phase, setPhase] = useState<'model' | 'build'>('build');
  const [placed, setPlaced] = useState<string[]>([]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const wrongSpokenRef = useRef(false);

  const shake = useRef(new Animated.Value(0)).current;
  const depart = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!gameReady) return;
    const cur = order[Math.min(round - 1, order.length - 1)];
    const ls = Array.from(cur.text);
    const extra = shuffle(ALPHABET.filter((c) => !ls.includes(c))).slice(0, 2);
    const modelRound = round <= MODEL_ROUNDS;
    const pool = modelRound ? ls : [...ls, ...extra];
    setTiles(shuffle(pool).map((ch, i) => ({ id: i, ch, used: false })));
    setPlaced(modelRound ? ls : []);
    setPhase(modelRound ? 'model' : 'build');
    setWrongId(null);
    wrongSpokenRef.current = false;
    depart.setValue(0);
    pop.setValue(0.85);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(modelRound ? PROMPT_AYIR : cur.say, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const handleSeparate = () => {
    if (phase !== 'model') return;
    game.markMove();
    setPlaced([]);
    setPhase('build');
    speak(PROMPT_DIZ, { instructions: HAPPY_VOICE });
  };

  const handleTile = (tile: Tile) => {
    if (locked || tile.used || phase !== 'build') return;
    const expected = letters[placed.length];
    if (tile.ch === expected) {
      const next = [...placed, tile.ch];
      setTiles((ts) => ts.map((t) => (t.id === tile.id ? { ...t, used: true } : t)));
      setPlaced(next);
      if (next.length === letters.length) {
        game.markCorrect();
        Animated.timing(depart, { toValue: 1, duration: 1100, useNativeDriver: USE_NATIVE }).start();
        speakThenWait(isModelRound ? `${SAY_LESSON} ${SAY_DONE}` : SAY_DONE, 1800, { instructions: HAPPY_VOICE }).then(game.advance);
      } else {
        game.markMove();
      }
    } else {
      game.markWrong();
      setWrongId(tile.id);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      game.later(() => setWrongId(null), 450);
      if (!wrongSpokenRef.current) {
        wrongSpokenRef.current = true;
        speak(SAY_WRONG, { instructions: HAPPY_VOICE });
      }
    }
  };

  // Dar telefonlarda 5 harfli sözcük sığsın diye vagon genişliği ekrana göre daralır.
  const wagonW = Math.max(38, Math.min(52, Math.floor((Math.min(SCREEN_W, 480) - 24 - 58 - 6 * letters.length) / letters.length)));
  const trainTranslate = depart.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_W] });

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Bu trenin vagonları harf! Harfleri doğru sıraya dizelim."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => game.setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>🚂 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.contentArea}>
        <Animated.View style={[styles.picCard, { transform: [{ scale: pop }] }]}>
          <Text style={styles.picEmoji}>{word.emoji}</Text>
        </Animated.View>

        <ListenButton
          onPress={() => speak(phase === 'model' ? PROMPT_AYIR : word.say, { instructions: HAPPY_VOICE })}
          color="#F57C00"
          style={{ marginTop: 10 }}
        />

        <Animated.View style={[styles.train, { transform: [{ translateX: trainTranslate }] }]}>
          <Text style={styles.loco}>🚂</Text>
          {letters.map((ch, i) => {
            const filled = i < placed.length;
            return (
              <View key={i} style={[styles.wagon, { width: wagonW }, filled && styles.wagonFilled, i === placed.length && phase === 'build' && styles.wagonNext]}>
                <Text style={styles.wagonLetter}>{filled ? placed[i] : ''}</Text>
              </View>
            );
          })}
        </Animated.View>
        <View style={styles.rail} />

        {phase === 'model' ? (
          <TouchableOpacity style={styles.separateBtn} onPress={handleSeparate} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Vagonları ayır">
            <Text style={styles.separateText}>🔧 Ayır</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pool}>
            {tiles.map((t) => {
              const isWrong = wrongId === t.id;
              return (
                <Animated.View key={t.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                  <TouchableOpacity
                    style={[styles.tile, t.used && styles.tileUsed, isWrong && styles.tileWrong]}
                    onPress={() => handleTile(t)}
                    disabled={t.used || locked}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.tileLetter}>{t.used ? '' : t.ch}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF3E0', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#E65100' },
  contentArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingBottom: 24 },

  picCard: { width: 130, height: 130, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  picEmoji: { fontSize: 78 },

  train: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6, marginTop: 26, paddingHorizontal: 8 },
  loco: { fontSize: 54, marginRight: 4 },
  wagon: { width: 52, height: 58, borderRadius: 12, backgroundColor: '#FFE0B2', borderWidth: 3, borderColor: '#FFB74D', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  wagonFilled: { backgroundColor: '#FFCC80', borderStyle: 'solid', borderColor: '#F57C00' },
  wagonNext: { borderColor: '#E65100', backgroundColor: '#FFF8E1' },
  wagonLetter: { fontSize: 30, fontWeight: '900', color: '#BF360C' },
  rail: { width: '86%', height: 6, borderRadius: 3, backgroundColor: '#8D6E63', marginTop: 4 },

  separateBtn: { marginTop: 34, backgroundColor: '#F57C00', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  separateText: { fontSize: 24, fontWeight: '900', color: '#fff' },

  pool: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 34, maxWidth: 380, paddingHorizontal: 12 },
  tile: { width: 62, height: 68, borderRadius: 16, backgroundColor: '#fff', borderWidth: 3, borderColor: '#FFB74D', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 3 },
  tileUsed: { backgroundColor: '#EFEBE9', borderColor: '#D7CCC8', elevation: 0, shadowOpacity: 0 },
  tileWrong: { backgroundColor: '#FFCDD2', borderColor: '#E57373' },
  tileLetter: { fontSize: 34, fontWeight: '900', color: '#E65100' },
});
