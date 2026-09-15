import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityEvent } from '../../lib/owner/activityFeed';
import { C, F, ROLE_BG, ROLE_COLORS, ROLE_ICONS, S } from './ownerTheme';

interface Props {
  event: ActivityEvent;
  onPress: () => void;
}

/** Göreli zaman metni — "az önce", "3 saat önce", "5 gün önce" vb. */
function goreliZaman(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const dk = Math.floor(diffMs / 60000);
  if (dk < 1) return 'az önce';
  if (dk < 60) return `${dk} dk önce`;
  const saat = Math.floor(dk / 60);
  if (saat < 24) return `${saat} sa önce`;
  const gun = Math.floor(saat / 24);
  return `${gun} gün önce`;
}

function ActivityRowBase({ event, onPress }: Props) {
  const renk = ROLE_COLORS[event.role];
  return (
    <TouchableOpacity style={[st.row, { borderLeftColor: renk }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[st.iconWrap, { backgroundColor: ROLE_BG[event.role] }]}>
        <Text style={st.icon}>{ROLE_ICONS[event.role]}</Text>
      </View>
      <View style={st.content}>
        <Text style={st.title} numberOfLines={2}>{event.title}</Text>
        {!!event.subtitle && <Text style={st.subtitle} numberOfLines={1}>{event.subtitle}</Text>}
      </View>
      <Text style={st.time}>{goreliZaman(event.timestamp)}</Text>
    </TouchableOpacity>
  );
}

export default React.memo(ActivityRowBase);

const st = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    paddingHorizontal: S.md, paddingVertical: S.sm,
    borderBottomWidth: 1, borderBottomColor: C.line, borderLeftWidth: 3,
    backgroundColor: C.panel,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 17 },
  content: { flex: 1, gap: 2 },
  title: { fontSize: F.small + 1, fontWeight: '600', color: C.ink },
  subtitle: { fontSize: F.meta, color: C.inkMid },
  time: { fontSize: F.meta - 1, color: C.inkLight },
});
