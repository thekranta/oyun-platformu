import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ActivityRole } from '../../lib/owner/activityFeed';
import { C, F, ROLE_LABELS, S } from './ownerTheme';

interface Props {
  aktif: ActivityRole | 'tumu';
  onSec: (r: ActivityRole | 'tumu') => void;
  search: string;
  onSearch: (v: string) => void;
}

export default function RoleFilterBar({ aktif, onSec, search, onSearch }: Props) {
  const secenekler: (ActivityRole | 'tumu')[] = ['tumu', 'cocuk_veli', 'ogretmen', 'uzman'];
  return (
    <View>
      <View style={st.chiprow}>
        {secenekler.map((r) => (
          <Chip key={r} label={r === 'tumu' ? 'Tümü' : ROLE_LABELS[r]} on={aktif === r} onPress={() => onSec(r)} />
        ))}
      </View>
      <View style={st.searchwrap}>
        <Text style={{ color: C.inkLight }}>🔍</Text>
        <TextInput
          style={st.searchInput}
          placeholder="İsim / e-posta ara…"
          placeholderTextColor={C.inkLight}
          value={search}
          onChangeText={onSearch}
        />
      </View>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[st.chip, on && { backgroundColor: C.accentSoft, borderColor: C.accent }]} onPress={onPress}>
      <Text style={[st.chipText, on && { color: C.accent }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  chiprow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: S.md },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel },
  chipText: { fontSize: F.meta, fontWeight: '600', color: C.inkMid },
  searchwrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, margin: S.md, marginTop: S.sm,
    backgroundColor: C.panelAlt, borderWidth: 1, borderColor: C.line, borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: F.small, color: C.ink, padding: 0 },
});
