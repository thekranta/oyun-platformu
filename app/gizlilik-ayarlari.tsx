import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAiConsent, isScopeGranted, setAiConsent, type AiConsent, type AiConsentScope } from '../lib/aiConsent';
import { legalUrl, openExternalLink, subscriptionManagementUrl } from '../lib/externalLink';
import { requestParentGate } from '../lib/parentGate';

/**
 * "Hesap ve gizlilik": yapay zekâ izinlerini yönetme (verme/geri alma), yasal metinler, mağaza aboneliğini
 * yönetme ve hesap silme. Yetişkin menüsünden (çocuk odası) ve veli/öğretmen panellerinden açılır.
 */
export default function GizlilikAyarlari() {
    const { t } = useTranslation();
    const [signedIn, setSignedIn] = useState<boolean | null>(null);
    const [consent, setConsent] = useState<AiConsent | null>(null);
    const [busyScope, setBusyScope] = useState<AiConsentScope | null>(null);

    const refresh = useCallback(async () => {
        const { userId, consent: current } = await getAiConsent();
        setSignedIn(userId !== null);
        setConsent(current);
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const toggle = async (scope: AiConsentScope) => {
        if (!consent || busyScope) return;
        const turningOn = !isScopeGranted(consent, scope);
        setBusyScope(scope);
        try {
            // İzni açmak ebeveyn kapısını geçmeyi gerektirir; kapatmak her zaman serbest.
            if (turningOn && !(await requestParentGate())) return;
            await setAiConsent(scope, turningOn);
            await refresh();
        } finally {
            setBusyScope(null);
        }
    };

    const manageUrl = subscriptionManagementUrl();

    const aiRows: { scope: AiConsentScope; title: string; desc: string }[] = [
        { scope: 'voice', title: t('account.voiceTitle'), desc: t('account.voiceDesc') },
        { scope: 'report', title: t('account.reportTitle'), desc: t('account.reportDesc') },
    ];

    return (
        <SafeAreaView style={styles.root}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('account.back')}>
                    <Ionicons name="chevron-back" size={24} color="#584B40" />
                </Pressable>
                <Text style={styles.headerTitle} accessibilityRole="header">{t('account.title')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    {signedIn === false && (
                        <View style={styles.block}>
                            <Text style={styles.body}>{t('account.needLogin')}</Text>
                            <Pressable onPress={() => router.replace('/')} accessibilityRole="button" style={styles.primary}>
                                <Text style={styles.primaryText}>{t('account.goHome')}</Text>
                            </Pressable>
                        </View>
                    )}

                    {signedIn && consent && (
                        <View style={styles.block}>
                            <Text style={styles.sectionTitle}>{t('account.aiSection')}</Text>
                            <Text style={styles.body}>{t('account.aiIntro')}</Text>
                            {aiRows.map((row) => {
                                const on = isScopeGranted(consent, row.scope);
                                return (
                                    <View key={row.scope} style={styles.aiRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.rowTitle}>{row.title}</Text>
                                            <Text style={styles.rowDesc}>{row.desc}</Text>
                                            <Text style={[styles.state, on ? styles.stateOn : styles.stateOff]}>{on ? t('account.on') : t('account.off')}</Text>
                                        </View>
                                        <Pressable
                                            onPress={() => toggle(row.scope)}
                                            disabled={busyScope !== null}
                                            accessibilityRole="button"
                                            style={[styles.toggle, on ? styles.toggleOff : styles.toggleOn, busyScope !== null && styles.disabled]}
                                        >
                                            <Text style={[styles.toggleText, on && styles.toggleTextOff]}>{on ? t('account.turnOff') : t('account.turnOn')}</Text>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <View style={styles.block}>
                        <Text style={styles.sectionTitle}>{t('account.legalSection')}</Text>
                        <Pressable onPress={() => { openExternalLink(legalUrl('privacy')); }} accessibilityRole="link" style={styles.linkRow}>
                            <Text style={styles.link}>{t('account.privacy')}</Text>
                            <Ionicons name="open-outline" size={16} color="#3F7D72" />
                        </Pressable>
                        <Pressable onPress={() => { openExternalLink(legalUrl('terms')); }} accessibilityRole="link" style={styles.linkRow}>
                            <Text style={styles.link}>{t('account.terms')}</Text>
                            <Ionicons name="open-outline" size={16} color="#3F7D72" />
                        </Pressable>
                    </View>

                    {Platform.OS !== 'web' && manageUrl && (
                        <View style={styles.block}>
                            <Text style={styles.sectionTitle}>{t('account.subscriptionSection')}</Text>
                            <Text style={styles.body}>{t('account.subscriptionNote')}</Text>
                            <Pressable onPress={() => { openExternalLink(manageUrl); }} accessibilityRole="link" style={styles.linkRow}>
                                <Text style={styles.link}>{t('account.manageSubscription')}</Text>
                                <Ionicons name="open-outline" size={16} color="#3F7D72" />
                            </Pressable>
                        </View>
                    )}

                    <View style={styles.block}>
                        <Text style={styles.sectionTitle}>{t('account.deleteSection')}</Text>
                        <Text style={styles.body}>{t('account.deleteDesc')}</Text>
                        <Pressable onPress={() => router.push('/hesap-sil')} accessibilityRole="button" style={styles.danger}>
                            <Text style={styles.dangerText}>{t('account.deleteButton')}</Text>
                        </Pressable>
                    </View>
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
    block: { marginBottom: 24 },
    sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1, color: '#A27D59', textTransform: 'uppercase', marginBottom: 8 },
    body: { fontSize: 14, color: '#756753', lineHeight: 21 },
    aiRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EEE6D9' },
    rowTitle: { fontSize: 15, fontWeight: '800', color: '#584B40' },
    rowDesc: { fontSize: 13, color: '#756753', lineHeight: 19, marginTop: 2 },
    state: { fontSize: 12, fontWeight: '800', marginTop: 4 },
    stateOn: { color: '#3F7D72' },
    stateOff: { color: '#A07D2F' },
    toggle: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, minWidth: 76, alignItems: 'center' },
    toggleOn: { backgroundColor: '#3F7D72' },
    toggleOff: { backgroundColor: '#EFE7D9' },
    toggleText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    toggleTextOff: { color: '#584B40' },
    disabled: { opacity: 0.6 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
    link: { fontSize: 15, fontWeight: '700', color: '#3F7D72' },
    primary: { backgroundColor: '#3F7D72', paddingVertical: 14, borderRadius: 16, marginTop: 14, alignItems: 'center' },
    primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    danger: { borderWidth: 1.5, borderColor: '#B3392B', paddingVertical: 13, borderRadius: 16, marginTop: 12, alignItems: 'center' },
    dangerText: { color: '#B3392B', fontSize: 15, fontWeight: '800' },
});
