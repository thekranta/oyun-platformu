import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityEvent } from '../../lib/owner/activityFeed';
import { fetchAllForStudent, KuyrukKaydi } from '../../lib/admin/queueQuery';
import { fetchOgretmenDetay, fetchUzmanKararlari, OgretmenDetay, UzmanKarar } from '../../lib/owner/ownerDetail';
import StudentStatsModal from '../StudentStatsModal';
import { C, F, S } from './ownerTheme';

interface Props {
  event: ActivityEvent;
  onClose: () => void;
}

const OY_ETIKET: Record<string, string> = { onay: '✅ Onay', revize: '🟠 Revize', reddet: '❌ Reddet' };

export default function ActivityDetailModal({ event, onClose }: Props) {
  if (event.role === 'cocuk_veli') {
    return <CocukDetay event={event} onClose={onClose} />;
  }
  if (event.role === 'uzman') {
    return <UzmanDetay event={event} onClose={onClose} />;
  }
  return <OgretmenDetayModal event={event} onClose={onClose} />;
}

function CocukDetay({ event, onClose }: Props) {
  const [scores, setScores] = useState<KuyrukKaydi[]>([]);
  const [loading, setLoading] = useState(true);
  const email = (event.meta?.email as string) || event.actorKey;

  useEffect(() => {
    let cancelled = false;
    if (!email) { setLoading(false); return; }
    fetchAllForStudent(email).then((r) => { if (!cancelled) { setScores(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [email]);

  if (loading) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={st.overlay}><ActivityIndicator color={C.accent} /></View>
      </Modal>
    );
  }

  return (
    <StudentStatsModal
      visible
      onClose={onClose}
      studentName={(event.meta?.childName as string) || event.actorLabel}
      studentAge={(event.meta?.childAgeMonths as number) || 0}
      scores={scores}
    />
  );
}

function UzmanDetay({ event, onClose }: Props) {
  const [kararlar, setKararlar] = useState<UzmanKarar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchUzmanKararlari(event.actorKey).then((r) => { if (!cancelled) { setKararlar(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [event.actorKey]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={st.card}>
          <View style={st.header}>
            <Text style={st.title}>{event.actorLabel} — karar geçmişi</Text>
            <TouchableOpacity onPress={onClose}><Text style={st.close}>✕</Text></TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator color={C.accent} /> : (
            <ScrollView>
              {kararlar.length === 0 && <Text style={st.empty}>Kayıt bulunamadı.</Text>}
              {kararlar.map((k, i) => (
                <View key={i} style={st.row}>
                  <Text style={st.rowTitle}>{k.ogrenciAdi} · {k.oyunTuru}</Text>
                  <Text style={st.rowSub}>{OY_ETIKET[k.oy] || k.oy}{k.gerekce ? ` — ${k.gerekce}` : ''}</Text>
                  <Text style={st.rowTime}>{new Date(k.tarih).toLocaleString('tr-TR')}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function OgretmenDetayModal({ event, onClose }: Props) {
  const [detay, setDetay] = useState<OgretmenDetay>({ siniflar: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchOgretmenDetay(event.actorKey).then((r) => { if (!cancelled) { setDetay(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [event.actorKey]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={st.card}>
          <View style={st.header}>
            <Text style={st.title}>{event.actorLabel} — sınıfları</Text>
            <TouchableOpacity onPress={onClose}><Text style={st.close}>✕</Text></TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator color={C.accent} /> : (
            <ScrollView>
              {detay.siniflar.length === 0 && <Text style={st.empty}>Sınıf bulunamadı.</Text>}
              {detay.siniflar.map((s) => (
                <View key={s.id} style={st.row}>
                  <Text style={st.rowTitle}>{s.name}</Text>
                  <Text style={st.rowSub}>{s.ogrenciSayisi} öğrenci</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#16202B99', justifyContent: 'center', alignItems: 'center', padding: S.lg },
  card: { backgroundColor: C.panel, borderRadius: 16, padding: S.lg, width: '100%', maxWidth: 520, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md },
  title: { fontSize: F.head, fontWeight: '800', color: C.ink },
  close: { fontSize: F.head, color: C.inkMid },
  empty: { fontSize: F.small, color: C.inkLight, textAlign: 'center', paddingVertical: S.lg },
  row: { paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.line, gap: 2 },
  rowTitle: { fontSize: F.small + 1, fontWeight: '600', color: C.ink },
  rowSub: { fontSize: F.meta, color: C.inkMid },
  rowTime: { fontSize: F.meta - 1, color: C.inkLight },
});
