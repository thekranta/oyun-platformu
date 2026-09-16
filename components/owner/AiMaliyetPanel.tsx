import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AiCostData, fetchAiCostData } from '../../lib/owner/aiCostMetrics';
import { C, F, S } from './ownerTheme';

const SERVICE_LABELS: Record<string, string> = {
  gemini: '🧠 Gemini',
  openai_tts: '🔊 TTS',
  openai_whisper: '🎙️ Whisper',
};

const BAR_MAX_HEIGHT = 56;

function formatUsd(n: number): string {
  if (n === 0) return '$0';
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

export default function AiMaliyetPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AiCostData | null>(null);

  useEffect(() => {
    fetchAiCostData().then((d) => {
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

  const maxWeekly = Math.max(1, ...data.weekly.map((w) => w.totalUsd));

  return (
    <View style={st.card}>
      <Text style={st.heading}>💰 AI Maliyeti</Text>
      <Text style={st.totalValue}>{formatUsd(data.totalUsd)}</Text>
      <Text style={st.caption}>Tahmini değerdir, gerçek faturayla küçük farklar olabilir.</Text>

      <View style={st.chartRow}>
        {data.weekly.map((w, i) => (
          <View key={i} style={st.chartCol}>
            <View
              style={[
                st.bar,
                { height: Math.max(2, (w.totalUsd / maxWeekly) * BAR_MAX_HEIGHT) },
              ]}
            />
            <Text style={st.weekLabel}>{w.weekLabel}</Text>
          </View>
        ))}
      </View>

      <Text style={st.groupLabel}>Servis kırılımı</Text>
      {data.byService.map((s) => (
        <ServiceBar key={s.servis} servis={s.servis} count={s.count} totalUsd={s.totalUsd} grandTotalUsd={data.totalUsd} />
      ))}
    </View>
  );
}

function ServiceBar({ servis, count, totalUsd, grandTotalUsd }: { servis: string; count: number; totalUsd: number; grandTotalUsd: number }) {
  const pct = grandTotalUsd > 0 ? Math.round((totalUsd / grandTotalUsd) * 100) : 0;
  return (
    <View style={st.serviceRow}>
      <Text style={st.serviceLabel} numberOfLines={1}>{SERVICE_LABELS[servis] || servis}</Text>
      <View style={st.serviceBarTrack}>
        <View style={[st.serviceBarFill, { width: `${pct}%` }]} />
      </View>
      <Text style={st.serviceMeta}>{formatUsd(totalUsd)} · {count}</Text>
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
  totalValue: { fontSize: F.counter, fontWeight: '800', color: C.accent },
  caption: { fontSize: F.meta - 1, color: C.inkLight, marginBottom: S.sm },
  chartRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    height: BAR_MAX_HEIGHT + 20, marginBottom: S.md,
  },
  chartCol: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: 10, borderRadius: 2, backgroundColor: C.accent },
  weekLabel: { fontSize: F.meta - 2, color: C.inkLight, marginTop: 4 },
  groupLabel: { fontSize: F.meta, fontWeight: '600', color: C.inkMid, marginTop: S.sm, marginBottom: 4 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  serviceLabel: { fontSize: F.meta, color: C.ink, width: 82 },
  serviceBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.panelAlt, overflow: 'hidden' },
  serviceBarFill: { height: '100%', backgroundColor: C.accent, borderRadius: 4 },
  serviceMeta: { fontSize: F.meta - 1, color: C.inkMid, width: 78, textAlign: 'right' },
});
