import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';

// ============================================
// 🎨 RENK ATÖLYESİ - Tekrar ve varyasyon (Sanat, SNAB.4)
// AYNI motif 2x2 ızgarada dört kez durur. Çocuk her paneli BAŞKA bir ana renkle
// boyar; kullanılmış bir ana renk nazikçe geri çevrilir. Dört panel dolunca
// resimler birlikte büyüyüp "poster" olur ve app etkiyi adlandırır:
// aynı resim, dört farklı duygu. Serbest/yaratıcı oyun — doğru-yanlış yok.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

const EMPTY = '#F4F4F5';   // boyanmamış bölge
const OUTLINE = '#78909C';  // bölge konturu
const INK = '#37474F';      // sabit yüz/gövde detayları (boyanmaz)
const GUIDE = '#FFB300';    // rehberli açılışta yanıp sönen kılavuz kontur
const PANEL_BG = '#FFFFFF';

// Palet — 6 renk (kavram: kırmızı, turuncu, sarı, yeşil, mavi, mor)
const PALETTE = [
  { key: 'kirmizi', hex: '#E53935', ad: 'Kırmızı' },
  { key: 'turuncu', hex: '#FB8C00', ad: 'Turuncu' },
  { key: 'sari', hex: '#FDD835', ad: 'Sarı' },
  { key: 'yesil', hex: '#43A047', ad: 'Yeşil' },
  { key: 'mavi', hex: '#1E88E5', ad: 'Mavi' },
  { key: 'mor', hex: '#8E24AA', ad: 'Mor' },
];
const C_KIRMIZI = PALETTE[0].hex;
const C_TURUNCU = PALETTE[1].hex;
const C_SARI = PALETTE[2].hex;
const C_YESIL = PALETTE[3].hex;
const C_MAVI = PALETTE[4].hex;

type Region = 'fon' | 'govde' | 'detay';
const REGIONS: Region[] = ['fon', 'govde', 'detay'];
const PANELS = [0, 1, 2, 3];

type Fills = Record<string, string>;
type FillFn = (r: Region) => string;
type PaintFn = (r: Region) => void;

interface Motif {
  key: string;
  ad: string;
  emoji: string;
  render: (f: FillFn, paint: PaintFn) => React.ReactNode;
}

// Çiçeğin taç yaprakları (merkez 50,38 çevresinde 6 daire)
const PETALS: [number, number][] = [
  [50, 21], [64.7, 29.5], [64.7, 46.5], [50, 55], [35.3, 46.5], [35.3, 29.5],
];

// ============================================================
// MOTİFLER — %100 elle yazılmış SVG. Her motifte ÜÇ boyanabilir bölge:
//   fon   → panelin arka planı (panelin ANA RENGİ budur)
//   govde → motifin ana kütlesi
//   detay → küçük ikinci bölge
// Sabit çizgiler (göz, burun, bıyık, sap, anten) boyanmaz: pointerEvents="none".
// ============================================================
const MOTIFS: Motif[] = [
  {
    key: 'kedi', ad: 'Kedi', emoji: '🐱',
    render: (f, paint) => (
      <>
        <Rect x={0} y={0} width={100} height={100} fill={f('fon')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('fon')} />
        {/* detay: kulaklar + kuyruk */}
        <Polygon points="31,30 33,7 52,24" fill={f('detay')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('detay')} />
        <Polygon points="69,30 67,7 48,24" fill={f('detay')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('detay')} />
        <Path d="M 75 84 C 95 84 97 60 84 51 C 92 63 87 74 72 74 Z" fill={f('detay')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('detay')} />
        {/* govde: gövde + baş */}
        <Ellipse cx={50} cy={76} rx={26} ry={19} fill={f('govde')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('govde')} />
        <Circle cx={50} cy={41} r={23} fill={f('govde')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('govde')} />
        {/* sabit yüz */}
        <Circle cx={41} cy={38} r={3} fill={INK} pointerEvents="none" />
        <Circle cx={59} cy={38} r={3} fill={INK} pointerEvents="none" />
        <Polygon points="50,45 46.5,48.5 53.5,48.5" fill="#F06292" pointerEvents="none" />
        <Path d="M 50 49 Q 46 53.5 42.5 50.5" stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" pointerEvents="none" />
        <Path d="M 50 49 Q 54 53.5 57.5 50.5" stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" pointerEvents="none" />
        <Line x1={21} y1={43} x2={38} y2={46} stroke={INK} strokeWidth={1.3} pointerEvents="none" />
        <Line x1={21} y1={51} x2={38} y2={50} stroke={INK} strokeWidth={1.3} pointerEvents="none" />
        <Line x1={79} y1={43} x2={62} y2={46} stroke={INK} strokeWidth={1.3} pointerEvents="none" />
        <Line x1={79} y1={51} x2={62} y2={50} stroke={INK} strokeWidth={1.3} pointerEvents="none" />
      </>
    ),
  },
  {
    key: 'cicek', ad: 'Çiçek', emoji: '🌸',
    render: (f, paint) => (
      <>
        <Rect x={0} y={0} width={100} height={100} fill={f('fon')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('fon')} />
        {/* sabit sap + yapraklar */}
        <Path d="M 50 52 L 50 94" stroke="#2E7D32" strokeWidth={4} strokeLinecap="round" fill="none" pointerEvents="none" />
        <Path d="M 50 74 C 36 66 27 74 29 82 C 37 88 47 84 50 76 Z" fill="#66BB6A" stroke="#2E7D32" strokeWidth={1.2} pointerEvents="none" />
        <Path d="M 50 82 C 64 74 73 82 71 90 C 63 96 53 92 50 84 Z" fill="#66BB6A" stroke="#2E7D32" strokeWidth={1.2} pointerEvents="none" />
        {/* govde: taç yaprakları */}
        {PETALS.map(([cx, cy], i) => (
          <Circle key={i} cx={cx} cy={cy} r={11.5} fill={f('govde')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('govde')} />
        ))}
        {/* detay: göbek */}
        <Circle cx={50} cy={38} r={11} fill={f('detay')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('detay')} />
        <Circle cx={50} cy={38} r={4} fill={INK} opacity={0.18} pointerEvents="none" />
      </>
    ),
  },
  {
    key: 'kelebek', ad: 'Kelebek', emoji: '🦋',
    render: (f, paint) => (
      <>
        <Rect x={0} y={0} width={100} height={100} fill={f('fon')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('fon')} />
        {/* govde: dört kanat */}
        <Path d="M 50 38 C 34 12 10 16 10 34 C 10 48 32 50 50 46 Z" fill={f('govde')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('govde')} />
        <Path d="M 50 38 C 66 12 90 16 90 34 C 90 48 68 50 50 46 Z" fill={f('govde')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('govde')} />
        <Path d="M 50 50 C 34 52 18 58 22 74 C 26 86 44 76 50 62 Z" fill={f('govde')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('govde')} />
        <Path d="M 50 50 C 66 52 82 58 78 74 C 74 86 56 76 50 62 Z" fill={f('govde')} stroke={OUTLINE} strokeWidth={1.5} onPress={() => paint('govde')} />
        {/* detay: kanat benekleri */}
        <Circle cx={26} cy={32} r={6} fill={f('detay')} stroke={OUTLINE} strokeWidth={1.4} onPress={() => paint('detay')} />
        <Circle cx={74} cy={32} r={6} fill={f('detay')} stroke={OUTLINE} strokeWidth={1.4} onPress={() => paint('detay')} />
        <Circle cx={34} cy={65} r={4.5} fill={f('detay')} stroke={OUTLINE} strokeWidth={1.4} onPress={() => paint('detay')} />
        <Circle cx={66} cy={65} r={4.5} fill={f('detay')} stroke={OUTLINE} strokeWidth={1.4} onPress={() => paint('detay')} />
        {/* sabit gövde + baş + antenler */}
        <Ellipse cx={50} cy={54} rx={4.5} ry={20} fill={INK} pointerEvents="none" />
        <Circle cx={50} cy={32} r={5} fill={INK} pointerEvents="none" />
        <Path d="M 48 28 C 44 20 40 16 36 15" stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" pointerEvents="none" />
        <Path d="M 52 28 C 56 20 60 16 64 15" stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" pointerEvents="none" />
        <Circle cx={36} cy={15} r={2} fill={INK} pointerEvents="none" />
        <Circle cx={64} cy={15} r={2} fill={INK} pointerEvents="none" />
      </>
    ),
  },
];

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: {
      cizimVerisi?: string; cizimResimBase64?: string; cizimResimFormat?: 'png' | 'jpeg';
      zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number;
    },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function RenkAtolyesi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [motifIdx, setMotifIdx] = useState(0);
  const [fills, setFills] = useState<Fills>({});
  const [color, setColor] = useState(C_SARI); // rehberli açılış: sarı hazır seçili
  const [posterDone, setPosterDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shakePanel, setShakePanel] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const fillsRef = useRef<Fills>({});
  const movesRef = useRef(0);
  const errorsRef = useRef(0);          // "bu rengi kullandın" hatırlatma sayısı
  const postersRef = useRef(0);         // tamamlanan poster sayısı
  const donePanelsRef = useRef(0);      // tamamlanan panel sayısı (oturum toplamı)
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startTimeRef = useRef(Date.now());
  const posterRef = useRef<View>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const posterScale = useRef(new Animated.Value(1)).current;

  useEffect(() => () => {
    isMountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    stopSpeech();
  }, []);

  // ---------- yardımcılar ----------
  const isPanelDone = (f: Fills, p: number) => REGIONS.every((r) => !!f[`${p}-${r}`]);
  const countDone = (f: Fills) => PANELS.filter((p) => isPanelDone(f, p)).length;
  const dominantOf = (f: Fills, p: number) => f[`${p}-fon`];

  const doneCount = countDone(fills);
  const usedDominants = PANELS.map((p) => dominantOf(fills, p)).filter(Boolean);
  const hasWork = Object.keys(fills).length > 0;
  const guided = gameReady && !posterDone && !hasWork;
  const motif = MOTIFS[motifIdx];

  // Renge özel ÖVGÜ — her renk için AYRI, sabit cümle (dinamik metin yok).
  const praiseColor = (hex: string) => {
    if (hex === C_KIRMIZI) { speak('Kırmızı! Kırmızı canlı ve heyecanlı bir renktir.', { instructions: HAPPY_VOICE }); return; }
    if (hex === C_TURUNCU) { speak('Turuncu! Turuncu portakal gibi sıcacık bir renktir.', { instructions: HAPPY_VOICE }); return; }
    if (hex === C_SARI) { speak('Sarı! Sarı, güneş gibi neşeli bir renktir.', { instructions: HAPPY_VOICE }); return; }
    if (hex === C_YESIL) { speak('Yeşil! Yeşil, çimen gibi taze ve huzurlu bir renktir.', { instructions: HAPPY_VOICE }); return; }
    if (hex === C_MAVI) { speak('Mavi! Mavi, deniz gibi sakin ve serin bir renktir.', { instructions: HAPPY_VOICE }); return; }
    speak('Mor! Mor, masal gibi gizemli bir renktir.', { instructions: HAPPY_VOICE });
  };

  // Kapanış: motife özel + etkiyi adlandıran + yansıtma cümlesi (hepsi sabit).
  const sayClosing = async (motifKey: string) => {
    if (motifKey === 'kedi') await speakThenWait('Dört kedi, dört farklı renk!', 1700, { instructions: HAPPY_VOICE });
    else if (motifKey === 'cicek') await speakThenWait('Dört çiçek, dört farklı renk!', 1700, { instructions: HAPPY_VOICE });
    else await speakThenWait('Dört kelebek, dört farklı renk!', 1700, { instructions: HAPPY_VOICE });
    if (!isMountedRef.current) return;
    await speakThenWait('Şekilleri tıpatıp aynı ama hiçbiri diğerine benzemiyor. Rengi değiştirince resmin duygusu da değişiyor.', 2800, { instructions: HAPPY_VOICE });
    if (!isMountedRef.current) return;
    await speakThenWait('Hangisi sana en neşeli geldi?', 1500, { instructions: HAPPY_VOICE });
  };

  const refuse = (p: number) => {
    errorsRef.current += 1;
    setShakePanel(p);
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: USE_NATIVE }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
    ]).start();
    speak('Bu rengi başka bir resimde kullandın. Her resim başka renk olsun, başka bir renk seç.', { instructions: HAPPY_VOICE });
    const t = setTimeout(() => { if (isMountedRef.current) setShakePanel(null); }, 520);
    timersRef.current.push(t);
  };

  const celebrate = (motifKey: string) => {
    setPosterDone(true);
    postersRef.current += 1;
    donePanelsRef.current += 4;
    setShowConfetti(true);
    Animated.sequence([
      Animated.timing(posterScale, { toValue: 1.09, duration: 420, useNativeDriver: USE_NATIVE }),
      Animated.spring(posterScale, { toValue: 1.04, friction: 5, useNativeDriver: USE_NATIVE }),
    ]).start();
    const t = setTimeout(() => { if (isMountedRef.current) setShowConfetti(false); }, 2800);
    timersRef.current.push(t);
    sayClosing(motifKey).catch(() => { });
  };

  // ---------- boyama ----------
  const paint = (p: number, region: Region) => {
    if (!gameReady || posterDone) return;
    const prev = fillsRef.current;

    // TEK KURAL: bir panelin ANA RENGİ (fon) daha önce kullanılmış olamaz.
    if (region === 'fon' && PANELS.some((q) => q !== p && prev[`${q}-fon`] === color)) {
      refuse(p);
      return;
    }

    movesRef.current += 1;
    const next: Fills = { ...prev, [`${p}-${region}`]: color };
    fillsRef.current = next;
    setFills(next);
    if (!finishedRef.current) setSaved(false);

    if (countDone(next) === 4) { celebrate(motif.key); return; }
    if (isPanelDone(next, p) && !isPanelDone(prev, p)) {
      speak('Bir resim bitti! Şimdi başka bir resmi bambaşka bir renkle boya.', { instructions: HAPPY_VOICE });
      return;
    }
    if (region === 'fon') praiseColor(color);
  };

  // ---------- poster akışı ----------
  const resetPoster = (idx: number) => {
    fillsRef.current = {};
    setFills({});
    setMotifIdx(idx);
    setPosterDone(false);
    if (!finishedRef.current) setSaved(false);
    setShakePanel(null);
    setShowConfetti(false);
    posterScale.setValue(1);
    setColor(C_SARI);
  };

  const startNewPoster = (idx: number) => {
    resetPoster(idx);
    if (gameReady) speak('Yeni bir poster! Aynı resmi yine dört kere, her birini başka renkle boyayalım.', { instructions: HAPPY_VOICE });
  };

  // finish(): SADECE iş kaydedilip bitirildiğinde çağrılır (ara aksiyonda ASLA).
  const finish = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const totalPanels = donePanelsRef.current + (posterDone ? 0 : countDone(fillsRef.current));

    let base64: string | undefined;
    try {
      if (posterRef.current) {
        let data: string | undefined;
        if (Platform.OS === 'web') {
          const { toPng } = await import('html-to-image');
          data = await toPng(posterRef.current as unknown as HTMLElement, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
        } else {
          data = await captureRef(posterRef, { format: 'png', quality: 0.9, result: 'base64' });
        }
        if (data) base64 = data.includes(',') ? data.split(',')[1] : data;
      }
    } catch (e) { console.warn('Poster resmi olusturulamadi:', e); }

    speak('Ne güzel bir poster oldu! Aferin.', { instructions: HAPPY_VOICE });
    onGameEnd('renk-atolyesi', duration, movesRef.current, 0, undefined, {
      cizimVerisi: JSON.stringify({
        motif: motif.key,
        fills: fillsRef.current,
        posterSayisi: postersRef.current,
        farkliAnaRenk: new Set(PANELS.map((p) => dominantOf(fillsRef.current, p)).filter(Boolean)).size,
        kuralHatirlatma: errorsRef.current,
      }),
      cizimResimBase64: base64,
      cizimResimFormat: 'png',
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Sanatsal Beceri ve Teknikleri Kullanabilme — tekrar ve varyasyon (SNAB.4)',
      correct_answers: totalPanels,
    });
    if (isMountedRef.current) setSaved(true);
  };

  const clearPoster = () => { resetPoster(motifIdx); };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={120} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}

      {!gameReady && (
        <CountdownOverlay
          message="Aynı resmi dört kere boyayacağız, ama her birini başka renkle!"
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => {
            startTimeRef.current = Date.now();
            setGameReady(true);
            speak('Bir renk seç ve resme dokun. Birinci resmi sarı ile boyayabilirsin.', { instructions: HAPPY_VOICE });
          }}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#C2185B" />
        </TouchableOpacity>
        <Text style={styles.title}>🎨 Renk Atölyesi</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.smallBtn} onPress={clearPoster} disabled={!hasWork} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color={hasWork ? '#e53935' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallBtn, styles.saveBtn, saved && styles.savedBtn]}
            onPress={finish}
            disabled={!hasWork || saved}
            activeOpacity={0.8}
          >
            <Ionicons name={saved ? 'checkmark' : 'save'} size={20} color={saved ? '#fff' : hasWork ? '#43A047' : '#ccc'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Motif seçici — aynı motif dört kez boyanır; yeni poster için motif değişir */}
      <View style={styles.motifRow}>
        {MOTIFS.map((m, i) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.motifBtn, motifIdx === i && styles.motifActive]}
            onPress={() => startNewPoster(i)}
            activeOpacity={0.85}
          >
            <Text style={styles.motifEmoji}>{m.emoji}</Text>
            <Text style={styles.motifName}>{m.ad}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.hintRow}>
        <Text style={styles.hint}>
          {posterDone ? 'Aynı resim, dört farklı duygu! 🖼️' : 'Her resmi BAŞKA bir renkle boya 🎨'}
        </Text>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>🖼️ {doneCount}/4</Text>
        </View>
      </View>

      {/* POSTER — dört panel birlikte büyür */}
      <View style={styles.posterArea}>
        <Animated.View style={{ transform: [{ scale: posterScale }] }}>
          <View ref={posterRef} style={[styles.poster, posterDone && styles.posterDone]}>
            <View style={styles.grid}>
              {PANELS.map((p) => {
                const f: FillFn = (r) => fills[`${p}-${r}`] || EMPTY;
                const doPaint: PaintFn = (r) => paint(p, r);
                const isShaking = shakePanel === p;
                return (
                  <Animated.View
                    key={p}
                    style={[
                      styles.panel,
                      isPanelDone(fills, p) && styles.panelDone,
                      isShaking ? { transform: [{ translateX: shake }] } : null,
                    ]}
                  >
                    <Svg width="100%" height="100%" viewBox="0 0 100 100">
                      {motif.render(f, doPaint)}
                      {/* rehberli açılış: ilk panel altın kesikli çerçeveyle işaret edilir */}
                      {guided && p === 0 && (
                        <Rect
                          x={2.5} y={2.5} width={95} height={95} rx={4}
                          fill="none" stroke={GUIDE} strokeWidth={4} strokeDasharray={[7, 5]}
                          pointerEvents="none"
                        />
                      )}
                    </Svg>
                  </Animated.View>
                );
              })}
            </View>
            {posterDone && (
              <View style={styles.ribbon}>
                <Text style={styles.ribbonText}>🖼️ POSTER</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      {/* Palet — kullanılmış ANA RENKLER işaretlidir */}
      {!posterDone && (
        <View style={styles.palette}>
          {PALETTE.map((c) => {
            const used = usedDominants.includes(c.hex);
            return (
              <TouchableOpacity
                key={c.key}
                style={[
                  styles.swatch,
                  { backgroundColor: c.hex },
                  color === c.hex && styles.swatchActive,
                  guided && c.key === 'sari' && styles.swatchGuide,
                ]}
                onPress={() => setColor(c.hex)}
                activeOpacity={0.85}
                accessibilityLabel={c.ad}
              >
                {used && (
                  <View style={styles.usedBadge}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
                {color === c.hex && <Ionicons name="brush" size={19} color="#fff" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Poster bitti — yeni poster ya da kaydet & bitir */}
      {posterDone && (
        <View style={styles.doneBar}>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => startNewPoster((motifIdx + 1) % MOTIFS.length)}
            activeOpacity={0.85}
          >
            <Text style={styles.newBtnText}>🎨 Yeni Poster</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.finishBtn, saved && styles.finishBtnSaved]}
            onPress={finish}
            disabled={saved}
            activeOpacity={0.85}
          >
            <Ionicons name={saved ? 'checkmark-circle' : 'save'} size={20} color="#fff" />
            <Text style={styles.finishBtnText}>{saved ? 'Kaydedildi' : 'Kaydet ve Bitir'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF1F6', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  title: { fontSize: 19, fontWeight: '900', color: '#C2185B' },
  headerActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  saveBtn: { borderWidth: 2, borderColor: '#43A047' },
  savedBtn: { backgroundColor: '#43A047', borderColor: '#2E7D32' },

  motifRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 6 },
  motifBtn: { width: 74, height: 62, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 1, borderWidth: 3, borderColor: 'transparent', elevation: 2 },
  motifActive: { borderColor: '#EC407A', transform: [{ scale: 1.06 }] },
  motifEmoji: { fontSize: 26 },
  motifName: { fontSize: 11, fontWeight: '800', color: '#AD1457' },

  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 2, paddingBottom: 6, paddingHorizontal: 12, flexWrap: 'wrap' },
  hint: { fontSize: 14, fontWeight: '800', color: '#AD1457' },
  progressBadge: { backgroundColor: '#fff', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, elevation: 2 },
  progressText: { fontSize: 13, fontWeight: '900', color: '#C2185B' },

  posterArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  poster: { width: 340, maxWidth: '96%', padding: 8, backgroundColor: '#fff', borderRadius: 20, borderWidth: 4, borderColor: '#F8BBD0', elevation: 5 },
  posterDone: { borderColor: '#FFC107', borderWidth: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  panel: { width: '47%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: PANEL_BG, borderWidth: 2, borderColor: '#F1DDE6' },
  panelDone: { borderColor: '#FFC107' },
  ribbon: { alignSelf: 'center', marginTop: 8, backgroundColor: '#FFC107', paddingVertical: 4, paddingHorizontal: 18, borderRadius: 999 },
  ribbonText: { fontSize: 13, fontWeight: '900', color: '#6D4C00', letterSpacing: 1 },

  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, maxWidth: 480 },
  swatch: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(0,0,0,0.12)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 3 },
  swatchActive: { borderColor: '#212121', transform: [{ scale: 1.14 }] },
  swatchGuide: { borderColor: GUIDE, borderWidth: 4 },
  usedBadge: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#455A64', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

  doneBar: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 12, flexWrap: 'wrap' },
  newBtn: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 22, borderWidth: 3, borderColor: '#EC407A', elevation: 3 },
  newBtnText: { fontSize: 15, fontWeight: '900', color: '#C2185B' },
  finishBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#43A047', paddingVertical: 13, paddingHorizontal: 20, borderRadius: 22, elevation: 3 },
  finishBtnSaved: { backgroundColor: '#2E7D32' },
  finishBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
});
