import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import InstitutionDashboard, { C } from '../components/InstitutionDashboard';
import { asset } from '../lib/assetMap';
import { createInstitutionSource, fetchAdminInstitutions } from '../lib/institutionApi';
import { createDemoInstitution } from '../lib/institutionDemo';
import { InstitutionInfo } from '../lib/institutionStats';
import { supabase } from '../lib/supabase';

// ============================================
// 🏛️ KURUM GİRİŞİ (/kurum) — kurum yöneticisinin kendi giriş noktası
// Öğretmen panelinden BAĞIMSIZDIR: yönetici için öğretmen kaydı gerekmez; yönetici olup olmadığı yalnız
// sunucudaki üyelikten (institution_members) anlaşılır. Oturum kalıcıdır: dönen yönetici doğrudan panele düşer.
// "Örnek kurumu incele" satış gösterisi içindir (uydurma veri, panelde "DEMO VERİ" etiketi görünür).
// ============================================

type Phase = 'checking' | 'login' | 'panel';

export default function KurumPage() {
    const { t } = useTranslation();
    const [phase, setPhase] = useState<Phase>('checking');
    const [institutions, setInstitutions] = useState<InstitutionInfo[]>([]);
    const [demo, setDemo] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);

    // Önceki oturum yönetici hesabıysa doğrudan panele; değilse (ör. veli/öğretmen oturumu) oturumu BOZMADAN girişi göster.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    const list = await fetchAdminInstitutions();
                    if (!cancelled && list && list.length > 0) {
                        setInstitutions(list);
                        setPhase('panel');
                        return;
                    }
                }
            } catch {
                /* giriş ekranına düşer */
            }
            if (!cancelled) setPhase('login');
        })();
        return () => { cancelled = true; };
    }, []);

    const demoInstitution = useMemo(() => (demo ? createDemoInstitution() : null), [demo]);
    const real = institutions[0] ?? null;
    const realSource = useMemo(() => (real ? createInstitutionSource(real.id) : null), [real]);

    const signIn = async () => {
        setError(null);
        setInfo(null);
        if (!email.trim() || !password) { setError(t('institution.login.missing')); return; }
        setBusy(true);
        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
            if (authError || !data.user) { setError(t('institution.login.invalid')); return; }
            const list = await fetchAdminInstitutions();
            if (list === undefined) {
                setError(t('institution.login.notReady'));
                await supabase.auth.signOut();
                return;
            }
            if (list.length === 0) {
                setError(t('institution.login.notAdmin'));
                await supabase.auth.signOut();
                return;
            }
            setPassword('');
            setInstitutions(list);
            setPhase('panel');
        } catch {
            setError(t('institution.login.invalid'));
        } finally {
            setBusy(false);
        }
    };

    const forgot = async () => {
        setError(null);
        setInfo(null);
        if (!email.trim()) { setError(t('institution.login.resetNeedEmail')); return; }
        try {
            const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: 'https://oyun-platformu.vercel.app/reset-password',
            });
            if (e) throw e;
            setInfo(t('institution.login.resetSent'));
        } catch {
            setError(t('institution.login.resetFailed'));
        }
    };

    const signOut = async () => {
        try { await supabase.auth.signOut(); } catch { /* sessiz */ }
        setInstitutions([]);
        setPassword('');
        setPhase('login');
    };

    if (phase === 'panel' && real && realSource) {
        return <InstitutionDashboard institution={real} source={realSource} onSignOut={signOut} />;
    }
    if (demoInstitution) {
        return <InstitutionDashboard institution={demoInstitution.info} source={demoInstitution.source} onClose={() => setDemo(false)} />;
    }
    if (phase === 'checking') {
        return (
            <View style={[styles.screen, styles.center]}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.checking}>{t('institution.login.checking')}</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Image source={asset('/images/icon.png')} style={styles.logo} resizeMode="contain" />
                    <Text style={styles.eyebrow}>{t('institution.panelTitle').toLocaleUpperCase('tr-TR')}</Text>
                    <Text style={styles.title}>{t('institution.login.title')}</Text>
                    <Text style={styles.subtitle}>{t('institution.login.subtitle')}</Text>

                    <Text style={styles.label}>{t('institution.login.email')}</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="ornek@kurum.com"
                        placeholderTextColor="#9AA6B8"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        textContentType="username"
                        autoComplete="email"
                        returnKeyType="next"
                        editable={!busy}
                    />
                    <Text style={styles.label}>{t('institution.login.password')}</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        placeholderTextColor="#9AA6B8"
                        secureTextEntry
                        autoCapitalize="none"
                        textContentType="password"
                        autoComplete="current-password"
                        returnKeyType="go"
                        onSubmitEditing={signIn}
                        editable={!busy}
                    />

                    {!!error && (
                        <View style={styles.errorBox} accessibilityRole="alert">
                            <Ionicons name="alert-circle" size={18} color={C.bad} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}
                    {!!info && (
                        <View style={styles.infoBox}>
                            <Ionicons name="checkmark-circle" size={18} color={C.good} />
                            <Text style={styles.infoText}>{info}</Text>
                        </View>
                    )}

                    <TouchableOpacity style={[styles.submit, busy && { opacity: 0.7 }]} onPress={signIn} disabled={busy} accessibilityRole="button">
                        {busy
                            ? <><ActivityIndicator color="#fff" /><Text style={styles.submitText}>{t('institution.login.submitting')}</Text></>
                            : <Text style={styles.submitText}>{t('institution.login.submit')}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={forgot} style={styles.linkBtn} accessibilityRole="button">
                        <Text style={styles.link}>{t('institution.login.forgot')}</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.demoBtn} onPress={() => setDemo(true)} accessibilityRole="button">
                        <Ionicons name="eye" size={18} color={C.primaryDark} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.demoTitle}>{t('institution.login.demo')}</Text>
                            <Text style={styles.demoHint}>{t('institution.login.demoHint')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={C.primaryDark} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.footer}>{t('institution.login.footer')}</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const shadow = Platform.select({
    web: { boxShadow: '0 6px 28px rgba(27,43,69,0.10)' } as object,
    default: { shadowColor: '#1B2B45', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 5 },
});

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
    checking: { fontSize: 14, color: C.muted, fontWeight: '600' },
    scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingVertical: 36 },
    card: { width: '100%', maxWidth: 420, backgroundColor: C.card, borderRadius: 24, padding: 24, ...(shadow as object) },
    logo: { width: 56, height: 56, borderRadius: 14, marginBottom: 14 },
    eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: C.primary },
    title: { fontSize: 26, fontWeight: '800', color: C.ink, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 6, marginBottom: 18, lineHeight: 20, fontWeight: '500' },
    label: { fontSize: 12.5, fontWeight: '700', color: C.ink, marginTop: 12, marginBottom: 6 },
    input: {
        height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.bg,
        paddingHorizontal: 14, fontSize: 15, color: C.ink,
    },
    errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.badSoft, borderRadius: 12, padding: 12, marginTop: 14 },
    errorText: { flex: 1, fontSize: 13, color: C.bad, fontWeight: '600', lineHeight: 18 },
    infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.goodSoft, borderRadius: 12, padding: 12, marginTop: 14 },
    infoText: { flex: 1, fontSize: 13, color: C.good, fontWeight: '600', lineHeight: 18 },
    submit: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 14,
        backgroundColor: C.primary, marginTop: 18,
    },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    linkBtn: { alignSelf: 'center', paddingVertical: 12 },
    link: { fontSize: 13.5, color: C.primaryDark, fontWeight: '700' },
    divider: { height: 1, backgroundColor: C.line, marginVertical: 6 },
    demoBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.primarySoft, borderRadius: 14, padding: 14, marginTop: 10 },
    demoTitle: { fontSize: 14.5, fontWeight: '800', color: C.primaryDark },
    demoHint: { fontSize: 12, color: '#3C7F78', marginTop: 2, fontWeight: '600' },
    footer: { fontSize: 12, color: C.muted, marginTop: 18, textAlign: 'center', fontWeight: '600' },
});
