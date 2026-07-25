import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { speak, stopSpeech } from '../services/speechService';

// =======================================
// ❤️ KÜÇÜK KALPLER - İnteraktif Sevgi Hikayesi
// Tema: Sevgi (sevgiyi gösterme yolları)
// Karakterler: Tavşan Pamuk, Kirpi Diken
// Tasarım: Hangi seçim yapılırsa yapılsın son AYNI ve olumludur.
// Her seçim bir TEMSİL'dir; Gemini bunları Maarif SAB bağlamında yorumlar.
// =======================================

const { width: SCREEN_W } = Dimensions.get('window');

// Coral (sıcak kadın) sesine "neşeli, anne şefkatinde masal" tonu.
const MOTHER_VOICE =
  'Speak in Turkish like a cheerful, loving mother reading a bedtime story to a preschool child. Warm, gentle, playful and expressive; slow and clear.';

type SceneKind = 'sad' | 'comfort' | 'happy';
interface StoryOption { id: string; temsil: string; label: string; emoji: string; next: string }
interface StoryNode { id: string; scene: SceneKind; narration: string; next?: string; options?: StoryOption[]; isFinal?: boolean }

const STORY: Record<string, StoryNode> = {
  intro: {
    id: 'intro',
    scene: 'sad',
    narration:
      'Tavşan Pamuk ormanda neşeyle zıplıyordu. Birden, büyük bir ağacın altında yapayalnız oturan küçük kirpi Diken’i gördü. Diken başını öne eğmişti ve çok üzgün görünüyordu.',
    next: 'q1',
  },
  q1: {
    id: 'q1',
    scene: 'sad',
    narration:
      'Pamuk, Diken’e sevgisini göstermek istedi. Sence ne yapsın? Yanına oturup ona sıkıca sarılsın mı, yoksa onu güldürecek eğlenceli bir şey mi yapsın? Haydi sen seç!',
    options: [
      { id: 'A', temsil: 'duygusal-teselli', label: 'Yanına oturup sarıl', emoji: '🫂', next: 'scene2' },
      { id: 'B', temsil: 'neselendirme', label: 'Güldürecek bir şey yap', emoji: '🎈', next: 'scene2' },
    ],
  },
  scene2: {
    id: 'scene2',
    scene: 'comfort',
    narration:
      'Pamuk’un sevgisiyle Diken biraz rahatladı ve usulca fısıldadı: “Annemi çok özledim, ama onu bir türlü bulamıyorum.”',
    next: 'q2',
  },
  q2: {
    id: 'q2',
    scene: 'comfort',
    narration:
      'Pamuk, Diken’e yardım etmek istedi. Sence nasıl yardım etsin? En sevdiği kırmızı çileği ona hediye mi etsin, yoksa elinden tutup birlikte annesini mi arasın? Haydi sen seç!',
    options: [
      { id: 'A', temsil: 'paylasma', label: 'En sevdiği çileği ver', emoji: '🍓', next: 'ending' },
      { id: 'B', temsil: 'isbirligi', label: 'Elinden tut, birlikte ara', emoji: '🤝', next: 'ending' },
    ],
  },
  ending: {
    id: 'ending',
    scene: 'happy',
    narration:
      'Tam o sırada Diken’in annesi göründü! Diken koşup annesine sımsıkı sarıldı, sonra da Pamuk’a. “Sen gerçek bir dostsun Pamuk, sevgin kalbimi ısıttı!” dedi. Pamuk mutlulukla gülümsedi. Sevgiyi göstermenin bin bir yolu vardı ve hepsi kalpleri ısıtıyordu. Aferin sana, senin de kocaman bir kalbin var!',
    isFinal: true,
  },
};

// ---------- SVG karakterler ----------
function Hedgehog({ x, y, mood, scale = 1 }: { x: number; y: number; mood: 'sad' | 'happy'; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* dikenli sırt */}
      <Path d="M -28 -4 Q -32 -30 -16 -24 Q -10 -36 0 -26 Q 10 -36 18 -24 Q 30 -30 28 -4 Z" fill="#8B5A2B" />
      {/* gövde */}
      <Ellipse cx="0" cy="0" rx="28" ry="20" fill="#C68B59" />
      {/* yüz */}
      <Ellipse cx="14" cy="2" rx="15" ry="13" fill="#E8C39E" />
      <Circle cx="27" cy="2" r="3.5" fill="#4A3222" />
      <Circle cx="15" cy="-2" r="2.6" fill="#3A2A1A" />
      {mood === 'sad' ? (
        <>
          <Path d="M 9 9 Q 15 5 21 9" stroke="#6B4A2E" strokeWidth="2" fill="none" strokeLinecap="round" />
          <Path d="M 11 2 q -2 6 0 10" stroke="#7EC8F0" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <Path d="M 9 6 Q 15 12 21 6" stroke="#6B4A2E" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
    </G>
  );
}

function Rabbit({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x}, ${y})`}>
      {/* kulaklar */}
      <Ellipse cx="-8" cy="-52" rx="6" ry="20" fill="#FFFFFF" stroke="#E8E1F0" strokeWidth="1.5" />
      <Ellipse cx="8" cy="-52" rx="6" ry="20" fill="#FFFFFF" stroke="#E8E1F0" strokeWidth="1.5" />
      <Ellipse cx="-8" cy="-52" rx="2.6" ry="14" fill="#FFC1E3" />
      <Ellipse cx="8" cy="-52" rx="2.6" ry="14" fill="#FFC1E3" />
      {/* gövde + kafa */}
      <Ellipse cx="0" cy="0" rx="22" ry="26" fill="#FFFFFF" stroke="#E8E1F0" strokeWidth="1.5" />
      <Circle cx="0" cy="-26" r="18" fill="#FFFFFF" stroke="#E8E1F0" strokeWidth="1.5" />
      <Circle cx="-6" cy="-27" r="2.6" fill="#3A2A3A" />
      <Circle cx="6" cy="-27" r="2.6" fill="#3A2A3A" />
      <Circle cx="-11" cy="-21" r="4" fill="#FFD1E6" />
      <Circle cx="11" cy="-21" r="4" fill="#FFD1E6" />
      <Path d="M -3 -22 L 3 -22 L 0 -19 Z" fill="#FF8FB1" />
      <Path d="M -5 -17 Q 0 -13 5 -17" stroke="#C98BA8" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </G>
  );
}

function SvgHeart({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <Path
      transform={`translate(${x}, ${y}) scale(${s / 12})`}
      d="M 0 3 C 0 -1 -6 -2 -6 3 C -6 7 -1 10 0 12 C 1 10 6 7 6 3 C 6 -2 0 -1 0 3 Z"
      fill="#FF5E86"
    />
  );
}

function StoryScene({ scene }: { scene: SceneKind }) {
  const sad = scene === 'sad';
  const happy = scene === 'happy';
  return (
    <Svg viewBox="0 0 360 240" width="100%" height="100%">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={happy ? '#FFE9A8' : '#BFE3FF'} />
          <Stop offset="1" stopColor={happy ? '#FFC7E6' : '#DAF3E7'} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="360" height="240" fill="url(#sky)" />

      {/* güneş / bulut */}
      {happy ? (
        <Circle cx="312" cy="44" r="26" fill="#FFD23F" />
      ) : (
        <G>
          <Ellipse cx="300" cy="46" rx="30" ry="18" fill="#EEF4FA" />
          {sad && (
            <>
              <Line x1="292" y1="66" x2="288" y2="82" stroke="#9CC3E0" strokeWidth="3" strokeLinecap="round" />
              <Line x1="306" y1="66" x2="302" y2="84" stroke="#9CC3E0" strokeWidth="3" strokeLinecap="round" />
            </>
          )}
        </G>
      )}

      {/* zemin */}
      <Ellipse cx="180" cy="250" rx="270" ry="72" fill="#9BD770" />
      <Ellipse cx="180" cy="262" rx="270" ry="60" fill="#7CC65A" />

      {/* ağaç */}
      <Rect x="40" y="118" width="16" height="64" rx="6" fill="#9A6B3F" />
      <Circle cx="48" cy="110" r="30" fill="#5FBF5F" />
      <Circle cx="30" cy="124" r="20" fill="#6FCB6F" />
      <Circle cx="66" cy="124" r="20" fill="#6FCB6F" />

      {happy && (
        <>
          <Circle cx="92" cy="202" r="6" fill="#FF8FB1" />
          <Circle cx="272" cy="206" r="6" fill="#FFD23F" />
          <SvgHeart x={182} y={66} s={18} />
          <SvgHeart x={220} y={92} s={12} />
          <SvgHeart x={150} y={98} s={10} />
        </>
      )}

      {/* karakterler */}
      <Hedgehog x={happy ? 150 : 208} y={176} mood={sad ? 'sad' : 'happy'} />
      {happy && <Hedgehog x={108} y={172} mood="happy" scale={1.15} />}
      <Rabbit x={happy ? 244 : 122} y={168} />
    </Svg>
  );
}

// ---------- Ana bileşen ----------
interface Props {
  onExit: () => void;
  onGameEnd?: (
    oyunAdi: string,
    sure: number,
    finalHamle: number,
    finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string },
  ) => void;
  userId?: string;
  userEmail?: string;
  userAge?: number;
}

export default function SevgiHikayesi({ onExit, onGameEnd }: Props) {
  const [nodeId, setNodeId] = useState('intro');
  const [phase, setPhase] = useState<'narrating' | 'choice'>('narrating');
  const [path, setPath] = useState<string[]>([]);
  const [startTime] = useState(Date.now());
  const [showConfetti, setShowConfetti] = useState(false);
  const [started, setStarted] = useState(false); // ilk dokunusa kadar bekle (ses otomatik-oynatma icin)

  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const node = STORY[nodeId];

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd?.('sevgi-hikayesi', duration, path.length, 0, undefined, {
      cizimVerisi: JSON.stringify({
        secilen_yol: path.join(' -> '),
        temsiller: path,
        maarif_kazanim: 'SAB - Sosyal Alan Becerileri: Sevgiyi ifade etme, empati kurma, yardımlaşma',
        analiz_ipucu:
          'Çocuğun iki seçimi sevgi-ifade tarzını temsil eder. 1. seçim: duygusal-teselli (empatik yakınlık) ya da neselendirme (olumlu duygu paylaşımı). 2. seçim: paylasma (cömertlik) ya da isbirligi (birlikte problem çözme). Tüm yollar olumlu sonuçlanır; amaç doğru/yanlış değil, çocuğun tercih ettiği prososyal stili SAB kazanımları çerçevesinde yorumlamaktır.',
        oyun_turu_aciklama: 'İnteraktif Değer Hikayesi - Sevgi',
      }),
      kazanimOdagi: 'Sosyal-Duygusal Gelişim: Sevgi ve Empati',
    });
  };

  // Her düğümde: anlatımı seslendir, bitince seçim göster / ilerle / bitir.
  useEffect(() => {
    if (!started) return;
    let active = true;
    setPhase('narrating');
    (async () => {
      await speak(node.narration, { instructions: MOTHER_VOICE });
      if (!active) return;
      if (node.options) {
        setPhase('choice');
      } else if (node.next) {
        const t = setTimeout(() => setNodeId(node.next!), 500);
        timersRef.current.push(t);
      } else if (node.isFinal) {
        setShowConfetti(true);
        const t = setTimeout(finish, 2600);
        timersRef.current.push(t);
      }
    })();
    return () => {
      active = false;
      stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, started]);

  // Unmount: konuşmayı durdur, zamanlayıcıları temizle
  useEffect(() => () => {
    stopSpeech();
    timersRef.current.forEach(clearTimeout);
  }, []);

  const handleChoice = (opt: StoryOption) => {
    setPath((p) => [...p, opt.temsil]);
    setNodeId(opt.next);
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={120} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}

      <TouchableOpacity style={styles.exitBtn} onPress={onExit} activeOpacity={0.8}>
        <Ionicons name="close" size={26} color="#fff" />
      </TouchableOpacity>

      <View style={styles.title}>
        <Text style={styles.titleText}>❤️ Küçük Kalpler</Text>
      </View>

      <View style={styles.sceneWrap}>
        <StoryScene scene={node.scene} />

        {/* Anlatim metni balonu - ses gelmese de ne oldugu anlasilsin */}
        {node.narration ? (
          <View style={styles.caption}>
            <Text style={styles.captionText}>{node.narration}</Text>
          </View>
        ) : null}

        {/* Baslangic: ilk dokunusla sesi baslat (otomatik-oynatma engelini asar) */}
        {!started && (
          <View style={styles.startOverlay}>
            <Text style={styles.startEmoji}>❤️</Text>
            <Text style={styles.startTitle}>Küçük Kalpler</Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => { setStarted(true); speak(node.narration, { instructions: MOTHER_VOICE }); }}
              activeOpacity={0.85}
            >
              <Ionicons name="play" size={26} color="#E0359A" />
              <Text style={styles.startBtnText}>Hikayeyi Dinle</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.bottom}>
        {phase === 'choice' && node.options ? (
          <View style={styles.choices}>
            {node.options.map((opt) => (
              <TouchableOpacity key={opt.id} style={styles.choiceBtn} onPress={() => handleChoice(opt)} activeOpacity={0.85}>
                <Text style={styles.choiceEmoji}>{opt.emoji}</Text>
                <Text style={styles.choiceLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : started ? (
          <TouchableOpacity
            style={styles.replayBtn}
            onPress={() => speak(node.narration, { instructions: MOTHER_VOICE })}
            activeOpacity={0.85}
          >
            <Ionicons name="volume-high" size={22} color="#fff" />
            <Text style={styles.replayText}>Tekrar Dinle</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF3F8', alignItems: 'center' },
  exitBtn: {
    position: 'absolute', top: 44, left: 18, zIndex: 20,
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF6AA9',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4,
  },
  title: { marginTop: 48, marginBottom: 6 },
  titleText: { fontSize: 24, fontWeight: '900', color: '#E0359A', textShadowColor: 'rgba(255,255,255,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },
  sceneWrap: {
    width: '92%', maxWidth: 520, aspectRatio: 3 / 2, borderRadius: 28, overflow: 'hidden',
    backgroundColor: '#DAF3E7', marginTop: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  bottom: { flex: 1, width: '92%', maxWidth: 520, justifyContent: 'center', paddingVertical: 16 },
  choices: { flexDirection: 'row', gap: 16, justifyContent: 'center', flexWrap: 'wrap' },
  choiceBtn: {
    width: 200, minHeight: 150, backgroundColor: '#fff', borderRadius: 26, padding: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFD1E6',
    shadowColor: '#E0359A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 5,
  },
  choiceEmoji: { fontSize: 52, marginBottom: 8 },
  choiceLabel: { fontSize: 17, fontWeight: '800', color: '#7A2B6E', textAlign: 'center' },
  replayBtn: {
    flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#FF6AA9', paddingVertical: 14, paddingHorizontal: 26, borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 4,
  },
  replayText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  caption: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.92)', paddingVertical: 12, paddingHorizontal: 16 },
  captionText: { fontSize: 15, fontWeight: '700', color: '#5A3A66', textAlign: 'center', lineHeight: 21 },
  startOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(224,53,154,0.38)', alignItems: 'center', justifyContent: 'center' },
  startEmoji: { fontSize: 56 },
  startTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 16, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 26, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 1, elevation: 5 },
  startBtnText: { color: '#E0359A', fontSize: 18, fontWeight: '900' },
});
