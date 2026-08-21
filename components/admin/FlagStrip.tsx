import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bayrak } from '../../lib/admin/flags';
import { C, F, S } from './theme';

interface Props {
  bayraklar: Bayrak[];
  onBayrakPress?: (hedefBolum?: string) => void;
}

export default function FlagStrip({ bayraklar, onBayrakPress }: Props) {
  const temiz = bayraklar.length === 0;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[st.wrap, { backgroundColor: temiz ? C.onayBg : C.bayrakBg }]}
      contentContainerStyle={st.inner}
    >
      {temiz ? (
        <View style={[st.chip, { borderColor: C.onay }]}>
          <Text style={{ color: C.onay, fontSize: F.small - 1.5, fontWeight: '600' }}>✅ Kontrollerin tamamı geçti</Text>
        </View>
      ) : (
        bayraklar.map((b) => {
          const renk = b.seviye === 'hata' ? C.bayrak : C.danisma;
          return (
            <TouchableOpacity
              key={b.id}
              style={[st.chip, { borderColor: renk }]}
              onPress={() => onBayrakPress?.(b.hedefBolum)}
            >
              <Text style={{ color: renk, fontSize: F.small - 1.5, fontWeight: '600' }}>{b.metin}</Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { height: 40, borderBottomWidth: 1, borderBottomColor: C.line },
  inner: { alignItems: 'center', paddingHorizontal: S.lg, gap: S.sm },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, backgroundColor: '#fff' },
});
