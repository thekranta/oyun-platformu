import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak, speakThenWait } from '../services/speechService';

// ============================================
// 🖼️ RESİMDE NE TERS? - Görsel materyalleri çözümleme (Türkçe / TAOB.3)
// Basit bir emoji sahnesi gösterilir; TEK öge gerçekte olamaz (bağlama aykırı).
// Çocuk mantıksız/olamayacak ögeye dokunur. Cevap görsel benzerlikle değil,
// GERÇEK DÜNYA MANTIĞIYLA bulunur (görsel okuryazarlık: anlam-bağlam çıkarımı).
// Çeldiriciler sahneye UYGUN olduğu için "aynısını bul" kısayolu imkânsızdır.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 8;

interface SceneItem { emoji: string; wrong?: boolean }
interface Scene { setting: string; icon: string; items: SceneItem[]; explanation: string }

// Her sahne: 3 sahneye UYGUN (mantıklı) öge + 1 gerçekte olamayacak öge.
// "wrong" öge farklı görünmez; yalnız gerçek-dünya mantığıyla ayırt edilir.
const SCENES: Scene[] = [
  {
    setting: 'Gökyüzü', icon: '🌤️',
    items: [{ emoji: '☀️' }, { emoji: '☁️' }, { emoji: '🐦' }, { emoji: '🐟', wrong: true }],
    explanation: 'Aferin! Balık gökyüzünde uçamaz. Balık suda yaşar.',
  },
  {
    setting: 'Gece', icon: '🌌',
    items: [{ emoji: '🌙' }, { emoji: '⭐' }, { emoji: '🦉' }, { emoji: '☀️', wrong: true }],
    explanation: 'Aferin! Güneş gece parlamaz. Güneş gündüz doğar.',
  },
  {
    setting: 'Deniz Altı', icon: '🌊',
    items: [{ emoji: '🐠' }, { emoji: '🐙' }, { emoji: '🦀' }, { emoji: '🐱', wrong: true }],
    explanation: 'Aferin! Kedi suyun altında yaşayamaz. Kedi karada yaşar.',
  },
  {
    setting: 'Meyve Ağacı', icon: '🌳',
    items: [{ emoji: '🍎' }, { emoji: '🍐' }, { emoji: '🍒' }, { emoji: '🍕', wrong: true }],
    explanation: 'Aferin! Pizza ağaçta yetişmez. Pizzayı mutfakta yaparız.',
  },
  {
    setting: 'Kahvaltı', icon: '🍽️',
    items: [{ emoji: '🍞' }, { emoji: '🧀' }, { emoji: '🥛' }, { emoji: '👟', wrong: true }],
    explanation: 'Aferin! Ayakkabı yenmez. Ayakkabıyı ayağımıza giyeriz.',
  },
  {
    setting: 'Sıcak Plaj', icon: '🏝️',
    items: [{ emoji: '🏖️' }, { emoji: '☀️' }, { emoji: '🌴' }, { emoji: '⛄', wrong: true }],
    explanation: 'Aferin! Kardan adam sıcakta erir. Kar sadece kışın olur.',
  },
  {
    setting: 'Yol', icon: '🛣️',
    items: [{ emoji: '🚗' }, { emoji: '🚌' }, { emoji: '🚦' }, { emoji: '🐳', wrong: true }],
    explanation: 'Aferin! Balina yolda yürüyemez. Balina denizde yüzer.',
  },
  {
    setting: 'Çiftlik', icon: '🚜',
    items: [{ emoji: '🐄' }, { emoji: '🐑' }, { emoji: '🐔' }, { emoji: '🦁', wrong: true }],
    explanation: 'Aferin! Aslan çiftlikte yaşamaz. Aslan ormanda yaşar.',
  },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

interface Cell { id: number; emoji: string; wrong: boolean }

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function ResimdeNeTers({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [round, setRound] = useState(1);
  const [order] = useState<Scene[]>(() => shuffle(SCENES));
  const [cells, setCells] = useState<Cell[]>([]);
  const [locked, setLocked] = useState(false);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [correctId, setCorrectId] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const correctRef = useRef(0);
  const finishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const scene = order[Math.min(round - 1, order.length - 1)];

  useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!gameReady) return;
    const cur = order[Math.min(round - 1, order.length - 1)];
    const arr: Cell[] = cur.items.map((it, i) => ({ id: i, emoji: it.emoji, wrong: !!it.wrong }));
    setCells(shuffle(arr).map((c, i) => ({ ...c, id: i })));
    setLocked(false);
    setWrongId(null);
    setCorrectId(null);
    bounce.setValue(0.9);
    Animated.spring(bounce, { toValue: 1, friction: 5, useNativeDriver: USE_NATIVE }).start();
    speak('Bu resimde ne ters? Olmaması gerekene dokun!', { instructions: HAPPY_VOICE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, gameReady]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('resimde-ne-ters', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Türkçe: Görsel Materyalleri Çözümleme — Görsel Okuryazarlık (TAOB.3)',
      correct_answers: correctRef.current,
    });
  };

  const handleTap = (cell: Cell) => {
    if (locked) return;
    movesRef.current += 1;
    if (cell.wrong) {
      setLocked(true);
      setCorrectId(cell.id);
      correctRef.current += 1;
      setShowConfetti(true);
      speakThenWait(scene.explanation, 1600, { instructions: HAPPY_VOICE }).then(() => {
        if (!isMountedRef.current) return;
        setShowConfetti(false);
        if (round < TOTAL_ROUNDS) setRound((r) => r + 1);
        else finish();
      });
    } else {
      errorsRef.current += 1;
      setWrongId(cell.id);
      Animated.sequence([
        Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => { if (isMountedRef.current) setWrongId(null); }, 450);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Bu resimde bir şey ters! Gerçekte olamayacak şeye dokun."
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
        <View style={styles.roundBadge}><Text style={styles.roundText}>🖼️ {round}/{TOTAL_ROUNDS}</Text></View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.prompt}>Bu resimde ne ters?</Text>
      <View style={styles.sceneCaption}>
        <Text style={styles.sceneCaptionText}>{scene.icon} {scene.setting}</Text>
      </View>

      <TouchableOpacity style={styles.listenBtn} onPress={() => speak('Bu resimde ne ters? Olmaması gerekene dokun!', { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
        <Ionicons name="volume-high" size={20} color="#fff" />
        <Text style={styles.listenText}>Tekrar Dinle</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.scene, { transform: [{ scale: bounce }] }]}>
        {cells.map((cell) => {
          const isWrong = wrongId === cell.id;
          const isCorrect = correctId === cell.id;
          return (
            <Animated.View key={cell.id} style={isWrong ? { transform: [{ translateX: shake }] } : undefined}>
              <TouchableOpacity
                style={[styles.cell, isWrong && styles.cellWrong, isCorrect && styles.cellCorrect]}
                onPress={() => handleTap(cell)}
                activeOpacity={0.85}
              >
                <Text style={styles.cellEmoji}>{cell.emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6EEFC', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roundText: { fontSize: 15, fontWeight: '900', color: '#6A1B9A' },

  prompt: { fontSize: 22, fontWeight: '900', color: '#6A1B9A', marginTop: 10, marginBottom: 6 },
  sceneCaption: { backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  sceneCaptionText: { fontSize: 16, fontWeight: '800', color: '#8E24AA' },

  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8E24AA', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  scene: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 18, maxWidth: 300, padding: 16, backgroundColor: '#fff', borderRadius: 28, borderWidth: 5, borderColor: '#CE93D8', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  cell: { width: 116, height: 116, borderRadius: 22, backgroundColor: '#F3E5F5', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 2 },
  cellWrong: { backgroundColor: '#FFCDD2' },
  cellCorrect: { backgroundColor: '#C8E6C9', borderWidth: 3, borderColor: '#43A047' },
  cellEmoji: { fontSize: 62 },
});
