import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  activeActorCount,
  ActivityEvent,
  ActivityRole,
  fetchActivityFeed,
  fetchSummaryTotals,
  SummaryTotals,
} from '../lib/owner/activityFeed';
import ActivityDetailModal from './owner/ActivityDetailModal';
import ActivityRow from './owner/ActivityRow';
import AiMaliyetPanel from './owner/AiMaliyetPanel';
import CurriculumHealthPanel from './owner/CurriculumHealthPanel';
import GrowthPanel from './owner/GrowthPanel';
import OwnerTabBar, { OwnerTab } from './owner/OwnerTabBar';
import PackageAssignForm from './owner/PackageAssignForm';
import RoleFilterBar from './owner/RoleFilterBar';
import SummaryStrip from './owner/SummaryStrip';
import TeamAddForm from './owner/TeamAddForm';
import TeamPerformancePanel from './owner/TeamPerformancePanel';
import { C, F, S } from './owner/ownerTheme';

interface Props {
  displayName: string;
}

export default function OwnerDashboard({ displayName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [totals, setTotals] = useState<SummaryTotals>({ cocukVeli: 0, ogretmen: 0, uzman: 0 });
  const [aktifRol, setAktifRol] = useState<ActivityRole | 'tumu'>('tumu');
  const [search, setSearch] = useState('');
  const [secili, setSecili] = useState<ActivityEvent | null>(null);
  const [tab, setTab] = useState<OwnerTab>('genel');

  const yukle = async () => {
    setLoading(true);
    const [feed, sums] = await Promise.all([fetchActivityFeed(), fetchSummaryTotals()]);
    setEvents(feed);
    setTotals(sums);
    setLoading(false);
  };

  useEffect(() => { yukle(); }, []);

  const active7d = useMemo(() => ({
    cocuk_veli: activeActorCount(events, 'cocuk_veli', 7),
    ogretmen: activeActorCount(events, 'ogretmen', 7),
    uzman: activeActorCount(events, 'uzman', 7),
  }), [events]);

  const filtered = useMemo(() => {
    let list = events;
    if (aktifRol !== 'tumu') list = list.filter((e) => e.role === aktifRol);
    const q = search.trim().toLocaleLowerCase('tr');
    if (q) list = list.filter((e) => e.title.toLocaleLowerCase('tr').includes(q) || e.actorLabel.toLocaleLowerCase('tr').includes(q));
    return list;
  }, [events, aktifRol, search]);

  return (
    <View style={st.root}>
      <View style={st.topbar}>
        <View>
          <Text style={st.brand}>🔒 Godmode</Text>
          <Text style={st.who}>{displayName}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TouchableOpacity onPress={yukle}><Text style={st.action}>Yenile</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}><Text style={st.action}>Çıkış</Text></TouchableOpacity>
        </View>
      </View>

      {!loading && <OwnerTabBar aktif={tab} onSec={setTab} />}

      {loading ? (
        <View style={st.center}><ActivityIndicator color={C.accent} size="large" /></View>
      ) : (
        <ScrollView>
          {tab === 'genel' && (
            <>
              <SummaryStrip totals={totals} active7d={active7d} />
              <RoleFilterBar aktif={aktifRol} onSec={setAktifRol} search={search} onSearch={setSearch} />
              <View style={st.list}>
                {filtered.length === 0 && <Text style={st.empty}>Bu filtreyle etkinlik bulunamadı.</Text>}
                {filtered.map((e) => (
                  <ActivityRow key={e.id} event={e} onPress={() => setSecili(e)} />
                ))}
              </View>
            </>
          )}
          {tab === 'buyume' && (
            <>
              <GrowthPanel />
              <AiMaliyetPanel />
            </>
          )}
          {tab === 'mufredat' && <CurriculumHealthPanel />}
          {tab === 'ekip' && <TeamPerformancePanel />}
          {tab === 'yonetim' && (
            <>
              <PackageAssignForm />
              <TeamAddForm />
            </>
          )}
        </ScrollView>
      )}

      {secili && <ActivityDetailModal event={secili} onClose={() => setSecili(null)} />}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  topbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: S.lg, paddingVertical: S.md, backgroundColor: C.panel,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  brand: { fontSize: F.head, fontWeight: '800', color: C.accent },
  who: { fontSize: F.meta, color: C.inkMid },
  action: { fontSize: F.small, fontWeight: '600', color: C.accent },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: S.xl },
  empty: { fontSize: F.small, color: C.inkLight, textAlign: 'center', paddingVertical: S.xl },
});
