import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useRoundGame, type RoundGameEnd } from '../lib/useRoundGame';
import { speak, speakThenWait } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';

// ============================================
// 📋 MİNİK ANKETÇİ - Veriyle çalışabilme + bulguyu yorumlayabilme (Matematik / MAB.11, MAB.13)
// Çocuk arkadaşlarına (çocuk yüzleri) sorar: her arkadaşa dokununca seçimi konuşma
// balonunda belirir ve sütuna eklenir (VERİ TOPLAMA + kaydetme).
// Sonra: "Bu bilgiyi nereden öğrendik?" (kaynağı söyleme: arkadaşlarımıza sorduk),
// "En çok / en az hangisi?" (bulguyu okuma) ve "Neden en çok seçilmiş?" (yorum:
// çünkü daha çok arkadaşım onu seçti — büyüklük/güzellik gibi veriye dayanmayan
// gerekçeler çeldiricidir). Sayılar sütun yüksekliğinden okunur; doğru cevap
// ekrandaki görsele bakmadan (yalnız hedefi eşlemekle) bulunamaz.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

const FRIENDS = ['👦', '👧🏽', '🧒🏻', '👧', '👦🏽', '🧒', '👧🏻'];
const COLORS = ['#EF5350', '#42A5F5', '#66BB6A'];

type Phase = 'collect' | 'source' | 'read' | 'why';

interface Survey {
  question: string;       // seslendirilen soru (statik klip)
  ask: 'most' | 'least';
  options: string[];      // kategori emojileri
  picks: number[];        // her arkadaşın seçtiği kategori indeksi
}

// Sayılar bilerek tek en çok / tek en az çıkacak şekilde küratörlü (eşitlik yok).
const SURVEYS: Survey[] = [
  { question: 'Arkadaşlarına sor: En çok hangi meyveyi seviyorlar?', ask: 'most', options: ['🍎', '🍌'], picks: [0, 0, 1, 0, 1] },
  { question: 'Şimdi sor: En çok hangi hayvanı seviyorlar?', ask: 'most', options: ['🐶', '🐱'], picks: [1, 0, 1, 1, 0] },
  { question: 'Şimdi sor: En çok hangi rengi seviyorlar?', ask: 'most', options: ['🔴', '🔵', '🟢'], picks: [0, 1, 0, 2, 0, 1, 0] },
  { question: 'Şimdi sor: En çok hangi oyuncağı seviyorlar?', ask: 'most', options: ['⚽', '🧸', '🚗'], picks: [1, 1, 0, 2, 1, 0, 1] },
  { question: 'Son soru: Hangi dondurmayı en az seviyorlar?', ask: 'least', options: ['🍫', '🍓', '🍋'], picks: [0, 1, 0, 1, 2, 0, 1] },
];
const TOTAL_ROUNDS = SURVEYS.length;

const SAY_COLLECT = 'Arkadaşlarına dokun. Hepsine sor.';
const SAY_SOURCE = 'Bu bilgiyi nereden öğrendik? Doğru kartı seç.';
const SAY_SOURCE_OK = 'Evet! Arkadaşlarımıza sorduk.';
const SAY_SOURCE_WRONG = 'Hmm, biz arkadaşlarımıza sormuştuk. Tekrar bak.';
const SAY_READ_MOST = 'En çok seçilen hangisi? Dokun.';
const SAY_READ_LEAST = 'En az seçilen hangisi? Dokun.';
const SAY_READ_OK_MOST = 'Doğru! Sütunu en yüksek olan en çok seçilmiş.';
const SAY_READ_OK_LEAST = 'Doğru! Sütunu en kısa olan en az seçilmiş.';
const SAY_READ_WRONG = 'Sütunlara bir daha bak.';
const SAY_WHY = 'Neden en çok seçilmiş olabilir?';
const SAY_WHY_OK = 'Evet! Çünkü daha çok arkadaşım onu seçti.';
const SAY_WHY_WRONG = 'Hmm, sayılara bakalım.';

const SOURCES = [
  { id: 'ask', emoji: '🧒🗣️', label: 'Arkadaşlarıma sordum', correct: true },
  { id: 'tv', emoji: '📺', label: 'Televizyonda gördüm', correct: false },
  { id: 'guess', emoji: '🤔', label: 'Tahmin ettim', correct: false },
];
const REASONS = [
  { id: 'count', emoji: '👥👍', say: 'Çünkü çok arkadaşım onu seçti.', correct: true },
  { id: 'big', emoji: '🐘', say: 'Çünkü çok büyük.', correct: false },
  { id: 'pretty', emoji: '✨', say: 'Çünkü çok güzel.', correct: false },
];

interface Props {
  onGameEnd: RoundGameEnd;
  onExit?: () => void;
  childName?: string;
}

export default function MinikAnketci({ onGameEnd, onExit, childName }: Props) {
  const game = useRoundGame({
    oyunAdi: 'minik-anketci',
    totalRounds: TOTAL_ROUNDS,
    kazanimOdagi: 'Matematik: Veriyle Çalışabilme ve Bulguyu Yorumlayabilme (MAB.11, MAB.13)',
    onGameEnd,
  });
  const { round, gameReady, showConfetti } = game;
  const survey = SURVEYS[Math.min(round - 1, SURVEYS.length - 1)];

  const [phase, setPhase] = useState<Phase>('collect');
  const [asked, setAsked] = useState<boolean[]>([]);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [okKey, setOkKey] = useState<string | null>(null);
  const busyRef = useRef(false);
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;

  const counts = survey.options.map((_, ci) => survey.picks.reduce((n, p, fi) => n + (p === ci && asked[fi] ? 1 : 0), 0));
  const fullCounts = survey.options.map((_, ci) => survey.picks.filter((p) => p === ci).length);
  const targetIdx = survey.ask === 'most' ? fullCounts.indexOf(Math.max(...fullCounts)) : fullCounts.indexOf(Math.min(...fullCounts));
  const maxCount = Math.max(...fullCounts);

  useEffect(() => {
    if (!gameReady) return;
    const s = SURVEYS[Math.min(round - 1, SURVEYS.length - 1)];
    setPhase('collect');
    setAsked(s.picks.map(() => false));
    setWrongKey(null);
    setOkKey(null);
    busyRef.current = false;
    pop.setValue(0.9);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speakThenWait(s.question, 600, { instructions: HAPPY_VOICE }).then(() => {
      speak(SAY_COLLECT, { instructions: HAPPY_VOICE });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const flashWrong = (key: string) => {
    setWrongKey(key);
    Animated.sequence([
      Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
    ]).start();
    game.later(() => setWrongKey(null), 500);
  };

  const handleFriend = (fi: number) => {
    if (phase !== 'collect' || asked[fi]) return;
    game.markMove();
    const next = asked.map((a, i) => (i === fi ? true : a));
    setAsked(next);
    if (next.every(Boolean)) {
      game.later(() => {
        setPhase('source');
        speak(SAY_SOURCE, { instructions: HAPPY_VOICE });
      }, 900);
    }
  };

  const handleSource = (s: typeof SOURCES[number]) => {
    if (phase !== 'source' || busyRef.current) return;
    if (!s.correct) {
      game.markWrong();
      flashWrong('src-' + s.id);
      speak(SAY_SOURCE_WRONG, { instructions: HAPPY_VOICE });
      return;
    }
    game.markMove();
    busyRef.current = true;
    setOkKey('src-' + s.id);
    speakThenWait(SAY_SOURCE_OK, 1300, { instructions: HAPPY_VOICE }).then(() => {
      setOkKey(null);
      busyRef.current = false;
      setPhase('read');
      speak(survey.ask === 'most' ? SAY_READ_MOST : SAY_READ_LEAST, { instructions: HAPPY_VOICE });
    });
  };

  const finishRound = () => {
    game.markCorrect();
    game.later(game.advance, 1100);
  };

  const handleColumn = (ci: number) => {
    if (phase !== 'read' || busyRef.current) return;
    if (ci !== targetIdx) {
      game.markWrong();
      flashWrong('col-' + ci);
      speak(SAY_READ_WRONG, { instructions: HAPPY_VOICE });
      return;
    }
    game.markMove();
    busyRef.current = true;
    setOkKey('col-' + ci);
    const ok = survey.ask === 'most' ? SAY_READ_OK_MOST : SAY_READ_OK_LEAST;
    speakThenWait(ok, 1700, { instructions: HAPPY_VOICE }).then(() => {
      setOkKey(null);
      busyRef.current = false;
      if (survey.ask === 'most') {
        setPhase('why');
        speak(SAY_WHY, { instructions: HAPPY_VOICE });
      } else {
        finishRound();
      }
    });
  };

  const handleReason = (r: typeof REASONS[number]) => {
    if (phase !== 'why' || busyRef.current) return;
    if (!r.correct) {
      game.markWrong();
      flashWrong('why-' + r.id);
      speakThenWait(r.say, 1500, { instructions: HAPPY_VOICE }).then(() => speak(SAY_WHY_WRONG, { instructions: HAPPY_VOICE }));
      return;
    }
    busyRef.current = true;
    setOkKey('why-' + r.id);
    speakThenWait(r.say, 1500, { instructions: HAPPY_VOICE }).then(() => speakThenWait(SAY_WHY_OK, 1700, { instructions: HAPPY_VOICE })).then(() => {
      setOkKey(null);
      busyRef.current = false;
      finishRound();
    });
  };

  const replayPrompt = () => {
    const line = phase === 'collect' ? survey.question
      : phase === 'source' ? SAY_SOURCE
      : phase === 'read' ? (survey.ask === 'most' ? SAY_READ_MOST : SAY_READ_LEAST)
      : SAY_WHY;
    speak(line, { instructions: HAPPY_VOICE });
  };

  const chartW = Math.min(SCREEN_W - 32, 380);
  const colW = Math.min(88, (chartW - 16 * (survey.options.length - 1)) / survey.options.length);
  const chipSize = 26;

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Arkadaşlarına sor, cevapları say ve en çok seçileni bul."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => game.setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}><Text style={styles.roundText}>📋 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.qCard, { transform: [{ scale: pop }] }]}>
          <View style={styles.qOptions}>
            {survey.options.map((o, i) => (
              <Text key={i} style={styles.qOption}>{o}</Text>
            ))}
          </View>
        </Animated.View>
        <ListenButton onPress={replayPrompt} color="#00897B" style={{ marginTop: 8 }} />

        {/* Arkadaşlar */}
        <View style={styles.friends}>
          {FRIENDS.slice(0, survey.picks.length).map((f, fi) => (
            <TouchableOpacity
              key={fi}
              style={[styles.friend, asked[fi] && styles.friendDone]}
              onPress={() => handleFriend(fi)}
              disabled={phase !== 'collect' || !!asked[fi]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Arkadaş ${fi + 1}`}
            >
              <Text style={styles.friendFace}>{f}</Text>
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>{asked[fi] ? survey.options[survey.picks[fi]] : '❓'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sütun grafiği */}
        <View style={[styles.chart, { width: chartW }]}>
          {survey.options.map((o, ci) => {
            const isWrong = wrongKey === 'col-' + ci;
            const isOk = okKey === 'col-' + ci;
            return (
              <Animated.View key={ci} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                <TouchableOpacity
                  style={[styles.col, { width: colW }, phase === 'read' && styles.colTappable, isWrong && styles.colWrong, isOk && styles.colOk]}
                  onPress={() => handleColumn(ci)}
                  disabled={phase !== 'read'}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Sütun ${ci + 1}`}
                >
                  <View style={[styles.stack, { height: chipSize * maxCount + 8 }]}>
                    {Array.from({ length: counts[ci] }).map((_, k) => (
                      <View key={k} style={[styles.chip, { width: colW - 20, height: chipSize - 4, backgroundColor: COLORS[ci] }]}>
                        <Text style={styles.chipEmoji}>{o}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.base}>{o}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Aşamaya göre kart paneli */}
        {phase === 'source' && (
          <View style={styles.cards}>
            {SOURCES.map((s) => {
              const isWrong = wrongKey === 'src-' + s.id;
              const isOk = okKey === 'src-' + s.id;
              return (
                <Animated.View key={s.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                  <TouchableOpacity style={[styles.card, isWrong && styles.cardWrong, isOk && styles.cardOk]} onPress={() => handleSource(s)} activeOpacity={0.85}>
                    <Text style={styles.cardEmoji}>{s.emoji}</Text>
                    <Text style={styles.cardLabel}>{s.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
        {phase === 'why' && (
          <View style={styles.cards}>
            {REASONS.map((r) => {
              const isWrong = wrongKey === 'why-' + r.id;
              const isOk = okKey === 'why-' + r.id;
              return (
                <Animated.View key={r.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                  <TouchableOpacity style={[styles.card, isWrong && styles.cardWrong, isOk && styles.cardOk]} onPress={() => handleReason(r)} activeOpacity={0.85}>
                    <Text style={styles.cardEmoji}>{r.emoji}</Text>
                    <Text style={styles.cardLabel}>{r.say.replace('Çünkü ', '').replace(/\.$/, '')}</Text>
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
  container: { flex: 1, backgroundColor: '#E0F2F1', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#00695C' },
  content: { alignItems: 'center', paddingHorizontal: 12, paddingBottom: 28 },

  qCard: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 26, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 5 },
  qOptions: { flexDirection: 'row', gap: 18 },
  qOption: { fontSize: 46 },

  friends: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16, maxWidth: 420 },
  friend: { width: 54, alignItems: 'center', paddingVertical: 4, borderRadius: 16, backgroundColor: '#fff', borderWidth: 3, borderColor: '#B2DFDB' },
  friendDone: { borderColor: '#26A69A', backgroundColor: '#E0F7FA' },
  friendFace: { fontSize: 32 },
  bubble: { marginTop: 2, minWidth: 34, height: 30, borderRadius: 12, backgroundColor: '#FFF9C4', alignItems: 'center', justifyContent: 'center' },
  bubbleText: { fontSize: 20 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 16, marginTop: 18, paddingVertical: 10, borderRadius: 22, backgroundColor: '#fff' },
  col: { alignItems: 'center', borderRadius: 16, paddingBottom: 6, borderWidth: 3, borderColor: 'transparent' },
  colTappable: { borderColor: '#80CBC4', backgroundColor: '#F1FBFA' },
  colWrong: { backgroundColor: '#FFCDD2', borderColor: '#E57373' },
  colOk: { backgroundColor: '#C8E6C9', borderColor: '#43A047' },
  stack: { justifyContent: 'flex-end', alignItems: 'center', gap: 2, paddingTop: 4 },
  chip: { borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  chipEmoji: { fontSize: 12 },
  base: { fontSize: 34, marginTop: 4 },

  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 16, maxWidth: 420 },
  card: { width: 104, minHeight: 108, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 8, borderWidth: 3, borderColor: '#80CBC4', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 3 },
  cardWrong: { backgroundColor: '#FFCDD2', borderColor: '#E57373' },
  cardOk: { backgroundColor: '#C8E6C9', borderColor: '#43A047' },
  cardEmoji: { fontSize: 34 },
  cardLabel: { fontSize: 12, fontWeight: '800', color: '#004D40', textAlign: 'center', marginTop: 4 },
});
