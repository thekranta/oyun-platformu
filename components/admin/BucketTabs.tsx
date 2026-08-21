import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BucketKey } from '../../lib/admin/queueQuery';
import { C, F, S } from './theme';

interface Sayaclar {
  banaDusen: number; sonOySende: number; baskasiniBekliyor: number;
  beklemede: number; onayli: number; reddedildi: number; deneme: number;
}

interface Props {
  aktif: BucketKey;
  onSec: (b: BucketKey) => void;
  sayaclar: Sayaclar;
  search: string;
  onSearch: (v: string) => void;
  sort: 'eski' | 'yeni';
  onSort: (s: 'eski' | 'yeni') => void;
}

export default function BucketTabs({ aktif, onSec, sayaclar, search, onSearch, sort, onSort }: Props) {
  return (
    <View>
      <View style={st.chiprow}>
        <Chip label={`Beklemede ${sayaclar.beklemede}`} on={aktif === 'beklemede'} onPress={() => onSec('beklemede')} />
        <Chip label={`Onaylı ${sayaclar.onayli}`} on={aktif === 'onayli'} onPress={() => onSec('onayli')} renk={C.onay} />
        <Chip label={`Reddedildi ${sayaclar.reddedildi}`} on={aktif === 'reddedildi'} onPress={() => onSec('reddedildi')} renk={C.ret} />
        <Chip label={`Deneme kayıtları ${sayaclar.deneme}`} on={aktif === 'deneme'} onPress={() => onSec('deneme')} />
      </View>

      <View style={st.searchwrap}>
        <View style={st.search}>
          <Text style={{ color: C.inkLight }}>🔍</Text>
          <TextInput
            style={st.searchInput}
            placeholder="Çocuk / oyun / e-posta ara…"
            placeholderTextColor={C.inkLight}
            value={search}
            onChangeText={onSearch}
          />
        </View>
        <TouchableOpacity style={st.fbtn} onPress={() => onSort(sort === 'eski' ? 'yeni' : 'eski')}>
          <Text style={st.fbtnText}>{sort === 'eski' ? 'En eski ▾' : 'En yeni ▾'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Chip({ label, on, onPress, renk }: { label: string; on: boolean; onPress: () => void; renk?: string }) {
  return (
    <TouchableOpacity
      style={[st.chip, on && { backgroundColor: C.accentSoft, borderColor: C.accent }]}
      onPress={onPress}
    >
      <Text style={[st.chipText, on && { color: C.accent }, !on && renk ? { color: renk } : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  chiprow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: S.md, paddingTop: S.md },
  chip: { fontSize: F.meta, fontWeight: '600', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel },
  chipText: { fontSize: F.meta, fontWeight: '600', color: C.inkMid },
  searchwrap: { padding: S.md, borderTopWidth: 1, borderTopColor: C.line, borderBottomWidth: 1, borderBottomColor: C.line, marginTop: S.sm, gap: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.panelAlt, borderWidth: 1, borderColor: C.line, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: F.small, color: C.ink, padding: 0 },
  fbtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: C.line, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  fbtnText: { fontSize: F.meta, fontWeight: '600', color: C.inkMid },
});
