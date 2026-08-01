import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 🔢 SAYI-BOYA - Numaraya göre boyama (Sanat + sayı-renk eşleme)
// Her karede bir numara var; o numaranın rengini seçip kareye dokun.
// Doğru renkle boyayınca piksel resim ortaya çıkar. Renk-sayı ilişkisi + boyama.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

const NUM_COLORS: Record<number, string> = { 1: '#FF5A5A', 2: '#4FA3FF', 3: '#FFCE3A', 4: '#57D971', 5: '#B77BFF' };

// 0 = boş; diğer rakamlar boyanacak kareler (o rengin numarası)
const TEMPLATES: { key: string; name: string; emoji: string; grid: string[] }[] = [
  { key: 'kalp', name: 'Kalp', emoji: '❤️', grid: ['0110110', '1111111', '1111111', '1111111', '0111110', '0011100', '0001000'] },
  { key: 'agac', name: 'Ağaç', emoji: '🌳', grid: ['0044400', '0444440', '4444444', '4444444', '0044400', '0003000', '0003000'] },
  { key: 'cicek', name: 'Çiçek', emoji: '🌸', grid: ['0033300', '0331330', '0333330', '0033300', '0004000', '0044400', '0004000'] },
  { key: 'yildiz', name: 'Yıldız', emoji: '⭐', grid: ['0003000', '0003000', '3333333', '0333330', '0033300', '0333330', '0300030'] },
];

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function SayiBoya({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [tplIdx, setTplIdx] = useState(0);
  const [filled, setFilled] = useState<Record<string, boolean>>({});
  const [activeNum, setActiveNum] = useState(1);
  const [wrongCell, setWrongCell] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [startTime] = useState(Date.now());
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const finishedRef = useRef(false);
  const doneRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shake = useRef(new Animated.Value(0)).current;

  const tpl = TEMPLATES[tplIdx];
  const cols = tpl.grid[0].length;
  const cell = Math.min(40, (SCREEN_W - 80) / cols);

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  // Bu şablonda kullanılan numaralar (palet için)
  const usedNums = Array.from(new Set(tpl.grid.join('').split('').map(Number).filter((n) => n > 0))).sort();

  const totalToPaint = tpl.grid.join('').split('').filter((c) => c !== '0').length;
  const paintedCount = Object.keys(filled).length;

  const changeTemplate = (i: number) => {
    setTplIdx(i); setFilled({}); setWrongCell(null); doneRef.current = false; setActiveNum(1);
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onGameEnd('sayi-boya', duration, movesRef.current, errorsRef.current, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat/Matematik: Sayı-Renk Eşleme ile Boyama (paint-by-number)',
      correct_answers: paintedCount,
    });
  };

  const tapCell = (r: number, c: number, num: number) => {
    if (num === 0 || doneRef.current) return;
    const key = `${r}-${c}`;
    if (filled[key]) return;
    movesRef.current += 1;
    if (activeNum === num) {
      const nf = { ...filled, [key]: true };
      setFilled(nf);
      if (Object.keys(nf).length >= totalToPaint) {
        doneRef.current = true;
        setShowConfetti(true);
        speak(`Bak, bir ${tpl.name.toLowerCase()} oldu! Aferin.`, { instructions: HAPPY_VOICE });
      }
    } else {
      errorsRef.current += 1;
      setWrongCell(key);
      Animated.sequence([
        Animated.timing(shake, { toValue: 5, duration: 50, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: -5, duration: 50, useNativeDriver: USE_NATIVE }),
        Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: USE_NATIVE }),
      ]).start();
      const t = setTimeout(() => setWrongCell(null), 400);
      timersRef.current.push(t);
    }
  };

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiCannon count={120} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
      {!gameReady && (
        <CountdownOverlay
          message="Her karede bir sayı var! O sayının rengini seç ve kareye dokun, boya."
          childName={childName}
          countdownSeconds={5}
          onComplete={() => setGameReady(true)}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#6A1B9A" />
        </TouchableOpacity>
        <Text style={styles.title}>🔢 Sayı-Boya</Text>
        <TouchableOpacity style={[styles.smallBtn, doneRef.current && styles.saveBtn]} onPress={finish} disabled={!doneRef.current} activeOpacity={0.8}>
          <Ionicons name="checkmark" size={20} color={doneRef.current ? '#43A047' : '#ccc'} />
        </TouchableOpacity>
      </View>

      {/* Resim seçici */}
      <View style={styles.picRow}>
        {TEMPLATES.map((t, i) => (
          <TouchableOpacity key={t.key} style={[styles.picBtn, tplIdx === i && styles.picActive]} onPress={() => changeTemplate(i)} activeOpacity={0.85}>
            <Text style={styles.picEmoji}>{t.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grid */}
      <Animated.View style={[styles.grid, { transform: [{ translateX: shake }] }]}>
        {tpl.grid.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {row.split('').map((ch, c) => {
              const num = Number(ch);
              const key = `${r}-${c}`;
              const isFilled = filled[key];
              const isWrong = wrongCell === key;
              if (num === 0) return <View key={c} style={{ width: cell, height: cell }} />;
              return (
                <TouchableOpacity
                  key={c}
                  style={[{ width: cell, height: cell }, styles.cell, isFilled ? { backgroundColor: NUM_COLORS[num] } : styles.cellEmpty, isWrong && styles.cellWrong]}
                  onPress={() => tapCell(r, c, num)}
                  activeOpacity={0.7}
                >
                  {!isFilled && <Text style={styles.cellNum}>{num}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* Numaralı renk paleti */}
      <View style={styles.palette}>
        {usedNums.map((n) => (
          <TouchableOpacity key={n} style={[styles.crayon, { backgroundColor: NUM_COLORS[n] }, activeNum === n && styles.crayonActive]} onPress={() => setActiveNum(n)} activeOpacity={0.85}>
            <Text style={styles.crayonNum}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF6FF', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  title: { fontSize: 19, fontWeight: '900', color: '#6A1B9A' },
  smallBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#eee' },
  saveBtn: { borderColor: '#43A047' },

  picRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  picBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent', elevation: 2 },
  picActive: { borderColor: '#8E24AA', transform: [{ scale: 1.08 }] },
  picEmoji: { fontSize: 26 },

  grid: { backgroundColor: '#fff', padding: 8, borderRadius: 16, marginTop: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 1, elevation: 5 },
  cell: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ECEFF1', margin: 1, borderRadius: 4 },
  cellEmpty: { backgroundColor: '#FAFAFA' },
  cellWrong: { borderColor: '#E53935', borderWidth: 2 },
  cellNum: { fontSize: 13, fontWeight: '800', color: '#90A4AE' },

  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingVertical: 16 },
  crayon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(0,0,0,0.12)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 3 },
  crayonActive: { borderColor: '#212121', transform: [{ scale: 1.15 }] },
  crayonNum: { fontSize: 22, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
});
