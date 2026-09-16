import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActivityEvent } from '../../lib/owner/activityFeed';
import { searchDatabase } from '../../lib/owner/globalSearch';
import ActivityDetailModal from './ActivityDetailModal';
import ActivityRow from './ActivityRow';
import { C, F, S } from './ownerTheme';

const DEBOUNCE_MS = 400;
const MIN_CHARS = 2;

export default function DatabaseSearchPanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ActivityEvent[]>([]);
  const [searched, setSearched] = useState(false);
  const [secili, setSecili] = useState<ActivityEvent | null>(null);

  useEffect(() => {
    if (query.trim().length < MIN_CHARS) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      searchDatabase(query).then((r) => {
        setResults(r);
        setSearched(true);
        setLoading(false);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <View style={st.card}>
      <Text style={st.heading}>🔍 Tam Arama</Text>
      <View style={st.searchwrap}>
        <Text style={{ color: C.inkLight }}>🔍</Text>
        <TextInput
          style={st.searchInput}
          placeholder="Çocuk / veli / öğretmen adı, e-posta ya da oyun türü ara…"
          placeholderTextColor={C.inkLight}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {query.trim().length < MIN_CHARS && (
        <Text style={st.hint}>En az {MIN_CHARS} karakter yaz.</Text>
      )}
      {loading && <ActivityIndicator color={C.accent} size="small" style={{ marginTop: S.md }} />}
      {!loading && searched && results.length === 0 && (
        <Text style={st.hint}>Sonuç bulunamadı.</Text>
      )}
      {!loading && results.map((e) => (
        <ActivityRow key={e.id} event={e} onPress={() => setSecili(e)} />
      ))}

      {secili && <ActivityDetailModal event={secili} onClose={() => setSecili(null)} />}
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
  searchwrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.panelAlt, borderWidth: 1, borderColor: C.line, borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: F.small, color: C.ink, padding: 0 },
  hint: { fontSize: F.small, color: C.inkLight, textAlign: 'center', paddingVertical: S.lg },
});
