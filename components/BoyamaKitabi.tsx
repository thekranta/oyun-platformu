import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Ellipse, Polygon, Rect } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 🎨 BOYAMA KİTABI - Bölge boyama (Sanat)
// Bir renk seç, resmin bölümlerine dokunarak boya (klasik boyama kitabı).
// Yaratıcı ifade + renk seçimi. Serbest oyun (doğru-yanlış yok).
// ============================================

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const EMPTY = '#F4F4F5';
const OUTLINE = '#607D8B';
const COLORS = ['#ef476f', '#f78c6b', '#ffd166', '#06d6a0', '#118ab2', '#5f4b8b', '#8B4513', '#000000', '#ffffff'];

type Fills = Record<string, string>;

// Her resim: bölgeleri (fill state'ten okur, dokununca boyanir)
const PICTURES: { key: string; name: string; emoji: string; render: (f: Fills, paint: (id: string) => void) => React.ReactNode }[] = [
  {
    key: 'ev', name: 'Ev', emoji: '🏠',
    render: (f, paint) => (
      <>
        <Rect x={0} y={0} width={300} height={210} fill={f.sky || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('sky')} />
        <Rect x={0} y={210} width={300} height={90} fill={f.grass || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('grass')} />
        <Circle cx={250} cy={55} r={30} fill={f.sun || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('sun')} />
        <Rect x={80} y={150} width={140} height={110} fill={f.wall || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('wall')} />
        <Polygon points="70,150 150,90 230,150" fill={f.roof || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('roof')} />
        <Rect x={130} y={200} width={40} height={60} fill={f.door || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('door')} />
        <Rect x={95} y={165} width={30} height={30} fill={f.window || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('window')} />
      </>
    ),
  },
  {
    key: 'balik', name: 'Balık', emoji: '🐟',
    render: (f, paint) => (
      <>
        <Rect x={0} y={0} width={300} height={300} fill={f.water || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('water')} />
        <Ellipse cx={150} cy={160} rx={90} ry={55} fill={f.body || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('body')} />
        <Polygon points="230,160 285,115 285,205" fill={f.tail || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('tail')} />
        <Circle cx={110} cy={145} r={12} fill={f.eye || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('eye')} />
        <Circle cx={70} cy={70} r={16} fill={f.bubble || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('bubble')} />
      </>
    ),
  },
  {
    key: 'cicek', name: 'Çiçek', emoji: '🌸',
    render: (f, paint) => (
      <>
        <Rect x={0} y={0} width={300} height={300} fill={f.sky || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('sky')} />
        {[[150, 70], [192, 100], [176, 148], [124, 148], [108, 100]].map(([cx, cy], i) => (
          <Circle key={i} cx={cx} cy={cy} r={30} fill={f.petals || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('petals')} />
        ))}
        <Circle cx={150} cy={110} r={26} fill={f.center || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('center')} />
        <Rect x={143} y={150} width={14} height={110} fill={f.stem || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('stem')} />
        <Ellipse cx={185} cy={210} rx={30} ry={15} fill={f.leaf || EMPTY} stroke={OUTLINE} strokeWidth={2} onPress={() => paint('leaf')} />
      </>
    ),
  },
];

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; cizimResimBase64?: string; cizimResimFormat?: 'png' | 'jpeg'; zorlukSeviyesi?: number; kazanimOdagi?: string },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function BoyamaKitabi({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [picIdx, setPicIdx] = useState(0);
  const [fills, setFills] = useState<Fills>({});
  const [color, setColor] = useState(COLORS[0]);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<View>(null);
  const startTimeRef = useRef(Date.now());

  const paint = (id: string) => { setFills((prev) => ({ ...prev, [id]: color })); setSaved(false); };
  const clearAll = () => { setFills({}); setSaved(false); };
  const changePicture = (i: number) => { setPicIdx(i); setFills({}); setSaved(false); startTimeRef.current = Date.now(); };

  const save = async () => {
    const painted = Object.keys(fills).length;
    if (painted === 0) return;
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    let base64: string | undefined;
    try {
      if (canvasRef.current) {
        let data: string | undefined;
        if (Platform.OS === 'web') {
          const { toPng } = await import('html-to-image');
          data = await toPng(canvasRef.current as unknown as HTMLElement, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
        } else {
          data = await captureRef(canvasRef, { format: 'png', quality: 0.9, result: 'base64' });
        }
        if (data) base64 = data.includes(',') ? data.split(',')[1] : data;
      }
    } catch (e) { console.warn('Resim olusturulamadi:', e); }
    speak('Çok güzel boyadın! Aferin.', { instructions: HAPPY_VOICE });
    onGameEnd('boyama-kitabi', duration, painted, 0, undefined, {
      cizimVerisi: JSON.stringify({ resim: PICTURES[picIdx].key, fills }),
      cizimResimBase64: base64,
      cizimResimFormat: 'png',
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Yaratıcı İfade ve Renk Seçimi (bölge boyama)',
    });
    setSaved(true);
  };

  const painted = Object.keys(fills).length;
  const pic = PICTURES[picIdx];

  return (
    <View style={styles.container}>
      {!gameReady && (
        <CountdownOverlay
          message="Bir renk seç, resmin bölümlerine dokunarak boya!"
          childName={childName}
          countdownSeconds={5}
          interaction="tap"
          onComplete={() => { startTimeRef.current = Date.now(); setGameReady(true); }}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#6A1B9A" />
        </TouchableOpacity>
        <Text style={styles.title}>🎨 Boyama Kitabı</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.smallBtn} onPress={clearAll} disabled={!painted} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color={painted ? '#e53935' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, styles.saveBtn, saved && styles.savedBtn]} onPress={save} disabled={!painted} activeOpacity={0.8}>
            <Ionicons name={saved ? 'checkmark' : 'save'} size={20} color={saved ? '#fff' : painted ? '#43A047' : '#ccc'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Resim seçici */}
      <View style={styles.picRow}>
        {PICTURES.map((p, i) => (
          <TouchableOpacity key={p.key} style={[styles.picBtn, picIdx === i && styles.picActive]} onPress={() => changePicture(i)} activeOpacity={0.85}>
            <Text style={styles.picEmoji}>{p.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View ref={canvasRef} style={styles.canvas}>
        <Svg width="100%" height="100%" viewBox="0 0 300 300">
          {pic.render(fills, paint)}
        </Svg>
      </View>

      <View style={styles.palette}>
        {COLORS.map((c) => (
          <TouchableOpacity key={c} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]} onPress={() => setColor(c)} activeOpacity={0.85}>
            {color === c && <Ionicons name="checkmark" size={20} color={c === '#ffffff' ? '#333' : '#fff'} />}
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
  headerActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  saveBtn: { borderWidth: 2, borderColor: '#43A047' },
  savedBtn: { backgroundColor: '#43A047', borderColor: '#2E7D32' },

  picRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  picBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent', elevation: 2 },
  picActive: { borderColor: '#8E24AA', transform: [{ scale: 1.08 }] },
  picEmoji: { fontSize: 28 },

  canvas: { width: '90%', aspectRatio: 1, maxHeight: '58%', backgroundColor: '#fff', borderRadius: 20, borderWidth: 3, borderColor: '#E1BEE7', overflow: 'hidden', alignSelf: 'center' },

  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 12, maxWidth: 540 },
  swatch: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(0,0,0,0.12)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 3 },
  swatchActive: { borderColor: '#212121', transform: [{ scale: 1.12 }] },
});
