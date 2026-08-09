import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { asset } from '../lib/assetMap';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';

// ============================================
// 👂 SES NASIL? - Müziksel özellikleri ayırt etme (Müzik, MDB.4)
// Çocuk kısa bir ezgi dinler ve o ezginin TEK bir özelliğini yargılar:
// tempo (yavaş/hızlı), gürlük (kısık/yüksek), ses kalınlığı (kalın/ince),
// ezgi yönü (çıkan/inen). Doğruda ezgi, özelliği GÖRÜNÜR kılan bir
// animasyonla birlikte tekrar çalar (zıplayan top / ses dalgası / titreşen
// tel / merdiven basamakları).
//
// Kısayol karşıtı: ekranda eşlenecek özdeş hiçbir şey yoktur; uyaran SES,
// seçenekler KELİME kartıdır. Cevap seçilmeden ÖNCE ekranda hiçbir özellik
// ipucu gösterilmez (dinleme sahnesi her tur birebir aynıdır).
//
// Sesler HAZIR: assets/sounds/sfx/motif-*.wav (aynı 5 notalı motifin
// 8 varyantı; her çift tam olarak TEK özellikte ayrılır).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

// ---- Sahne ölçüleri (tüm SVG koordinatları buradan türetilir) ----
const STAGE_W = Math.min(SCREEN_W - 40, 320);
const STAGE_H = 176;
const MID_Y = STAGE_H / 2;
const PAD_X = 20;

// Tempo sahnesi: zıplayan top
const BALL_R = 16;
const GROUND_Y = STAGE_H - 30;
const BALL_SPAN = STAGE_W - PAD_X * 2 - BALL_R * 2;
const HOP_H = 84;

// Ezgi yönü sahnesi: 5 basamaklı merdiven
const STEP_PAD = 16;
const STEP_GAP = 8;
const STEP_W = (STAGE_W - STEP_PAD * 2 - STEP_GAP * 4) / 5;
const BASE_Y = STAGE_H - 20;
const STEP_UNIT = 24;
const MARK_R = 11;
const stepH = (i: number, up: boolean) => (up ? 22 + i * STEP_UNIT : 22 + (4 - i) * STEP_UNIT);
const stepX = (i: number) => STEP_PAD + i * (STEP_W + STEP_GAP);

// Gürlük sahnesi: genliği farklı iki ses dalgası (aynı biçim, farklı boy)
function wavePath(amp: number): string {
  const n = 72;
  const w = STAGE_W - PAD_X * 2;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const x = PAD_X + (w * i) / n;
    const y = MID_Y - amp * Math.sin((i / n) * Math.PI * 6);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  return d.trim();
}
const WAVE_LOUD = wavePath(52);
const WAVE_SOFT = wavePath(12);

// Ses kalınlığı sahnesi: kalın/ince titreşen tel
const STR_X0 = 22;
const STR_X1 = STAGE_W - 22;
function stringPath(bow: number): string {
  return 'M ' + STR_X0 + ' ' + MID_Y + ' Q ' + (STAGE_W / 2).toFixed(1) + ' ' + (MID_Y - bow) + ' ' + STR_X1 + ' ' + MID_Y;
}
const STR_THICK = stringPath(34);
const STR_THIN = stringPath(11);

// Dinleme sahnesi: nötr radyo + ses yayları (her turda BİREBİR aynı — ipucu vermez)
const RADIO_CX = STAGE_W / 2 - 34;
function arcPath(r: number): string {
  const x = RADIO_CX + 44;
  return 'M ' + x + ' ' + (MID_Y - r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (MID_Y + r);
}

type PropKey = 'yavas' | 'hizli' | 'kisik' | 'yuksek' | 'kalin' | 'ince' | 'cikan' | 'inen';
type PairKey = 'tempo' | 'gurluk' | 'kalinlik' | 'yon';

interface Option { key: PropKey; emoji: string; label: string }

// Özellik çiftleri: SORU + iki büyük özellik kartı (emoji + Türkçe kelime).
// `question` STATİK dizedir (hazır klon ses klipleriyle eşleşir); `short` yalnız
// ekranda yazar ve her iki seçeneği de andığı için cevabı ele vermez.
const PAIRS: Record<PairKey, { question: string; short: string; options: Option[] }> = {
  tempo: {
    question: 'Bu müzik nasıl? Hızlı mı, yavaş mı?',
    short: 'Hızlı mı, yavaş mı?',
    options: [
      { key: 'hizli', emoji: '🐇', label: 'Hızlı' },
      { key: 'yavas', emoji: '🐢', label: 'Yavaş' },
    ],
  },
  gurluk: {
    question: 'Bu ses nasıl? Yüksek sesli mi, kısık mı?',
    short: 'Yüksek mi, kısık mı?',
    options: [
      { key: 'yuksek', emoji: '📣', label: 'Yüksek sesli' },
      { key: 'kisik', emoji: '🤫', label: 'Kısık' },
    ],
  },
  kalinlik: {
    question: 'Bu ses nasıl? Kalın mı, ince mi?',
    short: 'Kalın mı, ince mi?',
    options: [
      { key: 'kalin', emoji: '🐻', label: 'Kalın' },
      { key: 'ince', emoji: '🐦', label: 'İnce' },
    ],
  },
  yon: {
    question: 'Sesler yukarı mı çıkıyor, aşağı mı iniyor?',
    short: 'Çıkıyor mu, iniyor mu?',
    options: [
      { key: 'cikan', emoji: '⬆️', label: 'Çıkıyor' },
      { key: 'inen', emoji: '⬇️', label: 'İniyor' },
    ],
  },
};

// Yanlışta tek, nazik yönlendirme (ceza yok — çocuk yeniden dinleyip dener).
const REDIRECT = 'Olmadı. Müziği bir daha dinle, sonra öbür karta dokun.';

// Her motif: hangi çifte ait, dosya yolu, klip süresi (ms), nota süresi (ms —
// animasyon ezgiyle aynı hızda akar) ve doğruda söylenen STATİK açıklama.
const PROPS: Record<PropKey, { pair: PairKey; motif: string; durMs: number; noteMs: number; confirm: string }> = {
  yavas: {
    pair: 'tempo', motif: '/sounds/sfx/motif-yavas.wav', durMs: 3120, noteMs: 600,
    confirm: 'Aferin! Bu müzik yavaş. Notalar birbirinden uzak uzak geliyor, top da ağır ağır zıplıyor.',
  },
  hizli: {
    pair: 'tempo', motif: '/sounds/sfx/motif-hizli.wav', durMs: 1245, noteMs: 225,
    confirm: 'Aferin! Bu müzik hızlı. Notalar peş peşe koşuyor, top da hop hop zıplıyor.',
  },
  kisik: {
    pair: 'gurluk', motif: '/sounds/sfx/motif-kisik.wav', durMs: 1870, noteMs: 350,
    confirm: 'Doğru! Bu ses kısık. Fısıltı gibi minicik, bak ses dalgası da küçücük.',
  },
  yuksek: {
    pair: 'gurluk', motif: '/sounds/sfx/motif-yuksek.wav', durMs: 1870, noteMs: 350,
    confirm: 'Doğru! Bu ses yüksek. Bağırmak gibi kocaman, bak ses dalgası da koca koca kabarıyor.',
  },
  kalin: {
    pair: 'kalinlik', motif: '/sounds/sfx/motif-kalin.wav', durMs: 1870, noteMs: 350,
    confirm: 'Aferin! Bu ses kalın. Kalın teller ayı sesi gibi ağır ağır titrer.',
  },
  ince: {
    pair: 'kalinlik', motif: '/sounds/sfx/motif-ince.wav', durMs: 1870, noteMs: 350,
    confirm: 'Aferin! Bu ses ince. İnce teller kuş sesi gibi hızlı hızlı titrer.',
  },
  cikan: {
    pair: 'yon', motif: '/sounds/sfx/motif-cikan.wav', durMs: 1620, noteMs: 300,
    confirm: 'Aferin! Sesler yukarı çıkıyor. Merdiven çıkar gibi her nota bir öncekinden daha ince.',
  },
  inen: {
    pair: 'yon', motif: '/sounds/sfx/motif-inen.wav', durMs: 1620, noteMs: 300,
    confirm: 'Aferin! Sesler aşağı iniyor. Merdiven iner gibi her nota bir öncekinden daha kalın.',
  },
};

// Dört çift de iki kez, HER İKİ yönde geçer. Aynı çiftin iki yönü ilk ve ikinci
// yarıya dağıtılır → "geçen sefer yavaştı, o zaman şimdi hızlıdır" kısayolu kapanır.
const HALF_A: PropKey[] = ['yavas', 'kisik', 'kalin', 'cikan'];
const HALF_B: PropKey[] = ['hizli', 'yuksek', 'ince', 'inen'];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// ============================================================
// DİNLEME SAHNESİ — cevap seçilmeden önce görünen NÖTR görsel.
// Her turda aynıdır; hiçbir özelliği ele vermez (yalnız "ses var" der).
// ============================================================
function ListenStage() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] });

  return (
    <View style={styles.stageLayer}>
      <Svg width={STAGE_W} height={STAGE_H}>
        <Rect x={RADIO_CX - 44} y={MID_Y - 44} width={88} height={88} rx={20} fill="#B39DDB" />
        <Circle cx={RADIO_CX} cy={MID_Y} r={28} fill="#EDE7F6" />
        <Circle cx={RADIO_CX} cy={MID_Y} r={12} fill="#5E35B1" />
      </Svg>
      <Animated.View style={[styles.stageLayer, { opacity, transform: [{ scale }] }]} pointerEvents="none">
        <Svg width={STAGE_W} height={STAGE_H}>
          <Path d={arcPath(16)} stroke="#7E57C2" strokeWidth={7} strokeLinecap="round" fill="none" />
          <Path d={arcPath(30)} stroke="#7E57C2" strokeWidth={7} strokeLinecap="round" fill="none" />
          <Path d={arcPath(44)} stroke="#7E57C2" strokeWidth={7} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ============================================================
// TEMPO — zıplayan top: 5 zıplama = 5 nota. Yavaşta ağır ağır,
// hızlıda hop hop. Aynı yol, farklı HIZ → tempo görünür olur.
// ============================================================
function TempoStage({ noteMs }: { noteMs: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: noteMs * 5, easing: Easing.linear, useNativeDriver: USE_NATIVE }),
    );
    loop.start();
    return () => loop.stop();
  }, [t, noteMs]);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, BALL_SPAN] });
  const translateY = t.interpolate({
    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    outputRange: [0, -HOP_H, 0, -HOP_H, 0, -HOP_H, 0, -HOP_H, 0, -HOP_H, 0],
  });

  return (
    <View style={styles.stageLayer}>
      <Svg width={STAGE_W} height={STAGE_H}>
        <Line x1={PAD_X - 8} y1={GROUND_Y + 3} x2={STAGE_W - PAD_X + 8} y2={GROUND_Y + 3} stroke="#B39DDB" strokeWidth={6} strokeLinecap="round" />
        {[1, 2, 3, 4, 5].map((k) => (
          <Circle key={k} cx={PAD_X + BALL_R + (BALL_SPAN * k) / 5} cy={GROUND_Y + 3} r={5} fill="#7E57C2" />
        ))}
      </Svg>
      <Animated.View
        style={[styles.ball, { transform: [{ translateX }, { translateY }] }]}
        pointerEvents="none"
      >
        <Svg width={BALL_R * 2} height={BALL_R * 2}>
          <Circle cx={BALL_R} cy={BALL_R} r={BALL_R - 2} fill="#FF7043" stroke="#fff" strokeWidth={3} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ============================================================
// GÜRLÜK — ses dalgası: yüksekte kocaman kabarır, kısıkta küçücük
// titrer. Dalganın BOYU gürlüğü doğrudan gösterir.
// ============================================================
function GurlukStage({ loud, noteMs }: { loud: boolean; noteMs: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: noteMs, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
        Animated.timing(v, { toValue: 0, duration: noteMs, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, noteMs]);
  const scaleY = v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <View style={styles.stageLayer}>
      <Svg width={STAGE_W} height={STAGE_H}>
        <Line x1={PAD_X} y1={MID_Y} x2={STAGE_W - PAD_X} y2={MID_Y} stroke="#D1C4E9" strokeWidth={3} strokeLinecap="round" />
      </Svg>
      <Animated.View style={[styles.stageLayer, { transform: [{ scaleY }] }]} pointerEvents="none">
        <Svg width={STAGE_W} height={STAGE_H}>
          <Path
            d={loud ? WAVE_LOUD : WAVE_SOFT}
            stroke={loud ? '#E53935' : '#26A69A'}
            strokeWidth={loud ? 8 : 5}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ============================================================
// SES KALINLIĞI — titreşen tel: kalın tel geniş ve AĞIR titrer
// (kalın ses), ince tel dar ve HIZLI titrer (ince ses).
// scaleY 1 → -1 arası gidip gelir; ortadan geçerken tel düzleşir.
// ============================================================
function KalinlikStage({ thick }: { thick: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  const halfMs = thick ? 240 : 80;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: halfMs * 2, easing: Easing.linear, useNativeDriver: USE_NATIVE }),
    );
    loop.start();
    return () => loop.stop();
  }, [v, halfMs]);
  const scaleY = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, -1, 1] });

  return (
    <View style={styles.stageLayer}>
      <Svg width={STAGE_W} height={STAGE_H}>
        <Rect x={12} y={MID_Y - 46} width={13} height={92} rx={6} fill="#8D6E63" />
        <Rect x={STAGE_W - 25} y={MID_Y - 46} width={13} height={92} rx={6} fill="#8D6E63" />
        <Line x1={STR_X0} y1={MID_Y} x2={STR_X1} y2={MID_Y} stroke="#EFEBE9" strokeWidth={2} />
      </Svg>
      <Animated.View style={[styles.stageLayer, { transform: [{ scaleY }] }]} pointerEvents="none">
        <Svg width={STAGE_W} height={STAGE_H}>
          <Path
            d={thick ? STR_THICK : STR_THIN}
            stroke={thick ? '#5D4037' : '#039BE5'}
            strokeWidth={thick ? 17 : 4}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ============================================================
// EZGİ YÖNÜ — 5 basamaklı merdiven: çıkanda basamaklar yükselir,
// inende alçalır. Nota işareti basamakları nota nota gezer.
// ============================================================
function YonStage({ up, noteMs }: { up: boolean; noteMs: number }) {
  const [lit, setLit] = useState(0);
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setLit(0);
    const id = setInterval(() => setLit((n) => (n + 1) % 5), noteMs);
    return () => clearInterval(id);
  }, [up, noteMs]);

  useEffect(() => {
    pop.setValue(0.55);
    Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: USE_NATIVE }).start();
  }, [lit, pop]);

  const h = stepH(lit, up);
  const markLeft = stepX(lit) + STEP_W / 2 - MARK_R;
  const markTop = BASE_Y - h - MARK_R * 2 - 6;

  return (
    <View style={styles.stageLayer}>
      <Svg width={STAGE_W} height={STAGE_H}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Rect
            key={i}
            x={stepX(i)}
            y={BASE_Y - stepH(i, up)}
            width={STEP_W}
            height={stepH(i, up)}
            rx={7}
            fill={i <= lit ? '#FFB300' : '#EDE7F6'}
          />
        ))}
        <Line x1={STEP_PAD - 6} y1={BASE_Y + 3} x2={STAGE_W - STEP_PAD + 6} y2={BASE_Y + 3} stroke="#B39DDB" strokeWidth={6} strokeLinecap="round" />
      </Svg>
      <Animated.View
        style={[styles.mark, { left: markLeft, top: markTop, transform: [{ scale: pop }] }]}
        pointerEvents="none"
      >
        <Svg width={MARK_R * 2} height={MARK_R * 2}>
          <Circle cx={MARK_R} cy={MARK_R} r={MARK_R - 2} fill="#7E57C2" stroke="#fff" strokeWidth={3} />
        </Svg>
      </Animated.View>
    </View>
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

export default function SesNasil({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [order] = useState<PropKey[]>(() => [...shuffle(HALF_A), ...shuffle(HALF_B)]);
  const [current, setCurrent] = useState<PropKey>(HALF_A[0]);
  const [options, setOptions] = useState<Option[]>(PAIRS.tempo.options);
  const [revealed, setRevealed] = useState(false); // doğru cevaptan SONRA özellik animasyonu
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<PropKey | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Zamanlayıcılar + ses referansları (unmount'ta hepsi temizlenir)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const questionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const loadTokenRef = useRef(0); // eşzamanlı yüklemede yetim sesleri önler

  const shake = useRef(new Animated.Value(0)).current;

  const prop = PROPS[current];
  const pair = PAIRS[prop.pair];

  // ---- Unmount temizliği: TÜM zamanlayıcılar + Audio.Sound durdur/boşalt + konuşmayı kes ----
  useEffect(() => () => {
    isMountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    questionTimerRef.current = null;
    redirectTimerRef.current = null;
    loadTokenRef.current += 1; // devam eden yüklemeleri geçersiz kıl
    if (soundRef.current) {
      const s = soundRef.current;
      soundRef.current = null;
      s.stopAsync().catch(() => { });
      s.unloadAsync().catch(() => { });
    }
    stopSpeech();
  }, []);

  // Sessiz modda da (iOS) ezgi duyulsun.
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
      } catch {
        // ses modu ayarlanamazsa oynatma yine denenir
      }
    })();
  }, []);

  // Önceki klibi boşalt → istenen motifi yükleyip çal.
  // NOT: ses seviyesi HER motifte 1.0 — "kısık/yüksek" farkı kaydın kendisindedir.
  const playMotif = async (path: string) => {
    const myToken = ++loadTokenRef.current;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => { });
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(asset(path), { shouldPlay: true, volume: 1.0 });
      // Yükleme biterken tur değiştiyse / unmount olduysa yeni sesi de boşalt.
      if (!isMountedRef.current || myToken !== loadTokenRef.current) {
        await sound.unloadAsync().catch(() => { });
        return;
      }
      soundRef.current = sound;
    } catch (e) {
      console.warn('🎵 Motif yüklenemedi (sessiz geçildi):', e);
    }
  };

  // ---- Tur yaşam döngüsü: ezgiyi çal → bitince soruyu sor ----
  useEffect(() => {
    if (!gameReady) return;
    const key = order[round - 1];
    const cur = PROPS[key];
    setCurrent(key);
    setOptions(shuffle(PAIRS[cur.pair].options));
    setRevealed(false);
    setLocked(false);
    setWrong(null);
    playMotif(cur.motif);

    // Soru, ezginin ÜSTÜNE binmesin diye klip bitince sorulur.
    const t = setTimeout(() => {
      if (!isMountedRef.current) return;
      speak(PAIRS[cur.pair].question, { instructions: HAPPY_VOICE });
    }, cur.durMs + 250);
    questionTimerRef.current = t;
    timersRef.current.push(t);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    loadTokenRef.current += 1;
    if (soundRef.current) {
      const s = soundRef.current;
      soundRef.current = null;
      s.stopAsync().catch(() => { });
      s.unloadAsync().catch(() => { });
    }
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('ses-nasil', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Müzik: Müziksel Özellikleri Ayırt Edebilme — tempo, gürlük, ses kalınlığı, ezgi yönü (MDB.4)',
      correct_answers: correctRef.current,
    });
  };

  // Ezgiyi elle tekrar dinlet (sınırsız — dinleme yükü azalsın).
  // Soru, ezginin üstüne binmemesi için klip bitişine ötelenir.
  const replayMotif = () => {
    if (locked) return;
    if (questionTimerRef.current) clearTimeout(questionTimerRef.current);
    stopSpeech();
    playMotif(prop.motif);
    const t = setTimeout(() => {
      if (!isMountedRef.current) return;
      speak(pair.question, { instructions: HAPPY_VOICE });
    }, prop.durMs + 250);
    questionTimerRef.current = t;
    timersRef.current.push(t);
  };

  const repeatQuestion = () => {
    if (locked) return;
    speak(pair.question, { instructions: HAPPY_VOICE });
  };

  const handlePick = (key: PropKey) => {
    if (locked) return;
    movesRef.current += 1;
    if (questionTimerRef.current) {
      clearTimeout(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    stopSpeech();

    if (key === current) {
      // DOĞRU: ezgi, özelliği GÖRÜNÜR kılan animasyonla birlikte tekrar çalar,
      // sonra özelliği adlandıran açıklama gelir.
      setLocked(true);
      correctRef.current += 1;
      setShowConfetti(true);
      setRevealed(true);
      playMotif(prop.motif);
      const t = setTimeout(() => {
        if (!isMountedRef.current) return;
        speakThenWait(prop.confirm, 1800, { instructions: HAPPY_VOICE }).then(() => {
          if (!isMountedRef.current) return;
          setShowConfetti(false);
          if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
          else finish();
        });
      }, prop.durMs + 200);
      timersRef.current.push(t);
    } else {
      // YANLIŞ: kart titrer, ezgi tekrar çalar, nazik yönlendirme gelir.
      // Ceza yok — tur ilerlemez, çocuk yeniden dener (hata yalnız rapor metriğidir).
      errorsRef.current += 1;
      setWrong(key);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      playMotif(prop.motif);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      const rt = setTimeout(() => {
        if (!isMountedRef.current) return;
        speak(REDIRECT, { instructions: HAPPY_VOICE });
      }, prop.durMs + 200);
      redirectTimerRef.current = rt;
      timersRef.current.push(rt);
      const ct = setTimeout(() => {
        if (!isMountedRef.current) return;
        setWrong(null);
      }, 450);
      timersRef.current.push(ct);
    }
  };

  // Doğru cevaptan SONRA özellik sahnesi; öncesinde her tur aynı nötr sahne.
  const renderStage = () => {
    if (!revealed) return <ListenStage />;
    if (prop.pair === 'tempo') return <TempoStage noteMs={prop.noteMs} />;
    if (prop.pair === 'gurluk') return <GurlukStage loud={current === 'yuksek'} noteMs={prop.noteMs} />;
    if (prop.pair === 'kalinlik') return <KalinlikStage thick={current === 'kalin'} />;
    return <YonStage up={current === 'cikan'} noteMs={prop.noteMs} />;
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Kulağını aç! Müziği dinle ve nasıl olduğunu bul. İki karttan doğru olana dokun."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#6A1B9A" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>👂 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>{revealed ? 'Aferin! 🌟' : pair.short}</Text>

      <View style={styles.stageWrap}>{renderStage()}</View>

      {!revealed && (
        <>
          <TouchableOpacity style={styles.listenBtn} onPress={replayMotif} activeOpacity={0.85}>
            <Ionicons name="musical-notes" size={22} color="#fff" />
            <Text style={styles.listenText}>Müziği Dinle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qBtn} onPress={repeatQuestion} activeOpacity={0.8}>
            <Ionicons name="volume-high" size={16} color="#6A1B9A" />
            <Text style={styles.qText}>Soruyu Tekrar Dinle</Text>
          </TouchableOpacity>
        </>
      )}
      {revealed && <View style={styles.revealSpacer}><Text style={styles.revealHint}>Sesi hem duyuyor hem görüyorsun!</Text></View>}

      <View style={styles.cards}>
        {options.map((opt) => {
          const isWrong = wrong === opt.key;
          const isRight = revealed && opt.key === current;
          return (
            <Animated.View key={opt.key} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.card, isWrong && styles.cardWrong, isRight && styles.cardRight]}
                onPress={() => handlePick(opt.key)}
                activeOpacity={0.85}
                disabled={locked}
              >
                <Text style={styles.cardEmoji}>{opt.emoji}</Text>
                <Text style={styles.cardLabel}>{opt.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3E9FF', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#6A1B9A' },

  prompt: { fontSize: 20, fontWeight: '800', color: '#6A1B9A', marginTop: 6, marginBottom: 8 },

  stageWrap: { width: STAGE_W, height: STAGE_H, borderRadius: 26, backgroundColor: '#fff', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  stageLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'flex-start', justifyContent: 'flex-start' },
  ball: { position: 'absolute', left: PAD_X, top: GROUND_Y - BALL_R * 2, width: BALL_R * 2, height: BALL_R * 2 },
  mark: { position: 'absolute', width: MARK_R * 2, height: MARK_R * 2 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7E57C2', paddingVertical: 12, paddingHorizontal: 26, borderRadius: 24, marginTop: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  qBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 4, paddingHorizontal: 10 },
  qText: { color: '#6A1B9A', fontSize: 13, fontWeight: '800' },

  revealSpacer: { marginTop: 14, height: 78, alignItems: 'center', justifyContent: 'center' },
  revealHint: { fontSize: 15, fontWeight: '800', color: '#7B1FA2', textAlign: 'center', paddingHorizontal: 20 },

  cards: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap', maxWidth: 440, paddingHorizontal: 12 },
  card: { width: 140, height: 132, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 3, borderColor: '#EDE7F6', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  cardWrong: { backgroundColor: '#FFE0E0', borderColor: '#EF9A9A' },
  cardRight: { backgroundColor: '#E8F5E9', borderColor: '#66BB6A' },
  cardEmoji: { fontSize: 54 },
  cardLabel: { fontSize: 17, fontWeight: '900', color: '#4A148C', textAlign: 'center', paddingHorizontal: 6 },
});
