import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { fetchTeamPerformanceData, UzmanPerformans } from '../../lib/owner/teamPerformance';
import { C, F, S } from './ownerTheme';

function gunOnce(iso: string): string {
  if (!iso) return 'hiç';
  const gun = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (gun <= 0) return 'bugün';
  if (gun === 1) return 'dün';
  return `${gun} gün önce`;
}

export default function TeamPerformancePanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UzmanPerformans[] | null>(null);

  useEffect(() => {
    fetchTeamPerformanceData().then((d) => {
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
      <Text style={st.heading}>👥 Ekip Performansı</Text>
      {data.length === 0 ? (
        <Text style={st.emptyText}>Henüz bir uzman kararı kaydedilmemiş.</Text>
      ) : (
        data.map((u) => <UzmanRow key={u.uzmanAdi} u={u} />)
      )}
    </View>
  );
}

function UzmanRow({ u }: { u: UzmanPerformans }) {
  const onayPct = u.toplamOy > 0 ? (u.onay / u.toplamOy) * 100 : 0;
  const revizePct = u.toplamOy > 0 ? (u.revize / u.toplamOy) * 100 : 0;
  const reddetPct = u.toplamOy > 0 ? (u.reddet / u.toplamOy) * 100 : 0;

  return (
    <View style={st.row}>
      <View style={st.rowHead}>
        <Text style={st.name} numberOfLines={1}>{u.uzmanAdi}</Text>
        <Text style={st.meta}>{u.toplamOy} karar · son karar {gunOnce(u.sonKararTarihi)}</Text>
      </View>
      <View style={st.segTrack}>
        {onayPct > 0 && <View style={[st.seg, { width: `${onayPct}%`, backgroundColor: C.onay }]} />}
        {revizePct > 0 && <View style={[st.seg, { width: `${revizePct}%`, backgroundColor: C.revize }]} />}
        {reddetPct > 0 && <View style={[st.seg, { width: `${reddetPct}%`, backgroundColor: C.ret }]} />}
      </View>
      <Text style={st.breakdown}>✅ {u.onay} onay · 🟠 {u.revize} revize · 🔴 {u.reddet} reddet</Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: C.panel, borderRadius: 12, padding: S.md,
    marginHorizontal: S.md, marginBottom: S.sm,
    borderWidth: 1, borderColor: C.line,
  },
  heading: { fontSize: F.body, fontWeight: '700', color: C.ink, marginBottom: S.sm },
  emptyText: { fontSize: F.meta, color: C.inkLight, fontStyle: 'italic' },
  row: { marginBottom: S.md },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: F.small, fontWeight: '700', color: C.ink, flex: 1 },
  meta: { fontSize: F.meta - 1, color: C.inkLight },
  segTrack: { flexDirection: 'row', height: 8, borderRadius: 4, backgroundColor: C.panelAlt, overflow: 'hidden', marginBottom: 4 },
  seg: { height: '100%' },
  breakdown: { fontSize: F.meta - 1, color: C.inkMid },
});
