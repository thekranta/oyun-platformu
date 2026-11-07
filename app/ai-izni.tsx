import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setAiConsent, type AiConsentScope } from '../lib/aiConsent';
import { finishAiConsentFlow } from '../lib/aiConsentFlow';
import { legalUrl, openExternalLink } from '../lib/externalLink';
import { requestParentGate } from '../lib/parentGate';

/**
 * Yapay zekâ / ses izni ekranı (Apple 5.1.2(i)). `ensureAiConsent(scope)` (lib/aiConsentFlow.ts) buraya yönlendirir
 * ve ebeveynin kararını bekler. İzin, ebeveyn kapısını geçtikten sonra verilir; ekran karar verilmeden kapanırsa
 * (geri hareketi, donanım geri tuşu) izin verilmemiş sayılır.
 */
export default function AiIzni() {
    const { t } = useTranslation();
    const params = useLocalSearchParams<{ scope?: string }>();
    const scope: AiConsentScope = params.scope === 'voice' ? 'voice' : 'report';

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const decidedRef = useRef(false);

    useEffect(() => () => {
        if (!decidedRef.current) finishAiConsentFlow(false);
    }, []);

    const close = (granted: boolean) => {
        decidedRef.current = true;
        finishAiConsentFlow(granted);
        router.back();
    };

    const allow = async () => {
        if (busy) return;
        setError(null);
        setBusy(true);
        try {
            const passed = await requestParentGate();
            if (!passed) return;
            const saved = await setAiConsent(scope, true);
            if (!saved) {
                setError(t('aiConsent.saveFailed'));
                return;
            }
            close(true);
        } finally {
            setBusy(false);
        }
    };

    const rows: { label: string; text: string }[] = [
        { label: t('aiConsent.whatLabel'), text: t(`aiConsent.${scope}.what`) },
        { label: t('aiConsent.whoLabel'), text: t(`aiConsent.${scope}.who`) },
        { label: t('aiConsent.whyLabel'), text: t(`aiConsent.${scope}.why`) },
        { label: t('aiConsent.keptLabel'), text: t(`aiConsent.${scope}.kept`) },
    ];

    return (
        <SafeAreaView style={styles.root}>
            <View style={styles.header}>
                <Pressable onPress={() => close(false)} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('aiConsent.decline')}>
                    <Ionicons name="chevron-back" size={24} color="#584B40" />
                </Pressable>
                <Text style={styles.headerTitle} accessibilityRole="header">{t('aiConsent.title')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.icon}>{scope === 'voice' ? '🎤' : '📝'}</Text>
                    <Text style={styles.heading}>{t(`aiConsent.${scope}.heading`)}</Text>
                    <Text style={styles.parentNote}>{t('aiConsent.askParent')}</Text>
                    {rows.map((row) => (
                        <View key={row.label} style={styles.row}>
                            <Text style={styles.rowLabel}>{row.label}</Text>
                            <Text style={styles.rowText}>{row.text}</Text>
                        </View>
                    ))}
                    <Text style={styles.note}>{t('aiConsent.providerNote')}</Text>
                    <Text style={styles.note}>{t('aiConsent.withdrawNote')}</Text>
                    <Pressable onPress={() => { openExternalLink(legalUrl('privacy')); }} accessibilityRole="link" style={styles.linkBtn}>
                        <Text style={styles.link}>{t('aiConsent.privacyLink')}</Text>
                    </Pressable>
                    {error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
                    <Pressable onPress={allow} disabled={busy} accessibilityRole="button" style={[styles.allow, busy && styles.disabled]}>
                        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.allowText}>{t('aiConsent.allow')}</Text>}
                    </Pressable>
                    <Pressable onPress={() => close(false)} accessibilityRole="button" style={styles.decline}>
                        <Text style={styles.declineText}>{t('aiConsent.decline')}</Text>
                    </Pressable>
                </View>
            </ScrollView>
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
    icon: { fontSize: 40, textAlign: 'center' },
    heading: { fontSize: 21, fontWeight: '800', color: '#584B40', textAlign: 'center', marginTop: 6 },
    parentNote: { fontSize: 13, fontWeight: '700', color: '#A07D2F', textAlign: 'center', marginTop: 6, marginBottom: 10 },
    row: { marginTop: 12 },
    rowLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, color: '#A27D59', textTransform: 'uppercase' },
    rowText: { fontSize: 15, color: '#584B40', lineHeight: 22, marginTop: 2 },
    note: { fontSize: 13, color: '#756753', lineHeight: 20, marginTop: 14 },
    linkBtn: { paddingVertical: 10, alignSelf: 'flex-start' },
    link: { fontSize: 14, fontWeight: '700', color: '#3F7D72', textDecorationLine: 'underline' },
    error: { fontSize: 13, fontWeight: '700', color: '#A5503F', marginTop: 8 },
    allow: { backgroundColor: '#3F7D72', paddingVertical: 15, borderRadius: 16, marginTop: 14, alignItems: 'center' },
    allowText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    disabled: { opacity: 0.7 },
    decline: { paddingVertical: 14, marginTop: 4, alignItems: 'center' },
    declineText: { color: '#756753', fontSize: 15, fontWeight: '700' },
});
