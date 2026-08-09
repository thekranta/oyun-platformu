import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, { Circle, Line } from 'react-native-svg';
import { asset } from '../lib/assetMap';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';

// ============================================
// 🦘 HAYVAN JİMNASTİĞİ - Düşünme kapılı hareket molası (Hareket ve Sağlık, HSAB.1)
// Her tur: (1) düşünme sorusu — iki hayvan kartı ("Hangisi ZIPLAYARAK gider?"),
// (2) seçilen hareket adlandırılır ve büyük SVG çöp adam figürü iki karelik
// animasyonla hareketi GÖSTERİR, (3) 10 saniyelik UYGULAMA PENCERESİ açılır:
// düzenli tik sesi çalar + küçülen halka süreyi gösterir, çocuk ayağa kalkıp
// hareketi gerçekten yapar, (4) büyük YAPTIM! düğmesi belirir, çocuk basar, kutlanır.
// 6 tur ≈ 60 saniye GERÇEK büyük kas etkinliği; son tur sakinleştirici esnemedir.
// Yeni ses YOK — mevcut sentez earcon'ları kullanılır: tik / tik-hizli / bitti.
// Ekran çocuğun yerine yapamayacağı fiziksel eylemi hedefler (ekran başında oturtmaz).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 6;

// Uygulama penceresi: çocuk bu süre boyunca hareketi yapar (6 tur ≈ 60 sn etkin hareket).
const PRACTICE_MS = 10000;
// Halkayı/kalan saniyeyi güncelleyen kare aralığı (kendini yeniden kuran setTimeout zinciri).
const FRAME_MS = 100;
// YAPTIM! basılmazsa nazik hatırlatma (çocuk ekrandan uzaklaşmış olabilir).
const REMIND_MS = 9000;

// Süre halkası ölçüleri
const RING_BOX = 230;
const RING_R = 100;
const RING_C = 2 * Math.PI * RING_R;

// ---- Çöp adam pozu: 100x140 viewBox içinde uzuv uçları + gövde kayması/eğimi ----
type Poz = {
  lh: [number, number]; // sol el
  rh: [number, number]; // sağ el
  lf: [number, number]; // sol ayak
  rf: [number, number]; // sağ ayak
  dx: number;           // gövde yatay kayması
  dy: number;           // gövde dikey kayması (zıplama/çömelme)
  rot: number;          // gövde eğimi (derece)
};

interface Tur {
  soru: string;          // STATİK — soru cümlesi (seslendirilir + ekranda yazar)
  onay: string;          // STATİK — doğru cevabın onayı + hareket yönergesi
  yonlendirme: string;   // STATİK — yanlış seçimde nazik yönlendirme (ceza yok)
  kutlama: string;       // STATİK — YAPTIM! sonrası kutlama + neden iyi geldiği
  dogruEmoji: string;
  dogruAd: string;
  yanlisEmoji: string;
  yanlisAd: string;
  hareketAdi: string;    // ekran etiketi (ör. "ZIPLA!")
  ipucu: string;         // uygulama penceresinde ekranda duran kısa hatırlatma
  tik: string;           // tempo sesi: tik (sakin) / tik-hizli (canlı)
  tikMs: number;         // tempo aralığı
  renk: string;
  bg: string;
  pozA: Poz;
  pozB: Poz;
}

// Küratörlü 6 tur. Sıra pedagojiktir: enerjik başlar, dengeye iner, kapanışta esneme.
// Hareketlerin tamamı KAPALI ALANDA, küçük bir yerde, güvenle yapılabilir:
// koşma yok, yüksekten atlama yok — sadece yerinde zıplama, denge, yürüyüş, yan adım,
// yavaş dönme ve gerinme.
const TURLAR: Tur[] = [
  {
    soru: 'Hangisi zıplayarak gider: kurbağa mı, yılan mı?',
    onay: 'Aferin! Kurbağa zıplayarak gider. Şimdi ayağa kalk, kurbağa gibi çömel ve olduğun yerde zıpla!',
    yonlendirme: 'Yılan yerde sürünerek ilerler. Zıplayarak giden hayvan kurbağadır.',
    kutlama: 'Harika zıpladın! Zıplamak bacaklarını güçlendirir.',
    dogruEmoji: '🐸', dogruAd: 'Kurbağa',
    yanlisEmoji: '🐍', yanlisAd: 'Yılan',
    hareketAdi: 'ZIPLA!',
    ipucu: 'Çömel ve olduğun yerde zıpla',
    tik: '/sounds/sfx/tik-hizli.wav', tikMs: 1000,
    renk: '#2E7D32', bg: '#E8F5E9',
    pozA: { lh: [28, 80], rh: [72, 80], lf: [26, 118], rf: [74, 118], dx: 0, dy: 14, rot: 0 },
    pozB: { lh: [24, 26], rh: [76, 26], lf: [38, 126], rf: [62, 126], dx: 0, dy: -14, rot: 0 },
  },
  {
    soru: 'Hangisi ağır ağır, büyük adımlarla yürür: fil mi, fare mi?',
    onay: 'Doğru! Fil ağır ağır, büyük adımlarla yürür. Şimdi sen de fil gibi yavaş yürü ve kollarını hortum gibi salla!',
    yonlendirme: 'Fare küçücüktür, hızlı hızlı koşturur. Ağır ağır yürüyen hayvan fildir.',
    kutlama: 'Çok güçlü yürüdün! Ağır adımlar bacak kaslarını çalıştırır.',
    dogruEmoji: '🐘', dogruAd: 'Fil',
    yanlisEmoji: '🐭', yanlisAd: 'Fare',
    hareketAdi: 'AĞIR YÜRÜ!',
    ipucu: 'Yavaş yürü, kollarını hortum gibi salla',
    tik: '/sounds/sfx/tik.wav', tikMs: 1600,
    renk: '#546E7A', bg: '#ECEFF1',
    pozA: { lh: [30, 88], rh: [70, 62], lf: [24, 126], rf: [72, 122], dx: 0, dy: 2, rot: -3 },
    pozB: { lh: [30, 62], rh: [70, 88], lf: [30, 122], rf: [76, 126], dx: 0, dy: 6, rot: 3 },
  },
  {
    soru: 'Hangisi tek ayak üstünde durur: flamingo mu, ayı mı?',
    onay: 'Aferin! Flamingo tek ayak üstünde durur. Şimdi sen de bir ayağını kaldır ve dengede kalmaya çalış!',
    yonlendirme: 'Ayı dört ayağının üstünde ağır ağır yürür. Tek ayak üstünde duran kuş flamingodur.',
    kutlama: 'Dengeni korudun, bravo! Tek ayakta durmak dengeni güçlendirir.',
    dogruEmoji: '🦩', dogruAd: 'Flamingo',
    yanlisEmoji: '🐻', yanlisAd: 'Ayı',
    hareketAdi: 'TEK AYAK!',
    ipucu: 'Bir ayağını kaldır, dengede kal',
    tik: '/sounds/sfx/tik.wav', tikMs: 1200,
    renk: '#D81B60', bg: '#FCE4EC',
    pozA: { lh: [18, 58], rh: [82, 58], lf: [48, 130], rf: [70, 104], dx: 0, dy: 0, rot: 0 },
    pozB: { lh: [14, 46], rh: [86, 46], lf: [48, 130], rf: [74, 98], dx: 0, dy: -2, rot: 4 },
  },
  {
    soru: 'Hangisi yan yan yürür: yengeç mi, kaplumbağa mı?',
    onay: 'Doğru! Yengeç yan yan yürür. Şimdi sen de biraz çömel ve yengeç gibi yana doğru adım at!',
    yonlendirme: 'Kaplumbağa yavaş yavaş ileri yürür. Yan yan yürüyen hayvan yengeçtir.',
    kutlama: 'Süper yan yürüdün! Yana adım atmak vücudunu daha çevik yapar.',
    dogruEmoji: '🦀', dogruAd: 'Yengeç',
    yanlisEmoji: '🐢', yanlisAd: 'Kaplumbağa',
    hareketAdi: 'YAN YÜRÜ!',
    ipucu: 'Biraz çömel, yana adım at',
    tik: '/sounds/sfx/tik-hizli.wav', tikMs: 1100,
    renk: '#EF6C00', bg: '#FFF3E0',
    pozA: { lh: [16, 66], rh: [84, 66], lf: [24, 114], rf: [76, 114], dx: -12, dy: 12, rot: 0 },
    pozB: { lh: [14, 58], rh: [86, 58], lf: [22, 114], rf: [78, 114], dx: 12, dy: 12, rot: 0 },
  },
  {
    soru: 'Hangisi kanatlarını açıp gökyüzünde süzülür: kartal mı, penguen mi?',
    onay: 'Aferin! Kartal kanatlarını açıp gökyüzünde süzülür. Şimdi sen de kollarını kanat gibi aç ve yavaşça kendi etrafında dön!',
    yonlendirme: 'Penguen uçamaz, karda paytak paytak yürür. Gökyüzünde süzülen kuş kartaldır.',
    kutlama: 'Çok güzel süzüldün! Dönmek vücudunun dengesini geliştirir.',
    dogruEmoji: '🦅', dogruAd: 'Kartal',
    yanlisEmoji: '🐧', yanlisAd: 'Penguen',
    hareketAdi: 'DÖN!',
    ipucu: 'Kollarını kanat gibi aç, yavaşça dön',
    tik: '/sounds/sfx/tik.wav', tikMs: 1400,
    renk: '#6D4C41', bg: '#EFEBE9',
    pozA: { lh: [10, 52], rh: [90, 52], lf: [40, 128], rf: [60, 128], dx: 0, dy: 0, rot: -12 },
    pozB: { lh: [12, 40], rh: [88, 64], lf: [40, 128], rf: [60, 128], dx: 0, dy: -4, rot: 12 },
  },
  {
    // Kapanış: sakinleştirici esneme — nabız iner, seans huzurlu biter.
    soru: 'Hangisi uyandığında gerinip esner: kedi mi, balık mı?',
    onay: 'Doğru! Kedi uyandığında gerinip esner. Şimdi sen de yavaşça kollarını yukarı uzat, derin bir nefes al ve gerin!',
    yonlendirme: 'Balık suda yüzer, gerinmez. Uyandığında gerinen hayvan kedidir.',
    kutlama: 'Çok güzel gerindin! Şimdi nefesin sakinleşti, jimnastiğimiz bitti.',
    dogruEmoji: '🐈', dogruAd: 'Kedi',
    yanlisEmoji: '🐟', yanlisAd: 'Balık',
    hareketAdi: 'GERİN!',
    ipucu: 'Kollarını yukarı uzat, derin nefes al',
    tik: '/sounds/sfx/tik.wav', tikMs: 2000,
    renk: '#5E35B1', bg: '#EDE7F6',
    pozA: { lh: [26, 22], rh: [74, 22], lf: [40, 128], rf: [60, 128], dx: 0, dy: 0, rot: 0 },
    pozB: { lh: [20, 8], rh: [80, 8], lf: [38, 130], rf: [62, 130], dx: 0, dy: -5, rot: 0 },
  },
];

type Faz = 'soru' | 'hazirla' | 'uygulama' | 'yaptim' | 'kutlama';

// ---- Hareket figürü: iki karelik çöp adam (Circle baş + Line gövde/kol/bacak) ----
// Poz A ↔ Poz B arasında tempoyla geçer; çocuk hareketi GÖRÜR, tarif okumak zorunda kalmaz.
function HareketFiguru({ poz, renk, boyut }: { poz: Poz; renk: string; boyut: number }) {
  const ox = poz.dx;
  const oy = poz.dy;
  const kol = { stroke: renk, strokeWidth: 9, strokeLinecap: 'round' as const };
  const bacak = { stroke: renk, strokeWidth: 10, strokeLinecap: 'round' as const };
  return (
    <View style={{ transform: [{ rotate: `${poz.rot}deg` }] }}>
      <Svg width={boyut} height={boyut * 1.4} viewBox="0 0 100 140">
        {/* zemin çizgisi — zıplamanın yerden kesildiği görünsün */}
        <Line x1={10} y1={136} x2={90} y2={136} stroke="#CFD8DC" strokeWidth={5} strokeLinecap="round" />
        <Circle cx={50 + ox} cy={24 + oy} r={15} fill={renk} />
        <Line x1={50 + ox} y1={40 + oy} x2={50 + ox} y2={86 + oy} stroke={renk} strokeWidth={11} strokeLinecap="round" />
        <Line x1={50 + ox} y1={50 + oy} x2={poz.lh[0] + ox} y2={poz.lh[1] + oy} {...kol} />
        <Line x1={50 + ox} y1={50 + oy} x2={poz.rh[0] + ox} y2={poz.rh[1] + oy} {...kol} />
        <Line x1={50 + ox} y1={86 + oy} x2={poz.lf[0] + ox} y2={poz.lf[1] + oy} {...bacak} />
        <Line x1={50 + ox} y1={86 + oy} x2={poz.rf[0] + ox} y2={poz.rf[1] + oy} {...bacak} />
      </Svg>
    </View>
  );
}

// ---- Küçülen süre halkası: strokeDashoffset ile 10 sn'yi görselleştirir ----
function SureHalkasi({ oran, renk }: { oran: number; renk: string }) {
  const kalan = Math.max(0, Math.min(1, oran));
  return (
    <Svg width={RING_BOX} height={RING_BOX}>
      <Circle cx={RING_BOX / 2} cy={RING_BOX / 2} r={RING_R} stroke="#FFFFFF" strokeWidth={14} fill="none" />
      <Circle
        cx={RING_BOX / 2}
        cy={RING_BOX / 2}
        r={RING_R}
        stroke={renk}
        strokeWidth={14}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${RING_C} ${RING_C}`}
        strokeDashoffset={RING_C * (1 - kalan)}
        rotation={-90}
        originX={RING_BOX / 2}
        originY={RING_BOX / 2}
      />
    </Svg>
  );
}

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number; round_history?: any },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function HayvanJimnastigi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [faz, setFaz] = useState<Faz>('soru');
  const [kartlarTers, setKartlarTers] = useState(false);
  const [yanlisKart, setYanlisKart] = useState<string | null>(null);
  const [kalanMs, setKalanMs] = useState(PRACTICE_MS);
  const [pozB, setPozB] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const lockRef = useRef(false); // doğru cevap / YAPTIM işlenirken çift dokunuşu engeller
  // Tamamlanan uygulama pencerelerinin TOPLAM ETKİN HAREKET süresi (ms).
  const hareketMsRef = useRef(0);
  const startRef = useRef(Date.now()); // giriş ekranı sayılmasın diye onComplete'te sıfırlanır

  // Zamanlayıcılar: TÜMÜ timersRef'te toplanır (unmount'ta tek seferde temizlenir).
  // Zincirler ayrıca tek yuvalı ref'lerde tutulur ki pencere içinde anında iptal edilebilsinler.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Uygulama penceresi jetonu: pencere kapanınca/tur değişince eski zincirler ölür.
  const windowTokenRef = useRef(0);

  // Sesler: tempo tikleri (tur bazlı) + bitiş çanı (bir kez yüklenir)
  const tickSoundRef = useRef<Audio.Sound | null>(null);
  const tickPathRef = useRef<string | null>(null);
  const chimeSoundRef = useRef<Audio.Sound | null>(null);
  const loadTokenRef = useRef(0); // eşzamanlı yüklemede yetim sesleri önler

  const bounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  const tur = TURLAR[Math.min(round, TOTAL_ROUNDS) - 1];

  // ---- Unmount temizliği: TÜM zamanlayıcılar + tik/çan seslerini durdur-boşalt + konuşmayı kes ----
  // Uygulama penceresinin ortasında çıkılsa bile tik zinciri anında susar.
  useEffect(() => () => {
    isMountedRef.current = false;
    windowTokenRef.current += 1; // devam eden tik/kare zincirlerini geçersiz kıl
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (frameTimerRef.current) { clearTimeout(frameTimerRef.current); frameTimerRef.current = null; }
    if (tickTimerRef.current) { clearTimeout(tickTimerRef.current); tickTimerRef.current = null; }
    if (poseTimerRef.current) { clearTimeout(poseTimerRef.current); poseTimerRef.current = null; }
    loadTokenRef.current += 1; // devam eden ses yüklemelerini geçersiz kıl
    const t = tickSoundRef.current;
    tickSoundRef.current = null;
    if (t) { t.stopAsync().catch(() => { }); t.unloadAsync().catch(() => { }); }
    const c = chimeSoundRef.current;
    chimeSoundRef.current = null;
    if (c) { c.stopAsync().catch(() => { }); c.unloadAsync().catch(() => { }); }
    stopSpeech();
  }, []);

  // Sessiz modda da (iOS) tempo tiki duyulsun + bitiş çanını önceden yükle.
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
      } catch {
        // ses modu ayarlanamazsa oynatma yine denenir
      }
      const myToken = loadTokenRef.current;
      try {
        const { sound } = await Audio.Sound.createAsync(asset('/sounds/sfx/bitti.wav'), { shouldPlay: false, volume: 0.9 });
        if (!isMountedRef.current || myToken !== loadTokenRef.current) {
          await sound.unloadAsync().catch(() => { });
          return;
        }
        chimeSoundRef.current = sound;
      } catch (e) {
        console.warn('🔔 Bitiş çanı yüklenemedi (sessiz geçildi):', e);
      }
    })();
  }, []);

  // Turun temposuna uygun tik sesini yükler (soru sorulurken hazırlanır).
  const loadTick = async (path: string) => {
    if (tickPathRef.current === path && tickSoundRef.current) return;
    const myToken = ++loadTokenRef.current;
    const eski = tickSoundRef.current;
    tickSoundRef.current = null;
    tickPathRef.current = null;
    if (eski) {
      await eski.stopAsync().catch(() => { });
      await eski.unloadAsync().catch(() => { });
    }
    try {
      const { sound } = await Audio.Sound.createAsync(asset(path), { shouldPlay: false, volume: 0.85 });
      if (!isMountedRef.current || myToken !== loadTokenRef.current) {
        await sound.unloadAsync().catch(() => { });
        return;
      }
      tickSoundRef.current = sound;
      tickPathRef.current = path;
    } catch (e) {
      console.warn('⏱️ Tempo sesi yüklenemedi (sessiz geçildi):', e);
    }
  };

  const playTick = () => {
    const s = tickSoundRef.current;
    if (s) s.replayAsync().catch(() => { });
  };

  const playChime = () => {
    const s = chimeSoundRef.current;
    if (s) s.replayAsync().catch(() => { });
  };

  // ---- Tur başlangıcı: soru fazı ----
  useEffect(() => {
    if (!gameReady) return;
    const t = TURLAR[Math.min(round, TOTAL_ROUNDS) - 1];
    windowTokenRef.current += 1; // önceki turdan kalan zincir varsa öldür
    // Geçen turun zamanlayıcıları burada bitmiştir; listeyi sıfırla (seans boyunca şişmesin).
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    lockRef.current = false;
    setFaz('soru');
    setYanlisKart(null);
    setKalanMs(PRACTICE_MS);
    setPozB(false);
    setKartlarTers(Math.random() < 0.5); // doğru kart hep aynı tarafta olmasın
    bounce.setValue(0.85);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    loadTick(t.tik); // pencere açılmadan tempo sesi hazır olsun
    speak(t.soru, { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  // ---- İki karelik figür animasyonu (yalnız gösterim + uygulama fazlarında) ----
  useEffect(() => {
    if (faz !== 'hazirla' && faz !== 'uygulama') {
      setPozB(false);
      return;
    }
    const t = TURLAR[Math.min(round, TOTAL_ROUNDS) - 1];
    const araMs = Math.max(320, Math.round(t.tikMs / 2));
    let cancelled = false;
    const adim = () => {
      const timer = setTimeout(() => {
        if (cancelled || !isMountedRef.current) return;
        setPozB((v) => !v);
        adim();
      }, araMs);
      poseTimerRef.current = timer;
      timersRef.current.push(timer);
    };
    adim();
    return () => {
      cancelled = true;
      if (poseTimerRef.current) { clearTimeout(poseTimerRef.current); poseTimerRef.current = null; }
    };
     
  }, [faz, round]);

  // ---- YAPTIM! düğmesi nabzı + basılmazsa tek nazik hatırlatma ----
  useEffect(() => {
    if (faz !== 'yaptim') return;
    pulse.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 480, useNativeDriver: USE_NATIVE }),
        Animated.timing(pulse, { toValue: 1, duration: 480, useNativeDriver: USE_NATIVE }),
      ]),
    );
    loop.start();
    const hatirlat = setTimeout(() => {
      if (!isMountedRef.current) return;
      speak('Yaptım düğmesine bas, seni bekliyorum!', { instructions: HAPPY_VOICE });
    }, REMIND_MS);
    timersRef.current.push(hatirlat);
    return () => {
      loop.stop();
      clearTimeout(hatirlat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faz]);

  // ---- Uygulama penceresi: tempo tikleri + küçülen halka (10 sn gerçek hareket) ----
  const startPractice = (t: Tur) => {
    if (!isMountedRef.current) return;
    const token = ++windowTokenRef.current;
    const basladi = Date.now();
    setKalanMs(PRACTICE_MS);
    setFaz('uygulama');
    speak('Hadi başla!', { instructions: HAPPY_VOICE });

    // Tempo zinciri — her tik kendinden sonrakini kurar; jeton eskiyince kendiliğinden ölür.
    playTick();
    const tikAdimi = () => {
      const timer = setTimeout(() => {
        if (!isMountedRef.current || token !== windowTokenRef.current) return;
        playTick();
        tikAdimi();
      }, t.tikMs);
      tickTimerRef.current = timer;
      timersRef.current.push(timer);
    };
    tikAdimi();

    // Kare zinciri — halkayı ve kalan saniyeyi günceller, süre dolunca pencereyi kapatır.
    const kareAdimi = () => {
      const timer = setTimeout(() => {
        if (!isMountedRef.current || token !== windowTokenRef.current) return;
        const gecen = Date.now() - basladi;
        if (gecen >= PRACTICE_MS) {
          setKalanMs(0);
          endPractice(token);
          return;
        }
        setKalanMs(PRACTICE_MS - gecen);
        kareAdimi();
      }, FRAME_MS);
      frameTimerRef.current = timer;
      timersRef.current.push(timer);
    };
    kareAdimi();
  };

  // Pencere kapanır: jeton ilerletilir (tik zinciri susar), çan çalar, YAPTIM! belirir.
  const endPractice = (token: number) => {
    if (!isMountedRef.current || token !== windowTokenRef.current) return;
    windowTokenRef.current += 1;
    if (tickTimerRef.current) { clearTimeout(tickTimerRef.current); tickTimerRef.current = null; }
    if (frameTimerRef.current) { clearTimeout(frameTimerRef.current); frameTimerRef.current = null; }
    hareketMsRef.current += PRACTICE_MS; // etkin hareket süresi biriktir
    playChime();
    lockRef.current = false; // doğru cevaptan beri kilitliydi; YAPTIM! artık basılabilir
    setFaz('yaptim');
    speak('Süre doldu! Yaptım düğmesine bas.', { instructions: HAPPY_VOICE });
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    windowTokenRef.current += 1;
    const t = tickSoundRef.current;
    if (t) t.stopAsync().catch(() => { });
    // `sure` TÜM oyunlarda oturum süresidir (haftalık rapor bu alanı toplar) —
    // etkin hareket süresi ayrıca round_history'de taşınır.
    const durationSeconds = Math.round((Date.now() - startRef.current) / 1000);
    onGameEnd('hayvan-jimnastigi', durationSeconds, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Hareket ve Sağlık: Temel Hareket Becerilerini Sergileyebilme (HSAB.1)',
      correct_answers: correctRef.current,
      round_history: { hareketSaniye: Math.round(hareketMsRef.current / 1000), tamamlananHareket: correctRef.current },
    });
  };

  // ---- Düşünme kapısı: hangi hayvan böyle hareket eder? ----
  const handlePick = (dogruMu: boolean) => {
    if (lockRef.current || faz !== 'soru') return;
    movesRef.current += 1;
    if (dogruMu) {
      lockRef.current = true;
      correctRef.current += 1;
      setYanlisKart(null);
      setFaz('hazirla');
      speakThenWait(tur.onay, 1800, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        startPractice(tur);
      });
    } else {
      // Ceza yok: kart nazikçe titrer, doğru hareketi yapan hayvan hatırlatılır.
      errorsRef.current += 1;
      setYanlisKart(tur.yanlisAd);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      speak(tur.yonlendirme, { instructions: HAPPY_VOICE });
      const timer = setTimeout(() => {
        if (!isMountedRef.current) return;
        setYanlisKart(null);
      }, 500);
      timersRef.current.push(timer);
    }
  };

  // ---- YAPTIM!: çocuk hareketi bitirip ekrana döndü ----
  const handleYaptim = () => {
    if (lockRef.current || faz !== 'yaptim') return;
    lockRef.current = true;
    movesRef.current += 1;
    setShowConfetti(true);
    setFaz('kutlama');
    speakThenWait(tur.kutlama, 1800, { instructions: HAPPY_VOICE }).then(() => {
      if (!isMountedRef.current) return;
      setShowConfetti(false);
      lockRef.current = false;
      if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
      else finish();
    });
  };

  // Çıkışta her şey ANINDA sussun (tik zinciri, konuşma, çan).
  const handleExit = () => {
    windowTokenRef.current += 1;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (frameTimerRef.current) { clearTimeout(frameTimerRef.current); frameTimerRef.current = null; }
    if (tickTimerRef.current) { clearTimeout(tickTimerRef.current); tickTimerRef.current = null; }
    if (poseTimerRef.current) { clearTimeout(poseTimerRef.current); poseTimerRef.current = null; }
    const t = tickSoundRef.current;
    if (t) t.stopAsync().catch(() => { });
    const c = chimeSoundRef.current;
    if (c) c.stopAsync().catch(() => { });
    stopSpeech();
    onExit?.();
  };

  const hareketFazi = faz === 'hazirla' || faz === 'uygulama' || faz === 'yaptim' || faz === 'kutlama';
  const poz = pozB ? tur.pozB : tur.pozA;
  const kalanSn = Math.max(0, Math.ceil(kalanMs / 1000));
  const btnW = Math.min(320, SCREEN_W - 48);

  const kartlar = kartlarTers
    ? [{ emoji: tur.yanlisEmoji, ad: tur.yanlisAd, dogru: false }, { emoji: tur.dogruEmoji, ad: tur.dogruAd, dogru: true }]
    : [{ emoji: tur.dogruEmoji, ad: tur.dogruAd, dogru: true }, { emoji: tur.yanlisEmoji, ad: tur.yanlisAd, dogru: false }];

  return (
    <View style={[styles.container, { backgroundColor: tur.bg }]}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Hayvan jimnastiği zamanı! Önce ayağa kalk ve etrafında yer aç, eşyalara çarpma. Sonra hayvanı seç ve onun gibi hareket et."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => { startRef.current = Date.now(); setGameReady(true); }}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color={tur.renk} />
        </TouchableOpacity>
        <View style={styles.roundBadge}>
          <Text style={[styles.roundText, { color: tur.renk }]}>🦘 {round}/{TOTAL_ROUNDS}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* ---------- SORU FAZI: düşünme kapısı ---------- */}
      {!hareketFazi && (
        <View style={styles.playArea}>
          <Text style={[styles.soru, { color: tur.renk }]}>{tur.soru}</Text>

          <TouchableOpacity
            style={[styles.listenBtn, { backgroundColor: tur.renk }]}
            onPress={() => speak(tur.soru, { instructions: HAPPY_VOICE })}
            activeOpacity={0.85}
          >
            <Ionicons name="volume-high" size={20} color="#fff" />
            <Text style={styles.listenText}>Tekrar Dinle</Text>
          </TouchableOpacity>

          <Animated.View style={[styles.kartSatiri, { transform: [{ scale: bounce }] }]}>
            {kartlar.map((k) => {
              const titriyor = yanlisKart === k.ad;
              return (
                <Animated.View key={k.ad} style={titriyor ? { transform: [{ translateX: shake }] } : undefined}>
                  <TouchableOpacity
                    style={[styles.kart, titriyor && styles.kartYanlis]}
                    onPress={() => handlePick(k.dogru)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.kartEmoji}>{k.emoji}</Text>
                    <Text style={styles.kartAd}>{k.ad}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Animated.View>
        </View>
      )}

      {/* ---------- HAREKET FAZLARI: göster → uygula → YAPTIM! → kutla ---------- */}
      {hareketFazi && (
        <View style={styles.playArea}>
          <View style={[styles.hareketPill, { backgroundColor: tur.renk }]}>
            <Text style={styles.hareketAdi}>{tur.dogruEmoji}  {tur.hareketAdi}</Text>
          </View>

          <View style={styles.sahne}>
            {faz === 'uygulama' && (
              <View style={styles.halkaKat}>
                <SureHalkasi oran={kalanMs / PRACTICE_MS} renk={tur.renk} />
              </View>
            )}
            <View style={styles.figurKat}>
              <HareketFiguru poz={poz} renk={tur.renk} boyut={110} />
            </View>
            {faz === 'uygulama' && (
              <View style={[styles.sayacPill, { borderColor: tur.renk }]}>
                <Text style={[styles.sayacText, { color: tur.renk }]}>{kalanSn}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.ipucu, { color: tur.renk }]}>
            {faz === 'hazirla' ? tur.ipucu : faz === 'uygulama' ? tur.ipucu : faz === 'yaptim' ? 'Bitti! Şimdi düğmeye bas.' : 'Aferin!'}
          </Text>

          {faz === 'hazirla' && (
            <View style={styles.bekleBox}>
              <Text style={styles.bekleText}>Ayağa kalk, hazır ol…</Text>
            </View>
          )}

          {faz === 'uygulama' && (
            <View style={styles.bekleBox}>
              <Text style={styles.bekleText}>Hareketi yapmaya devam et!</Text>
            </View>
          )}

          {faz === 'yaptim' && (
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <TouchableOpacity
                style={[styles.yaptimBtn, { width: btnW, backgroundColor: tur.renk }]}
                onPress={handleYaptim}
                activeOpacity={0.85}
              >
                <Text style={styles.yaptimEmoji}>🎉</Text>
                <Text style={styles.yaptimText}>YAPTIM!</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {faz === 'kutlama' && (
            <View style={[styles.kutlamaBox, { width: btnW }]}>
              <Text style={styles.kutlamaEmoji}>🌟</Text>
              <Text style={styles.kutlamaText}>Aferin!</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900' },

  playArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 20 },

  // Soru fazı
  soru: { fontSize: 21, fontWeight: '900', textAlign: 'center', maxWidth: 440, marginBottom: 12 },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginBottom: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  kartSatiri: { flexDirection: 'row', justifyContent: 'center', gap: 18, flexWrap: 'wrap' },
  kart: { width: 150, height: 172, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  kartYanlis: { backgroundColor: '#FFE0E0' },
  kartEmoji: { fontSize: 78 },
  kartAd: { fontSize: 19, fontWeight: '900', color: '#37474F' },

  // Hareket fazları
  hareketPill: { paddingVertical: 10, paddingHorizontal: 26, borderRadius: 999, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  hareketAdi: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  sahne: { width: RING_BOX, height: RING_BOX, alignItems: 'center', justifyContent: 'center' },
  halkaKat: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  figurKat: { alignItems: 'center', justifyContent: 'center' },
  sayacPill: { position: 'absolute', bottom: -6, alignSelf: 'center', minWidth: 62, paddingVertical: 4, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#fff', borderWidth: 4, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 4 },
  sayacText: { fontSize: 28, fontWeight: '900' },

  ipucu: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 18, maxWidth: 380 },
  bekleBox: { marginTop: 10, backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  bekleText: { fontSize: 16, fontWeight: '800', color: '#546E7A' },

  // Büyük, uzaktan görülen, kolay basılan YAPTIM! düğmesi
  yaptimBtn: { height: 138, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 6, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 10 },
  yaptimEmoji: { fontSize: 46 },
  yaptimText: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  kutlamaBox: { height: 138, borderRadius: 34, backgroundColor: '#FFD54F', alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 6, borderColor: '#fff', shadowColor: '#FFB300', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 10 },
  kutlamaEmoji: { fontSize: 50 },
  kutlamaText: { fontSize: 30, fontWeight: '900', color: '#E65100' },
});
