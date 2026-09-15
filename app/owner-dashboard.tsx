import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DynamicBackground from '../components/DynamicBackground';
import OwnerDashboard from '../components/OwnerDashboard';
import { C, F } from '../components/owner/ownerTheme';
import { asset } from '../lib/assetMap';
import { supabase } from '../lib/supabase';

/**
 * Sahip ("godmode") paneli girişi. admin.tsx'teki Uzman Girişi login-gate deseninin
 * birebir taklidi ama `owners` tablosuna bakar (admins'ten TAMAMEN ayrı, bkz.
 * supabase_migrations/create_owner_dashboard.sql). Giriş ekranındaki butonlara
 * bilerek eklenmedi — sadece bu URL'i bilenler erişir.
 */
export default function OwnerDashboardRoute() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (email.trim() === '' || password.trim() === '') {
      alert('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) {
        const m = error?.message || '';
        if (m.includes('Invalid login credentials')) alert('Hatalı e-posta veya şifre.');
        else alert(`Giriş yapılamadı: ${m || 'bilinmeyen hata'}`);
        return;
      }
      const { data: ownerRow, error: ownerError } = await supabase
        .from('owners')
        .select('display_name')
        .eq('user_id', data.user.id)
        .maybeSingle();
      if (ownerError) {
        alert(
          'Sahip yetkisi kontrol edilemedi (kurulum eksik olabilir).\n\n' +
          `Teknik detay: ${ownerError.message}\n\n` +
          'Çözüm: supabase_migrations/create_owner_dashboard.sql dosyasını Supabase SQL Editor\'da çalıştır.'
        );
        await supabase.auth.signOut();
        return;
      }
      if (!ownerRow) {
        alert(`Bu hesap geçerli ama sahip yetkisi yok.\n\nHesap: ${data.user.email}`);
        await supabase.auth.signOut();
        return;
      }
      setDisplayName(ownerRow.display_name);
      setIsAuthenticated(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <DynamicBackground>
        <View style={st.centerContainer}>
          <View style={st.loginBox}>
            <Image source={asset('/images/icon.png')} style={st.loginLogo} resizeMode="contain" />
            <Text style={st.loginTitle}>Sahip Girişi 🔒</Text>
            <TextInput style={st.input} placeholder="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={C.inkLight} />
            <TextInput style={st.input} placeholder="Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={C.inkLight} />
            <TouchableOpacity style={st.loginButton} onPress={handleLogin} disabled={isLoggingIn}>
              {isLoggingIn ? <ActivityIndicator size="small" color="white" /> : <Text style={st.loginButtonText}>Giriş Yap</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 14, alignItems: 'center' }} onPress={() => router.back()}>
              <Text style={{ color: C.inkMid }}>Geri Dön</Text>
            </TouchableOpacity>
          </View>
        </View>
      </DynamicBackground>
    );
  }

  return <OwnerDashboard displayName={displayName} />;
}

const st = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginBox: { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, gap: 12 },
  loginLogo: { width: 56, height: 56, borderRadius: 14, alignSelf: 'center', marginBottom: 10 },
  loginTitle: { fontSize: F.screen, fontWeight: '700', color: C.ink, textAlign: 'center', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, fontSize: F.small + 1, color: C.ink },
  loginButton: { backgroundColor: C.accent, borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 4 },
  loginButtonText: { color: '#fff', fontWeight: '700', fontSize: F.small + 1 },
});
