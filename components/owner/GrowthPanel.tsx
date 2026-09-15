import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { fetchGrowthData, GrowthData } from '../../lib/owner/growthMetrics';
import { OgretmenTier, VeliTier } from '../../lib/subscriptionTiers';
import { C, F, ROLE_COLORS, S } from './ownerTheme';

// PackageAssignForm.tsx'teki sabitle birebir aynı.
const TIER_LABELS: Record<VeliTier | OgretmenTier, string> = {
  free: '🆓 Ücretsiz',
  tohum: '🌱 Tohum',
  filiz: '🌿 Filiz',
  fidan: '🌳 Fidan',
  orman: '🌲 Orman',
  cinar: '🌳 Çınar',
  mese: '🌲 Meşe',
};

const VELI_TIER_ORDER: VeliTier[] = ['free', 'tohum', 'filiz', 'fidan', 'orman'];
const OGRETMEN_TIER_ORDER: OgretmenTier[] = ['free', 'cinar', 'mese'];

const BAR_MAX_HEIGHT = 56;

export default function GrowthPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GrowthData | null>(null);

  useEffect(() => {
    fetchGrowthData().then((d) => {
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

  const maxCount = Math.max(1, ...data.weekly.flatMap((w) => [w.veli, w.ogretmen]));
  const veliTotal = Object.values(data.veliTiers).reduce((a, b) => a + b, 0);
  const ogretmenTotal = Object.values(data.ogretmenTiers).reduce((a, b) => a + b, 0);

  return (
    <View style={st.card}>
      <Text style={st.heading}>📈 Büyüme</Text>

      <View style={st.legendRow}>
        <LegendDot color={ROLE_COLORS.cocuk_veli} label="Veli" />
        <LegendDot color={ROLE_COLORS.ogretmen} label="Öğretmen" />
      </View>

      <View style={st.chartRow}>
        {data.weekly.map((w, i) => (
          <View key={i} style={st.chartCol}>
            <View style={st.barPair}>
              <View
                style={[
                  st.bar,
                  { height: Math.max(2, (w.veli / maxCount) * BAR_MAX_HEIGHT), backgroundColor: ROLE_COLORS.cocuk_veli },
                ]}
              />
              <View
                style={[
                  st.bar,
                  { height: Math.max(2, (w.ogretmen / maxCount) * BAR_MAX_HEIGHT), backgroundColor: ROLE_COLORS.ogretmen },
                ]}
              />
            </View>
            <Text style={st.weekLabel}>{w.weekLabel}</Text>
          </View>
        ))}
      </View>

      <Text style={st.groupLabel}>Veli paket dağılımı</Text>
      {VELI_TIER_ORDER.map((tier) => (
        <TierBar key={tier} label={TIER_LABELS[tier]} count={data.veliTiers[tier]} total={veliTotal} />
      ))}

      <Text style={st.groupLabel}>Öğretmen paket dağılımı</Text>
      {OGRETMEN_TIER_ORDER.map((tier) => (
        <TierBar key={tier} label={TIER_LABELS[tier]} count={data.ogretmenTiers[tier]} total={ogretmenTotal} />
      ))}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={st.legendItem}>
      <View style={[st.legendDot, { backgroundColor: color }]} />
      <Text style={st.legendText}>{label}</Text>
    </View>
  );
}

function TierBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={st.tierRow}>
      <Text style={st.tierLabel} numberOfLines={1}>{label}</Text>
      <View style={st.tierBarTrack}>
        <View style={[st.tierBarFill, { width: `${pct}%` }]} />
      </View>
      <Text style={st.tierCount}>{count}</Text>
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
  legendRow: { flexDirection: 'row', gap: S.md, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: F.meta, color: C.inkMid },
  chartRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    height: BAR_MAX_HEIGHT + 20, marginBottom: S.md,
  },
  chartCol: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 6, borderRadius: 2 },
  weekLabel: { fontSize: F.meta - 2, color: C.inkLight, marginTop: 4 },
  groupLabel: { fontSize: F.meta, fontWeight: '600', color: C.inkMid, marginTop: S.sm, marginBottom: 4 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tierLabel: { fontSize: F.meta, color: C.ink, width: 82 },
  tierBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.panelAlt, overflow: 'hidden' },
  tierBarFill: { height: '100%', backgroundColor: C.accent, borderRadius: 4 },
  tierCount: { fontSize: F.meta, color: C.inkMid, width: 20, textAlign: 'right' },
});
