import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { C, F, S } from './ownerTheme';

export type OwnerTab = 'genel' | 'buyume' | 'mufredat' | 'ekip' | 'yonetim';

const TABS: { key: OwnerTab; label: string }[] = [
  { key: 'genel', label: 'Genel Bakış' },
  { key: 'buyume', label: 'Büyüme & Maliyet' },
  { key: 'mufredat', label: 'Müfredat' },
  { key: 'ekip', label: 'Ekip' },
  { key: 'yonetim', label: 'Yönetim' },
];

interface Props {
  aktif: OwnerTab;
  onSec: (t: OwnerTab) => void;
}

export default function OwnerTabBar({ aktif, onSec }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.wrap} contentContainerStyle={st.row}>
      {TABS.map((t) => (
        <TouchableOpacity key={t.key} style={[st.tab, aktif === t.key && st.tabActive]} onPress={() => onSec(t.key)}>
          <Text style={[st.tabText, aktif === t.key && st.tabTextActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  // Sabit yükseklik ŞART: react-native-web'in ScrollView'i, ata zincirinde gerçek
  // yükseklik (bkz. OwnerDashboard.tsx'teki 100vh düzeltmesi) olduğunda, dahili
  // kaydırma div'ine kendiliğinden flexGrow:1 uyguluyor -- flex'e bırakılırsa bu
  // yatay sekme çubuğu dikeyde de büyüyüp asıl içerik alanının yerini çalıyordu.
  wrap: { height: 48, flexGrow: 0, flexShrink: 0, backgroundColor: C.panel, borderBottomWidth: 1, borderBottomColor: C.line },
  row: { flexGrow: 1, alignItems: 'center', paddingHorizontal: S.md, gap: S.md },
  tab: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.accent },
  tabText: { fontSize: F.small, fontWeight: '600', color: C.inkMid },
  tabTextActive: { color: C.accent },
});
