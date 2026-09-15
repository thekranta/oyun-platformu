import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActivityRole, SummaryTotals } from '../../lib/owner/activityFeed';
import { C, F, ROLE_BG, ROLE_COLORS, ROLE_ICONS, ROLE_LABELS, S } from './ownerTheme';

interface Props {
  totals: SummaryTotals;
  active7d: Record<ActivityRole, number>;
}

const ROLE_TOTAL_KEY: Record<ActivityRole, keyof SummaryTotals> = {
  cocuk_veli: 'cocukVeli',
  ogretmen: 'ogretmen',
  uzman: 'uzman',
};

export default function SummaryStrip({ totals, active7d }: Props) {
  const roles: ActivityRole[] = ['cocuk_veli', 'ogretmen', 'uzman'];
  return (
    <View style={st.row}>
      {roles.map((role) => (
        <View key={role} style={[st.card, { backgroundColor: ROLE_BG[role] }]}>
          <Text style={st.icon}>{ROLE_ICONS[role]}</Text>
          <Text style={[st.total, { color: ROLE_COLORS[role] }]}>{totals[ROLE_TOTAL_KEY[role]]}</Text>
          <Text style={st.label}>{ROLE_LABELS[role]}</Text>
          <Text style={st.active}>son 7g aktif: {active7d[role] ?? 0}</Text>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, padding: S.md },
  card: { flex: 1, minWidth: 140, borderRadius: 12, padding: S.md, alignItems: 'center', gap: 2 },
  icon: { fontSize: 22 },
  total: { fontSize: F.counter, fontWeight: '800' },
  label: { fontSize: F.small, fontWeight: '600', color: C.ink },
  active: { fontSize: F.meta, color: C.inkMid },
});
