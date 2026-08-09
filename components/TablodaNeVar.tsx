import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from 'react-native-svg';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';

// ============================================
// 🖼️ TABLODA NE VAR? - Sanat eseri inceleme (Sanat/SNAB.2)
// Ekranın üst yarısında çerçeveli bir TABLO (elle yazılmış SVG kompozisyon) durur.
// Soru, tablonun TAMAMINI taramayı gerektirir: en çok hangi renk, kaç tane, en önde
// ne var, hangi şey YOK. Doğruda cevabın KANITI tablonun İÇİNDE canlanır — ilgili
// bölgeler tek tek nabız gibi parlar (sayma sorularında sayaç rozetiyle birlikte).
//
// 4 TABLO × 2 SORU = 8 TUR: çocuk aynı esere İKİ kez, farklı gözle bakar.
// Kısayol karşıtı: ekranda cevabın eşi/kopyası HİÇ bulunmaz; çipler renk lekesi,
// rakam ya da etiketli semboldür — çocuk kompozisyonu tarayıp saymak/karşılaştırmak
// /yargılamak zorundadır. NON-adaptif.
// ============================================

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

// Tablo ölçüsü — viewBox 360x280 (çerçeve dahil), ekrana göre ölçeklenir.
// Kısa ekranlarda soru + çipler taşmasın diye yükseklikten de sınırlanır (~380 px kroma).
const PAINT_W = Math.min(SCREEN_W - 36, 356, Math.max(210, (SCREEN_H - 380) * (360 / 280)));
const PAINT_H = PAINT_W * (280 / 360);

// Kanıt nabzı: bölge PULSE_ON kadar parlar, sonra söner; bir sonraki bölge PULSE_STEP sonra.
const PULSE_ON = 470;
const PULSE_STEP = 640;

type PaintingId = 'sehir' | 'bahce' | 'tepe' | 'naturmort';
type ChipKind = 'renk' | 'sayi' | 'emoji';

interface Chip { id: string; label: string; emoji?: string; color?: string }

interface RoundDef {
  painting: PaintingId;
  soru: string;      // SESLENDİRİLİR (statik) + ekranda gösterilir
  ipucu: string;     // yalnızca ekran (seslendirilmez)
  chipKind: ChipKind;
  chips: Chip[];
  dogru: string;
  onay: string;      // SESLENDİRİLİR (statik) — sayma cümlesi kanıt animasyonuyla eş zamanlı
  kanit: string[];   // tablo içinde sırayla parlayacak bölge kimlikleri
  sayarak: boolean;  // kanıt sırasında sayaç rozeti göster
}

const PAINTING_TITLES: Record<PaintingId, string> = {
  sehir: 'Şehir Penceresi',
  bahce: 'Daireler Bahçesi',
  tepe: 'Tepede Ev',
  naturmort: 'Meyve Tabağı',
};

// ------------------------------------------------------------------
// TABLO 1 — "Şehir Penceresi": kalın siyah çizgilerle bölünmüş 12 kare
// 5 kırmızı, 2 mavi, 1 sarı, 4 beyaz. Hiç yuvarlak şekil YOK.
// ------------------------------------------------------------------
const GRID_X = [28, 106, 184, 262];
const GRID_Y = [28, 105.3, 182.7];
const CELL_W = 70;
const CELL_H = 69.3;
const SEHIR_CELLS: { id: string; col: number; row: number; fill: string }[] = [
  { id: 'c0', col: 0, row: 0, fill: '#E53935' },
  { id: 'c1', col: 1, row: 0, fill: '#FAFAFA' },
  { id: 'c2', col: 2, row: 0, fill: '#1E88E5' },
  { id: 'c3', col: 3, row: 0, fill: '#E53935' },
  { id: 'c4', col: 0, row: 1, fill: '#FAFAFA' },
  { id: 'c5', col: 1, row: 1, fill: '#E53935' },
  { id: 'c6', col: 2, row: 1, fill: '#FDD835' },
  { id: 'c7', col: 3, row: 1, fill: '#FAFAFA' },
  { id: 'c8', col: 0, row: 2, fill: '#E53935' },
  { id: 'c9', col: 1, row: 2, fill: '#1E88E5' },
  { id: 'c10', col: 2, row: 2, fill: '#FAFAFA' },
  { id: 'c11', col: 3, row: 2, fill: '#E53935' },
];

// ------------------------------------------------------------------
// TABLO 2 — "Daireler Bahçesi": iç içe dairelerden üç çiçek, üç FARKLI boyda
// ------------------------------------------------------------------
const CICEKLER = [
  { id: 'cicek3', cx: 85, cy: 150, r: 32, fill: '#1E88E5', ic: '#0D47A1' },
  { id: 'cicek1', cx: 180, cy: 116, r: 52, fill: '#8E24AA', ic: '#4A148C' },
  { id: 'cicek2', cx: 280, cy: 140, r: 42, fill: '#FB8C00', ic: '#E65100' },
];
const YAPRAKLAR = [
  { cx: 66, cy: 185, rx: 15, ry: 7 },
  { cx: 104, cy: 200, rx: 13, ry: 6 },
  { cx: 156, cy: 165, rx: 22, ry: 10 },
  { cx: 206, cy: 190, rx: 20, ry: 9 },
  { cx: 258, cy: 180, rx: 18, ry: 8 },
  { cx: 302, cy: 198, rx: 16, ry: 7 },
];

// ------------------------------------------------------------------
// TABLO 3 — "Tepede Ev": katmanlı manzara. ÖNDE kocaman bir ev,
// tepenin ARKASINDA dört küçücük ağaç (büyüklük = derinlik ipucu).
// ------------------------------------------------------------------
const TEPE_TREES = [
  { id: 'agac1', cx: 52, gy: 166 },
  { id: 'agac2', cx: 94, gy: 156 },
  { id: 'agac3', cx: 288, gy: 189 },
  { id: 'agac4', cx: 322, gy: 186 },
];

// ------------------------------------------------------------------
// TABLO 4 — "Meyve Tabağı": sade natürmort. Üç elma, bir portakal, bir erik.
// MUZ YOK.
// ------------------------------------------------------------------
const MEYVELER = [
  { id: 'elma1', cx: 96, cy: 168, r: 26, fill: '#E53935', sap: true },
  { id: 'elma2', cx: 180, cy: 158, r: 28, fill: '#EF5350', sap: true },
  { id: 'elma3', cx: 264, cy: 168, r: 26, fill: '#E53935', sap: true },
  { id: 'portakal', cx: 134, cy: 197, r: 24, fill: '#FB8C00', sap: false },
  { id: 'erik', cx: 228, cy: 197, r: 22, fill: '#7B1FA2', sap: false },
];

// ------------------------------------------------------------------
// 8 TUR — her tabloya iki farklı soru
// ------------------------------------------------------------------
const ROUNDS: RoundDef[] = [
  {
    painting: 'sehir',
    soru: 'Bu tabloda en çok hangi renk var?',
    ipucu: 'Renkleri karşılaştır, en çok olanı bul 👀',
    chipKind: 'renk',
    chips: [
      { id: 'kirmizi', label: 'Kırmızı', color: '#E53935' },
      { id: 'mavi', label: 'Mavi', color: '#1E88E5' },
      { id: 'sari', label: 'Sarı', color: '#FDD835' },
    ],
    dogru: 'kirmizi',
    onay: 'Aferin! En çok kırmızı var. Birlikte sayalım: bir, iki, üç, dört, beş kırmızı kutu.',
    kanit: ['c0', 'c3', 'c5', 'c8', 'c11'],
    sayarak: true,
  },
  {
    painting: 'sehir',
    soru: 'Bu tabloda hangi şekil YOK?',
    ipucu: 'Tabloda OLMAYAN şekli bul 👀',
    chipKind: 'emoji',
    chips: [
      { id: 'ucgen', label: 'Üçgen', emoji: '🔺' },
      { id: 'kare', label: 'Kare', emoji: '⬛' },
      { id: 'daire', label: 'Daire', emoji: '🔴' },
    ],
    dogru: 'daire',
    onay: 'Doğru! Bu tabloda hiç daire yok. Ressam sadece köşeli şekiller kullanmış.',
    kanit: ['c0', 'c2', 'c6', 'c10'],
    sayarak: false,
  },
  {
    painting: 'bahce',
    soru: 'Bu tabloda kaç tane büyük daire var?',
    ipucu: 'Büyük daireleri tek tek say 👀',
    chipKind: 'sayi',
    chips: [{ id: 's2', label: '2' }, { id: 's3', label: '3' }, { id: 's4', label: '4' }],
    dogru: 's3',
    onay: 'Aferin! Üç tane büyük daire var. Birlikte sayalım: bir, iki, üç.',
    kanit: ['cicek3', 'cicek1', 'cicek2'],
    sayarak: true,
  },
  {
    painting: 'bahce',
    soru: 'En büyük daire hangi renkte?',
    ipucu: 'Daireleri boyuna göre karşılaştır 👀',
    chipKind: 'renk',
    chips: [
      { id: 'turuncu', label: 'Turuncu', color: '#FB8C00' },
      { id: 'mavi', label: 'Mavi', color: '#1E88E5' },
      { id: 'mor', label: 'Mor', color: '#8E24AA' },
    ],
    dogru: 'mor',
    onay: 'Doğru! En büyük daire mor. Bütün daireleri karşılaştırıp en büyüğünü buldun.',
    kanit: ['cicek3', 'cicek2', 'cicek1'],
    sayarak: false,
  },
  {
    painting: 'tepe',
    soru: 'Tabloda en ÖNDE ne var?',
    ipucu: 'En yakın duran, en büyük görünen 👀',
    chipKind: 'emoji',
    chips: [
      { id: 'agac', label: 'Ağaç', emoji: '🌳' },
      { id: 'gunes', label: 'Güneş', emoji: '☀️' },
      { id: 'ev', label: 'Ev', emoji: '🏠' },
    ],
    dogru: 'ev',
    onay: 'Aferin! Ev en önde. Önde olan şeyler daha büyük görünür, arkadakiler küçücük kalır.',
    kanit: ['ev', 'agaclar'],
    sayarak: false,
  },
  {
    painting: 'tepe',
    soru: 'Bu tabloda kaç tane ağaç var?',
    ipucu: 'Tepenin arkasındaki ağaçları say 👀',
    chipKind: 'sayi',
    chips: [{ id: 's2', label: '2' }, { id: 's3', label: '3' }, { id: 's4', label: '4' }],
    dogru: 's4',
    onay: 'Aferin! Dört tane ağaç var. Birlikte sayalım: bir, iki, üç, dört.',
    kanit: ['agac1', 'agac2', 'agac3', 'agac4'],
    sayarak: true,
  },
  {
    painting: 'naturmort',
    soru: 'Tabakta kaç tane meyve var?',
    ipucu: 'Tabaktaki meyveleri tek tek say 👀',
    chipKind: 'sayi',
    chips: [{ id: 's4', label: '4' }, { id: 's5', label: '5' }, { id: 's6', label: '6' }],
    dogru: 's5',
    onay: 'Aferin! Tabakta beş meyve var. Birlikte sayalım: bir, iki, üç, dört, beş.',
    kanit: ['elma1', 'portakal', 'elma2', 'erik', 'elma3'],
    sayarak: true,
  },
  {
    painting: 'naturmort',
    soru: 'Bu tabloda hangi meyve YOK?',
    ipucu: 'Tabloda OLMAYAN meyveyi bul 👀',
    chipKind: 'emoji',
    chips: [
      { id: 'portakal', label: 'Portakal', emoji: '🍊' },
      { id: 'elma', label: 'Elma', emoji: '🍎' },
      { id: 'muz', label: 'Muz', emoji: '🍌' },
    ],
    dogru: 'muz',
    onay: 'Doğru! Bu tabloda hiç muz yok. Ressam elma, portakal ve erik çizmiş.',
    kanit: ['elmalar', 'portakal', 'erik'],
    sayarak: false,
  },
];
const TOTAL_ROUNDS = ROUNDS.length; // 8

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// ==================================================================
// KANIT VURGUSU — hedef bölgenin üstünde beyaz hale + altın çerçeve
// ==================================================================
function HiRect({ x, y, w, h, r = 6 }: { x: number; y: number; w: number; h: number; r?: number }) {
  return (
    <>
      <Rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={r + 4} fill="none" stroke="#FFFFFF" strokeWidth={13} opacity={0.55} />
      <Rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={r + 4} fill="none" stroke="#FFC107" strokeWidth={5} />
    </>
  );
}

function HiCircle({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      <Circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="#FFFFFF" strokeWidth={13} opacity={0.55} />
      <Circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="#FFC107" strokeWidth={5} />
    </>
  );
}

// Müze çerçevesi: koyu ahşap + altın pervaz + tuval zemini
function Frame({ bg }: { bg: string }) {
  return (
    <>
      <Rect x={0} y={0} width={360} height={280} rx={14} fill="#4E342E" />
      <Rect x={9} y={9} width={342} height={262} rx={9} fill="#C9A227" />
      <Rect x={16} y={16} width={328} height={248} rx={4} fill="#3E2723" />
      <Rect x={20} y={20} width={320} height={240} fill={bg} />
    </>
  );
}

// ------------------------- TABLO 1 -------------------------
function SehirPenceresi({ active }: { active: string | null }) {
  return (
    <>
      <Frame bg="#111111" />
      {SEHIR_CELLS.map((c) => (
        <Rect key={c.id} x={GRID_X[c.col]} y={GRID_Y[c.row]} width={CELL_W} height={CELL_H} fill={c.fill} />
      ))}
      {SEHIR_CELLS.filter((c) => c.id === active).map((c) => (
        <HiRect key={`hl-${c.id}`} x={GRID_X[c.col]} y={GRID_Y[c.row]} w={CELL_W} h={CELL_H} r={2} />
      ))}
    </>
  );
}

// ------------------------- TABLO 2 -------------------------
function DairelerBahcesi({ active }: { active: string | null }) {
  return (
    <>
      <Frame bg="#FFF8E1" />
      {/* zemin */}
      <Rect x={20} y={218} width={320} height={42} fill="#A5D6A7" />
      <Rect x={20} y={218} width={320} height={7} fill="#81C784" />
      {/* saplar */}
      {CICEKLER.map((f) => (
        <Rect key={`sap-${f.id}`} x={f.cx - 4.5} y={f.cy} width={9} height={222 - f.cy} fill="#66BB6A" />
      ))}
      {/* yapraklar */}
      {YAPRAKLAR.map((l, i) => (
        <Ellipse key={`yaprak-${i}`} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill="#66BB6A" />
      ))}
      {/* iç içe daireler */}
      {CICEKLER.map((f) => (
        <React.Fragment key={f.id}>
          <Circle cx={f.cx} cy={f.cy} r={f.r} fill={f.fill} />
          <Circle cx={f.cx} cy={f.cy} r={f.r * 0.58} fill="#FFFDE7" />
          <Circle cx={f.cx} cy={f.cy} r={f.r * 0.28} fill={f.ic} />
        </React.Fragment>
      ))}
      {CICEKLER.filter((f) => f.id === active).map((f) => (
        <HiCircle key={`hl-${f.id}`} cx={f.cx} cy={f.cy} r={f.r} />
      ))}
    </>
  );
}

// ------------------------- TABLO 3 -------------------------
function TepedeEv({ active }: { active: string | null }) {
  const treesLit = active === 'agaclar';
  return (
    <>
      <Frame bg="#B3E5FC" />
      {/* güneş */}
      <Circle cx={300} cy={56} r={34} fill="#FFF59D" opacity={0.55} />
      <Circle cx={300} cy={56} r={26} fill="#FFD54F" />
      {/* bulutlar */}
      <Ellipse cx={92} cy={66} rx={30} ry={15} fill="#FFFFFF" opacity={0.92} />
      <Ellipse cx={120} cy={62} rx={22} ry={12} fill="#FFFFFF" opacity={0.92} />
      {/* arka tepe */}
      <Path d="M 20 180 Q 120 130 220 172 Q 285 200 340 182 L 340 260 L 20 260 Z" fill="#81C784" />
      {/* tepenin ARKASINDAKİ küçücük ağaçlar */}
      {TEPE_TREES.map((t) => (
        <React.Fragment key={t.id}>
          <Rect x={t.cx - 3} y={t.gy - 16} width={6} height={16} fill="#6D4C41" />
          <Circle cx={t.cx} cy={t.gy - 27} r={14} fill="#2E7D32" />
        </React.Fragment>
      ))}
      {TEPE_TREES.filter((t) => treesLit || t.id === active).map((t) => (
        <HiRect key={`hl-${t.id}`} x={t.cx - 17} y={t.gy - 44} w={34} h={44} r={12} />
      ))}
      {/* ön tepe */}
      <Path d="M 20 215 Q 130 178 250 210 Q 310 226 340 214 L 340 260 L 20 260 Z" fill="#66BB6A" />
      {/* EN ÖNDEKİ kocaman ev */}
      <Rect x={215} y={110} width={16} height={32} fill="#8D6E63" />
      <Rect x={118} y={150} width={120} height={88} fill="#FFF8E1" stroke="#5D4037" strokeWidth={3} />
      <Polygon points="104,154 178,94 252,154" fill="#C62828" />
      <Rect x={132} y={168} width={30} height={28} fill="#4FC3F7" stroke="#5D4037" strokeWidth={2} />
      <Rect x={198} y={168} width={30} height={28} fill="#4FC3F7" stroke="#5D4037" strokeWidth={2} />
      <Rect x={162} y={196} width={36} height={42} rx={4} fill="#6D4C41" />
      <Circle cx={191} cy={218} r={3} fill="#FFD54F" />
      {active === 'ev' && <HiRect x={100} y={90} w={156} h={152} r={8} />}
    </>
  );
}

// ------------------------- TABLO 4 -------------------------
function MeyveTabagi({ active }: { active: string | null }) {
  const applesLit = active === 'elmalar';
  return (
    <>
      <Frame bg="#FFF3E0" />
      {/* masa */}
      <Rect x={20} y={198} width={320} height={62} fill="#A1887F" />
      <Rect x={20} y={198} width={320} height={7} fill="#8D6E63" />
      {/* tabak */}
      <Ellipse cx={180} cy={200} rx={132} ry={40} fill="#ECEFF1" stroke="#B0BEC5" strokeWidth={3} />
      <Ellipse cx={180} cy={202} rx={104} ry={27} fill="#FAFAFA" />
      {/* meyveler (arka sıra elmalar → ön sıra portakal ve erik) */}
      {MEYVELER.map((m) => (
        <React.Fragment key={m.id}>
          {m.sap && (
            <>
              <Rect x={m.cx - 2.5} y={m.cy - m.r - 6} width={5} height={12} fill="#6D4C41" />
              <Ellipse cx={m.cx + 12} cy={m.cy - m.r - 3} rx={11} ry={5.5} fill="#66BB6A" />
            </>
          )}
          <Circle cx={m.cx} cy={m.cy} r={m.r} fill={m.fill} />
          <Ellipse cx={m.cx - m.r * 0.38} cy={m.cy - m.r * 0.38} rx={m.r * 0.26} ry={m.r * 0.18} fill="#FFFFFF" opacity={0.45} />
        </React.Fragment>
      ))}
      {MEYVELER.filter((m) => m.id === active || (applesLit && m.sap)).map((m) => (
        <HiCircle key={`hl-${m.id}`} cx={m.cx} cy={m.cy} r={m.r} />
      ))}
    </>
  );
}

function Painting({ id, active }: { id: PaintingId; active: string | null }) {
  return (
    <Svg width={PAINT_W} height={PAINT_H} viewBox="0 0 360 280">
      {id === 'sehir' && <SehirPenceresi active={active} />}
      {id === 'bahce' && <DairelerBahcesi active={active} />}
      {id === 'tepe' && <TepedeEv active={active} />}
      {id === 'naturmort' && <MeyveTabagi active={active} />}
    </Svg>
  );
}

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function TablodaNeVar({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [chips, setChips] = useState<Chip[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [proofActive, setProofActive] = useState<string | null>(null);
  const [proofCount, setProofCount] = useState(0);

  const startRef = useRef(0);
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  const current = ROUNDS[round - 1];

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    isMountedRef.current = false;
    stopSpeech();
  }, []);

  // Tur kurulumu: çipleri hazırla (rakamlar artan kalır), tabloyu yumuşakça göster, soruyu seslendir.
  useEffect(() => {
    if (!gameReady) return;
    const r = ROUNDS[round - 1];
    setChips(r.chipKind === 'sayi' ? r.chips : shuffle(r.chips));
    setLocked(false);
    setWrongId(null);
    setProofActive(null);
    setProofCount(0);
    fade.setValue(0.25);
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: USE_NATIVE }).start();
    speak(r.soru, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const durationSeconds = Math.floor((Date.now() - (startRef.current || Date.now())) / 1000);
    onGameEnd('tabloda-ne-var', durationSeconds, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Sanat Eserlerini İnceleyebilme (SNAB.2)',
      correct_answers: correctRef.current,
    });
  };

  // KANIT: hedef bölgeler tablonun İÇİNDE tek tek nabız gibi parlar;
  // sayma sorularında üstte sayaç rozeti birlikte ilerler.
  const runProof = (ids: string[], counting: boolean) => {
    ids.forEach((id, i) => {
      const onT = setTimeout(() => {
        if (!isMountedRef.current) return;
        setProofActive(id);
        if (counting) setProofCount(i + 1);
      }, i * PULSE_STEP);
      const offT = setTimeout(() => {
        if (!isMountedRef.current) return;
        setProofActive(null);
      }, i * PULSE_STEP + PULSE_ON);
      timersRef.current.push(onT, offT);
    });
  };

  const handlePick = (chipId: string) => {
    if (locked || !gameReady) return;
    movesRef.current += 1;
    const r = ROUNDS[round - 1];

    if (chipId === r.dogru) {
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      runProof(r.kanit, r.sayarak);
      // Onay cümlesi kanıt animasyonuyla eş zamanlı ilerler; en az 1500 ms,
      // ama kanıt zinciri uzunsa yarıda kesilmesin diye onun kadar bekler.
      const minWait = Math.max(1500, r.kanit.length * PULSE_STEP + 250);
      speakThenWait(r.onay, minWait, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        setProofActive(null);
        setProofCount(0);
        if (round < TOTAL_ROUNDS) setRound((x) => x + 1);
        else finish();
      });
    } else {
      // Ceza yok: çip titrer, tablo yerinde kalır, çocuk yeniden bakar.
      errorsRef.current += 1;
      setWrongId(chipId);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      speak('Tabloya bir daha bak. Acele etme, tekrar dene.', { instructions: HAPPY_VOICE });
      const t = setTimeout(() => { if (isMountedRef.current) setWrongId(null); }, 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Şimdi tablolara bakacağız! Soruyu iyi dinle, tabloyu incele ve doğru cevaba dokun."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => { startRef.current = Date.now(); setGameReady(true); }}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#5D4037" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🖼️ {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      {/* TABLO */}
      <View style={styles.paintWrap}>
        <Animated.View style={{ opacity: fade }}>
          <Painting id={current.painting} active={proofActive} />
        </Animated.View>
        {proofCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{proofCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.plaque}><Text style={styles.plaqueText}>{PAINTING_TITLES[current.painting]}</Text></View>

      {/* SORU */}
      <Text style={styles.prompt}>{current.soru}</Text>
      <Text style={styles.hint}>{current.ipucu}</Text>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak(current.soru, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={19} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      {/* CEVAP ÇİPLERİ — renk lekesi / rakam / etiketli sembol (tablonun kopyası DEĞİL) */}
      <View style={styles.chips}>
        {chips.map((c) => {
          const isWrong = wrongId === c.id;
          return (
            <Animated.View key={c.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.chip, isWrong && styles.chipWrong]}
                onPress={() => handlePick(c.id)}
                activeOpacity={0.85}
                disabled={locked}
              >
                {current.chipKind === 'renk' && <View style={[styles.swatch, { backgroundColor: c.color }]} />}
                {current.chipKind === 'sayi' && <Text style={styles.digit}>{c.label}</Text>}
                {current.chipKind === 'emoji' && <Text style={styles.chipEmoji}>{c.emoji}</Text>}
                {current.chipKind !== 'sayi' && <Text style={styles.chipLabel}>{c.label}</Text>}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF3E7', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#5D4037' },

  paintWrap: { marginTop: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 8 },
  countBadge: { position: 'absolute', top: -8, right: -8, minWidth: 46, height: 46, borderRadius: 23, backgroundColor: '#FFC107', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', paddingHorizontal: 6 },
  countText: { fontSize: 24, fontWeight: '900', color: '#4E342E' },

  plaque: { marginTop: 8, backgroundColor: '#EFE3D0', paddingVertical: 4, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#D7C4A8' },
  plaqueText: { fontSize: 12, fontWeight: '800', color: '#6D4C41', letterSpacing: 0.4 },

  prompt: { fontSize: 20, fontWeight: '900', color: '#4E342E', marginTop: 10, textAlign: 'center', paddingHorizontal: 18 },
  hint: { fontSize: 13, fontWeight: '700', color: '#8D6E63', marginTop: 3, textAlign: 'center', paddingHorizontal: 18 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8D6E63', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 22, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  chips: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap', maxWidth: 440, paddingHorizontal: 12 },
  chip: { width: 100, height: 96, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 2, borderColor: '#E8DCC8', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  chipWrong: { backgroundColor: '#FFE0E0', borderColor: '#EF9A9A' },
  swatch: { width: 46, height: 46, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)' },
  digit: { fontSize: 46, fontWeight: '900', color: '#4E342E' },
  chipEmoji: { fontSize: 40 },
  chipLabel: { fontSize: 13, fontWeight: '800', color: '#5D4037' },
});
