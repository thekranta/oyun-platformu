import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteAccount, type DeleteFailure } from '../lib/accountDeletion';
import { supabase } from '../lib/supabase';

/**
 * Hesabı ve verileri silme — HEM uygulama içi (Hesap ve gizlilik → Hesabımı sil) HEM de herkese açık web adresi
 * (https://oyun.childhoodtech.com/hesap-sil; Google Play "Hesap silme bağlantısı" olarak girilir).
 * Oturum açık değilse e-posta da burada sorulur. Her durumda şifre yeniden istenir (güvenlik + sunucu tazelik şartı).
 */

const FAILURE_KEY: Record<DeleteFailure, string> = {
    wrong_password: 'deleteAccount.wrongPassword',
    reauth_required: 'deleteAccount.reauth',
    admin_account: 'deleteAccount.admin',
    not_configured: 'deleteAccount.notConfigured',
    network: 'deleteAccount.network',
    server: 'deleteAccount.server',
};

function goHome() {
    try {
        if (router.canDismiss?.()) router.dismissAll();
    } catch {
        // yığın zaten tek ekran
    }
    router.replace('/');
}

export default function HesapSil() {
    const { t } = useTranslation();
    const [sessionEmail, setSessionEmail] = useState<string | null>(null);
    const [emailInput, setEmailInput] = useState('');
    const [password, setPassword] = useState('');
    const [understood, setUnderstood] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [focused, setFocused] = useState<'email' | 'password' | null>(null);

    useEffect(() => {
        let alive = true;
        supabase.auth.getSession().then(({ data }) => {
            if (alive) setSessionEmail(data.session?.user?.email ?? null);
        }).catch(() => { });
        return () => { alive = false; };
    }, []);

    const email = (sessionEmail ?? emailInput).trim();

    const submit = async () => {
        if (busy) return;
        setError(null);
        if (!email || !password) { setError(t('deleteAccount.needFields')); return; }
        if (!understood) { setError(t('deleteAccount.needConfirm')); return; }
        setBusy(true);
        const result = await deleteAccount(email, password);
        setBusy(false);
        if (result.ok) { setDone(true); return; }
        setError(t(FAILURE_KEY[result.reason]));
    };

    if (done) {
        return (
            <SafeAreaView style={styles.root}>
                <View style={styles.doneBox}>
                    <Text style={styles.doneIcon}>✅</Text>
                    <Text style={styles.doneTitle}>{t('deleteAccount.doneTitle')}</Text>
                    <Text style={styles.doneBody}>{t('deleteAccount.doneBody')}</Text>
                    <Pressable onPress={goHome} accessibilityRole="button" style={styles.doneBtn}>
                        <Text style={styles.doneBtnText}>{t('deleteAccount.done')}</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.root}>
            <View style={styles.header}>
                <Pressable onPress={() => (router.canGoBack() ? router.back() : goHome())} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('account.back')}>
                    <Ionicons name="chevron-back" size={24} color="#584B40" />
                </Pressable>
                <Text style={styles.headerTitle} accessibilityRole="header">{t('deleteAccount.title')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        <Text style={styles.intro}>{t('deleteAccount.intro')}</Text>

                        <Text style={styles.sectionTitle}>{t('deleteAccount.willDeleteTitle')}</Text>
                        {(t('deleteAccount.willDelete', { returnObjects: true }) as unknown as string[]).map((line) => (
                            <Text key={line} style={styles.bullet}>•  {line}</Text>
                        ))}

                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('deleteAccount.willKeepTitle')}</Text>
                        <Text style={styles.body}>{t('deleteAccount.willKeep')}</Text>

                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{t('deleteAccount.emailLabel')}</Text>
                        {sessionEmail ? (
                            <Text style={styles.emailFixed}>{sessionEmail}</Text>
                        ) : (
                            <View collapsable={false} style={[styles.inputBox, focused === 'email' && styles.inputBoxFocused]}>
                                <TextInput
                                    style={styles.input}
                                    value={emailInput}
                                    onChangeText={setEmailInput}
                                    placeholder={t('deleteAccount.emailLabel')}
                                    placeholderTextColor="#9E9E9E"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    onFocus={() => setFocused('email')}
                                    onBlur={() => setFocused(null)}
                                />
                            </View>
                        )}

                        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{t('deleteAccount.passwordLabel')}</Text>
                        <View collapsable={false} style={[styles.inputBox, focused === 'password' && styles.inputBoxFocused]}>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder={t('deleteAccount.passwordHint')}
                                placeholderTextColor="#9E9E9E"
                                secureTextEntry
                                autoCapitalize="none"
                                autoCorrect={false}
                                onFocus={() => setFocused('password')}
                                onBlur={() => setFocused(null)}
                            />
                        </View>

                        <Pressable onPress={() => setUnderstood((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: understood }} style={styles.checkRow}>
                            <View style={[styles.checkbox, understood && styles.checkboxOn]}>
                                {understood && <Ionicons name="checkmark" size={16} color="#fff" />}
                            </View>
                            <Text style={styles.checkText}>{t('deleteAccount.confirmCheck')}</Text>
                        </Pressable>

                        {error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}

                        <Pressable onPress={submit} disabled={busy} accessibilityRole="button" style={[styles.submit, busy && styles.disabled]}>
                            {busy ? (
                                <View style={styles.busyRow}>
                                    <ActivityIndicator color="#fff" />
                                    <Text style={styles.submitText}>{t('deleteAccount.working')}</Text>
                                </View>
                            ) : (
                                <Text style={styles.submitText}>{t('deleteAccount.submit')}</Text>
                            )}
                        </Pressable>
                        <Text style={styles.help}>{t('deleteAccount.help')}</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FAF2E4' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#584B40' },
    content: { padding: 16, alignItems: 'center' },
    card: { width: '100%', maxWidth: 520, backgroundColor: '#FFFCF5', borderRadius: 26, padding: 22 },
    intro: { fontSize: 15, color: '#584B40', lineHeight: 22, fontWeight: '600' },
    sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1, color: '#A27D59', textTransform: 'uppercase', marginTop: 16, marginBottom: 6 },
    bullet: { fontSize: 15, color: '#584B40', lineHeight: 23 },
    body: { fontSize: 14, color: '#756753', lineHeight: 21 },
    emailFixed: { fontSize: 16, fontWeight: '700', color: '#584B40' },
    inputBox: { borderWidth: 1.5, borderColor: '#D7CBBA', borderRadius: 14, paddingHorizontal: 12, backgroundColor: '#fff' },
    inputBoxFocused: { borderColor: '#3F7D72' },
    input: { fontSize: 16, color: '#263238', paddingVertical: 12 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
    checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#A5503F', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
    checkboxOn: { backgroundColor: '#A5503F' },
    checkText: { flex: 1, fontSize: 14, color: '#584B40', lineHeight: 20 },
    error: { fontSize: 14, fontWeight: '700', color: '#A5503F', marginTop: 14, lineHeight: 20 },
    submit: { backgroundColor: '#B3392B', paddingVertical: 15, borderRadius: 16, marginTop: 18, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    disabled: { opacity: 0.7 },
    help: { fontSize: 12, color: '#8A7A63', lineHeight: 18, marginTop: 14, textAlign: 'center' },
    doneBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
    doneIcon: { fontSize: 54 },
    doneTitle: { fontSize: 22, fontWeight: '800', color: '#584B40', marginTop: 10, textAlign: 'center' },
    doneBody: { fontSize: 15, color: '#756753', lineHeight: 22, marginTop: 10, textAlign: 'center', maxWidth: 420 },
    doneBtn: { backgroundColor: '#3F7D72', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 16, marginTop: 24 },
    doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
