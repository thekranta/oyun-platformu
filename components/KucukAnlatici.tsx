import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 📖 KÜÇÜK ANLATICI - Sözlü anlatım / öykü sıralama (Türkçe/TAKB.1)
// 4 karışık hikâye kartını DOĞRU sıraya (önce->sonra) dokunarak diz. Kendini
// düzeltir: yanlış kart yerleşmez (sallanır), yalnız doğru sıra ilerler.
// Sıralama bitince örnek bir anlatı seslendirilir, sonra çocuk "kendi
// cümleleriyle" anlatmaya davet edilir (mikrofonsuz, doğrulanmaz — açık uçlu).
// Ölçülebilir çekirdek: kendini düzelten sıralama. Anlatım adımı serbesttir.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

// Her hikâye = 4 kart (emoji + kısa etiket) DOĞRU sırada + sıralama sonrası
// seslendirilecek SABİT örnek anlatı. Tüm anlatılar statiktir (hazır-MP3 üretilebilir).
interface StorySet {
  title: string;
  cards: { emoji: string; text: string }[];
  narration: string;
}

const STORIES: StorySet[] = [
  {
    title: 'Çiçek nasıl açar?',
    cards: [
      { emoji: '🌰', text: 'Tohum ektik' },
      { emoji: '💧', text: 'Suladık' },
      { emoji: '🌱', text: 'Filizlendi' },
      { emoji: '🌸', text: 'Çiçek açtı' },
    ],
    narration: 'Önce toprağa tohumu ektik. Sonra her gün suladık. Tohum yavaşça filizlendi. En sonunda güzel bir çiçek açtı!',
  },
  {
    title: 'Civciv nasıl doğar?',
    cards: [
      { emoji: '🥚', text: 'Yumurta' },
      { emoji: '🐣', text: 'Çatladı' },
      { emoji: '🐤', text: 'Civciv çıktı' },
      { emoji: '🐔', text: 'Tavuk oldu' },
    ],
    narration: 'Önce yuvada bir yumurta vardı. Sonra yumurta çatladı. İçinden minik bir civciv çıktı. En sonunda civciv büyüyüp tavuk oldu!',
  },
  {
    title: 'Ev nasıl yapılır?',
    cards: [
      { emoji: '🧱', text: 'Tuğlalar' },
      { emoji: '🏗️', text: 'İnşaat' },
      { emoji: '🏠', text: 'Ev bitti' },
      { emoji: '🎉', text: 'Kutladık' },
    ],
    narration: 'Önce tuğlaları taşıdık. Sonra ustalar çalışmaya başladı. Kocaman bir ev yapıldı. En sonunda hep birlikte kutladık!',
  },
  {
    title: 'Kardan adam',
    cards: [
      { emoji: '❄️', text: 'Kar yağdı' },
      { emoji: '⛄', text: 'Kardan adam' },
      { emoji: '☀️', text: 'Güneş açtı' },
      { emoji: '💧', text: 'Eridi' },
    ],
    narration: 'Önce lapa lapa kar yağdı. Sonra bahçede kardan adam yaptık. Derken güneş açtı. En sonunda kardan adam eriyip su oldu!',
  },
  {
    title: 'Elmayı nasıl yeriz?',
    cards: [
      { emoji: '🌳', text: 'Elma ağacı' },
      { emoji: '🧺', text: 'Topladık' },
      { emoji: '🚰', text: 'Yıkadık' },
      { emoji: '😋', text: 'Yedik' },
    ],
    narration: 'Önce elma ağacının yanına gittik. Sonra sepete kırmızı elmalar topladık. Elmaları muslukta güzelce yıkadık. En sonunda afiyetle yedik!',
  },
  {
    title: 'Gökkuşağı nasıl çıkar?',
    cards: [
      { emoji: '☁️', text: 'Bulutlandı' },
      { emoji: '🌧️', text: 'Yağmur' },
      { emoji: '☂️', text: 'Şemsiye' },
      { emoji: '🌈', text: 'Gökkuşağı' },
    ],
    narration: 'Önce gökyüzü bulutlandı. Sonra yağmur yağmaya başladı. Şemsiyemizi açtık. En sonunda rengârenk bir gökkuşağı çıktı!',
  },
];

const TOTAL_ROUNDS = STORIES.length;

interface Card { id: number; order: number; emoji: string; text: string }

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Kartları karıştır; tam sıralı (zaten çözülmüş) düşmesin diye en az bir kez yeniden dener.
const orderCards = (base: { emoji: string; text: string }[]): Card[] => {
  const built = base.map((c, order) => ({ order, emoji: c.emoji, text: c.text }));
  let arr = shuffle(built);
  let guard = 0;
  while (guard++ < 12 && arr.every((c, i) => c.order === i)) arr = shuffle(built);
  return arr.map((c, i) => ({ ...c, id: i }));
};

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function KucukAnlatici({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [title, setTitle] = useState('');
  const [narration, setNarration] = useState('');
  const [expected, setExpected] = useState(0);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [narratePhase, setNarratePhase] = useState(false); // sıralama bitti -> "Şimdi sen anlat" paneli
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const prevRef = useRef<string | null>(null);
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const roundDoneRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const pool = STORIES.filter((s) => s.title !== prevRef.current);
    const story = pool[Math.floor(Math.random() * pool.length)];
    prevRef.current = story.title;
    setCards(orderCards(story.cards));
    setTitle(story.title);
    setNarration(story.narration);
    setExpected(0);
    setWrongId(null);
    setNarratePhase(false);
    setShowConfetti(false);
    roundDoneRef.current = false;
    speak('Kartları doğru sıraya koy! Önce ne oldu?', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('kucuk-anlatici', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Türkçe: Konuşma Sürecini Yönetme — Sözlü Anlatım (TAKB.1)',
      correct_answers: correctRef.current,
    });
  };

  // Sıralama: doğru SONRAKİ karta dokun -> yerleşir/ilerler; yanlış -> sallanır, kilitlenmez.
  const handleTap = (card: Card) => {
    if (roundDoneRef.current || narratePhase || card.order < expected) return; // yerleşmiş/bitmiş
    movesRef.current += 1;
    if (card.order === expected) {
      correctRef.current += 1;
      const next = expected + 1;
      setExpected(next);
      if (next >= cards.length) {
        // Hikâye doğru sıralandı -> örnek anlatıyı seslendir, sonra "Şimdi sen anlat" paneli.
        roundDoneRef.current = true;
        setShowConfetti(true);
        speakThenWait(narration, 1500, { instructions: HAPPY_VOICE }).then(() => {
          if (!isMountedRef.current) return;
          setNarratePhase(true);
        });
      }
    } else {
      errorsRef.current += 1;
      setWrongId(card.id);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongId(null), 450);
      timersRef.current.push(t);
    }
  };

  // "Bitti ✓" -> çocuk anlatımını bitirdi (doğrulanmaz, açık uçlu) -> sonraki hikâye / oyun sonu.
  const handleBitti = () => {
    if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
    else finish();
  };

  const orderedCards = cards.slice().sort((a, b) => a.order - b.order);

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Hikâye kartlarını sırala! Sonra hikâyeyi kendi cümlelerinle anlat."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#5E35B1" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>📖 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      {!narratePhase ? (
        <>
          <Text style={styles.prompt}>Hikâyeyi sırala 📖</Text>
          <Text style={styles.hint}>Sıradaki: {expected + 1}.</Text>

          <TouchableOpacity
            style={styles.listenBtn}
            onPress={() => speak('Kartları doğru sıraya koy! Önce ne oldu?', { instructions: HAPPY_VOICE })}
            activeOpacity={0.85}
          >
            <Ionicons name="volume-high" size={18} color="#fff" />
            <Text style={styles.listenText}>Tekrar Dinle</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            {cards.map((card) => {
              const placed = card.order < expected;
              const isWrong = wrongId === card.id;
              return (
                <Animated.View key={card.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
                  <TouchableOpacity style={[styles.card, placed && styles.cardPlaced]} onPress={() => handleTap(card)} activeOpacity={0.85} disabled={placed}>
                    <Text style={styles.cardEmoji}>{card.emoji}</Text>
                    <Text style={styles.cardText}>{card.text}</Text>
                    {placed && <View style={styles.orderBadge}><Text style={styles.orderText}>{card.order + 1}</Text></View>}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          <Text style={styles.storyTitle}>{title}</Text>
        </>
      ) : (
        <>
          <Text style={styles.prompt}>🎤 Şimdi sen anlat!</Text>

          <View style={styles.row}>
            {orderedCards.map((card) => (
              <View key={card.id} style={[styles.card, styles.cardPlaced]}>
                <Text style={styles.cardEmoji}>{card.emoji}</Text>
                <Text style={styles.cardText}>{card.text}</Text>
                <View style={styles.orderBadge}><Text style={styles.orderText}>{card.order + 1}</Text></View>
              </View>
            ))}
          </View>

          <View style={styles.narratePanel}>
            <Text style={styles.micHint}>Kartlara bak, hikâyeyi kendi cümlelerinle anlat.</Text>
            <TouchableOpacity style={styles.replayBtn} onPress={() => speak(narration, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
              <Ionicons name="volume-high" size={18} color="#7E57C2" />
              <Text style={styles.replayText}>Örneği Tekrar Dinle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bittiBtn} onPress={handleBitti} activeOpacity={0.9}>
              <Text style={styles.bittiText}>Bitti ✓</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1EAFB', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#5E35B1' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#5E35B1', marginTop: 12, textAlign: 'center', paddingHorizontal: 16 },
  hint: { fontSize: 15, fontWeight: '700', color: '#9575CD', marginTop: 2 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7E57C2', paddingVertical: 9, paddingHorizontal: 18, borderRadius: 22, marginTop: 12, marginBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 10, marginTop: 12, maxWidth: 400 },
  card: { width: 82, height: 104, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  cardPlaced: { backgroundColor: '#E4D8F6' },
  cardEmoji: { fontSize: 44 },
  cardText: { fontSize: 11, fontWeight: '800', color: '#5E35B1', marginTop: 3, textAlign: 'center' },
  orderBadge: { position: 'absolute', top: -6, left: -6, width: 28, height: 28, borderRadius: 14, backgroundColor: '#7E57C2', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  orderText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  storyTitle: { fontSize: 16, fontWeight: '800', color: '#9575CD', marginTop: 20, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 16 },

  narratePanel: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, borderWidth: 2, borderColor: '#D1C4E9', paddingVertical: 18, paddingHorizontal: 22, marginTop: 22, maxWidth: 360, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  micHint: { fontSize: 15, fontWeight: '700', color: '#6A4C9C', textAlign: 'center', marginBottom: 14 },
  replayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EDE7F6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginBottom: 16 },
  replayText: { color: '#7E57C2', fontSize: 14, fontWeight: '800' },
  bittiBtn: { backgroundColor: '#43A047', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 26, shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  bittiText: { color: '#fff', fontSize: 20, fontWeight: '900' },
});
