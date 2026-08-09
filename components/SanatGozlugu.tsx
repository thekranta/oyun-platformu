import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';

// ============================================
// 👓 SANAT GÖZLÜĞÜ - Sanat kavramlarını bir esere UYGULAMA (Sanat, SNAB.1)
// Her turda elle çizilmiş TEK bir SVG sanat kartı gösterilir (yalnızca dalgalı
// çizgiler, yalnızca sıcak renkler, tekrar eden desen, heykel...). Çocuk kartın
// BİR ÖZELLİĞİNİ çıkarıp adlandırır. Seçenekler görsel kopya değil, KELİME +
// küçük sembol çipleridir (özellik → kategori, aynısını bulma DEĞİL).
// Turlar sırayla ilerler: çizgi → şekil → renk → ton → desen → sanat türü.
// Tüm seslendirilen metinler STATİKTİR (hazır klip hattı için zorunlu).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

// Yanlışta ceza yok: nazik, STATİK yönlendirme.
const REDIRECT = 'Olsun! Resme bir daha bak ve tekrar dene.';

const ART_SIZE = Math.round(Math.min(206, Math.max(150, SCREEN_W * 0.52)));

// ------------------------------------------------------------------
// 8 küçük kompozisyon — %100 elle yazılmış SVG, sabit koordinatlarla.
// Hiç bitmap, hiç hazır görsel yok.
// ------------------------------------------------------------------

// 1) Dalgalı çizgiler: 5 paralel mavi dalga
const ART_DALGALI = (
  <G>
    {[34, 67, 100, 133, 166].map((y) => (
      <Path
        key={y}
        d={`M 14 ${y} Q 35 ${y - 24}, 57 ${y} T 100 ${y} T 143 ${y} T 186 ${y}`}
        stroke="#1E88E5"
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
    ))}
  </G>
);

// 2) Zikzak çizgiler: 4 turuncu keskin kırık çizgi
const ART_ZIKZAK = (
  <G>
    {[40, 80, 120, 160].map((y) => (
      <Path
        key={y}
        d={`M 14 ${y} L 38 ${y - 15} L 62 ${y + 15} L 86 ${y - 15} L 110 ${y + 15} L 134 ${y - 15} L 158 ${y + 15} L 182 ${y - 15}`}
        stroke="#F4511E"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="miter"
        fill="none"
      />
    ))}
  </G>
);

// 3) Şekil: yalnızca üçgenlerden kurulu bir düzen (hiç daire, hiç kare yok)
const ART_UCGEN = (
  <G>
    <Polygon points="100,26 148,104 52,104" fill="#7E57C2" />
    <Polygon points="46,66 84,126 8,126" fill="#26A69A" />
    <Polygon points="154,66 192,126 116,126" fill="#EF5350" />
    <Polygon points="38,138 62,184 14,184" fill="#FFA726" />
    <Polygon points="100,138 124,184 76,184" fill="#42A5F5" />
    <Polygon points="162,138 186,184 138,184" fill="#66BB6A" />
  </G>
);

// 4) Sıcak renkler: kırmızı / turuncu / sarı 6 dikdörtgenlik düzen
const ART_SICAK = (
  <G>
    {[
      { x: 11, y: 37, c: '#E53935' }, { x: 73, y: 37, c: '#FB8C00' }, { x: 135, y: 37, c: '#FDD835' },
      { x: 11, y: 105, c: '#FB8C00' }, { x: 73, y: 105, c: '#FDD835' }, { x: 135, y: 105, c: '#E53935' },
    ].map((r) => (
      <Rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={54} height={58} rx={8} fill={r.c} />
    ))}
  </G>
);

// 5) Soğuk renkler: mavi / turkuaz / mor iç içe geçmiş daireler
const ART_SOGUK = (
  <G>
    <Circle cx={32} cy={36} r={16} fill="#4DD0E1" />
    <Circle cx={70} cy={84} r={44} fill="#1E88E5" />
    <Circle cx={132} cy={84} r={40} fill="#26C6DA" />
    <Circle cx={100} cy={142} r={42} fill="#7E57C2" />
    <Circle cx={170} cy={160} r={18} fill="#5C6BC0" />
  </G>
);

// 6) Koyu ton: dört sütun, hepsi koyu tonlarda
const ART_KOYU = (
  <G>
    {[
      { x: 8, c: '#1A237E' }, { x: 56, c: '#1B5E20' }, { x: 104, c: '#4A148C' }, { x: 152, c: '#3E2723' },
    ].map((r) => (
      <Rect key={r.x} x={r.x} y={30} width={40} height={140} rx={10} fill={r.c} />
    ))}
  </G>
);

// 7) Tekrar eden desen: daire-üçgen, daire-üçgen... iki sıra
const ART_DESEN = (
  <G>
    {[66, 134].map((y) =>
      [27, 58, 89, 120, 151, 182].map((x, i) =>
        i % 2 === 0 ? (
          <Circle key={`c-${y}-${x}`} cx={x} cy={y} r={13} fill="#EC407A" />
        ) : (
          <Polygon key={`t-${y}-${x}`} points={`${x - 14},${y + 12} ${x + 14},${y + 12} ${x},${y - 14}`} fill="#FFA726" />
        ),
      ),
    )}
  </G>
);

// 8) Heykel: kaide üzerinde gri bir figür (kabarık, her yönden bakılabilir)
const ART_HEYKEL = (
  <G>
    <Ellipse cx={100} cy={190} rx={66} ry={8} fill="#E0E0E0" />
    <Rect x={38} y={172} width={124} height={16} rx={4} fill="#8D8D8D" />
    <Rect x={52} y={146} width={96} height={26} rx={3} fill="#A6A6A6" />
    <Polygon points="100,58 134,146 66,146" fill="#BDBDBD" stroke="#8D8D8D" strokeWidth={2} />
    <Polygon points="100,58 100,146 66,146" fill="#D9D9D9" />
    <Polygon points="106,78 140,54 148,66 114,90" fill="#B0B0B0" stroke="#8D8D8D" strokeWidth={2} />
    <Circle cx={100} cy={44} r={20} fill="#C7CDD1" stroke="#8D8D8D" strokeWidth={2} />
  </G>
);

const ART: Record<string, React.ReactElement> = {
  dalgali: ART_DALGALI,
  zikzak: ART_ZIKZAK,
  ucgen: ART_UCGEN,
  sicak: ART_SICAK,
  soguk: ART_SOGUK,
  koyu: ART_KOYU,
  desen: ART_DESEN,
  heykel: ART_HEYKEL,
};

function ArtCard({ art }: { art: string }) {
  return (
    <Svg width={ART_SIZE} height={ART_SIZE} viewBox="0 0 200 200">
      <Rect x={0} y={0} width={200} height={200} rx={20} fill="#FFFDF7" />
      {ART[art]}
    </Svg>
  );
}

// ------------------------------------------------------------------
// Turlar — sabit pedagojik sıra: çizgi → şekil → renk → ton → desen → tür.
// question / confirm cümleleri STATİK metinlerdir (hazır ses klipleri).
// ------------------------------------------------------------------
interface Option { key: string; emoji: string; label: string }
interface Round {
  art: string;
  short: string;      // ekranda görünen kısa başlık (seslendirilmez)
  question: string;   // STATİK — seslendirilir
  options: Option[];  // KELİME + sembol çipleri (uyaranın kopyası değil)
  correct: string;
  confirm: string;    // STATİK — kavramı adlandıran + AÇIKLAYAN onay
}

const LINE_OPTIONS: Option[] = [
  { key: 'dalgali', emoji: '〰️', label: 'Dalgalı' },
  { key: 'duz', emoji: '➖', label: 'Düz' },
  { key: 'zikzak', emoji: '⚡', label: 'Zikzak' },
];

const HEAT_OPTIONS: Option[] = [
  { key: 'sicak', emoji: '🔥', label: 'Sıcak renkler' },
  { key: 'soguk', emoji: '❄️', label: 'Soğuk renkler' },
];

const ROUNDS: Round[] = [
  {
    art: 'dalgali',
    short: 'Çizgiler nasıl?',
    question: 'Bu resimdeki çizgiler nasıl?',
    options: LINE_OPTIONS,
    correct: 'dalgali',
    confirm: 'Aferin! Bunlar dalgalı çizgi. Dalgalı çizgiler deniz dalgası gibi yumuşak yumuşak kıvrılır.',
  },
  {
    art: 'zikzak',
    short: 'Çizgiler nasıl?',
    question: 'Peki bu çizgiler nasıl?',
    options: LINE_OPTIONS,
    correct: 'zikzak',
    confirm: 'Doğru! Bunlar zikzak çizgi. Zikzak çizgiler şimşek gibi keskin keskin kırılır.',
  },
  {
    art: 'ucgen',
    short: 'Hangi şekiller var?',
    question: 'Bu resim hangi şekillerden yapılmış?',
    options: [
      { key: 'ucgen', emoji: '🔺', label: 'Üçgen' },
      { key: 'kare', emoji: '⬛', label: 'Kare' },
      { key: 'daire', emoji: '🔴', label: 'Daire' },
    ],
    correct: 'ucgen',
    confirm: 'Aferin! Bu resim üçgenlerden yapılmış. Üçgenin üç kenarı ve üç sivri köşesi vardır.',
  },
  {
    art: 'sicak',
    short: 'Renkler nasıl?',
    question: 'Bu resim sıcak renklerle mi, soğuk renklerle mi yapılmış?',
    options: HEAT_OPTIONS,
    correct: 'sicak',
    confirm: 'Evet! Kırmızı, turuncu ve sarı sıcak renklerdir. Güneşi ve ateşi hatırlatırlar.',
  },
  {
    art: 'soguk',
    short: 'Renkler nasıl?',
    question: 'Peki bu resim sıcak renklerle mi, soğuk renklerle mi yapılmış?',
    options: HEAT_OPTIONS,
    correct: 'soguk',
    confirm: 'Doğru! Mavi, turkuaz ve mor soğuk renklerdir. Denizi ve buzu hatırlatırlar.',
  },
  {
    art: 'koyu',
    short: 'Renkler açık mı, koyu mu?',
    question: 'Bu resmin renkleri açık mı, koyu mu?',
    options: [
      { key: 'koyu', emoji: '🌑', label: 'Koyu' },
      { key: 'acik', emoji: '🌕', label: 'Açık' },
    ],
    correct: 'koyu',
    confirm: 'Aferin! Bu resmin renkleri koyu. Koyu renklere biraz siyah karışmıştır, geceyi ve gölgeyi hatırlatırlar.',
  },
  {
    art: 'desen',
    short: 'Şekiller nasıl dizilmiş?',
    question: 'Bu resimdeki şekiller nasıl dizilmiş?',
    options: [
      { key: 'tekrar', emoji: '🔁', label: 'Tekrar ediyor' },
      { key: 'karisik', emoji: '🎲', label: 'Karışık' },
      { key: 'kuculuyor', emoji: '🔽', label: 'Küçülüyor' },
    ],
    correct: 'tekrar',
    confirm: 'Süper! Bu bir desen. Aynı şekiller sırayla tekrar tekrar geliyor, buna desen deriz.',
  },
  {
    art: 'heykel',
    short: 'Bu hangi sanat?',
    question: 'Bu hangi sanat? Resim mi, heykel mi?',
    options: [
      { key: 'resim', emoji: '🖼️', label: 'Resim' },
      { key: 'heykel', emoji: '🗿', label: 'Heykel' },
      { key: 'muzik', emoji: '🎵', label: 'Müzik' },
      { key: 'dans', emoji: '💃', label: 'Dans' },
    ],
    correct: 'heykel',
    confirm: 'Aferin! Bu bir heykel. Heykele her yönden bakabilirsin, çünkü resim gibi düz değil, kabarıktır.',
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

export default function SanatGozlugu({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [current, setCurrent] = useState<Round>(ROUNDS[0]);
  const [options, setOptions] = useState<Option[]>(ROUNDS[0].options);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const startRef = useRef(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => () => {
    isMountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    stopSpeech();
  }, []);

  useEffect(() => {
    if (!gameReady) return;
    const cur = ROUNDS[(round - 1) % ROUNDS.length];
    setCurrent(cur);
    setOptions(shuffle(cur.options));
    setLocked(false);
    setWrong(null);
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak(cur.question, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const durationSeconds = Math.floor((Date.now() - startRef.current) / 1000);
    onGameEnd('sanat-gozlugu', durationSeconds, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Sanat Alanına Özgü Kavramları Kullanabilme (SNAB.1)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (opt: Option) => {
    if (locked) return;
    movesRef.current += 1;
    if (opt.key === current.correct) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait(current.confirm, 1500, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrong(opt.key);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      speak(REDIRECT, { instructions: HAPPY_VOICE });
      const t = setTimeout(() => { if (isMountedRef.current) setWrong(null); }, 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Sanat gözlüğünü tak! Resme iyi bak, sonra doğru kelimeyi seç."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => { startRef.current = Date.now(); setGameReady(true); }}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#6A1B9A" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>👓 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>{current.short}</Text>

      <Animated.View style={[styles.artFrame, { transform: [{ scale: bounce }] }]}>
        <ArtCard art={current.art} />
      </Animated.View>

      <TouchableOpacity
        style={styles.listenBtn}
        onPress={() => speak(current.question, { instructions: HAPPY_VOICE })}
        activeOpacity={0.85}
      >
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        {options.map((opt) => {
          const isWrong = wrong === opt.key;
          return (
            <Animated.View key={opt.key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.optChip, isWrong && styles.optWrong]}
                onPress={() => handlePick(opt)}
                activeOpacity={0.85}
              >
                <Text style={styles.optEmoji}>{opt.emoji}</Text>
                <Text style={styles.optLabel}>{opt.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3E5F5', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#6A1B9A' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#6A1B9A', marginTop: 6, textAlign: 'center', paddingHorizontal: 16 },

  artFrame: { marginTop: 10, padding: 6, borderRadius: 26, backgroundColor: '#fff', borderWidth: 3, borderColor: '#D1C4E9', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8E24AA', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  options: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap', maxWidth: 460, paddingHorizontal: 12 },
  optChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 22, borderWidth: 2, borderColor: '#E1BEE7', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  optWrong: { backgroundColor: '#FFE0E0', borderColor: '#EF9A9A' },
  optEmoji: { fontSize: 26 },
  optLabel: { fontSize: 16, fontWeight: '800', color: '#4A148C' },
});
