import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CurriculumHealthData, fetchCurriculumHealthData, GameCoverage, CodeCoverage } from '../../lib/owner/curriculumHealth';
import { C, F, S, codeColor } from './ownerTheme';

const MAX_ROWS = 10;

export default function CurriculumHealthPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CurriculumHealthData | null>(null);

  useEffect(() => {
    fetchCurriculumHealthData().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <View style={[st.card, { alignItems: 'center' }]}>
        <ActivityIndicator color={C.accent} size="small" />
      </View>
    );
  }

  return (
    <View style={st.card}>
      <Text style={st.heading}>📚 Müfredat Sağlığı</Text>
      <Text style={st.totalValue}>{data.kapsananKod} / {data.toplamKod} kod kapsanıyor (%{data.kapsamOrani})</Text>

      <Text style={st.groupLabel}>Alan bazlı kapsam</Text>
      {data.alanlar.map((a) => (
        <AlanBar key={a.alan} label={a.alan} kapsanan={a.kapsananKodSayisi} toplam={a.kodSayisi} />
      ))}

      <CodeList title="Kapsanmayan kodlar" items={data.bosluklar} emptyText="Tüm kodlar en az bir oyunla kapsanıyor. 🎉" />
      <CodeList title="Kırılgan kodlar (tek oyunlu)" items={data.kirilgan} emptyText="Tüm kapsanan kodların en az 2 oyunu var." />
      <GameList title="Hiç oynanmamış oyunlar" items={data.oynanmayanOyunlar} emptyText="Kapsanan tüm oyunlar en az bir kez oynanmış." />
    </View>
  );
}

function AlanBar({ label, kapsanan, toplam }: { label: string; kapsanan: number; toplam: number }) {
  const pct = toplam > 0 ? Math.round((kapsanan / toplam) * 100) : 0;
  return (
    <View style={st.alanRow}>
      <Text style={st.alanLabel} numberOfLines={1}>{label}</Text>
      <View style={st.alanBarTrack}>
        <View style={[st.alanBarFill, { width: `${pct}%` }]} />
      </View>
      <Text style={st.alanCount}>{kapsanan}/{toplam}</Text>
    </View>
  );
}

function CodeList({ title, items, emptyText }: { title: string; items: CodeCoverage[]; emptyText: string }) {
  return (
    <View style={st.listBlock}>
      <Text style={st.groupLabel}>{title} ({items.length})</Text>
      {items.length === 0 && <Text style={st.emptyText}>{emptyText}</Text>}
      {items.slice(0, MAX_ROWS).map((c) => (
        <View key={c.code} style={st.listRow}>
          <Text style={[st.chip, { backgroundColor: codeColor(c.code) + '26', color: codeColor(c.code) }]}>{c.code}</Text>
          <Text style={st.listText} numberOfLines={1}>
            {c.aciklama}{c.oyunlar.length === 1 ? ` — ${c.oyunlar[0].displayName}` : ''}
          </Text>
        </View>
      ))}
      {items.length > MAX_ROWS && <Text style={st.moreText}>+{items.length - MAX_ROWS} daha</Text>}
    </View>
  );
}

function GameList({ title, items, emptyText }: { title: string; items: GameCoverage[]; emptyText: string }) {
  return (
    <View style={st.listBlock}>
      <Text style={st.groupLabel}>{title} ({items.length})</Text>
      {items.length === 0 && <Text style={st.emptyText}>{emptyText}</Text>}
      {items.slice(0, MAX_ROWS).map((g) => (
        <View key={g.oyunTuru} style={st.listRow}>
          <Text style={st.listText} numberOfLines={1}>{g.displayName}</Text>
        </View>
      ))}
      {items.length > MAX_ROWS && <Text style={st.moreText}>+{items.length - MAX_ROWS} daha</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: C.panel, borderRadius: 12, padding: S.md,
    marginHorizontal: S.md, marginBottom: S.sm,
    borderWidth: 1, borderColor: C.line,
  },
  heading: { fontSize: F.body, fontWeight: '700', color: C.ink, marginBottom: 2 },
  totalValue: { fontSize: F.head, fontWeight: '800', color: C.accent, marginBottom: S.sm },
  groupLabel: { fontSize: F.meta, fontWeight: '600', color: C.inkMid, marginTop: S.sm, marginBottom: 4 },
  alanRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  alanLabel: { fontSize: F.meta, color: C.ink, width: 110 },
  alanBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.panelAlt, overflow: 'hidden' },
  alanBarFill: { height: '100%', backgroundColor: C.accent, borderRadius: 4 },
  alanCount: { fontSize: F.meta, color: C.inkMid, width: 40, textAlign: 'right' },
  listBlock: { marginTop: S.xs },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  chip: { fontSize: F.meta - 0.5, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, overflow: 'hidden' },
  listText: { flex: 1, fontSize: F.meta, color: C.inkMid },
  emptyText: { fontSize: F.meta, color: C.inkLight, fontStyle: 'italic' },
  moreText: { fontSize: F.meta - 1, color: C.inkLight, marginTop: 2 },
});
