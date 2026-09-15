import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { assignPackage, findUserByEmail, FoundUser } from '../../lib/owner/packageAssignment';
import { OgretmenTier, VeliTier } from '../../lib/subscriptionTiers';
import { C, F, S } from './ownerTheme';

// TeacherDashboard.tsx'teki showAlert deseninin aynısı.
const showAlert = (
  title: string,
  message: string,
  buttons?: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' }>
) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const actionButton = buttons.find((b) => b.style !== 'cancel');
      const result = window.confirm(`${title}\n\n${message}`);
      if (result) actionButton?.onPress?.();
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const VELI_TIERS: VeliTier[] = ['free', 'tohum', 'filiz', 'fidan', 'orman'];
const OGRETMEN_TIERS: OgretmenTier[] = ['free', 'cinar', 'mese'];

const TIER_LABELS: Record<VeliTier | OgretmenTier, string> = {
  free: '🆓 Ücretsiz',
  tohum: '🌱 Tohum',
  filiz: '🌿 Filiz',
  fidan: '🌳 Fidan',
  orman: '🌲 Orman',
  cinar: '🌳 Çınar',
  mese: '🌲 Meşe',
};

const DURATION_OPTIONS: { label: string; months: number | null }[] = [
  { label: '1 Ay', months: 1 },
  { label: '3 Ay', months: 3 },
  { label: '6 Ay', months: 6 },
  { label: '12 Ay', months: 12 },
  { label: 'Süresiz', months: null },
];

function formatExpiry(iso: string | null): string {
  if (!iso) return 'Süresiz';
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PackageAssignForm() {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [found, setFound] = useState<FoundUser | null>(null);
  const [selectedTier, setSelectedTier] = useState<VeliTier | OgretmenTier | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<number | null>(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSearch = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSearching(true);
    setNotFound(false);
    setFound(null);
    setMessage(null);
    try {
      const result = await findUserByEmail(trimmed);
      if (result) {
        setFound(result);
        setSelectedTier(result.tier);
      } else {
        setNotFound(true);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleApply = () => {
    if (!found || !selectedTier) return;
    const tierLabel = TIER_LABELS[selectedTier];
    const durationLabel = DURATION_OPTIONS.find((d) => d.months === selectedMonths)?.label;
    showAlert(
      'Paketi Uygula',
      `${found.label} için paket "${tierLabel}" (${durationLabel}) olarak ayarlanacak. Onaylıyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Uygula',
          onPress: async () => {
            setSaving(true);
            setMessage(null);
            const result = await assignPackage(found.kind, found.email, selectedTier, selectedMonths);
            if (result.ok) {
              const refreshed = await findUserByEmail(found.email);
              if (refreshed) setFound(refreshed);
              setMessage({ text: '✅ Paket güncellendi.', ok: true });
            } else {
              setMessage({ text: `❌ ${result.error}`, ok: false });
            }
            setSaving(false);
          },
        },
      ]
    );
  };

  const tierOptions = found?.kind === 'ogretmen' ? OGRETMEN_TIERS : VELI_TIERS;

  return (
    <View style={st.card}>
      <Text style={st.heading}>🎁 Paket Ata</Text>

      <View style={st.searchRow}>
        <TextInput
          style={st.emailInput}
          placeholder="Kullanıcının e-postası"
          placeholderTextColor={C.inkLight}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={st.searchBtn} onPress={handleSearch} disabled={searching}>
          {searching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.searchBtnText}>Bul</Text>}
        </TouchableOpacity>
      </View>

      {notFound && <Text style={st.notFound}>Bu e-posta ile kayıtlı kullanıcı bulunamadı.</Text>}

      {found && (
        <View style={st.foundBox}>
          <Text style={st.foundLabel}>
            {found.kind === 'veli' ? '👶 Veli' : '👩‍🏫 Öğretmen'} · {found.label}
          </Text>
          <Text style={st.foundCurrent}>
            Mevcut: {TIER_LABELS[found.tier]} · Bitiş: {formatExpiry(found.packageExpiresAt)}
          </Text>

          <Text style={st.groupLabel}>Yeni paket</Text>
          <View style={st.chipRow}>
            {tierOptions.map((tier) => (
              <Chip key={tier} label={TIER_LABELS[tier]} on={selectedTier === tier} onPress={() => setSelectedTier(tier)} />
            ))}
          </View>

          <Text style={st.groupLabel}>Süre</Text>
          <View style={st.chipRow}>
            {DURATION_OPTIONS.map((d) => (
              <Chip key={d.label} label={d.label} on={selectedMonths === d.months} onPress={() => setSelectedMonths(d.months)} />
            ))}
          </View>

          <TouchableOpacity style={st.applyBtn} onPress={handleApply} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.applyBtnText}>Paketi Uygula</Text>}
          </TouchableOpacity>

          {message && (
            <Text style={[st.message, { color: message.ok ? C.onay : C.ret }]}>{message.text}</Text>
          )}
        </View>
      )}
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
  card: {
    backgroundColor: C.panel, borderRadius: 12, padding: S.md,
    marginHorizontal: S.md, marginBottom: S.sm,
    borderWidth: 1, borderColor: C.line,
  },
  heading: { fontSize: F.body, fontWeight: '700', color: C.ink, marginBottom: S.sm },
  searchRow: { flexDirection: 'row', gap: S.sm },
  emailInput: {
    flex: 1, backgroundColor: C.panelAlt, borderWidth: 1, borderColor: C.line, borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: F.small, color: C.ink,
  },
  searchBtn: {
    backgroundColor: C.accent, borderRadius: 9, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontSize: F.small, fontWeight: '700' },
  notFound: { fontSize: F.small, color: C.ret, marginTop: S.sm },
  foundBox: { marginTop: S.md, gap: 4 },
  foundLabel: { fontSize: F.small + 1, fontWeight: '700', color: C.ink },
  foundCurrent: { fontSize: F.meta, color: C.inkMid, marginBottom: S.xs },
  groupLabel: { fontSize: F.meta, fontWeight: '600', color: C.inkMid, marginTop: S.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel },
  chipText: { fontSize: F.meta, fontWeight: '600', color: C.inkMid },
  applyBtn: {
    backgroundColor: C.accent, borderRadius: 9, paddingVertical: 10,
    alignItems: 'center', marginTop: S.md,
  },
  applyBtnText: { color: '#fff', fontSize: F.small, fontWeight: '700' },
  message: { fontSize: F.small, fontWeight: '600', marginTop: S.sm },
});
