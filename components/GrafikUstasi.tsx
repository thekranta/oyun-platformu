import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 📊 GRAFİK USTASI - Veri düzenleme + grafik okuma (Matematik/MAB.11, ikincil MAB.13)
// İki aşama: (1) karışık meyveleri türüne göre DOKUNARAK sütunlara diz (basit piktograf kur);
//            (2) "Hangisi en çok?" / "Hangisi en az?" sorusuna en uzun/en kısa sütuna dokunarak yanıt ver.
// Veri okuryazarlığına giriş. Tamamen görsel; sütun yüksekliği doğal hata kontrolüdür
// (özdeş ögeyi bulmak değil, çocuğun kendi kurduğu grafiği okuması). NON-adaptif.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

// Kullanılan meyve türleri (emoji = hem sütun hücresi hem eksen etiketi).
const FRUITS: Record<string, { emoji: string; color: string }> = {
  elma: { emoji: '🍎', color: '#EF5350' },
  muz: { emoji: '🍌', color: '#FDD835' },
  uzum: { emoji: '🍇', color: '#AB47BC' },
  cilek: { emoji: '🍓', color: '#EC407A' },
  portakal: { emoji: '🍊', color: '#FFA726' },
};

type QType = 'cok' | 'az';
interface RoundDef { cols: { key: string; count: number }[]; question: QType }

// Küratörlü turlar: her turda sayılar birbirinden FARKLI → net kazanan (beraberlik yok).
// cols dizisi = soldan sağa gösterim sırası (doğru cevabın konumu turdan tura değişir).
const ROUNDS: RoundDef[] = [
  { cols: [{ key: 'elma', count: 4 }, { key: 'muz', count: 2 }], question: 'cok' },                                 // en çok → 🍎 elma
  { cols: [{ key: 'uzum', count: 5 }, { key: 'elma', count: 2 }], question: 'az' },                                  // en az  → 🍎 elma
  { cols: [{ key: 'elma', count: 2 }, { key: 'muz', count: 4 }, { key: 'uzum', count: 3 }], question: 'cok' },       // en çok → 🍌 muz
  { cols: [{ key: 'elma', count: 3 }, { key: 'muz', count: 4 }, { key: 'cilek', count: 2 }], question: 'az' },       // en az  → 🍓 çilek
  { cols: [{ key: 'cilek', count: 4 }, { key: 'muz', count: 2 }, { key: 'elma', count: 3 }], question: 'cok' },      // en çok → 🍓 çilek
  { cols: [{ key: 'elma', count: 4 }, { key: 'portakal', count: 2 }, { key: 'muz', count: 3 }], question: 'az' },    // en az  → 🍊 portakal
  { cols: [{ key: 'portakal', count: 3 }, { key: 'uzum', count: 5 }], question: 'cok' },                             // en çok → 🍇 üzüm
  { cols: [{ key: 'muz', count: 2 }, { key: 'uzum', count: 4 }, { key: 'elma', count: 3 }], question: 'az' },        // en az  → 🍌 muz
];
const TOTAL_ROUNDS = ROUNDS.length; // 8

// Doğru sütun: 'cok' → en yüksek sayılı; 'az' → en düşük sayılı (sayılar tur içinde tekil).
const answerKeyOf = (r: RoundDef): string => {
  let best = r.cols[0];
  for (const c of r.cols) {
    if (r.question === 'cok' ? c.count > best.count : c.count < best.count) best = c;
  }
  return best.key;
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

interface PileItem { id: number; key: string }

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function GrafikUstasi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'build' | 'read'>('build');
  const [pile, setPile] = useState<PileItem[]>([]);
  const [placed, setPlaced] = useState<Record<string, number>>({});
  const [locked, setLocked] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const remainingRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;
  // Sütuna yeni meyve eklenince en üstteki (yeni) hücre "zıplayarak" belirir.
  const popAnims = useRef<Record<string, Animated.Value>>(
    Object.keys(FRUITS).reduce((acc, k) => { acc[k] = new Animated.Value(1); return acc; }, {} as Record<string, Animated.Value>),
  ).current;

  const currentRound = ROUNDS[round - 1];
  const answerKey = answerKeyOf(currentRound);
  const questionText = currentRound.question === 'cok' ? 'Hangisi en çok?' : 'Hangisi en az?';
  const promptText = phase === 'build' ? 'Meyveleri türüne göre yerleştir!' : questionText;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  // Tur kurulumu: yığını oluştur, sütunları sıfırla, kurma aşamasına dön, yönergeyi seslendir.
  useEffect(() => {
    if (!gameReady) return;
    const r = ROUNDS[round - 1];
    const items: PileItem[] = [];
    const p: Record<string, number> = {};
    let id = 0;
    r.cols.forEach((c) => { p[c.key] = 0; for (let i = 0; i < c.count; i++) items.push({ id: id++, key: c.key }); });
    remainingRef.current = items.length;
    Object.keys(FRUITS).forEach((k) => popAnims[k].setValue(1));
    setPlaced(p);
    setPile(shuffle(items));
    setPhase('build');
    setLocked(false);
    setWrongKey(null);
    speak('Meyveleri türüne göre yerleştir!', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('grafik-ustasi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Matematik: Veri Düzenleme ve Grafik Okuma (MAB.11)',
      correct_answers: correctRef.current,
    });
  };

  // AŞAMA 1 — Yığındaki meyveye dokun → kendi türünün sütununa eklenir (yanlış hamle YOK).
  const handleBuild = (item: PileItem) => {
    if (phase !== 'build' || locked) return;
    movesRef.current += 1;
    setPlaced((prev) => ({ ...prev, [item.key]: (prev[item.key] || 0) + 1 }));
    const av = popAnims[item.key];
    av.setValue(0.2);
    Animated.spring(av, { toValue: 1, friction: 5, tension: 140, useNativeDriver: USE_NATIVE }).start();
    setPile((prev) => prev.filter((x) => x.id !== item.id));
    remainingRef.current -= 1;
    if (remainingRef.current <= 0) {
      // Grafik tamam → okuma aşamasına geç, soruyu seslendir.
      setPhase('read');
      speak(currentRound.question === 'cok' ? 'Hangisi en çok?' : 'Hangisi en az?', { instructions: HAPPY_VOICE });
    }
  };

  // AŞAMA 2 — En uzun (en çok) / en kısa (en az) sütuna dokun.
  const handleRead = (key: string) => {
    if (phase !== 'read' || locked) return;
    movesRef.current += 1;
    if (key === answerKey) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      const confirmText = currentRound.question === 'cok' ? 'Aferin! En çok olanı buldun.' : 'Aferin! En az olanı buldun.';
      speakThenWait(confirmText, 1500, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrongKey(key);
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
          message="Meyveleri türlerine göre dizip grafik yapalım! Sonra en çok ya da en az olanı bul."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#1565C0" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>📊 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>{promptText}</Text>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(promptText, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      {/* Grafik alanı — piktograf sütunları (kurma aşamasında büyür, okuma aşamasında dokunulabilir) */}
      <View style={styles.chart}>
        {currentRound.cols.map((c) => {
          const count = placed[c.key] || 0;
          const isWrong = wrongKey === c.key;
          const readable = phase === 'read';
          return (
            <Animated.View key={c.key} style={[styles.colWrap, isWrong ? { transform: [{ translateX: shake }] } : null]}>
              <TouchableOpacity
                activeOpacity={readable ? 0.8 : 1}
                disabled={!readable || locked}
                onPress={() => handleRead(c.key)}
                style={[styles.colTouch, readable && styles.colReadable]}
              >
                <View style={styles.stack}>
                  {Array.from({ length: count }).map((_, i) => {
                    const isNewest = i === count - 1;
                    return (
                      <Animated.View
                        key={i}
                        style={[
                          styles.cell,
                          { backgroundColor: FRUITS[c.key].color },
                          isNewest ? { transform: [{ scale: popAnims[c.key] }] } : null,
                        ]}
                      >
                        <Text style={styles.cellEmoji}>{FRUITS[c.key].emoji}</Text>
                      </Animated.View>
                    );
                  })}
                </View>
                <View style={[styles.axis, readable && styles.axisReadable]}>
                  <Text style={styles.axisEmoji}>{FRUITS[c.key].emoji}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Alt bölge: kurma aşamasında meyve yığını; okuma aşamasında ipucu */}
      {phase === 'build' ? (
        <View style={styles.bottomZone}>
          <Text style={styles.pileHint}>Meyveye dokun 👆</Text>
          <View style={styles.pile}>
            {pile.map((item) => (
              <TouchableOpacity key={item.id} style={styles.pileChip} onPress={() => handleBuild(item)} activeOpacity={0.7}>
                <Text style={styles.pileEmoji}>{FRUITS[item.key].emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.bottomZone}>
          <Text style={styles.readHint}>En {currentRound.question === 'cok' ? 'uzun' : 'kısa'} sütuna dokun 👆</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF4FF', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#1565C0' },

  prompt: { fontSize: 21, fontWeight: '900', color: '#1565C0', marginTop: 6, textAlign: 'center', paddingHorizontal: 16 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1E88E5', paddingVertical: 9, paddingHorizontal: 18, borderRadius: 22, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 16, marginTop: 18, minHeight: 240, paddingHorizontal: 12 },
  colWrap: { alignItems: 'center' },
  colTouch: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 6, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
  colReadable: { backgroundColor: '#fff', borderColor: '#1E88E5', shadowColor: '#1E88E5', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  // column-reverse + flex-start → hücreler ortak tabandan yukarı doğru dizilir (piktograf çubuğu).
  stack: { height: 180, flexDirection: 'column-reverse', justifyContent: 'flex-start', alignItems: 'center' },
  cell: { width: 46, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginVertical: 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  cellEmoji: { fontSize: 20 },
  axis: { marginTop: 8, width: 50, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 },
  axisReadable: { backgroundColor: '#E3F2FF' },
  axisEmoji: { fontSize: 26 },

  bottomZone: { alignItems: 'center', marginTop: 14, minHeight: 120, width: '100%', paddingHorizontal: 16 },
  pileHint: { fontSize: 14, fontWeight: '800', color: '#5C6BC0', marginBottom: 8 },
  readHint: { fontSize: 16, fontWeight: '900', color: '#1565C0', marginTop: 6 },
  pile: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, maxWidth: 440 },
  pileChip: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 4 },
  pileEmoji: { fontSize: 30 },
});
