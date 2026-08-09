import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { asset } from '../lib/assetMap';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';

// ============================================
// 🔔 HANGİ ÇALGI ÇALDI? - İşitsel kaynak ayırt etme (Müzik, MDB.3)
// Büyük DİNLE düğmesine basılır; sentezlenmiş bir çalgı sesi çalar ve HİÇBİR
// kart kıpırdamaz (görsel ipucu YOK). Çocuk sesi çıkaran çalgının kartına
// dokunur. Doğruda o kart ZIPLAR + aynı ses tekrar çalar (sebep-sonuç bağı
// görünür olur) ve sesin NEDEN öyle olduğunu anlatan sabit bir cümle gelir.
// Son iki turda arka arkaya İKİ ses çalar; çocuk ikisini SIRASIYLA gösterir.
//
// KISAYOL KARŞITI: uyaran SES, seçenekler RESİM — farklı duyu kanalları olduğu
// için kopya eşleme fiziksel olarak mümkün değil. Çocuk tınıyı (kalın/ince,
// kısa/uzun, hışırtılı/net) çözüp kaynağı çıkarsamak zorunda.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

type Key = 'davul' | 'zil' | 'marakas' | 'tahta';

// Kart görünümü çalgıya SABİT bağlıdır (hedefe göre DEĞİŞMEZ) → renk/etiket ipucu vermez.
const INSTRUMENTS: Record<Key, { emoji: string; label: string; color: string }> = {
  davul: { emoji: '🥁', label: 'Davul', color: '#EF6C00' },
  zil: { emoji: '🔔', label: 'Zil', color: '#F9A825' },
  marakas: { emoji: '🪇', label: 'Marakas', color: '#43A047' },
  tahta: { emoji: '🪵', label: 'Tahta Blok', color: '#8D6E63' },
};

const KEY_LIST: Key[] = ['davul', 'zil', 'marakas', 'tahta'];

// Hazır sentez klipleri (lib/assetMap.ts'te kayıtlı — burada yalnızca okunur).
const SFX_PATH: Record<Key, string> = {
  davul: '/sounds/sfx/davul.wav',
  zil: '/sounds/sfx/zil.wav',
  marakas: '/sounds/sfx/marakas.wav',
  tahta: '/sounds/sfx/tahta.wav',
};

// Klip süreleri (24 kHz mono 16-bit WAV boyutundan hesaplandı) — zamanlama için.
const SFX_MS: Record<Key, number> = { davul: 420, zil: 1400, marakas: 520, tahta: 200 };
// İki sesli turlarda sesler arası boşluk.
const GAP_MS = 350;

// 8 tur. 1-4: üç kart. 5-6: dört kart (marakas/tahta ayrımı zorlaşır). 7-8: İKİ ses, sırayla.
const ROUNDS: { sounds: Key[]; options: Key[]; confirm: string }[] = [
  {
    sounds: ['davul'],
    options: ['davul', 'zil', 'marakas'],
    confirm: 'Aferin! Bu davul. Davul büyük ve içi boş olduğu için sesi KALIN ve derin çıkar.',
  },
  {
    sounds: ['zil'],
    options: ['davul', 'zil', 'tahta'],
    confirm: 'Doğru! Bu zil. Zil metalden yapıldığı için sesi İNCE ve uzun uzun çınlar.',
  },
  {
    sounds: ['marakas'],
    options: ['davul', 'marakas', 'tahta'],
    confirm: 'Aferin! Bu marakas. Marakasın içinde küçücük taneler var, sallanınca hışır hışır ses çıkarır.',
  },
  {
    sounds: ['tahta'],
    options: ['zil', 'marakas', 'tahta'],
    confirm: 'Doğru! Bu tahta blok. Tahta sert ve içi dolu olduğu için sesi çok kısa, tak diye biter.',
  },
  {
    sounds: ['marakas'],
    options: KEY_LIST,
    confirm: 'Süper! Yine marakas. Marakasın hışırtısı biraz uzun sürer, tahta blok ise tek bir tak der.',
  },
  {
    sounds: ['zil'],
    options: KEY_LIST,
    confirm: 'Harika! Yine zil. Zile vurunca ses hemen bitmez, uzun uzun çınlamaya devam eder.',
  },
  {
    sounds: ['tahta', 'davul'],
    options: KEY_LIST,
    confirm: 'Süper! Önce tahta blok tak dedi, sonra davul dum dedi. Sırayı doğru hatırladın.',
  },
  {
    sounds: ['zil', 'marakas'],
    options: KEY_LIST,
    confirm: 'Harika! Önce zil çınladı, sonra marakas hışırdadı. İki sesi de sırasıyla buldun.',
  },
];

// 'wait'  : ses henüz dinlenmedi (kartlar sönük, dokunuş nazikçe DİNLE'ye yönlendirir)
// 'listen': ses çalıyor (KART ANİMASYONU YOK — cevap sızmaz)
// 'answer': çocuk cevaplayabilir
// 'reveal': doğru bulundu, kutlama + açıklama
type Phase = 'wait' | 'listen' | 'answer' | 'reveal';

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

export default function HangiCalgiCaldi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [current, setCurrent] = useState(ROUNDS[0]);
  const [options, setOptions] = useState<Key[]>(ROUNDS[0].options);
  const [phase, setPhase] = useState<Phase>('wait');
  const [wrongKey, setWrongKey] = useState<Key | null>(null);
  const [revealKey, setRevealKey] = useState<Key | null>(null); // SADECE doğru cevaptan sonra dolar
  const [solved, setSolved] = useState<Key[]>([]);              // dizi turunda bulunanlar
  const [seqStep, setSeqStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const startRef = useRef(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playingRef = useRef(false);

  // Ses referansları: dört klip bir kez yüklenir, tur boyunca yeniden çalınır.
  const soundsRef = useRef<Partial<Record<Key, Audio.Sound>>>({});
  const loadTokenRef = useRef(0); // yavaş createAsync'in yetim ses bırakmasını engeller

  // Animasyonlar
  const shakeAnim = useRef(new Animated.Value(0)).current; // yanlış kart titremesi
  const jumpY = useRef(new Animated.Value(0)).current;     // doğru kart zıplaması
  const jumpS = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current; // DİNLE düğmesi nabzı
  const ringAnim = useRef(new Animated.Value(0)).current;  // dinleme halkası
  const zeroAnim = useRef(new Animated.Value(0)).current;  // hareketsiz kartlar için sabit
  const oneAnim = useRef(new Animated.Value(1)).current;

  // ---- Unmount temizliği: TÜM zamanlayıcılar + tüm Audio.Sound durdur/boşalt + TTS ----
  useEffect(() => () => {
    isMountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    loadTokenRef.current += 1; // devam eden yüklemeleri geçersiz kıl
    const loaded = soundsRef.current;
    soundsRef.current = {};
    Object.values(loaded).forEach((s) => {
      if (!s) return;
      s.stopAsync().catch(() => {});
      s.unloadAsync().catch(() => {});
    });
    stopSpeech();
  }, []);

  // Sessiz modda da (iOS) çalgı sesleri duyulsun + dört klibi önden yükle.
  useEffect(() => {
    const myToken = ++loadTokenRef.current;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
      } catch {
        // ses modu ayarlanamazsa oynatma yine denenir
      }
      for (const key of KEY_LIST) {
        try {
          const { sound } = await Audio.Sound.createAsync(asset(SFX_PATH[key]), { shouldPlay: false, volume: 1.0 });
          // Yükleme biterken bileşen söküldüyse yeni sesi de boşalt (yetim ses kalmasın).
          if (!isMountedRef.current || myToken !== loadTokenRef.current) {
            await sound.unloadAsync().catch(() => {});
            return;
          }
          soundsRef.current[key] = sound;
        } catch (e) {
          console.warn('🔔 Çalgı sesi yüklenemedi (sessiz geçildi):', e);
        }
      }
    })();
  }, []);

  const playSfx = (key: Key) => {
    const s = soundsRef.current[key];
    if (!s) return;
    s.replayAsync().catch(() => {
      // ses çalınamazsa oyun sessizce devam eder
    });
  };

  // Turun ses örüntüsünü çalar (tek ses ya da iki ses arka arkaya).
  // KART ANİMASYONU YOKTUR — çalarken ekranda yalnızca DİNLE düğmesi hareket eder.
  // Toplam süreyi (ms) döndürür ki sonrasına konuşma zamanlanabilsin.
  const playPattern = (): number => {
    if (playingRef.current) return 0;
    stopSpeech(); // yönerge sesi çalgı sesiyle çakışmasın
    playingRef.current = true;
    setPhase('listen');
    const seq = current.sounds;
    let at = 0;
    seq.forEach((k, i) => {
      const startAt = at;
      const t = setTimeout(() => { if (isMountedRef.current) playSfx(k); }, startAt);
      timersRef.current.push(t);
      at += SFX_MS[k];
      if (i < seq.length - 1) at += GAP_MS;
    });
    const total = at + 150;
    const done = setTimeout(() => {
      if (!isMountedRef.current) return;
      playingRef.current = false;
      setPhase('answer');
    }, total);
    timersRef.current.push(done);
    return total;
  };

  // Doğru cevaptan SONRA: kart zıplar ve AYNI ses tekrar çalar (sebep-sonuç bağı).
  const revealJump = (key: Key, delay: number) => {
    const t = setTimeout(() => {
      if (!isMountedRef.current) return;
      setRevealKey(key);
      playSfx(key);
      jumpY.setValue(0);
      jumpS.setValue(1);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(jumpY, { toValue: -34, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE }),
          Animated.timing(jumpY, { toValue: 0, duration: 190, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE }),
          Animated.timing(jumpY, { toValue: -16, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE }),
          Animated.timing(jumpY, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE }),
        ]),
        Animated.sequence([
          Animated.timing(jumpS, { toValue: 1.12, duration: 170, useNativeDriver: USE_NATIVE }),
          Animated.timing(jumpS, { toValue: 1, duration: 460, useNativeDriver: USE_NATIVE }),
        ]),
      ]).start();
    }, delay);
    timersRef.current.push(t);
  };

  // ---- Tur kurulumu: ses OTOMATİK çalmaz, çocuk DİNLE'ye basar ----
  useEffect(() => {
    if (!gameReady) return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    playingRef.current = false;
    const cur = ROUNDS[round - 1];
    setCurrent(cur);
    setOptions(shuffle(cur.options)); // karıştırma hedeften BAĞIMSIZ (konum ipucu vermez)
    setPhase('wait');
    setWrongKey(null);
    setRevealKey(null);
    setSolved([]);
    setSeqStep(0);
    jumpY.setValue(0);
    jumpS.setValue(1);
    speak(cur.sounds.length > 1 ? 'Şimdi arka arkaya iki ses çalacak. Dinle, sonra iki çalgıyı sırasıyla göster.' : 'DİNLE düğmesine bas ve sesi dinle.', { instructions: HAPPY_VOICE }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  // DİNLE düğmesi nabzı yalnızca ses henüz dinlenmemişken.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 620, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
      ]),
    );
    if (gameReady && phase === 'wait') { pulseAnim.setValue(1); loop.start(); }
    else pulseAnim.setValue(1);
    return () => loop.stop();
  }, [gameReady, phase, pulseAnim]);

  // Ses çalarken düğmenin çevresinde yayılan halka (her çalgı için AYNI — ipucu değil).
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(ringAnim, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE }),
    );
    if (phase === 'listen') { ringAnim.setValue(0); loop.start(); }
    else ringAnim.setValue(0);
    return () => loop.stop();
  }, [phase, ringAnim]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    loadTokenRef.current += 1;
    const loaded = soundsRef.current;
    soundsRef.current = {};
    Object.values(loaded).forEach((s) => {
      if (!s) return;
      s.stopAsync().catch(() => {});
      s.unloadAsync().catch(() => {});
    });
    const duration = Math.floor((Date.now() - startRef.current) / 1000);
    onGameEnd('hangi-calgi-caldi', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Müzik: Sesleri Ayırt Edebilme — tını ve kaynak (MDB.3)',
      correct_answers: correctRef.current,
    });
  };

  const handlePick = (key: Key) => {
    // Ses hiç dinlenmeden cevap verilemez → nazikçe DİNLE'ye yönlendir.
    if (phase === 'wait') {
      speak('Önce DİNLE düğmesine bas, sesi dinle.', { instructions: HAPPY_VOICE }).catch(() => {});
      return;
    }
    if (phase !== 'answer') return; // ses çalarken ya da kutlama sırasında dokunuş yok

    movesRef.current += 1;
    const seq = current.sounds;
    const isSeq = seq.length > 1;

    if (key === seq[seqStep]) {
      // Dizi turunda İLK ses doğru bulundu — tur henüz bitmedi.
      if (seqStep < seq.length - 1) {
        setSolved((s) => [...s, key]);
        setSeqStep((n) => n + 1);
        speak('Evet, ilki buydu! Şimdi ikinci sesi göster.', { instructions: HAPPY_VOICE }).catch(() => {});
        return;
      }

      // Tur tamamlandı: kutlama + kart(lar) zıplarken ses tekrar + açıklama.
      setSolved((s) => [...s, key]);
      setPhase('reveal');
      correctRef.current += 1;
      setShowConfetti(true);
      let at = 0;
      seq.forEach((k, i) => {
        revealJump(k, at);
        at += SFX_MS[k];
        if (i < seq.length - 1) at += GAP_MS;
      });
      const t = setTimeout(() => {
        if (!isMountedRef.current) return;
        speakThenWait(current.confirm, 1800, { instructions: HAPPY_VOICE })
          .then(() => {
            if (!isMountedRef.current) return;
            setShowConfetti(false);
            if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
            else finish();
          })
          .catch(() => {});
      }, at + 250);
      timersRef.current.push(t);
      return;
    }

    // YANLIŞ: ceza yok. Kart titrer → hedef ses yeniden çalar → nazik yönlendirme.
    errorsRef.current += 1;
    setWrongKey(key);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
    ]).start();
    const clear = setTimeout(() => { if (isMountedRef.current) setWrongKey(null); }, 450);
    timersRef.current.push(clear);
    if (isSeq) { setSeqStep(0); setSolved([]); } // diziyi baştan dinlet
    const total = playPattern();
    const wait = total > 0 ? total + 150 : 450;
    const t2 = setTimeout(() => {
      if (!isMountedRef.current) return;
      speak(isSeq ? 'Olmadı. İki sesi baştan dinle ve sırasıyla göster.' : 'Olmadı. Sesi tekrar dinle ve hangi çalgı olduğunu bul.', { instructions: HAPPY_VOICE }).catch(() => {});
    }, wait);
    timersRef.current.push(t2);
  };

  const isSeqRound = current.sounds.length > 1;
  const listening = phase === 'listen';
  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.75] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Kulağını aç! DİNLE düğmesine bas, sesi dinle. Sonra o sesi çıkaran çalgının kartına dokun."
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => { startRef.current = Date.now(); setGameReady(true); }}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#4527A0" />
        </TouchableOpacity>
        <View style={styles.roundBadge}><Text style={styles.roundText}>🔔 {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>
        {isSeqRound ? 'Önce hangisi, sonra hangisi?' : 'Bu sesi hangi çalgı çıkardı?'}
      </Text>

      {/* DİNLE: tek uyaran kaynağı. Çalarken hiçbir kart kıpırdamaz. */}
      <View style={styles.listenWrap}>
        {listening && (
          <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
        )}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.listenBtn, listening && styles.listenBtnActive, phase === 'reveal' && styles.listenBtnDim]}
            onPress={() => { if (phase !== 'reveal') playPattern(); }}
            activeOpacity={0.85}
          >
            <Text style={styles.listenEmoji}>{listening ? '🎧' : '🔊'}</Text>
            <Text style={styles.listenText}>{listening ? 'DİNLİYORUZ' : 'DİNLE'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {isSeqRound && (
        <View style={styles.seqRow}>
          {[0, 1].map((i) => (
            <View key={i} style={[styles.seqSlot, solved[i] != null && styles.seqSlotDone]}>
              <Text style={styles.seqNum}>{i + 1}.</Text>
              <Text style={styles.seqEmoji}>{solved[i] != null ? INSTRUMENTS[solved[i]].emoji : '❓'}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.hint}>
        {phase === 'wait' ? 'Önce sesi dinle 👂' : listening ? 'Dikkatle dinle…' : phase === 'reveal' ? 'Aferin! 🎉' : 'Şimdi çalgıyı seç!'}
      </Text>

      {/* Kartlar: görünüşleri hedeften bağımsız; yalnızca ÇOCUK DOKUNDUKTAN SONRA değişir. */}
      <View style={styles.cards}>
        {options.map((key) => {
          const inst = INSTRUMENTS[key];
          const isWrong = wrongKey === key;
          const isReveal = revealKey === key;
          const isSolved = solved.includes(key);
          return (
            <Animated.View
              key={key}
              style={{
                transform: [
                  { translateX: isWrong ? shakeAnim : zeroAnim },
                  { translateY: isReveal ? jumpY : zeroAnim },
                  { scale: isReveal ? jumpS : oneAnim },
                ],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.card,
                  { borderColor: inst.color },
                  phase === 'wait' && styles.cardIdle,
                  isWrong && styles.cardWrong,
                  isReveal && styles.cardReveal,
                ]}
                onPress={() => handlePick(key)}
                activeOpacity={0.85}
              >
                <Text style={styles.cardEmoji}>{inst.emoji}</Text>
                <Text style={[styles.cardLabel, { color: inst.color }]}>{inst.label}</Text>
                {isSolved && <Text style={styles.cardTick}>✅</Text>}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE7F6', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 4 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#4527A0' },

  prompt: { fontSize: 20, fontWeight: '900', color: '#4527A0', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },

  listenWrap: { width: 176, height: 176, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  ring: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 6, borderColor: '#7E57C2' },
  listenBtn: { width: 152, height: 152, borderRadius: 76, backgroundColor: '#5E35B1', alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#fff', shadowColor: '#5E35B1', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 18, elevation: 10 },
  listenBtnActive: { backgroundColor: '#7E57C2' },
  listenBtnDim: { backgroundColor: '#B0A4CF', shadowOpacity: 0.1 },
  listenEmoji: { fontSize: 50 },
  listenText: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.5, marginTop: 2 },

  seqRow: { flexDirection: 'row', gap: 14, marginTop: 10 },
  seqSlot: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 3, borderColor: '#D1C4E9' },
  seqSlotDone: { borderColor: '#43A047', backgroundColor: '#E8F5E9' },
  seqNum: { fontSize: 16, fontWeight: '900', color: '#5E35B1' },
  seqEmoji: { fontSize: 26 },

  hint: { fontSize: 16, fontWeight: '800', color: '#6A1B9A', marginTop: 10, textAlign: 'center' },

  cards: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap', maxWidth: 440, paddingHorizontal: 12 },
  card: { width: 128, height: 118, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 1, elevation: 5 },
  cardIdle: { opacity: 0.55 },
  cardWrong: { backgroundColor: '#FFE0E0' },
  cardReveal: { backgroundColor: '#FFF8E1' },
  cardEmoji: { fontSize: 52 },
  cardLabel: { fontSize: 14, fontWeight: '900' },
  cardTick: { position: 'absolute', top: 4, right: 6, fontSize: 18 },
});
