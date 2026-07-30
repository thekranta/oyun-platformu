import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { speak } from '../services/speechService';

// ============================================
// 🎨 BOYAMA - Serbest yaratıcı boyama (Sanat)
// Renk seç, kareleri boya, kendi desenini/resmini yap. Doğru-yanlış yok;
// yaratıcı ifade ve ince motor. Görsel + serbest oyun.
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const COLS = 6;
const ROWS = 5;
const EMPTY = '#F3F4F6';

const PALETTE = ['#FF5A5A', '#FF9F45', '#FFCE3A', '#57D971', '#4FA3FF', '#B77BFF', '#8D6E63', '#212121'];

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function Boyama({ onGameEnd, onExit }: Props) {
  const [cells, setCells] = useState<string[]>(Array(COLS * ROWS).fill(EMPTY));
  const [active, setActive] = useState(PALETTE[0]);
  const [erase, setErase] = useState(false);
  const [startTime] = useState(Date.now());
  const finishedRef = useRef(false);

  const paint = (i: number) => {
    setCells((prev) => {
      const next = [...prev];
      next[i] = erase ? EMPTY : active;
      return next;
    });
  };

  const clearAll = () => setCells(Array(COLS * ROWS).fill(EMPTY));

  const done = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const filled = cells.filter((c) => c !== EMPTY).length;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    speak('Ne güzel boyadın! Aferin.', { instructions: HAPPY_VOICE });
    onGameEnd('boyama', duration, filled, 0, undefined, {
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Yaratıcı İfade ve İnce Motor Beceri (serbest boyama)',
      correct_answers: filled,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#6A1B9A" />
        </TouchableOpacity>
        <Text style={styles.title}>🎨 Boyama</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={done} activeOpacity={0.85}>
          <Ionicons name="checkmark" size={18} color="#fff" />
          <Text style={styles.doneText}>Bitti</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Bir renk seç, kareleri boya!</Text>

      <View style={styles.grid}>
        {cells.map((c, i) => (
          <TouchableOpacity key={i} style={[styles.cell, { backgroundColor: c }]} onPress={() => paint(i)} activeOpacity={0.7} />
        ))}
      </View>

      <View style={styles.palette}>
        {PALETTE.map((col) => (
          <TouchableOpacity
            key={col}
            style={[styles.swatch, { backgroundColor: col }, active === col && !erase && styles.swatchActive]}
            onPress={() => { setActive(col); setErase(false); }}
            activeOpacity={0.85}
          />
        ))}
        <TouchableOpacity style={[styles.swatch, styles.eraser, erase && styles.swatchActive]} onPress={() => setErase(true)} activeOpacity={0.85}>
          <Ionicons name="backspace-outline" size={22} color="#607D8B" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.swatch, styles.clear]} onPress={clearAll} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={20} color="#B71C1C" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CELL = Math.min(52, (SCREEN_W - 60) / COLS);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF6FF', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  title: { fontSize: 20, fontWeight: '900', color: '#6A1B9A' },
  doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#57D971', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 16 },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  hint: { fontSize: 16, fontWeight: '700', color: '#8E24AA', marginTop: 6, marginBottom: 14 },
  grid: { width: CELL * COLS + (COLS - 1) * 6, flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  cell: { width: CELL, height: CELL, borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0' },

  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 26, maxWidth: 420, paddingHorizontal: 12 },
  swatch: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  swatchActive: { borderColor: '#212121', transform: [{ scale: 1.12 }] },
  eraser: { backgroundColor: '#ECEFF1' },
  clear: { backgroundColor: '#FFEBEE' },
});
