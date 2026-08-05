import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { asset } from '../lib/assetMap';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';

// ============================================
// 🎵 MÜZİK DURUNCA DON - Freeze dance (Müzik, MHB.3)
// Neşeli bir şarkı çalar → çocuk dans eder. Müzik DURUNCA çocuk donar ve
// sessizlik boyunca büyük "DON!" düğmesine basar → müzik yeniden başlar.
// Müzik ve ritimle hareket; dur/başla öz-düzenleme (MHB.3). Yeni ses YOK —
// mevcut şarkılar (MuzikCalar deseni: expo-av Audio.Sound + assetMap) tekrar
// kullanılır.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 6;

// Dans penceresi 3-6 sn sürer, sonra müzik durur (donma penceresi açılır).
const DANCE_MIN_MS = 3000;
const DANCE_RANGE_MS = 3000;
// Müzik durduktan sonra çocuğun DON'a basması için tanınan süre.
const FREEZE_WINDOW_MS = 3500;

// Canlı, neşeli şarkılardan oluşan havuz (MuzikCalar'daki mevcut varlıklar).
const SONG_POOL = [
  { path: '/sounds/songs/BIRDEN_ONA_RITMIM_VAR.mp3', title: 'Birden Ona Ritmim Var', color: '#26C6DA' },
  { path: '/sounds/songs/CALISKAN_ARI_GIBI.mp3', title: 'Çalışkan Arı Gibi', color: '#66BB6A' },
  { path: '/sounds/songs/ADIL_OYUN_GUZEL_OYUN.mp3', title: 'Adil Oyun, Güzel Oyun', color: '#FF7043' },
];

type Phase = 'dancing' | 'frozen' | 'happy';

// Müzik çalarken zıplayan ekolayzer çubukları; durunca düzleşir (görsel "durdu" işareti).
function EqualizerBars({ active, color }: { active: boolean; color: string }) {
  const vals = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0.25))).current;
  useEffect(() => {
    const loops = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 300 + i * 80, useNativeDriver: USE_NATIVE }),
          Animated.timing(v, { toValue: 0.25, duration: 300 + i * 80, useNativeDriver: USE_NATIVE }),
        ]),
      ),
    );
    if (active) loops.forEach((l) => l.start());
    else vals.forEach((v) => v.setValue(0.25));
    return () => loops.forEach((l) => l.stop());
  }, [active, vals]);
  return (
    <View style={styles.eqRow}>
      {vals.map((v, i) => (
        <Animated.View key={i} style={[styles.eqBar, { backgroundColor: color, transform: [{ scaleY: v }] }]} />
      ))}
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

export default function MuzikDuruncaDon({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [roundNonce, setRoundNonce] = useState(0); // aynı turu tekrar başlatmak için (zaman aşımı)
  const [phase, setPhase] = useState<Phase>('dancing');
  const [song, setSong] = useState(SONG_POOL[0]);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const lockRef = useRef(false); // doğru cevap işlenirken çift dokunuşu engeller

  // Zamanlayıcılar + ses referansları (unmount'ta hepsi temizlenir)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const freezeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const loadTokenRef = useRef(0); // eşzamanlı yüklemede yetim sesleri önler
  const songIdxRef = useRef(0);

  // Animasyonlar
  const danceAnim = useRef(new Animated.Value(0)).current; // dansçı sallanması
  const pulseAnim = useRef(new Animated.Value(1)).current; // DON düğmesi nabzı
  const shakeAnim = useRef(new Animated.Value(0)).current; // yanlış dokunuşta titreme

  // ---- Unmount temizliği: TÜM zamanlayıcılar + Audio.Sound durdur/boşalt ----
  useEffect(() => () => {
    isMountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    loadTokenRef.current += 1; // devam eden yüklemeleri geçersiz kıl
    if (soundRef.current) {
      const s = soundRef.current;
      soundRef.current = null;
      s.stopAsync().catch(() => {});
      s.unloadAsync().catch(() => {});
    }
    stopSpeech();
  }, []);

  // Sessiz modda da (iOS) müzik duyulsun.
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
      } catch {
        // ses modu ayarlanamazsa oynatma yine denenir
      }
    })();
  }, []);

  // Önceki sesi boşalt → yeni şarkıyı (döngüde) yükleyip çal.
  const loadAndPlay = async (path: string) => {
    const myToken = ++loadTokenRef.current;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(asset(path), { shouldPlay: true, isLooping: true, volume: 1.0 });
      // Yükleme biterken tur değiştiyse / unmount olduysa yeni sesi de boşalt.
      if (!isMountedRef.current || myToken !== loadTokenRef.current) {
        await sound.unloadAsync().catch(() => {});
        return;
      }
      soundRef.current = sound;
    } catch (e) {
      console.warn('🎵 Müzik yüklenemedi (sessiz geçildi):', e);
    }
  };

  // ---- Tur yaşam döngüsü: dans → (rastgele gecikme) müzik dur → don penceresi ----
  useEffect(() => {
    if (!gameReady) return;
    let cancelled = false;

    // Şarkıyı sırayla döndür (ardışık turlar farklı şarkı).
    const nextSong = SONG_POOL[songIdxRef.current % SONG_POOL.length];
    songIdxRef.current += 1;

    lockRef.current = false;
    setSong(nextSong);
    setPhase('dancing');
    loadAndPlay(nextSong.path);

    // Rastgele 3-6 sn sonra müziği DURDUR → donma penceresini aç.
    const pauseDelay = DANCE_MIN_MS + Math.floor(Math.random() * DANCE_RANGE_MS);
    const pauseTimer = setTimeout(async () => {
      if (cancelled || !isMountedRef.current) return;
      try {
        await soundRef.current?.pauseAsync();
      } catch {
        // duraklatma başarısızsa görsel donma yine de devam eder
      }
      if (cancelled || !isMountedRef.current) return;
      setPhase('frozen');
      speak('Müzik durdu! DON!', { instructions: HAPPY_VOICE });

      // Donma penceresi: süre içinde DON'a basılmazsa nazikçe aynı tur tekrar.
      const freezeTimer = setTimeout(() => {
        if (cancelled || !isMountedRef.current) return;
        handleFreezeTimeout();
      }, FREEZE_WINDOW_MS);
      freezeTimerRef.current = freezeTimer;
      timersRef.current.push(freezeTimer);
    }, pauseDelay);
    pauseTimerRef.current = pauseTimer;
    timersRef.current.push(pauseTimer);

    return () => {
      cancelled = true;
      clearTimeout(pauseTimer);
      if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, roundNonce, gameReady]);

  // Dans sallanması yalnızca 'dancing' fazında.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(danceAnim, { toValue: 1, duration: 360, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
        Animated.timing(danceAnim, { toValue: -1, duration: 360, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
      ]),
    );
    if (gameReady && phase === 'dancing') {
      danceAnim.setValue(0);
      loop.start();
    }
    return () => loop.stop();
  }, [phase, gameReady, danceAnim]);

  // DON düğmesi nabzı yalnızca 'frozen' fazında.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.14, duration: 420, useNativeDriver: USE_NATIVE }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 420, useNativeDriver: USE_NATIVE }),
      ]),
    );
    if (phase === 'frozen') {
      pulseAnim.setValue(1);
      loop.start();
    }
    return () => loop.stop();
  }, [phase, pulseAnim]);

  const shakeButton = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
    ]).start();
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // Müziği durdur/boşalt (çıkışta müzik çalmaya devam etmesin).
    loadTokenRef.current += 1;
    if (soundRef.current) {
      const s = soundRef.current;
      soundRef.current = null;
      s.stopAsync().catch(() => {});
      s.unloadAsync().catch(() => {});
    }
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('muzik-durunca-don', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Müzik: Müzik ve Ritimle Hareket — Dur/Don (MHB.3)',
      correct_answers: correctRef.current,
    });
  };

  // Donma penceresi doldu (dokunulmadı) → nazik uyarı + aynı turu tekrar.
  const handleFreezeTimeout = () => {
    if (lockRef.current) return;
    errorsRef.current += 1; // hedef beceri gerçekleşmedi (rapor için)
    speak('Müzik durunca donmalıyız! Tekrar deneyelim.', { instructions: HAPPY_VOICE });
    setRoundNonce((n) => n + 1); // aynı tur, yeni deneme
  };

  const handleDonTap = () => {
    if (lockRef.current) return;

    if (phase === 'frozen') {
      // DOĞRU: müzik dururken zamanında dondu.
      lockRef.current = true;
      movesRef.current += 1;
      correctRef.current += 1;
      if (freezeTimerRef.current) {
        clearTimeout(freezeTimerRef.current);
        freezeTimerRef.current = null;
      }
      setShowConfetti(true);
      setPhase('happy');
      speakThenWait('Aferin! Müzik durunca hemen dondun!', 1400, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        lockRef.current = false;
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else if (phase === 'dancing') {
      // Müzik hâlâ çalıyor: erken dokunuş → nazik uyarı, ilerleme yok.
      movesRef.current += 1;
      errorsRef.current += 1;
      shakeButton();
      speak('Müzik daha çalıyor, durmasını bekle!', { instructions: HAPPY_VOICE });
    }
  };

  const isFrozen = phase === 'frozen';
  const isHappy = phase === 'happy';
  const bg = isFrozen ? '#E1F5FE' : isHappy ? '#FFF8E1' : '#F3E9FF';
  const cardColor = isFrozen ? '#4FC3F7' : song.color;

  const danceRotate = danceAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] });
  const danceBob = danceAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, -10, 0] });

  const statusText = isFrozen ? '🔇 Müzik durdu!' : isHappy ? '🎉 Harika!' : '🎶 Müzik çalıyor!';
  const hintText = isFrozen ? 'Hemen DON! Düğmeye bas.' : isHappy ? 'Donmayı başardın!' : 'Sen de dans et!';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Müzik çalınca dans et, müzik durunca hemen DON! Durunca DON düğmesine bas."
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
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>🎵 {round}/{TOTAL_ROUNDS}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.playArea}>
        <View style={[styles.statusPill, isFrozen && styles.statusPillFrozen]}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>

        <View style={[styles.stage, { borderColor: cardColor }]}>
          <Animated.Text
            style={[styles.dancer, phase === 'dancing' && { transform: [{ rotate: danceRotate }, { translateY: danceBob }] }]}
          >
            💃
          </Animated.Text>
          {isFrozen && <Text style={styles.iceBadge}>🧊</Text>}
        </View>

        <EqualizerBars active={gameReady && phase === 'dancing'} color={cardColor} />

        <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
        <Text style={styles.hint}>{hintText}</Text>

        {/* DON düğmesi: 'dancing'te sönük+atıl (basınca "bekle" uyarısı),
            'frozen'da canlı+nabızlı (basınca doğru). 'happy'de gizli. */}
        {!isHappy && (
          <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: isFrozen ? pulseAnim : 1 }] }}>
            <TouchableOpacity
              style={[styles.donBtn, isFrozen ? styles.donBtnActive : styles.donBtnIdle]}
              onPress={handleDonTap}
              activeOpacity={0.85}
            >
              <Text style={styles.donEmoji}>{isFrozen ? '🧊' : '💤'}</Text>
              <Text style={[styles.donText, !isFrozen && styles.donTextIdle]}>DON!</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {isHappy && (
          <View style={styles.happyBox}>
            <Text style={styles.happyEmoji}>🌟</Text>
            <Text style={styles.happyText}>Aferin!</Text>
          </View>
        )}
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

  playArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 24 },

  statusPill: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 999, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  statusPillFrozen: { backgroundColor: '#01579B' },
  statusText: { fontSize: 18, fontWeight: '900', color: '#4A148C' },

  stage: { width: 180, height: 180, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  dancer: { fontSize: 104 },
  iceBadge: { position: 'absolute', bottom: 8, right: 10, fontSize: 40 },

  eqRow: { flexDirection: 'row', alignItems: 'flex-end', height: 30, gap: 6, marginTop: 16, marginBottom: 6 },
  eqBar: { width: 8, height: 28, borderRadius: 5 },

  songTitle: { fontSize: 16, fontWeight: '800', color: '#6A1B9A', marginTop: 6 },
  hint: { fontSize: 17, fontWeight: '700', color: '#7B1FA2', marginTop: 4, marginBottom: 18, textAlign: 'center' },

  donBtn: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#fff' },
  donBtnActive: { backgroundColor: '#FF3D81', shadowColor: '#FF3D81', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 22, elevation: 12 },
  donBtnIdle: { backgroundColor: '#C7BCDD', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 },
  donEmoji: { fontSize: 58 },
  donText: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: 1, marginTop: 2 },
  donTextIdle: { color: '#fff', opacity: 0.85 },

  happyBox: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#FFD54F', alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#fff', shadowColor: '#FFB300', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  happyEmoji: { fontSize: 64 },
  happyText: { fontSize: 30, fontWeight: '900', color: '#E65100', marginTop: 2 },
});
