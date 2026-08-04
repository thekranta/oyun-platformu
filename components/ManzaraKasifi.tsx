import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🗺️ MANZARA KAŞİFİ - Mekânın coğrafi koşulları (Sosyal, SAB.10)
// Bir YER/manzara emojisi gösterilir (çöl, kutup, deniz, orman, dağ, volkan).
// Çocuk "burada ne bulunur?" sorusuna, o yerin coğrafi koşuluna UYAN nesneyi
// seçer (çöl→sıcak/kum→kaktüs, kutup→soğuk/buz→penguen). Yer ile cevap FARKLI
// emojilerdir; ortak coğrafi koşulu düşünmek gerekir (akıl yürütme).
// Onay cümlesi yeri de ADLANDIRIR (nomenklatür): "Aferin! Burası çöl...".
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

interface Item { emoji: string; name: string }
interface Round {
  place: string;        // ekranda gösterilen YER emojisi
  correct: Item;        // o yerin koşuluna uyan doğru nesne
  wrong: [Item, Item];  // başka yerlere ait, makul-yanlış çeldiriciler
  confirm: string;      // yeri adlandıran STATİK onay cümlesi
}

// Küratörlü turlar (6 farklı yer). Her oyunda karıştırılıp ilk TOTAL_ROUNDS'u oynanır.
const ROUNDS: Round[] = [
  {
    place: '🏜️',
    correct: { emoji: '🌵', name: 'Kaktüs' },
    wrong: [{ emoji: '🐧', name: 'Penguen' }, { emoji: '🐟', name: 'Balık' }],
    confirm: 'Aferin! Burası çöl. Çölde hava çok sıcaktır, her yer kumla kaplıdır ve kaktüsler yetişir.',
  },
  {
    place: '🏜️',
    correct: { emoji: '🐫', name: 'Deve' },
    wrong: [{ emoji: '🐳', name: 'Balina' }, { emoji: '🐻‍❄️', name: 'Kutup ayısı' }],
    confirm: 'Aferin! Burası çöl. Çöl sıcak ve kumludur. Develer bu sıcak kumlarda uzun uzun yürüyebilir.',
  },
  {
    place: '❄️',
    correct: { emoji: '🐧', name: 'Penguen' },
    wrong: [{ emoji: '🌵', name: 'Kaktüs' }, { emoji: '🐒', name: 'Maymun' }],
    confirm: 'Aferin! Burası kutup. Kutupta her yer buz ve karla kaplıdır, hava çok soğuktur. Penguenler orada yaşar.',
  },
  {
    place: '❄️',
    correct: { emoji: '🐻‍❄️', name: 'Kutup ayısı' },
    wrong: [{ emoji: '🐫', name: 'Deve' }, { emoji: '🐠', name: 'Balık' }],
    confirm: 'Aferin! Burası kutup. Kutup buz gibi soğuktur, karla kaplıdır. Kutup ayıları kalın kürkleriyle orada yaşar.',
  },
  {
    place: '🌊',
    correct: { emoji: '🐟', name: 'Balık' },
    wrong: [{ emoji: '🐫', name: 'Deve' }, { emoji: '🐻', name: 'Ayı' }],
    confirm: 'Aferin! Burası deniz. Deniz baştan başa suyla doludur ve içinde balıklar yüzer.',
  },
  {
    place: '🌊',
    correct: { emoji: '🦀', name: 'Yengeç' },
    wrong: [{ emoji: '🦅', name: 'Kartal' }, { emoji: '🌵', name: 'Kaktüs' }],
    confirm: 'Aferin! Burası deniz. Denizde su vardır; balıklar, yengeçler ve birçok deniz canlısı orada yaşar.',
  },
  {
    place: '🌳',
    correct: { emoji: '🦌', name: 'Geyik' },
    wrong: [{ emoji: '🐧', name: 'Penguen' }, { emoji: '🐙', name: 'Ahtapot' }],
    confirm: 'Aferin! Burası orman. Ormanda kocaman ağaçlar vardır; geyikler ve birçok hayvan orada yaşar.',
  },
  {
    place: '🌳',
    correct: { emoji: '🍄', name: 'Mantar' },
    wrong: [{ emoji: '🐟', name: 'Balık' }, { emoji: '🐫', name: 'Deve' }],
    confirm: 'Aferin! Burası orman. Orman yemyeşil ağaçlarla doludur; nemli ve gölgeli toprakta mantarlar biter.',
  },
  {
    place: '🏔️',
    correct: { emoji: '🐐', name: 'Dağ keçisi' },
    wrong: [{ emoji: '🐟', name: 'Balık' }, { emoji: '🐧', name: 'Penguen' }],
    confirm: 'Aferin! Burası dağ. Dağlar çok yüksektir, tepesi karla kaplıdır. Dağ keçileri kayalara tırmanır.',
  },
  {
    place: '🌋',
    correct: { emoji: '🔥', name: 'Ateş' },
    wrong: [{ emoji: '🐧', name: 'Penguen' }, { emoji: '🐟', name: 'Balık' }],
    confirm: 'Aferin! Burası volkan. Volkanın içi çok sıcaktır; kızgın lavlar ve ateş püskürür.',
  },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
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

export default function ManzaraKasifi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [current, setCurrent] = useState<Round>(ROUNDS[0]);
  const [options, setOptions] = useState<Item[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const orderRef = useRef<Round[]>(shuffle(ROUNDS));
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const cur = orderRef.current[(round - 1) % orderRef.current.length];
    setCurrent(cur);
    setOptions(shuffle([cur.correct, ...cur.wrong]));
    setLocked(false);
    setWrong(null);
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak('Burası nasıl bir yer? Buraya uyanı seç!', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('manzara-kasifi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal: Mekânın Coğrafi Koşulları (SAB.10)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (item: Item) => {
    if (locked) return;
    movesRef.current += 1;
    if (item.emoji === current.correct.emoji) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait(current.confirm, 1600, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrong(item.emoji);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrong(null), 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Manzaraları keşfedelim! Burası nasıl bir yer, buraya uyanı bul."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🗺️ {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Burada ne bulunur?</Text>
      <Animated.View style={[styles.placeCard, { transform: [{ scale: bounce }] }]}>
        <Text style={styles.placeEmoji}>{current.place}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak('Burası nasıl bir yer? Buraya uyanı seç!', { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((item) => {
          const isWrong = wrong === item.emoji;
          return (
            <Animated.View key={item.emoji} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity style={[styles.optCard, isWrong && styles.optWrong]} onPress={() => handlePick(item)} activeOpacity={0.85}>
                <Text style={styles.optEmoji}>{item.emoji}</Text>
                <Text style={styles.optName}>{item.name}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F8E9', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#2E7D32' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#2E7D32', marginTop: 8 },
  placeCard: { width: 140, height: 140, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  placeEmoji: { fontSize: 90 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#43A047', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 20, flexWrap: 'wrap', maxWidth: 440, paddingHorizontal: 12 },
  optCard: { width: 116, height: 120, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  optWrong: { backgroundColor: '#FFE0E0' },
  optEmoji: { fontSize: 52 },
  optName: { fontSize: 14, fontWeight: '800', color: '#33691E' },
});
