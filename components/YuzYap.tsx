import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { speak } from '../services/speechService';

// ============================================
// 😀 YÜZ YAP - Parçalarla karakter oluşturma (Sanat / kolaj)
// Kafaya göz, burun, ağız, şapka... yerleştirerek komik bir yüz/karakter yap.
// Yaratıcı ifade + parça-bütün. Bir parça seç, kafaya dokunup yerleştir.
// ============================================

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const PARTS = ['👀', '👁️', '👃', '👄', '👅', '👂', '🎩', '🧢', '👑', '👓', '🕶️', '🎀', '👨‍🦰', '🧔', '⭐', '❤️'];
const SIZES = [34, 50, 70];
const HEADS = [
  { key: 'ten', color: '#FFD9B3', name: 'Ten' },
  { key: 'sari', color: '#FFE082', name: 'Sarı' },
  { key: 'yesil', color: '#A5D6A7', name: 'Uzaylı' },
  { key: 'mavi', color: '#90CAF9', name: 'Robot' },
];

interface Placed { id: number; emoji: string; x: number; y: number; size: number }

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; cizimResimBase64?: string; cizimResimFormat?: 'png' | 'jpeg'; zorlukSeviyesi?: number; kazanimOdagi?: string },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function YuzYap({ onGameEnd, onExit }: Props) {
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [active, setActive] = useState(PARTS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [head, setHead] = useState(HEADS[0]);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<View>(null);
  const idRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const activeRef = useRef(active); activeRef.current = active;
  const sizeRef = useRef(size); sizeRef.current = size;

  const place = (x: number, y: number) => {
    setPlaced((prev) => [...prev, { id: idRef.current++, emoji: activeRef.current, x, y, size: sizeRef.current }]);
    setSaved(false);
  };
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => place(e.nativeEvent.locationX, e.nativeEvent.locationY),
  }), []);

  const undoLast = () => { setPlaced((p) => p.slice(0, -1)); setSaved(false); };
  const clearAll = () => { setPlaced([]); setSaved(false); };

  const save = async () => {
    if (placed.length === 0) return;
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    let base64: string | undefined;
    try {
      if (canvasRef.current) {
        let data: string | undefined;
        if (Platform.OS === 'web') {
          const { toPng } = await import('html-to-image');
          data = await toPng(canvasRef.current as unknown as HTMLElement, { pixelRatio: 2, cacheBust: true, backgroundColor: '#EAF7FB' });
        } else {
          data = await captureRef(canvasRef, { format: 'png', quality: 0.9, result: 'base64' });
        }
        if (data) base64 = data.includes(',') ? data.split(',')[1] : data;
      }
    } catch (e) { console.warn('Resim olusturulamadi:', e); }
    speak('Ne komik bir yüz! Aferin.', { instructions: HAPPY_VOICE });
    onGameEnd('yuz-yap', duration, placed.length, 0, undefined, {
      cizimVerisi: JSON.stringify({ head: head.key, placed }),
      cizimResimBase64: base64,
      cizimResimFormat: 'png',
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Yaratıcı İfade ve Parça-Bütün (yüz/karakter oluşturma)',
    });
    setSaved(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F57C00" />
        </TouchableOpacity>
        <Text style={styles.title}>😀 Yüz Yap</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.smallBtn} onPress={undoLast} disabled={!placed.length} activeOpacity={0.8}>
            <Ionicons name="arrow-undo" size={20} color={placed.length ? '#FF9800' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={clearAll} disabled={!placed.length} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color={placed.length ? '#e53935' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, styles.saveBtn, saved && styles.savedBtn]} onPress={save} disabled={!placed.length} activeOpacity={0.8}>
            <Ionicons name={saved ? 'checkmark' : 'save'} size={20} color={saved ? '#fff' : placed.length ? '#43A047' : '#ccc'} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.hint}>Bir parça seç, kafaya dokunup yerleştir! 👆</Text>

      <View ref={canvasRef} style={styles.canvas} {...panResponder.panHandlers}>
        <View style={[styles.head, { backgroundColor: head.color }]} pointerEvents="none" />
        {placed.map((p) => (
          <Text key={p.id} style={{ position: 'absolute', left: p.x - p.size / 2, top: p.y - p.size / 2, fontSize: p.size }}>{p.emoji}</Text>
        ))}
      </View>

      {/* Parçalar */}
      <View style={styles.partRow}>
        {PARTS.map((pt) => (
          <TouchableOpacity key={pt} style={[styles.partBtn, active === pt && styles.partActive]} onPress={() => setActive(pt)} activeOpacity={0.8}>
            <Text style={styles.partEmoji}>{pt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Kafa rengi + boyut */}
      <View style={styles.toolsRow}>
        {HEADS.map((h) => (
          <TouchableOpacity key={h.key} style={[styles.headBtn, { backgroundColor: h.color }, head.key === h.key && styles.headActive]} onPress={() => setHead(h)} activeOpacity={0.85} />
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
  container: { flex: 1, backgroundColor: '#FFF3E0', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  title: { fontSize: 19, fontWeight: '900', color: '#F57C00' },
  headerActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  saveBtn: { borderWidth: 2, borderColor: '#43A047' },
  savedBtn: { backgroundColor: '#43A047', borderColor: '#2E7D32' },
  hint: { fontSize: 15, fontWeight: '700', color: '#EF6C00', marginVertical: 6 },
  canvas: { flex: 1, width: '94%', backgroundColor: '#EAF7FB', borderRadius: 20, borderWidth: 3, borderColor: '#FFCC80', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  head: { width: 220, height: 240, borderRadius: 120, borderWidth: 3, borderColor: 'rgba(0,0,0,0.12)' },

  partRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingTop: 10, paddingHorizontal: 10, maxWidth: 540 },
  partBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 1, elevation: 2 },
  partActive: { borderColor: '#FB8C00', transform: [{ scale: 1.1 }] },
  partEmoji: { fontSize: 26 },

  toolsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 12, flexWrap: 'wrap' },
  headBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: 'rgba(0,0,0,0.1)' },
  headActive: { borderColor: '#212121', transform: [{ scale: 1.12 }] },
  divider: { width: 2, height: 30, backgroundColor: '#B0BEC5', marginHorizontal: 6, borderRadius: 1 },
  sizeOpt: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#E0E0E0' },
  sizeOptActive: { borderColor: '#FB8C00', backgroundColor: '#FFF3E0' },
});
