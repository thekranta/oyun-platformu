import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { speak, speakThenWait } from '../services/speechService';
import ListenButton from './ListenButton';

// ============================================
// ↔️ ZITLARI EŞLEŞTİR - Zıt kavramlar (Dil / Kavram gelişimi, 3-5 yaş)
// Kartlar açık durur; çocuk her kavramı ZITTIYLA eşler (☀️↔🌙, 🐘↔🐜).
// Aynı görseli değil, FARKLI ama zıt kavramı bulur = gerçek öğrenme.
// Ses gelmese de görsel çalışır; kavram adları seslendirilir.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 4;
const PAIRS_PER_ROUND = 3;

// emojiSize: emoji'lerin kendi glif boyutu neyi temsil ettiğinden bağımsızdır (bir fil
// ile bir karınca emoji'si aynı font-size'da neredeyse aynı görsel boyutta çıkar) — bu
// yüzden "Büyük/Küçük" gibi boyut karşıtlığına dayanan çiftlerde, karşıtlık göze
// görünsün diye açıkça farklı fontSize veriliyor. Diğer çiftlerde (boyutla ilgisi
// olmayan kavramlar) varsayılan boyut kullanılır.
interface Item { emoji: string; name: string; emojiSize?: number }
interface Pair { a: Item; b: Item }

const PAIRS: Pair[] = [
  { a: { emoji: '☀️', name: 'Gündüz' }, b: { emoji: '🌙', name: 'Gece' } },
  { a: { emoji: '🔥', name: 'Sıcak' }, b: { emoji: '❄️', name: 'Soğuk' } },
  { a: { emoji: '😊', name: 'Mutlu' }, b: { emoji: '😢', name: 'Üzgün' } },
  { a: { emoji: '🐘', name: 'Büyük', emojiSize: 70 }, b: { emoji: '🐜', name: 'Küçük', emojiSize: 26 } },
  { a: { emoji: '🐇', name: 'Hızlı' }, b: { emoji: '🐢', name: 'Yavaş' } },
  { a: { emoji: '⬆️', name: 'Yukarı' }, b: { emoji: '⬇️', name: 'Aşağı' } },
  { a: { emoji: '📖', name: 'Açık' }, b: { emoji: '📕', name: 'Kapalı' } },
];

// Not: Temalı varyant (zitlari-eslestir-2 / Günlük Hayat Zıtları, bkz.
// components/gameRegistry.tsx) için ikinci çift seti registry'de tanımlanır
// (lazyWithReload'ın kod bölme amacını bozmamak için burada named export YOK).

interface Card { cardId: number; pairId: number; emoji: string; name: string; emojiSize?: number }

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildRound = (pairs: Pair[]): Card[] => {
  const chosen = shuffle(pairs).slice(0, PAIRS_PER_ROUND);
  const cards: Card[] = [];
  chosen.forEach((p, pairId) => {
    cards.push({ cardId: 0, pairId, emoji: p.a.emoji, name: p.a.name, emojiSize: p.a.emojiSize });
    cards.push({ cardId: 0, pairId, emoji: p.b.emoji, name: p.b.name, emojiSize: p.b.emojiSize });
  });
  return shuffle(cards).map((c, i) => ({ ...c, cardId: i }));
};

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
  pairs?: Pair[];       // temalı varyant için zıt-çift seti (verilmezse varsayılan set)
  oyunAdi?: string;     // varyant oyun kimliği
  title?: string;       // tur rozetindeki emoji+başlık (verilmezse ↔️)
  introMessage?: string; // giriş sesi metni (temalı varyant için)
}

export default function ZitlariEslestir({ onGameEnd, onExit, childName, pairs = PAIRS, oyunAdi = 'zitlari-eslestir', title = '↔️', introMessage = 'Birbirinin zıddı olan kartları eşleştir! Gündüz - gece gibi.' }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [firstId, setFirstId] = useState<number | null>(null);
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => {
    isMountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
  }, []);

  // Her tur: yeni zıt çiftleri
  useEffect(() => {
    if (!gameReady) return;
    setCards(buildRound(pairs));
    setMatched(new Set());
    setFirstId(null);
    setWrongIds([]);
    setLocked(false);
    speak('Zıt olanları eşleştir!', { instructions: HAPPY_VOICE });
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd(oyunAdi, duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Dil ve Kavram Gelişimi: Zıt Kavramlar',
      correct_answers: correctRef.current,
    });
  };

  const runShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
    ]).start();
  };

  const handleTap = (card: Card) => {
    if (locked || matched.has(card.cardId)) return;

    if (firstId === null) {
      setFirstId(card.cardId);
      return;
    }
    if (firstId === card.cardId) return; // aynı kart

    movesRef.current += 1;
    const firstCard = cards.find((c) => c.cardId === firstId);
    if (!firstCard) { setFirstId(null); return; }

    if (firstCard.pairId === card.pairId) {
      // doğru zıt çift
      correctRef.current += 1;
      const next = new Set(matched);
      next.add(firstCard.cardId);
      next.add(card.cardId);
      setMatched(next);
      setFirstId(null);
      const fb = `${firstCard.name} ile ${card.name} zıttır. Aferin!`;

      if (next.size >= cards.length) {
        const roundDone = round >= TOTAL_ROUNDS;
        if (roundDone) setShowConfetti(true);
        speakThenWait(fb, roundDone ? 1500 : 900, { instructions: HAPPY_VOICE }).then(() => {
          if (!isMountedRef.current) return;
          if (roundDone) finish();
          else setRound((r) => r + 1);
        });
      } else {
        speak(fb, { instructions: HAPPY_VOICE });
      }
    } else {
      // zıt değil - nazik uyarı
      errorsRef.current += 1;
      setWrongIds([firstId, card.cardId]);
      setLocked(true);
      runShake();
      const t = setTimeout(() => {
        setWrongIds([]);
        setFirstId(null);
        setLocked(false);
      }, 650);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={120} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}

      {!gameReady && (
        <CountdownOverlay
          message={introMessage}
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <GameExitButton onPress={onExit ?? (() => {})} />
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>{title} {round}/{TOTAL_ROUNDS}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.contentArea}>
        <Text style={styles.prompt}>Zıt olanları eşleştir!</Text>

        <ListenButton onPress={() => speak('Zıt olanları eşleştir!', { instructions: HAPPY_VOICE })} color="#B54708" style={{ marginTop: 12 }} />

        <View style={styles.grid}>
          {cards.map((card) => {
            const isMatched = matched.has(card.cardId);
            const isSelected = firstId === card.cardId;
            const isWrong = wrongIds.includes(card.cardId);
            return (
              <Animated.View key={card.cardId} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                <TouchableOpacity
                  style={[
                    styles.card,
                    isSelected && styles.cardSelected,
                    isMatched && styles.cardMatched,
                    isWrong && styles.cardWrong,
                  ]}
                  onPress={() => handleTap(card)}
                  activeOpacity={0.85}
                  disabled={isMatched}
                >
                  <Text style={[styles.cardEmoji, card.emojiSize ? { fontSize: card.emojiSize } : undefined]}>{card.emoji}</Text>
                  <Text style={[styles.cardName, isMatched && styles.cardNameMatched]}>{card.name}</Text>
                  {isMatched && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0', alignItems: 'center' },
  // Header sabit en üstte kalsın (çıkış butonu standardıyla tutarlı); geri kalan içerik
  // (soru + Tekrar Dinle + kart ızgarası) altındaki boş alanda dikey ortalanır — önceden
  // container'da justifyContent olmadığından hepsi ekranın üstüne yığılıyordu.
  contentArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#B54708' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#B54708', marginTop: 10, marginBottom: 6 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8, maxWidth: 400, paddingHorizontal: 8 },
  card: { width: 104, height: 116, borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, borderColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  cardSelected: { borderColor: '#FF8A00', backgroundColor: '#FFF3E0', transform: [{ scale: 1.04 }] },
  cardMatched: { borderColor: '#57D971', backgroundColor: '#EAFBEF' },
  cardWrong: { borderColor: '#FF6B6B' },
  cardEmoji: { fontSize: 50 },
  cardName: { fontSize: 14, fontWeight: '900', color: '#5A3A1E' },
  cardNameMatched: { color: '#2E7D5B' },
  checkBadge: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#57D971', alignItems: 'center', justifyContent: 'center' },
});
