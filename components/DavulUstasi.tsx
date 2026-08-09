import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { asset } from '../lib/assetMap';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';

// ============================================
// 🥁 DAVUL USTASI - Çağır-yanıtla ritim tekrarı (Müzik, MÇB.4)
// App kısa bir ritmi ÇALAR ama ASLA GÖSTERMEZ (yalnızca ses + düzenli nabız
// atan metronom noktası). Sonra pedin çevresinde yeşil halka açılır ve çocuk
// duyduğu ritmi geri çalar. Model görsel olarak hiç gösterilmediği için gözle
// kopyalanamaz: işitsel bellek + tını sırası gerekir.
//
// PUANLAMA (bu sürüm): VURUŞ SAYISI + TINI SIRASI (büyük ped = kuvvetli,
// küçük ped = hafif). Milisaniye hassasiyeti YOK — pencere cömerttir, ceza
// yoktur. Ham zamanlama yine de kaydedilir (round_history) ki ileride
// zamanlama puanlaması eklenebilsin.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

// Metronom nabzı / sayım tıkı aralığı (model ÖNCESİ 3 tık = sayım girişi).
const PULSE_MS = 560;
const COUNT_IN = 3;
// Model bittikten sonra yeşil halkanın açılmasına kadar geçen nefes payı.
const RING_DELAY_MS = 700;
// Cömert pencereler: ilk vuruş için uzun, vuruşlar arası için rahat bir ara.
const FIRST_TAP_MS = 9000;
const GAP_WINDOW_MS = 2800;
// Beklenen sayıya ulaşınca fazladan vuruş gelir mi diye kısa bekleme.
const SETTLE_MS = 1000;
// Bu kadar denemeden sonra oyun nazikçe ilerler (çocuk turda sıkışmasın).
const MAX_ATTEMPTS = 3;

type Tone = 'K' | 'H'; // K = kuvvetli (büyük ped) · H = hafif (küçük ped)
type Phase = 'listening' | 'playing' | 'success';
type SfxName = 'kuvvetli' | 'hafif' | 'zil' | 'metronom';

interface Hit {
  tone: Tone;
  delay: number; // önceki vuruşun başlangıcından itibaren ms (ilki 0)
}

// 8 tur: 2 vuruştan 5 vuruşa; 3. turda hafif tını, 7. turda sus (boşluk) girer.
// Tüm yönerge/onay cümleleri STATİK metinlerdir (klon ses hattı için).
const ROUNDS: { hits: Hit[]; intro: string; confirm: string }[] = [
  {
    hits: [{ tone: 'K', delay: 0 }, { tone: 'K', delay: 800 }],
    intro: 'Kulağını aç! Önce ben davulu çalacağım, sonra sen aynısını çalacaksın.',
    confirm: 'Aferin! İki vuruş çaldın. Dum, dum!',
  },
  {
    hits: [{ tone: 'K', delay: 0 }, { tone: 'K', delay: 700 }, { tone: 'K', delay: 700 }],
    intro: 'Şimdi biraz daha uzun bir ritim geliyor. İyi dinle!',
    confirm: 'Harika! Üç vuruş çaldın. Dum, dum, dum!',
  },
  {
    hits: [{ tone: 'K', delay: 0 }, { tone: 'H', delay: 700 }],
    intro: 'Şimdi iki davul var. Büyük davul kuvvetli, küçük davul hafif çalar. Dinle!',
    confirm: 'Süper! Önce kuvvetli, sonra hafif. Büyük davul gür ses verir, küçük davul yumuşak.',
  },
  {
    hits: [{ tone: 'K', delay: 0 }, { tone: 'H', delay: 500 }, { tone: 'H', delay: 500 }],
    intro: 'Bu sefer bir kuvvetli, iki hafif var. Sen de öyle çal!',
    confirm: 'Harika! Bir kuvvetli, iki hafif. Kuvvetli, hafif, hafif!',
  },
  {
    hits: [{ tone: 'K', delay: 0 }, { tone: 'K', delay: 550 }, { tone: 'H', delay: 550 }, { tone: 'H', delay: 550 }],
    intro: 'Dört vuruş geliyor. Kuvvetli mi hafif mi, kulağınla yakala!',
    confirm: 'Aferin! Önce iki kuvvetli, sonra iki hafif. Sırayı kulağınla yakaladın.',
  },
  {
    hits: [{ tone: 'K', delay: 0 }, { tone: 'H', delay: 450 }, { tone: 'K', delay: 450 }, { tone: 'H', delay: 450 }],
    intro: 'Bu ritimde kuvvetli ve hafif sırayla geliyor. Dikkatlice dinle!',
    confirm: 'Süper! Kuvvetli, hafif, kuvvetli, hafif. Ritim sırayla değişiyordu, sen de öyle çaldın.',
  },
  {
    hits: [{ tone: 'K', delay: 0 }, { tone: 'H', delay: 420 }, { tone: 'H', delay: 420 }, { tone: 'K', delay: 840 }],
    intro: 'Bu ritimde ortada küçük bir bekleme var. İyi dinle!',
    confirm: 'Harika! Ortadaki küçük beklemeyi de duydun. Müzikte susmak da ritmin bir parçasıdır.',
  },
  {
    hits: [
      { tone: 'K', delay: 0 }, { tone: 'H', delay: 400 }, { tone: 'H', delay: 400 },
      { tone: 'K', delay: 800 }, { tone: 'K', delay: 400 },
    ],
    intro: 'Son ritim! Beş vuruş var. Hazır mısın? Dinle!',
    confirm: 'Bravo! Beş vuruşu sırasıyla çaldın. Kulağın ritmi yakaladı, artık gerçek bir davul ustasısın!',
  },
];

interface RoundLog {
  tur: number;
  deneme: number;
  modelTini: string;
  modelAralikMs: number[];
  calinanTini: string;
  calinanAralikMs: number[]; // ham zamanlama izi (ileride zamanlama puanı için)
  ilkVurusGecikmeMs: number;
  beklenenVurus: number;
  calinanVurus: number;
  sayiDogru: boolean;
  siraDogru: boolean;
  basarili: boolean;
}

// ---- Elle yazılmış SVG davul pedi (hiç bitmap yok) ----
function DrumPad({
  width, tone, disabled, gold, label, onPress, pressAnim, rippleAnim,
}: {
  width: number;
  tone: Tone;
  disabled: boolean;
  gold: boolean;
  label: string;
  onPress: () => void;
  pressAnim: Animated.Value;
  rippleAnim: Animated.Value;
}) {
  const height = width * 0.9;
  const rippleSize = width * 0.62;
  const isBig = tone === 'K';

  const skin = gold ? '#FFECB3' : isBig ? '#FFF8E1' : '#E8F1FE';
  const shell = isBig ? '#A1887F' : '#7E8CD6';
  const edge = gold ? '#FF8F00' : isBig ? '#5D4037' : '#3949AB';

  const rippleScale = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.8] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.padColumn}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={disabled}>
        <Animated.View style={{ width, height, opacity: disabled ? 0.42 : 1, transform: [{ scale: pressAnim }] }}>
          <Svg width={width} height={height} viewBox="0 0 200 180">
            {/* yere düşen gölge */}
            <Ellipse cx={100} cy={163} rx={58} ry={9} fill="#000000" opacity={0.1} />
            {/* gövde (kasnak) */}
            <Path
              d="M 24 58 L 36 132 A 64 24 0 0 0 164 132 L 176 58 Z"
              fill={shell}
              stroke={edge}
              strokeWidth={4}
              strokeLinejoin="round"
            />
            {/* gergi ipleri (zikzak) */}
            <Path
              d="M 36 92 L 58 126 L 80 92 L 102 126 L 124 92 L 146 126 L 166 92"
              fill="none"
              stroke="#EFEBE9"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
            {/* doğru cevapta altın hale */}
            {gold && <Ellipse cx={100} cy={58} rx={86} ry={37} fill="none" stroke="#FFC107" strokeWidth={4} opacity={0.75} />}
            {/* deri (vuruş yüzeyi) */}
            <Ellipse cx={100} cy={58} rx={76} ry={30} fill={skin} stroke={edge} strokeWidth={gold ? 7 : 5} />
            <Ellipse cx={100} cy={58} rx={50} ry={19} fill="none" stroke={edge} strokeWidth={2} opacity={0.2} />
            <Circle cx={100} cy={58} r={7} fill={edge} opacity={0.18} />
          </Svg>

          {/* dokunuşta yayılan dalga halkası */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ripple,
              {
                width: rippleSize,
                height: rippleSize,
                borderRadius: rippleSize / 2,
                left: width / 2 - rippleSize / 2,
                top: height * 0.322 - rippleSize / 2,
                borderColor: isBig ? '#5D4037' : '#3949AB',
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }, { scaleY: 0.42 }],
              },
            ]}
          />
        </Animated.View>
      </TouchableOpacity>
      <Text style={[styles.padLabel, !isBig && styles.padLabelSoft]}>{label}</Text>
    </View>
  );
}

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: {
      cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string;
      correct_answers?: number; round_history?: any;
    },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function DavulUstasi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>('listening');
  const [gold, setGold] = useState(false);
  const [tapDots, setTapDots] = useState<Tone[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const roundRef = useRef(1);
  const attemptRef = useRef(0);
  const lockRef = useRef(false);          // değerlendirme sırasında çift dokunuşu engeller
  const tokenRef = useRef(0);             // model zamanlamalarını geçersiz kılmak için
  const loadTokenRef = useRef(0);         // eşzamanlı yüklemede yetim sesleri önler
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapsRef = useRef<{ tone: Tone; t: number }[]>([]);
  const modelEndAtRef = useRef(0);
  const historyRef = useRef<RoundLog[]>([]);
  const soundsRef = useRef<Partial<Record<SfxName, Audio.Sound>>>({});

  // Animasyonlar
  const pressBig = useRef(new Animated.Value(1)).current;
  const pressSmall = useRef(new Animated.Value(1)).current;
  const rippleBig = useRef(new Animated.Value(1)).current;
  const rippleSmall = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // ---- Unmount temizliği: TÜM zamanlayıcılar + tüm Audio.Sound + konuşma ----
  useEffect(() => () => {
    isMountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = null;
    tokenRef.current += 1;              // planlanmış model vuruşlarını geçersiz kıl
    loadTokenRef.current += 1;          // devam eden yüklemeleri geçersiz kıl
    const loaded = soundsRef.current;
    soundsRef.current = {};
    (Object.keys(loaded) as SfxName[]).forEach((k) => {
      const s = loaded[k];
      if (!s) return;
      s.stopAsync().catch(() => {});
      s.unloadAsync().catch(() => {});
    });
    stopSpeech();
  }, []);

  // Sesleri BİR KEZ önden yükle: dokunuşta replayAsync ile anında çalsın.
  useEffect(() => {
    const myToken = ++loadTokenRef.current;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
      } catch {
        // ses modu ayarlanamazsa oynatma yine denenir
      }
      const clips: [SfxName, string, number][] = [
        ['kuvvetli', '/sounds/sfx/davul-kuvvetli.wav', 1.0],
        ['hafif', '/sounds/sfx/davul-hafif.wav', 1.0],
        ['zil', '/sounds/sfx/zil.wav', 0.9],
        ['metronom', '/sounds/sfx/metronom.wav', 0.5],
      ];
      for (const [name, path, volume] of clips) {
        try {
          const { sound } = await Audio.Sound.createAsync(asset(path), { shouldPlay: false, volume });
          if (!isMountedRef.current || myToken !== loadTokenRef.current) {
            await sound.unloadAsync().catch(() => {});
            return;
          }
          soundsRef.current[name] = sound;
        } catch (e) {
          console.warn('🥁 Davul sesi yüklenemedi (sessiz geçildi):', e);
        }
      }
    })();
  }, []);

  const playSfx = (name: SfxName) => {
    const s = soundsRef.current[name];
    if (!s) return;
    s.replayAsync().catch(() => {});
  };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = null;
  };

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  };

  // Cevap penceresi: son vuruştan sonra bu kadar sessizlik olursa değerlendir.
  const armIdle = (myToken: number, ms: number) => {
    if (idleRef.current) clearTimeout(idleRef.current);
    const t = setTimeout(() => {
      if (!isMountedRef.current || myToken !== tokenRef.current) return;
      evaluate(myToken);
    }, ms);
    idleRef.current = t;
    timersRef.current.push(t);
  };

  // ---- Modeli ÇAL (asla gösterme): 3 sayım tıkı → ritim → yeşil halka ----
  const scheduleModel = (myToken: number) => {
    const cur = ROUNDS[roundRef.current - 1];
    for (let i = 0; i < COUNT_IN; i++) {
      later(() => {
        if (!isMountedRef.current || myToken !== tokenRef.current) return;
        playSfx('metronom');
      }, i * PULSE_MS);
    }
    let t = COUNT_IN * PULSE_MS + 240;
    cur.hits.forEach((h) => {
      t += h.delay;
      const at = t;
      later(() => {
        if (!isMountedRef.current || myToken !== tokenRef.current) return;
        playSfx(h.tone === 'K' ? 'kuvvetli' : 'hafif');
      }, at);
    });
    later(() => {
      if (!isMountedRef.current || myToken !== tokenRef.current) return;
      tapsRef.current = [];
      setTapDots([]);
      modelEndAtRef.current = Date.now();
      lockRef.current = false;
      setPhase('playing');
      speak('Şimdi sen çal! Duyduğun ritmi pede vur.', { instructions: HAPPY_VOICE });
      armIdle(myToken, FIRST_TAP_MS);
    }, t + RING_DELAY_MS);
  };

  // Turu (yeniden) başlat: yönergeyi söyle, sonra modeli çal. `line` daima statik metin.
  const startListening = (line: string) => {
    clearTimers();
    const myToken = ++tokenRef.current;
    lockRef.current = true;
    tapsRef.current = [];
    setTapDots([]);
    setGold(false);
    setPhase('listening');
    speakThenWait(line, 900, { instructions: HAPPY_VOICE }).then(() => {
      if (!isMountedRef.current || myToken !== tokenRef.current) return;
      scheduleModel(myToken);
    });
  };

  useEffect(() => {
    if (!gameReady) return;
    roundRef.current = round;
    attemptRef.current = 0;
    startListening(ROUNDS[round - 1].intro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  // Yeşil halka nabzı (yalnızca cevap penceresi açıkken)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
        Animated.timing(ringAnim, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
      ]),
    );
    if (phase === 'playing') { ringAnim.setValue(0); loop.start(); }
    return () => loop.stop();
  }, [phase, ringAnim]);

  // Metronom noktası: model çalarken DÜZENLİ atar (ritmi ele vermez, yalnız nabız verir)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: PULSE_MS / 2, useNativeDriver: USE_NATIVE }),
        Animated.timing(pulseAnim, { toValue: 0, duration: PULSE_MS / 2, useNativeDriver: USE_NATIVE }),
      ]),
    );
    if (phase === 'listening') { pulseAnim.setValue(0); loop.start(); }
    else pulseAnim.setValue(0);
    return () => loop.stop();
  }, [phase, pulseAnim]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimers();
    tokenRef.current += 1;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('davul-ustasi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Müzik: Ritim Çalışmalarına Katılabilme — işitsel ritim tekrarı (MÇB.4)',
      correct_answers: correctRef.current,
      round_history: historyRef.current,
    });
  };

  // ---- Değerlendirme: SAYI + TINI SIRASI (zamanlama puanlanmaz, yalnız kaydedilir) ----
  const evaluate = (myToken: number) => {
    if (!isMountedRef.current || myToken !== tokenRef.current || lockRef.current) return;
    const cur = ROUNDS[roundRef.current - 1];
    const expected = cur.hits.map((h) => h.tone);
    const taps = tapsRef.current;

    // Hiç çalmadıysa: hata sayılmaz, nazikçe davet edilir ve model tekrar çalar.
    if (taps.length === 0) {
      startListening('Sıra sende! Pede dokun ve duyduğun ritmi çal.');
      return;
    }

    lockRef.current = true;
    // Tek tınılı turlarda (yalnız kuvvetli) sıra kendiliğinden doğrudur: sayı yeter.
    const singleTone = expected.every((x) => x === expected[0]);
    const countOk = taps.length === expected.length;
    const orderOk = singleTone ? true : countOk && taps.every((x, i) => x.tone === expected[i]);
    const ok = countOk && orderOk;
    attemptRef.current += 1;

    historyRef.current.push({
      tur: roundRef.current,
      deneme: attemptRef.current,
      modelTini: expected.join('-'),
      modelAralikMs: cur.hits.map((h) => h.delay),
      calinanTini: taps.map((x) => x.tone).join('-'),
      calinanAralikMs: taps.map((x, i) => (i === 0 ? 0 : x.t - taps[i - 1].t)),
      ilkVurusGecikmeMs: modelEndAtRef.current ? taps[0].t - modelEndAtRef.current : 0,
      beklenenVurus: expected.length,
      calinanVurus: taps.length,
      sayiDogru: countOk,
      siraDogru: orderOk,
      basarili: ok,
    });

    if (ok) {
      correctRef.current += 1;
      attemptRef.current = 0;
      setGold(true);
      setPhase('success');
      setShowConfetti(true);
      playSfx('zil');
      speakThenWait(cur.confirm, 1800, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current || myToken !== tokenRef.current) return;
        setShowConfetti(false);
        setGold(false);
        if (roundRef.current < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
      return;
    }

    // Tutmadı: CEZA YOK. Model tekrar çalar, çocuk yeniden dener.
    errorsRef.current += 1;
    if (attemptRef.current >= MAX_ATTEMPTS) {
      attemptRef.current = 0;
      setPhase('listening');
      speakThenWait('Çok güzel denedin! Şimdi yeni bir ritme geçelim.', 1600, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current || myToken !== tokenRef.current) return;
        if (roundRef.current < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
      return;
    }
    if (countOk) startListening('Vuruş sayısı doğru! Şimdi kuvvetli ve hafifin sırasına dikkat et. Tekrar dinle.');
    else startListening('Az kaldı! Vuruş sayısına dikkat et. Ritmi tekrar dinle.');
  };

  const handlePad = (tone: Tone) => {
    if (phase !== 'playing' || lockRef.current) return;
    const myToken = tokenRef.current;
    movesRef.current += 1;
    playSfx(tone === 'K' ? 'kuvvetli' : 'hafif');
    tapsRef.current = [...tapsRef.current, { tone, t: Date.now() }];
    setTapDots(tapsRef.current.map((x) => x.tone));

    const press = tone === 'K' ? pressBig : pressSmall;
    const rip = tone === 'K' ? rippleBig : rippleSmall;
    press.setValue(0.93);
    Animated.spring(press, { toValue: 1, friction: 4, tension: 120, useNativeDriver: USE_NATIVE }).start();
    rip.setValue(0);
    Animated.timing(rip, { toValue: 1, duration: 460, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE }).start();

    const need = ROUNDS[roundRef.current - 1].hits.length;
    armIdle(myToken, tapsRef.current.length >= need ? SETTLE_MS : GAP_WINDOW_MS);
  };

  const handleReplay = () => {
    if (phase !== 'playing' || lockRef.current) return;
    startListening('Tamam, ritmi bir daha çalıyorum. İyi dinle!');
  };

  // ---- Görsel durum ----
  const cur = ROUNDS[round - 1];
  const twoPads = cur.hits.some((h) => h.tone === 'H');
  const bigW = twoPads ? Math.min(SCREEN_W * 0.44, 186) : Math.min(SCREEN_W * 0.66, 252);
  const smallW = Math.min(SCREEN_W * 0.3, 128);
  const padsDisabled = phase !== 'playing';

  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0.5] });
  const dotScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const dotOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  const statusText = phase === 'listening' ? '🔊 Dinle...' : phase === 'playing' ? '🥁 Şimdi sen çal!' : '🌟 Harika!';
  const hintText =
    phase === 'listening' ? 'Kulağını aç, ritmi dinle.'
      : phase === 'playing' ? 'Duyduğun ritmi pede vur.'
        : 'Ritmi doğru çaldın!';

  return (
    <View style={[styles.container, phase === 'success' && styles.containerHappy]}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Önce ben davulla bir ritim çalacağım, sen sadece dinle. Yeşil halka açılınca aynı ritmi sen çal!"
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#5D4037" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🥁 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      {/* Öğretmen + metronom noktası. Nokta DÜZENLİ atar; ritmi ASLA göstermez. */}
      <View style={styles.metroRow}>
        <Text style={styles.teacher}>🧑‍🏫</Text>
        <View style={styles.metroBox}>
          <Animated.View style={[styles.metroDot, { transform: [{ scale: dotScale }], opacity: dotOpacity }]} />
        </View>
        <Text style={styles.metroLabel}>nabız</Text>
      </View>

      <View style={styles.statusPill}><Text style={styles.statusText}>{statusText}</Text></View>
      <Text style={styles.hint}>{hintText}</Text>

      {/* Çocuğun KENDİ vuruşları (model değil) — kaç kere vurduğunu görür */}
      <View style={styles.dotRow}>
        {tapDots.map((t, i) => (
          <View key={i} style={[styles.tapDot, t === 'K' ? styles.tapDotStrong : styles.tapDotSoft]} />
        ))}
      </View>

      <View style={styles.padArea}>
        <View style={styles.padRow}>
          <View>
            {phase === 'playing' && (
              <Animated.View
                pointerEvents="none"
                style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
              />
            )}
            <DrumPad
              width={bigW}
              tone="K"
              disabled={padsDisabled}
              gold={gold}
              label="Kuvvetli"
              onPress={() => handlePad('K')}
              pressAnim={pressBig}
              rippleAnim={rippleBig}
            />
          </View>

          {twoPads && (
            <View>
              {phase === 'playing' && (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
                />
              )}
              <DrumPad
                width={smallW}
                tone="H"
                disabled={padsDisabled}
                gold={gold}
                label="Hafif"
                onPress={() => handlePad('H')}
                pressAnim={pressSmall}
                rippleAnim={rippleSmall}
              />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.listenBtn, phase !== 'playing' && styles.listenBtnIdle]}
          onPress={handleReplay}
          disabled={phase !== 'playing'}
          activeOpacity={0.85}
        >
          <Ionicons name="volume-high" size={20} color="#fff" />
          <Text style={styles.listenText}>Tekrar Dinle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF3E0', alignItems: 'center' },
  containerHappy: { backgroundColor: '#FFF8E1' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#5D4037' },

  metroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  teacher: { fontSize: 32 },
  metroBox: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  metroDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF6C00' },
  metroLabel: { fontSize: 13, fontWeight: '800', color: '#A1887F' },

  statusPill: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 22, borderRadius: 999, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  statusText: { fontSize: 18, fontWeight: '900', color: '#5D4037' },
  hint: { fontSize: 16, fontWeight: '700', color: '#8D6E63', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },

  dotRow: { flexDirection: 'row', gap: 8, height: 20, alignItems: 'center', marginTop: 10 },
  tapDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
  tapDotStrong: { backgroundColor: '#6D4C41' },
  tapDotSoft: { backgroundColor: '#7E8CD6' },

  padArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingBottom: 20 },
  padRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 18 },
  padColumn: { alignItems: 'center' },
  padLabel: { fontSize: 15, fontWeight: '900', color: '#5D4037', marginTop: 2 },
  padLabelSoft: { color: '#3949AB' },

  // Cevap penceresi açıldığında pedin çevresinde açılan YEŞİL HALKA
  ring: { position: 'absolute', left: -12, right: -12, top: -12, bottom: 16, borderRadius: 34, borderWidth: 6, borderColor: '#43A047' },

  ripple: { position: 'absolute', borderWidth: 4 },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EF6C00', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 22, marginTop: 26, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenBtnIdle: { backgroundColor: '#D7CCC8' },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
