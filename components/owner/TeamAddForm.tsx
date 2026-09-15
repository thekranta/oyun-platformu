import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createTeamMember, TeamRole } from '../../lib/owner/teamManagement';
import { C, F, S } from './ownerTheme';

// PackageAssignForm.tsx'teki showAlert deseninin aynısı.
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

const ROLE_LABELS: Record<TeamRole, string> = {
  uzman: '🧑‍⚕️ Uzman',
  sahip: '🔒 Sahip',
};

export default function TeamAddForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<TeamRole>('uzman');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handleCreate = () => {
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setMessage({ text: '❌ Ad soyad ve e-posta zorunlu.', ok: false });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: '❌ Şifre en az 6 karakter olmalı.', ok: false });
      return;
    }
    setMessage(null);
    showAlert(
      'Hesap Oluştur',
      `${trimmedName} (${trimmedEmail}) için "${ROLE_LABELS[role]}" yetkisiyle yeni hesap oluşturulacak. Onaylıyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Oluştur',
          onPress: async () => {
            setSaving(true);
            const result = await createTeamMember(role, trimmedEmail, password, trimmedName);
            if (result.ok) {
              setMessage({ text: '✅ Hesap oluşturuldu.', ok: true });
              setDisplayName('');
              setEmail('');
              setPassword('');
            } else {
              setMessage({ text: `❌ ${result.error}`, ok: false });
            }
            setSaving(false);
          },
        },
      ]
    );
  };

  return (
    <View style={st.card}>
      <Text style={st.heading}>👥 Uzman / Sahip Ekle</Text>

      <TextInput
        style={st.input}
        placeholder="Ad Soyad"
        placeholderTextColor={C.inkLight}
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={st.input}
        placeholder="E-posta"
        placeholderTextColor={C.inkLight}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={st.input}
        placeholder="Şifre (en az 6 karakter)"
        placeholderTextColor={C.inkLight}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text style={st.groupLabel}>Rol</Text>
      <View style={st.chipRow}>
        {(['uzman', 'sahip'] as TeamRole[]).map((r) => (
          <Chip key={r} label={ROLE_LABELS[r]} on={role === r} onPress={() => setRole(r)} />
        ))}
      </View>

      {role === 'sahip' && (
        <Text style={st.warning}>
          ⚠️ "Sahip" rolü platformdaki TÜM verilere okuma erişimi ve paket yazma yetkisi verir.
        </Text>
      )}

      <TouchableOpacity style={st.createBtn} onPress={handleCreate} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.createBtnText}>Hesap Oluştur</Text>}
      </TouchableOpacity>

      {message && (
        <Text style={[st.message, { color: message.ok ? C.onay : C.ret }]}>{message.text}</Text>
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
  input: {
    backgroundColor: C.panelAlt, borderWidth: 1, borderColor: C.line, borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: F.small, color: C.ink,
    marginBottom: S.sm,
  },
  groupLabel: { fontSize: F.meta, fontWeight: '600', color: C.inkMid, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel },
  chipText: { fontSize: F.meta, fontWeight: '600', color: C.inkMid },
  warning: { fontSize: F.meta, color: C.ret, marginTop: S.sm, lineHeight: 16 },
  createBtn: {
    backgroundColor: C.accent, borderRadius: 9, paddingVertical: 10,
    alignItems: 'center', marginTop: S.md,
  },
  createBtnText: { color: '#fff', fontSize: F.small, fontWeight: '700' },
  message: { fontSize: F.small, fontWeight: '600', marginTop: S.sm },
});
