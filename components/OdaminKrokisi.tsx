import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';

// ============================================
// 📍 ODAMIN KROKİSİ - Kendi krokisini OLUŞTURMA + okuma (Sosyal/SAB.17)
// Çocuk KUŞBAKIŞI boş bir plan görür (kalın duvar, kapı, pencere, 3x3 kesik
// çizgili hücre). Kopyalanacak örnek kroki ASLA gösterilmez; hedef yalnızca
// DİLDE vardır: "Yatağı pencerenin YANINA koy." Eşya çipine dokunulur, sonra
// krokide hücreye dokunulur. Plan dolunca OKUMA moduna geçilir: çocuk KENDİ
// yaptığı krokiyi geri okur ("Halı nerede?"). İki set: oda, sonra park.
// Kısayol karşıtı: ekranda eşleştirilecek hazır bir kroki yok -> temsil ÜRETME.
// (Hazine Haritası krokiyi OKUR; bu oyun krokiyi ÜRETİR.)
// ============================================

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

// --- Kroki geometrisi (SVG viewBox birimi: 300x300) ---
const VB = 300;
const BOARD = Math.round(Math.min(SCREEN_W - 56, SCREEN_H * 0.36, 300));
const K = BOARD / VB;
const GRID0 = 30; // ızgaranın sol/üst başlangıcı
const CELL_VB = 80; // hücre kenarı (viewBox birimi)
const CELL_PX = CELL_VB * K;
const CELL_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
// Izgara indeksleri:  0 1 2 / 3 4 5 / 6 7 8
// Pencere (oda) SOL duvarın ORTASINDA -> tek komşu hücre: 3
// Gölet (park) SAĞ duvarın ORTASINDA  -> tek komşu hücre: 5
// Kapı / giriş kapısı ALT duvarın ORTASINDA -> tek komşu hücre: 7, tam karşısı: 1
const cellVbX = (i: number) => GRID0 + (i % 3) * CELL_VB;
const cellVbY = (i: number) => GRID0 + Math.floor(i / 3) * CELL_VB;

// --- Kuşbakışı eşyalar (tamamı elle yazılmış SVG; hiç bitmap yok) ---
const ITEMS = {
  yatak: { name: 'Yatak', emoji: '🛏️' },
  hali: { name: 'Halı', emoji: '🟫' },
  kutu: { name: 'Oyuncak kutusu', emoji: '🧸' },
  masa: { name: 'Masa', emoji: '🪑' },
  kitaplik: { name: 'Kitaplık', emoji: '📚' },
  agac: { name: 'Ağaç', emoji: '🌳' },
  kumhavuzu: { name: 'Kum havuzu', emoji: '🏖️' },
  kaydirak: { name: 'Kaydırak', emoji: '🛝' },
  bank: { name: 'Bank', emoji: '🪵' },
  salincak: { name: 'Salıncak', emoji: '🎠' },
} as const;

type ItemId = keyof typeof ITEMS;

function ItemGlyph({ id, size }: { id: ItemId; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {id === 'yatak' && (
        <G>
          <Rect x={22} y={10} width={56} height={80} rx={9} fill="#B3E5FC" stroke="#0288D1" strokeWidth={3} />
          <Rect x={30} y={16} width={40} height={18} rx={7} fill="#FFFFFF" stroke="#4FC3F7" strokeWidth={2} />
          <Rect x={22} y={46} width={56} height={44} rx={9} fill="#81D4FA" />
          <Line x1={22} y1={46} x2={78} y2={46} stroke="#0288D1" strokeWidth={2.5} />
        </G>
      )}
      {id === 'hali' && (
        <G>
          <Ellipse cx={50} cy={50} rx={44} ry={31} fill="#D7A86E" stroke="#A9743F" strokeWidth={3} />
          <Ellipse cx={50} cy={50} rx={31} ry={20} fill="none" stroke="#FFE0B2" strokeWidth={4} />
          <Ellipse cx={50} cy={50} rx={16} ry={9} fill="#A9743F" />
        </G>
      )}
      {id === 'kutu' && (
        <G>
          <Rect x={16} y={22} width={68} height={58} rx={9} fill="#FFCC80" stroke="#EF6C00" strokeWidth={3} />
          <Line x1={16} y1={51} x2={84} y2={51} stroke="#EF6C00" strokeWidth={3} />
          <Line x1={16} y1={22} x2={84} y2={80} stroke="#FFB74D" strokeWidth={2.5} />
          <Line x1={84} y1={22} x2={16} y2={80} stroke="#FFB74D" strokeWidth={2.5} />
          <Rect x={42} y={44} width={16} height={13} rx={4} fill="#EF6C00" />
        </G>
      )}
      {id === 'masa' && (
        <G>
          <Circle cx={50} cy={50} r={33} fill="#A1887F" stroke="#5D4037" strokeWidth={3} />
          <Circle cx={50} cy={50} r={21} fill="none" stroke="#D7CCC8" strokeWidth={3} />
          <Circle cx={50} cy={50} r={7} fill="#5D4037" />
        </G>
      )}
      {id === 'kitaplik' && (
        <G>
          <Rect x={12} y={32} width={76} height={36} rx={5} fill="#8D6E63" stroke="#4E342E" strokeWidth={3} />
          <Line x1={30} y1={37} x2={30} y2={63} stroke="#FFE082" strokeWidth={5} />
          <Line x1={44} y1={37} x2={44} y2={63} stroke="#EF9A9A" strokeWidth={5} />
          <Line x1={58} y1={37} x2={58} y2={63} stroke="#A5D6A7" strokeWidth={5} />
          <Line x1={72} y1={37} x2={72} y2={63} stroke="#90CAF9" strokeWidth={5} />
        </G>
      )}
      {id === 'agac' && (
        <G>
          <Circle cx={50} cy={50} r={35} fill="#66BB6A" stroke="#2E7D32" strokeWidth={3} />
          <Circle cx={35} cy={38} r={12} fill="#81C784" />
          <Circle cx={64} cy={58} r={11} fill="#81C784" />
          <Circle cx={50} cy={50} r={8} fill="#6D4C41" />
        </G>
      )}
      {id === 'kumhavuzu' && (
        <G>
          <Rect x={12} y={24} width={76} height={52} rx={11} fill="#FFE0B2" stroke="#C8964A" strokeWidth={4} />
          <Circle cx={32} cy={42} r={3.5} fill="#C8964A" />
          <Circle cx={52} cy={58} r={3.5} fill="#C8964A" />
          <Circle cx={68} cy={38} r={3.5} fill="#C8964A" />
          <Circle cx={44} cy={65} r={3.5} fill="#C8964A" />
          <Circle cx={64} cy={62} r={3.5} fill="#C8964A" />
        </G>
      )}
      {id === 'kaydirak' && (
        <G>
          <Polygon points="32,10 48,10 64,90 40,90" fill="#4FC3F7" stroke="#0277BD" strokeWidth={3} />
          <Line x1={33} y1={20} x2={48} y2={20} stroke="#0277BD" strokeWidth={3} />
          <Line x1={35} y1={31} x2={50} y2={31} stroke="#0277BD" strokeWidth={3} />
          <Line x1={37} y1={42} x2={52} y2={42} stroke="#0277BD" strokeWidth={3} />
          <Rect x={38} y={76} width={24} height={14} rx={4} fill="#B3E5FC" stroke="#0277BD" strokeWidth={2.5} />
        </G>
      )}
      {id === 'bank' && (
        <G>
          <Rect x={10} y={36} width={80} height={28} rx={7} fill="#A1887F" stroke="#4E342E" strokeWidth={3} />
          <Line x1={14} y1={45} x2={86} y2={45} stroke="#D7CCC8" strokeWidth={3} />
          <Line x1={14} y1={55} x2={86} y2={55} stroke="#D7CCC8" strokeWidth={3} />
          <Rect x={16} y={64} width={9} height={8} rx={2} fill="#4E342E" />
          <Rect x={75} y={64} width={9} height={8} rx={2} fill="#4E342E" />
        </G>
      )}
      {id === 'salincak' && (
        <G>
          <Rect x={14} y={24} width={72} height={52} rx={8} fill="none" stroke="#78909C" strokeWidth={5} />
          <Line x1={30} y1={26} x2={40} y2={44} stroke="#90A4AE" strokeWidth={3} />
          <Line x1={70} y1={26} x2={60} y2={44} stroke="#90A4AE" strokeWidth={3} />
          <Rect x={34} y={42} width={32} height={17} rx={5} fill="#FFB74D" stroke="#EF6C00" strokeWidth={3} />
        </G>
      )}
    </Svg>
  );
}

// --- Adımlar ---
// TÜM seslendirilen cümleler SABİT metin dizgileridir (şablon/birleştirme yok).
interface PlaceStep {
  kind: 'place';
  item: ItemId;
  cell: number;
  say: string;
  ok: string;
  hint: string;
}
interface ReadStep {
  kind: 'read';
  item: ItemId;
  say: string;
  ok: string;
  hint: string;
}
type Step = PlaceStep | ReadStep;

interface Plan {
  key: 'oda' | 'park';
  title: string;
  emoji: string;
  legend: string;
  tray: ItemId[];
  done: string;
  steps: Step[];
}

const PLANS: Plan[] = [
  {
    key: 'oda',
    title: 'Odamın Krokisi',
    emoji: '🛏️',
    legend: '🪟 Pencere solda  ·  🚪 Kapı aşağıda',
    tray: ['yatak', 'hali', 'kutu', 'masa', 'kitaplik'],
    done: 'Oda krokini bitirdin! Şimdi bir de park krokisi yapalım.',
    steps: [
      {
        kind: 'place',
        item: 'yatak',
        cell: 3,
        say: 'Yatağı pencerenin yanına koy.',
        ok: 'Aferin! Yatak pencerenin yanında. Sabah güneş yatağına vuracak.',
        hint: 'Pencere sol duvarda. Yatağı pencerenin hemen yanındaki kareye koyalım.',
      },
      {
        kind: 'place',
        item: 'hali',
        cell: 4,
        say: 'Halıyı odanın tam ortasına koy.',
        ok: 'Harika! Halı tam ortada. Odanın ortası oyun oynamak için en güzel yerdir.',
        hint: 'Odanın tam ortası, ortadaki karedir. Halıyı oraya koyalım.',
      },
      {
        kind: 'place',
        item: 'kutu',
        cell: 1,
        say: 'Oyuncak kutusunu kapının tam karşısına koy.',
        ok: 'Süper! Oyuncak kutusu kapının tam karşısında. Kapıdan girince onu hemen görürsün.',
        hint: 'Kapı aşağıda. Kapının tam karşısı, en yukarıdaki orta karedir.',
      },
      {
        kind: 'place',
        item: 'masa',
        cell: 8,
        say: 'Masayı odanın sağ alt köşesine koy.',
        ok: 'Aferin! Masa sağ alt köşede. Köşe, iki duvarın birleştiği yerdir.',
        hint: 'Sağ alt köşe, en aşağıdaki sıranın en sağındaki karedir.',
      },
      {
        kind: 'place',
        item: 'kitaplik',
        cell: 0,
        say: 'Kitaplığı yatağın arkasına koy. Arka taraf, kapıdan uzak olan yukarı taraftır.',
        ok: 'Harika! Kitaplık yatağın arkasında. Krokide arka taraf yukarısıdır.',
        hint: 'Yatak pencerenin yanında. Yatağın bir üstündeki kare, yatağın arkasıdır.',
      },
      {
        kind: 'read',
        item: 'hali',
        say: 'Şimdi kendi krokini oku. Halı nerede? Halının olduğu kareye dokun.',
        ok: 'Doğru! Halıyı oraya sen koymuştun. Bu senin krokin, odanı yukarıdan gösteren küçük haritan.',
        hint: 'Halı yuvarlak bir kilimdir. Krokide onu bul ve üstüne dokun.',
      },
      {
        kind: 'read',
        item: 'kutu',
        say: 'Kapıdan odaya girdin. Tam karşında ne var? Krokide ona dokun.',
        ok: 'Aferin! Kapının tam karşısında oyuncak kutusu var. Krokini gerçekten okuyabiliyorsun.',
        hint: 'Kapı krokinin altında. Tam karşısı, en yukarıdaki orta karedir.',
      },
    ],
  },
  {
    key: 'park',
    title: 'Park Krokisi',
    emoji: '🌳',
    legend: '🌊 Gölet sağda  ·  🚪 Giriş kapısı aşağıda',
    tray: ['agac', 'kumhavuzu', 'kaydirak', 'bank', 'salincak'],
    done: 'Park krokini de bitirdin! Artık kendi krokini yapabiliyorsun.',
    steps: [
      {
        kind: 'place',
        item: 'agac',
        cell: 5,
        say: 'Ağacı göletin yanına koy.',
        ok: 'Aferin! Ağaç göletin yanında. Kuşlar suya yakın ağaçları çok sever.',
        hint: 'Gölet sağ tarafta. Ağacı göletin hemen yanındaki kareye koyalım.',
      },
      {
        kind: 'place',
        item: 'kumhavuzu',
        cell: 4,
        say: 'Kum havuzunu parkın tam ortasına koy.',
        ok: 'Harika! Kum havuzu tam ortada. Ortadaki kum havuzunu parkın her yerinden görürsün.',
        hint: 'Parkın tam ortası, ortadaki karedir. Kum havuzunu oraya koyalım.',
      },
      {
        kind: 'place',
        item: 'kaydirak',
        cell: 0,
        say: 'Kaydırağı parkın sol üst köşesine koy.',
        ok: 'Süper! Kaydırak sol üst köşede. Köşeler krokinin en uç yerleridir.',
        hint: 'Sol üst köşe, en yukarıdaki sıranın en solundaki karedir.',
      },
      {
        kind: 'place',
        item: 'bank',
        cell: 1,
        say: 'Bankı giriş kapısının tam karşısına koy.',
        ok: 'Aferin! Bank giriş kapısının tam karşısında. Banka oturunca bütün parkı görürsün.',
        hint: 'Giriş kapısı aşağıda. Tam karşısı, en yukarıdaki orta karedir.',
      },
      {
        kind: 'place',
        item: 'salincak',
        cell: 7,
        say: 'Salıncağı kum havuzunun önüne koy. Ön taraf, giriş kapısına yakın olan aşağı taraftır.',
        ok: 'Harika! Salıncak kum havuzunun önünde. Krokide ön taraf aşağısıdır.',
        hint: 'Kum havuzu tam ortada. Kum havuzunun bir altındaki kare, onun önüdür.',
      },
      {
        kind: 'read',
        item: 'kaydirak',
        say: 'Şimdi kendi park krokini oku. Kaydırak nerede? Kaydırağın olduğu kareye dokun.',
        ok: 'Doğru! Kaydırağı sol üst köşeye sen koymuştun. Bu senin park krokin.',
        hint: 'Kaydırak uzun ve eğik bir kayma yoludur. Krokide onu bul ve üstüne dokun.',
      },
      {
        kind: 'read',
        item: 'bank',
        say: 'Giriş kapısından parka girdin. Tam karşında ne var? Krokide ona dokun.',
        ok: 'Aferin! Giriş kapısının tam karşısında bank var. Kendi krokini çok güzel okudun.',
        hint: 'Giriş kapısı krokinin altında. Tam karşısı, en yukarıdaki orta karedir.',
      },
    ],
  },
];

const INTRO = 'Kendi krokini yapacaksın! Önce alttan eşyayı seç, sonra krokide yerini göster.';
const NEED_ITEM = 'Önce alttan bir eşya seç, sonra krokide yerini göster.';
const WRONG_ITEM = 'Şimdi bu eşyanın sırası değil. Yönergede söylediğim eşyayı bul.';
const PICKED_ITEM = 'Güzel! Şimdi krokide yerini göster.';

type CellState = 'idle' | 'filled' | 'wrong' | 'ok';

// --- Boş kroki çerçevesi: duvar + kapı + pencere/gölet + 3x3 kesik çizgili ızgara ---
function PlanBoard({ planKey, cellStates }: { planKey: 'oda' | 'park'; cellStates: CellState[] }) {
  const floor = planKey === 'oda' ? '#FFF8E7' : '#F1F8E9';
  const wall = planKey === 'oda' ? '#8D6E63' : '#7CB342';
  return (
    <Svg width={BOARD} height={BOARD} viewBox="0 0 300 300">
      {/* zemin + kalın duvar çerçevesi */}
      <Rect x={18} y={18} width={264} height={264} rx={12} fill={floor} />
      <Rect x={14} y={14} width={272} height={272} rx={14} fill="none" stroke={wall} strokeWidth={12} />

      {/* duvardaki işaret noktası: pencere (oda, SOL duvar ortası) / gölet (park, SAĞ duvar ortası) */}
      {planKey === 'oda' ? (
        <G>
          <Rect x={7} y={118} width={14} height={64} rx={3} fill="#E1F5FE" stroke="#0288D1" strokeWidth={2.5} />
          <Line x1={11} y1={123} x2={11} y2={177} stroke="#0288D1" strokeWidth={2} />
          <Line x1={17} y1={123} x2={17} y2={177} stroke="#0288D1" strokeWidth={2} />
        </G>
      ) : (
        <G>
          <Rect x={279} y={116} width={14} height={68} rx={4} fill="#4FC3F7" stroke="#0288D1" strokeWidth={2.5} />
          <Ellipse cx={286} cy={150} rx={5} ry={23} fill="#81D4FA" />
        </G>
      )}

      {/* alt duvarın ortasında kapı / giriş kapısı */}
      <Rect x={120} y={274} width={60} height={22} fill={floor} />
      {planKey === 'oda' ? (
        <G>
          <Line x1={120} y1={286} x2={120} y2={252} stroke="#6D4C41" strokeWidth={5} strokeLinecap="round" />
          <Path d="M 120 252 A 34 34 0 0 1 154 286" fill="none" stroke="#BCAAA4" strokeWidth={2} strokeDasharray="6 5" />
        </G>
      ) : (
        <G>
          <Rect x={113} y={272} width={10} height={26} rx={3} fill="#8D6E63" />
          <Rect x={177} y={272} width={10} height={26} rx={3} fill="#8D6E63" />
          <Line x1={123} y1={278} x2={177} y2={278} stroke="#8D6E63" strokeWidth={3} strokeDasharray="7 6" />
        </G>
      )}

      {/* 3x3 kesik çizgili hücre ızgarası */}
      {CELL_IDS.map((i) => {
        const st = cellStates[i];
        const fill = st === 'wrong' ? '#EF9A9A' : st === 'ok' ? '#A5D6A7' : '#FFFFFF';
        const fillOpacity = st === 'wrong' || st === 'ok' ? 0.9 : st === 'filled' ? 0.6 : 0.38;
        const stroke = st === 'wrong' ? '#E53935' : st === 'ok' ? '#2E7D32' : '#A1887F';
        return (
          <Rect
            key={i}
            x={cellVbX(i) + 3}
            y={cellVbY(i) + 3}
            width={CELL_VB - 6}
            height={CELL_VB - 6}
            rx={9}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={st === 'idle' || st === 'filled' ? 2.5 : 4}
            strokeDasharray={st === 'idle' || st === 'filled' ? '9 6' : undefined}
          />
        );
      })}
    </Svg>
  );
}

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

export default function OdaminKrokisi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [planIdx, setPlanIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [placed, setPlaced] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<ItemId | null>(null);
  const [justPlaced, setJustPlaced] = useState<ItemId | null>(null);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [wrongChip, setWrongChip] = useState<ItemId | null>(null);
  const [readOk, setReadOk] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const startRef = useRef(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pop = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const boardScale = useRef(new Animated.Value(1)).current;

  const plan = PLANS[planIdx];
  const step = plan.steps[stepIdx];
  const isRead = step.kind === 'read';
  const remaining = plan.tray.filter((id) => placed[id] === undefined);

  useEffect(() => () => {
    isMountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    stopSpeech();
  }, []);

  // Yeni plan açılışında kroki büyüyerek gelsin
  useEffect(() => {
    if (!gameReady) return;
    boardScale.setValue(0.9);
    Animated.spring(boardScale, { toValue: 1, friction: 6, useNativeDriver: USE_NATIVE }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planIdx, gameReady]);

  // Her adımda o adımın SABİT yönergesi seslendirilir
  useEffect(() => {
    if (!gameReady) return;
    setSelected(null);
    setWrongCell(null);
    setWrongChip(null);
    speak(PLANS[planIdx].steps[stepIdx].say, { instructions: HAPPY_VOICE });
  }, [planIdx, stepIdx, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const durationSeconds = Math.floor((Date.now() - startRef.current) / 1000);
    onGameEnd('odamin-krokisi', durationSeconds, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sosyal: Mekânsal Temsil Oluşturabilme — kroki üretme ve okuma (SAB.17)',
      correct_answers: correctRef.current,
    });
  };

  const wiggle = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
    ]).start();
  };

  // Adım tamamlandı -> sıradaki adım / sıradaki kroki / bitiş
  const advance = () => {
    if (stepIdx < plan.steps.length - 1) {
      setStepIdx((s) => s + 1);
      return;
    }
    // Kroki tamamlandı: kutlama
    setShowConfetti(true);
    setLocked(true);
    speakThenWait(plan.done, 1800, { instructions: HAPPY_VOICE }).then(() => {
      if (!isMountedRef.current) return;
      setShowConfetti(false);
      setLocked(false);
      if (planIdx < PLANS.length - 1) {
        setPlaced({});
        setJustPlaced(null);
        setReadOk(null);
        setStepIdx(0);
        setPlanIdx((p) => p + 1);
      } else {
        finish();
      }
    });
  };

  const handleChip = (id: ItemId) => {
    if (locked || isRead) return;
    movesRef.current += 1;
    if (id !== step.item) {
      setWrongChip(id);
      wiggle();
      speak(WRONG_ITEM, { instructions: HAPPY_VOICE });
      const t = setTimeout(() => { if (isMountedRef.current) setWrongChip(null); }, 600);
      timersRef.current.push(t);
      return;
    }
    setSelected(id);
    speak(PICKED_ITEM, { instructions: HAPPY_VOICE });
  };

  const missCell = (idx: number, hint: string) => {
    errorsRef.current += 1;
    setSelected(null); // eşya nazikçe tepsiye geri döner
    setWrongCell(idx);
    wiggle();
    speak(hint, { instructions: HAPPY_VOICE });
    const t = setTimeout(() => { if (isMountedRef.current) setWrongCell(null); }, 750);
    timersRef.current.push(t);
  };

  const handleCell = (idx: number) => {
    if (locked) return;

    if (step.kind === 'place') {
      if (selected === null) {
        speak(NEED_ITEM, { instructions: HAPPY_VOICE });
        return;
      }
      movesRef.current += 1;
      if (idx !== step.cell) {
        missCell(idx, step.hint);
        return;
      }
      const id = step.item;
      setPlaced((p) => ({ ...p, [id]: idx }));
      setJustPlaced(id);
      setSelected(null);
      setLocked(true);
      correctRef.current += 1;
      pop.setValue(0.4);
      Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
      speakThenWait(step.ok, 1500, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setLocked(false);
        advance();
      });
      return;
    }

    // OKUMA modu: cevap, çocuğun O EŞYAYI KENDİ koyduğu hücredir
    const answer = placed[step.item];
    movesRef.current += 1;
    if (idx !== answer) {
      missCell(idx, step.hint);
      return;
    }
    setReadOk(idx);
    setLocked(true);
    correctRef.current += 1;
    speakThenWait(step.ok, 1600, { instructions: HAPPY_VOICE }).then(() => {
      if (!isMountedRef.current) return;
      setReadOk(null);
      setLocked(false);
      advance();
    });
  };

  const cellStates: CellState[] = CELL_IDS.map((i) => {
    if (wrongCell === i) return 'wrong';
    if (readOk === i) return 'ok';
    return Object.keys(placed).some((id) => placed[id] === i) ? 'filled' : 'idle';
  });

  const itemPx = CELL_PX * 0.8;
  const totalSteps = plan.steps.length;

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={120} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message={INTRO}
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => { startRef.current = Date.now(); setGameReady(true); }}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#4E342E" />
        </TouchableOpacity>
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>📍 {stepIdx + 1}/{totalSteps}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>{plan.emoji} {plan.title}</Text>

      <View style={styles.clueRow}>
        <View style={styles.clueCard}>
          <Text style={styles.clueIcon}>{isRead ? '🔍' : '📐'}</Text>
          <Text style={styles.clueText}>{step.say}</Text>
        </View>
        <TouchableOpacity
          style={styles.listenBtn}
          onPress={() => speak(PLANS[planIdx].steps[stepIdx].say, { instructions: HAPPY_VOICE })}
          activeOpacity={0.85}
        >
          <Ionicons name="volume-high" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.boardWrap, { transform: [{ scale: boardScale }] }]}>
        <PlanBoard planKey={plan.key} cellStates={cellStates} />

        {/* Krokiye yerleşmiş eşyalar (dokunuşu engellemez) */}
        {plan.tray.map((id) => {
          const cell = placed[id];
          if (cell === undefined) return null;
          const left = cellVbX(cell) * K + (CELL_PX - itemPx) / 2;
          const top = cellVbY(cell) * K + (CELL_PX - itemPx) / 2;
          const isNew = justPlaced === id;
          return (
            <Animated.View
              key={id}
              pointerEvents="none"
              style={[styles.placedItem, { left, top }, isNew ? { transform: [{ scale: pop }] } : null]}
            >
              <ItemGlyph id={id} size={itemPx} />
            </Animated.View>
          );
        })}

        {/* 9 hücrenin dokunma alanı (eşyaların ÜSTÜNDE) */}
        {CELL_IDS.map((i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.6}
            onPress={() => handleCell(i)}
            style={[styles.cellTouch, { left: cellVbX(i) * K, top: cellVbY(i) * K }]}
          />
        ))}
      </Animated.View>

      <Text style={styles.legend}>{plan.legend}</Text>

      {isRead ? (
        <View style={styles.readBanner}>
          <Text style={styles.readBannerText}>🔍 Bu krokiyi sen yaptın — şimdi oku!</Text>
        </View>
      ) : (
        <View style={styles.tray}>
          {remaining.map((id) => {
            const isSel = selected === id;
            const isBad = wrongChip === id;
            return (
              <Animated.View key={id} style={isBad ? { transform: [{ translateX: shake }] } : undefined}>
                <TouchableOpacity
                  style={[styles.chip, isSel && styles.chipSelected, isBad && styles.chipWrong]}
                  onPress={() => handleChip(id)}
                  activeOpacity={0.85}
                >
                  <ItemGlyph id={id} size={40} />
                  <Text style={styles.chipText} numberOfLines={1}>{ITEMS[id].emoji} {ITEMS[id].name}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF3E3', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 4 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#4E342E' },

  prompt: { fontSize: 19, fontWeight: '900', color: '#4E342E', marginTop: 4 },

  clueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 14, maxWidth: 460 },
  clueCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8E7', borderWidth: 2, borderColor: '#E0C08A', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  clueIcon: { fontSize: 22 },
  clueText: { flex: 1, fontSize: 15, fontWeight: '800', color: '#5D4037' },
  listenBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#8D6E63', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 2, elevation: 3 },

  boardWrap: { width: BOARD, height: BOARD, marginTop: 10, borderRadius: 20, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 6 },
  placedItem: { position: 'absolute' },
  cellTouch: { position: 'absolute', width: CELL_PX, height: CELL_PX, borderRadius: 10 },

  legend: { fontSize: 13, fontWeight: '800', color: '#8D6E63', marginTop: 8 },

  tray: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8, paddingHorizontal: 10, maxWidth: 460 },
  chip: { width: 82, height: 84, borderRadius: 18, backgroundColor: '#fff', borderWidth: 3, borderColor: '#E8DCC3', alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  chipSelected: { borderColor: '#43A047', backgroundColor: '#E8F5E9' },
  chipWrong: { borderColor: '#E57373', backgroundColor: '#FFEBEE' },
  chipText: { fontSize: 10, fontWeight: '800', color: '#5D4037' },

  readBanner: { marginTop: 12, backgroundColor: '#FFF3C4', borderWidth: 2, borderColor: '#F4C430', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 20 },
  readBannerText: { fontSize: 15, fontWeight: '900', color: '#7B5E00' },
});
