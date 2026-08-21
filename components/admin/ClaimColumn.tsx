import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AyrisikAnaliz, boldParcala } from '../../lib/admin/parseAnalysis';
import { Bayrak } from '../../lib/admin/flags';
import { C, F, S, R, codeColor } from './theme';

interface Props {
  analiz: AyrisikAnaliz | null;
  bayraklar: Bayrak[];
  maarifKod: string;
  onFlagSection: (baslik: string) => void;
  vurgulananBolum?: string | null;
  scrollRef?: React.RefObject<ScrollView>;
  bolumRefs?: React.MutableRefObject<Record<string, number>>;
}

function ZenginMetin({ text }: { text: string }) {
  return (
    <Text style={st.p}>
      {boldParcala(text).map((p, i) => (
        <Text key={i} style={p.bold ? { fontWeight: '700' } : undefined}>{p.text}</Text>
      ))}
    </Text>
  );
}

export default function ClaimColumn({ analiz, bayraklar, maarifKod, onFlagSection, vurgulananBolum, scrollRef, bolumRefs }: Props) {
  if (!analiz) {
    return (
      <ScrollView style={st.col} contentContainerStyle={{ padding: S.xl }}>
        <Text style={st.colHead}>İDDİA</Text>
        <Text style={st.muted}>Bu kayıt için henüz AI analizi üretilmemiş.</Text>
      </ScrollView>
    );
  }

  const bayrakliBasliklar = new Set(bayraklar.map((b) => b.hedefBolum).filter(Boolean) as string[]);

  if (!analiz.bicimTam) {
    return (
      <ScrollView style={st.col} contentContainerStyle={{ padding: S.xl }}>
        <Text style={st.colHead}>İDDİA</Text>
        <View style={[st.section, { borderLeftColor: C.bayrak, backgroundColor: C.bayrakBg, padding: 14, borderRadius: R.card }]}>
          <Text style={[st.sh, { color: C.bayrak }]}>🚩 Biçim ihlali — ham metin</Text>
          <Text style={st.p}>{analiz.ham}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView ref={scrollRef} style={st.col} contentContainerStyle={{ paddingBottom: S.xl }}>
      <Text style={st.colHead}>İDDİA</Text>

      {analiz.bolumler.map((b, i) => {
        const flagli = bayrakliBasliklar.has(b.baslik);
        const vurgulu = vurgulananBolum === b.baslik;
        return (
          <View
            key={i}
            onLayout={(e) => { if (bolumRefs) bolumRefs.current[b.baslik] = e.nativeEvent.layout.y; }}
            style={[
              st.section,
              i === 0 && { borderLeftColor: codeColor(maarifKod) },
              flagli && st.sectionFlagged,
              vurgulu && st.sectionVurgulu,
            ]}
          >
            <View style={st.sh}>
              <Text style={st.shText}>{b.baslik}</Text>
              <TouchableOpacity onPress={() => onFlagSection(b.baslik)} hitSlop={8}>
                <Text style={st.flagBtn}>⚑</Text>
              </TouchableOpacity>
            </View>
            <ZenginMetin text={b.govde} />
          </View>
        );
      })}

      {analiz.veliMetni && (
        <View style={st.veliBox}>
          <Text style={st.veliHead}>📨 VELİYE GİDECEK METİN</Text>
          <Text style={st.veliP}>{analiz.veliMetni}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  col: { flex: 1, minWidth: 0 },
  colHead: { fontSize: F.meta, fontWeight: '700', letterSpacing: 0.6, color: C.inkLight, paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: S.sm },
  muted: { fontSize: F.small, color: C.inkLight, fontStyle: 'italic', paddingHorizontal: S.xl },
  section: { marginHorizontal: S.xl, marginBottom: S.lg, paddingLeft: 14, borderLeftWidth: 3, borderLeftColor: C.line },
  sectionFlagged: { backgroundColor: C.bayrakBg, borderRadius: 8, paddingVertical: 10, paddingRight: 14, marginRight: S.md, marginLeft: S.md + 6 },
  sectionVurgulu: { borderLeftColor: C.bayrak },
  sh: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  shText: { fontSize: F.small, fontWeight: '700', letterSpacing: 0.2, color: C.ink },
  flagBtn: { marginLeft: 'auto', fontSize: F.small, color: C.inkLight, padding: 2 },
  p: { fontFamily: undefined, fontSize: F.body, lineHeight: 24, color: C.ink, maxWidth: 720 },
  veliBox: { marginHorizontal: S.xl, marginTop: 4, marginBottom: S.xl, padding: 14, backgroundColor: C.veliBg, borderWidth: 1, borderColor: C.veliLine, borderLeftWidth: 4, borderRadius: 8 },
  veliHead: { fontSize: F.meta - 0.5, fontWeight: '700', color: C.veliInk, letterSpacing: 0.4, marginBottom: 6 },
  veliP: { fontSize: F.body - 0.5, lineHeight: 22, color: C.veliInk },
});
