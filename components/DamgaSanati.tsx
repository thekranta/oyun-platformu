import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { speak } from '../services/speechService';

// ============================================
// ✨ DAMGA SANATI - Çıkartma/damga ile serbest kompozisyon (Sanat)
// Bir damga seç, tuvale dokunarak bas; sahneni süsle. Yaratıcı ifade +
// kompozisyon. Doğru-yanlış yok (serbest oyun).
// ============================================

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const STAMPS = ['🌸', '⭐', '❤️', '🦋', '🐞', '🌈', '🍄', '🐝', '🌟', '🎈', '🍀', '☀️', '🐠', '🌺', '🐢'];
const BGS = [
  { key: 'gok', color: '#BBDEFB', name: 'Gökyüzü' },
  { key: 'cayir', color: '#C8E6C9', name: 'Çayır' },
  { key: 'gece', color: '#3949AB', name: 'Gece' },
  { key: 'deniz', color: '#B2EBF2', name: 'Deniz' },
];
const SIZES = [34, 52, 72];

interface Stamp { id: number; emoji: string; x: number; y: number; size: number }

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; cizimResimBase64?: string; cizimResimFormat?: 'png' | 'jpeg'; zorlukSeviyesi?: number; kazanimOdagi?: string },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function DamgaSanati({ onGameEnd, onExit }: Props) {
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [active, setActive] = useState(STAMPS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [bg, setBg] = useState(BGS[0]);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<View>(null);
  const idRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const activeRef = useRef(active); activeRef.current = active;
  const sizeRef = useRef(size); sizeRef.current = size;

  const place = (x: number, y: number) => {
    setStamps((prev) => [...prev, { id: idRef.current++, emoji: activeRef.current, x, y, size: sizeRef.current }]);
    setSaved(false);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => place(e.nativeEvent.locationX, e.nativeEvent.locationY),
  }), []);

  const undoLast = () => { setStamps((p) => p.slice(0, -1)); setSaved(false); };
  const clearAll = () => { setStamps([]); setSaved(false); };

  const save = async () => {
    if (stamps.length === 0) return;
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    let base64: string | undefined;
    try {
      if (canvasRef.current) {
        let data: string | undefined;
        if (Platform.OS === 'web') {
          const { toPng } = await import('html-to-image');
          data = await toPng(canvasRef.current as unknown as HTMLElement, { pixelRatio: 2, cacheBust: true, backgroundColor: bg.color });
        } else {
          data = await captureRef(canvasRef, { format: 'png', quality: 0.9, result: 'base64' });
        }
        if (data) base64 = data.includes(',') ? data.split(',')[1] : data;
      }
    } catch (e) { console.warn('Resim olusturulamadi:', e); }
    speak('Ne güzel süsledin! Aferin.', { instructions: HAPPY_VOICE });
    onGameEnd('damga-sanati', duration, stamps.length, 0, undefined, {
      cizimVerisi: JSON.stringify({ bg: bg.key, stamps }),
      cizimResimBase64: base64,
      cizimResimFormat: 'png',
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Yaratıcı İfade ve Kompozisyon (damga/çıkartma sanatı)',
    });
    setSaved(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#00838F" />
        </TouchableOpacity>
        <Text style={styles.title}>✨ Damga Sanatı</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.smallBtn} onPress={undoLast} disabled={!stamps.length} activeOpacity={0.8}>
            <Ionicons name="arrow-undo" size={20} color={stamps.length ? '#FF9800' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={clearAll} disabled={!stamps.length} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color={stamps.length ? '#e53935' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, styles.saveBtn, saved && styles.savedBtn]} onPress={save} disabled={!stamps.length} activeOpacity={0.8}>
            <Ionicons name={saved ? 'checkmark' : 'save'} size={20} color={saved ? '#fff' : stamps.length ? '#43A047' : '#ccc'} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.hint}>Bir damga seç, tuvale dokunup bas! 👆</Text>

      <View ref={canvasRef} style={[styles.canvas, { backgroundColor: bg.color }]} {...panResponder.panHandlers}>
        {stamps.map((s) => (
          <Text key={s.id} style={{ position: 'absolute', left: s.x - s.size / 2, top: s.y - s.size / 2, fontSize: s.size }}>{s.emoji}</Text>
        ))}
      </View>

      {/* Damgalar */}
      <View style={styles.stampRow}>
        {STAMPS.map((st) => (
          <TouchableOpacity key={st} style={[styles.stampBtn, active === st && styles.stampActive]} onPress={() => setActive(st)} activeOpacity={0.8}>
            <Text style={styles.stampEmoji}>{st}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Arka plan + boyut */}
      <View style={styles.toolsRow}>
        {BGS.map((b) => (
          <TouchableOpacity key={b.key} style={[styles.bgBtn, { backgroundColor: b.color }, bg.key === b.key && styles.bgActive]} onPress={() => setBg(b)} activeOpacity={0.85} />
        ))}
        <View style={styles.divider} />
        {SIZES.map((s, idx) => (
          <TouchableOpacity key={s} style={[styles.sizeOpt, size === s && styles.sizeOptActive]} onPress={() => setSize(s)} activeOpacity={0.85}>
            <Text style={{ fontSize: 14 + idx * 6 }}>{active}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  title: { fontSize: 19, fontWeight: '900', color: '#00838F' },
  headerActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  saveBtn: { borderWidth: 2, borderColor: '#43A047' },
  savedBtn: { backgroundColor: '#43A047', borderColor: '#2E7D32' },
  hint: { fontSize: 15, fontWeight: '700', color: '#0097A7', marginVertical: 6 },
  canvas: { flex: 1, width: '94%', borderRadius: 20, borderWidth: 3, borderColor: '#B2EBF2', overflow: 'hidden' },

  stampRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingTop: 10, paddingHorizontal: 10, maxWidth: 540 },
  stampBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 1, elevation: 2 },
  stampActive: { borderColor: '#00ACC1', transform: [{ scale: 1.1 }] },
  stampEmoji: { fontSize: 26 },

  toolsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 12, flexWrap: 'wrap' },
  bgBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'rgba(0,0,0,0.1)' },
  bgActive: { borderColor: '#212121', transform: [{ scale: 1.12 }] },
  divider: { width: 2, height: 30, backgroundColor: '#B0BEC5', marginHorizontal: 6, borderRadius: 1 },
  sizeOpt: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#E0E0E0' },
  sizeOptActive: { borderColor: '#00ACC1', backgroundColor: '#E0F7FA' },
});
