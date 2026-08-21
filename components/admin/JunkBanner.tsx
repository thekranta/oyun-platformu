import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C, F, S, R } from './theme';

interface Props {
  sayi: number;
  gorunur: boolean;
  onIncele: () => void;
  onKapat: () => void;
}

/** D3 — toplu ÖNERİ + tek tek onay. Hiçbir kayıt otomatik/toplu silinmez/gizlenmez. */
export default function JunkBanner({ sayi, gorunur, onIncele, onKapat }: Props) {
  if (!gorunur || sayi === 0) return null;
  return (
    <View style={st.wrap}>
      <Text style={st.text}>⚠ {sayi} kayıt şüpheli (e-postası yok veya adı tekrar eden karakter)</Text>
      <TouchableOpacity onPress={onIncele}><Text style={st.link}>İncele</Text></TouchableOpacity>
      <TouchableOpacity onPress={onKapat}><Text style={st.close}>✕</Text></TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { margin: S.md, marginBottom: 0, padding: 10, backgroundColor: C.danismaBg, borderWidth: 1, borderColor: C.danisma, borderRadius: R.card, flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1, fontSize: F.meta, color: C.danisma, fontWeight: '600' },
  link: { fontSize: F.meta, color: C.danisma, fontWeight: '700', textDecorationLine: 'underline' },
  close: { fontSize: F.small, color: C.danisma, paddingHorizontal: 4 },
});
