import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🗺️ HAZİNE HARİTASI - Basit kroki/harita okuma (Sosyal/SAB.15)
// 3x3 ızgara harita: işaret noktaları (🌳 ağaç, 🌊 göl, 🏠 ev, ⛰️ dağ, 🌸 çiçek)
// ve toprak kareler. Sabit sözlü ipucu ("Hazine ağacın hemen SAĞINDA.") dinlenir;
// çocuk işaret noktası + yön ilişkisinden konumu ÇIKARIP doğru toprak karesine
// dokunur -> 💎 belirir. Kopyalanacak "aynısı" yok; mekânsal akıl yürütme. Görsel.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

// Izgara indeksleri:
//   0 1 2
//   3 4 5
//   6 7 8
// Yön -> hedef: sağında=i+1, solunda=i-1, üstünde=i-3, altında=i+3
// Her turda: cells (işaret noktası emojisi ya da '' toprak), sabit ipucu, doğru kare.
// Doğru kare DAİMA boş toprak (işaret noktası üstünde değil) ve tek çözümlüdür.
interface Round {
  cells: string[]; // 9 hücre: emoji = işaret noktası, '' = toprak
  clue: string;
  answer: number; // 0-8
}

const ROUNDS: Round[] = [
  // 1) ağaç@3, ev@7 -> ağacın SAĞINDA = 4
  //   .  .  .
  //   🌳 💎 .
  //   .  🏠 .
  { cells: ['', '', '', '🌳', '', '', '', '🏠', ''], clue: 'Hazine ağacın hemen SAĞINDA.', answer: 4 },

  // 2) ev@0, ağaç@2, göl@7 -> evin ALTINDA = 3
  //   🏠 .  🌳
  //   💎 .  .
  //   .  🌊 .
  { cells: ['🏠', '', '🌳', '', '', '', '', '🌊', ''], clue: 'Hazine evin hemen ALTINDA.', answer: 3 },

  // 3) göl@4, çiçek@6, ev@8 -> gölün ÜSTÜNDE = 1
  //   .  💎 .
  //   .  🌊 .
  //   🌸 .  🏠
  { cells: ['', '', '', '', '🌊', '', '🌸', '', '🏠'], clue: 'Hazine gölün hemen ÜSTÜNDE.', answer: 1 },

  // 4) dağ@5, çiçek@2, ev@6 -> dağın SOLUNDA = 4
  //   .  .  🌸
  //   .  💎 ⛰️
  //   🏠 .  .
  { cells: ['', '', '🌸', '', '', '⛰️', '🏠', '', ''], clue: 'Hazine dağın hemen SOLUNDA.', answer: 4 },

  // 5) ağaç@0, göl@6, ev@8 -> gölün SAĞINDA = 7
  //   🌳 .  .
  //   .  .  .
  //   🌊 💎 🏠
  { cells: ['🌳', '', '', '', '', '', '🌊', '', '🏠'], clue: 'Hazine gölün hemen SAĞINDA.', answer: 7 },

  // 6) ağaç@1, ev@5, çiçek@6 -> evin ÜSTÜNDE = 2
  //   .  🌳 💎
  //   .  .  🏠
  //   🌸 .  .
  { cells: ['', '🌳', '', '', '', '🏠', '🌸', '', ''], clue: 'Hazine evin hemen ÜSTÜNDE.', answer: 2 },

  // 7) dağ@0, göl@2, ağaç@7 -> dağın ALTINDA = 3
  //   ⛰️ .  🌊
  //   💎 .  .
  //   .  🌳 .
  { cells: ['⛰️', '', '🌊', '', '', '', '', '🌳', ''], clue: 'Hazine dağın hemen ALTINDA.', answer: 3 },

  // 8) çiçek@4, ev@2, ağaç@8 -> çiçeğin SOLUNDA = 3
  //   .  .  🏠
  //   💎 🌸 .
  //   .  .  🌳
  { cells: ['', '', '🏠', '', '🌸', '', '', '', '🌳'], clue: 'Hazine çiçeğin hemen SOLUNDA.', answer: 3 },
];

const GAP = 10;
const BOARD_W = Math.min(SCREEN_W - 40, 340);
const CELL = Math.floor((BOARD_W - GAP * 2) / 3);
const EMOJI = Math.round(CELL * 0.52);

interface Props {
  onGameEnd: (
    oyunAdi: string,
    sure: number,
    finalHamle: number,
    finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function HazineHaritasi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [found, setFound] = useState(false);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;
  const boardScale = useRef(new Animated.Value(1)).current;
  const gemPop = useRef(new Animated.Value(0)).current;

  const current = ROUNDS[round - 1];

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    setFound(false);
    setWrongIdx(null);
    gemPop.setValue(0);
    boardScale.setValue(0.9);
    Animated.spring(boardScale, { toValue: 1, friction: 6, useNativeDriver: USE_NATIVE }).start();
    speak(ROUNDS[round - 1].clue, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('hazine-haritasi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal: Basit Kroki/Harita Okuma (SAB.15)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (idx: number) => {
    if (found) return;
    movesRef.current += 1;
    if (idx === current.answer) {
      setFound(true);
      correctRef.current += 1;
      setShowConfetti(true);
      gemPop.setValue(0.3);
      Animated.spring(gemPop, { toValue: 1, friction: 4, useNativeDriver: USE_NATIVE }).start();
      speakThenWait('Aferin! Hazineyi buldun.', 1500, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrongIdx(idx);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => { if (isMountedRef.current) setWrongIdx(null); }, 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Hazine haritasını oku! İpucunu dinle, hazinenin gömülü olduğu yere dokun."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#5D4037" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🗺️ {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Hazine nerede?</Text>

      <View style={styles.clueCard}>
        <Text style={styles.clueIcon}>📜</Text>
        <Text style={styles.clueText}>{current.clue}</Text>
      </View>

      <TouchableOpacity
        style={styles.listenBtn}
        onPress={() => speak(current.clue, { instructions: HAPPY_VOICE })}
        activeOpacity={0.85}
      >
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.board, { transform: [{ scale: boardScale }] }]}>
        {current.cells.map((cell, idx) => {
          const isLandmark = cell !== '';
          const isFound = found && idx === current.answer;
          const isWrong = wrongIdx === idx;
          return (
            <Animated.View key={idx} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[
                  styles.cell,
                  isLandmark ? styles.landmarkCell : styles.dirtCell,
                  isFound && styles.foundCell,
                  isWrong && styles.wrongCell,
                ]}
                onPress={() => handleTap(idx)}
                disabled={found}
                activeOpacity={0.85}
              >
                {isFound ? (
                  <Animated.Text style={[styles.cellEmoji, { transform: [{ scale: gemPop }] }]}>💎</Animated.Text>
                ) : isLandmark ? (
                  <Text style={styles.cellEmoji}>{cell}</Text>
                ) : null}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>

      {found && <Text style={styles.foundText}>🎉 Hazineyi buldun!</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EAD3', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#5D4037' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#5D4037', marginTop: 6 },

  clueCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF8E7', borderWidth: 2, borderColor: '#E0C08A', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, marginTop: 12, maxWidth: BOARD_W, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  clueIcon: { fontSize: 26 },
  clueText: { flex: 1, fontSize: 17, fontWeight: '800', color: '#6D4C41' },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8D6E63', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  board: { width: CELL * 3 + GAP * 2, flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginTop: 20, padding: GAP, backgroundColor: '#C9A063', borderRadius: 22, borderWidth: 3, borderColor: '#A67C48', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  cell: { width: CELL, height: CELL, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dirtCell: { backgroundColor: '#D8B584', borderWidth: 2, borderColor: '#C0954F' },
  landmarkCell: { backgroundColor: '#BFE3A6', borderWidth: 2, borderColor: '#8FBF6E' },
  foundCell: { backgroundColor: '#FFF3C4', borderWidth: 3, borderColor: '#F4C430' },
  wrongCell: { backgroundColor: '#F3C6C6', borderColor: '#E57373' },
  cellEmoji: { fontSize: EMOJI },

  foundText: { fontSize: 22, fontWeight: '900', color: '#2E7D32', marginTop: 18 },
});
