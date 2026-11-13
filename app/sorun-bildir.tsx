import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDeviceInfo, getDiagnosticContext, recentErrorsText } from '../lib/diagnostics';
import { submitBugReport } from '../services/bugReports';

/**
 * "Sorun bildir": yetişkin menüsünden ve "Hesap ve gizlilik"ten açılır. Testçi/veli yalnız "ne oldu"yu yazar;
 * cihaz modeli, Android/iOS sürümü, uygulama sürümü, son ekran/oyun ve son hatalar OTOMATİK eklenir
 * (lib/diagnostics.ts, services/bugReports.ts). Çocuk adı/e-posta/kimlik gönderilmez.
 *
 * Android klavye dersleri (index.tsx GirisFormu): girdiler KONTROLSÜZ (defaultValue + ref), kapsayıcı collapsable={false},
 * odakta gölge/elevation yok.
 */

const MIN_NOTE = 5;

export default function SorunBildir() {
    const { t } = useTranslation();
    const device = useMemo(() => getDeviceInfo(), []);
    const lastGame = useMemo(() => getDiagnosticContext().lastGame, []);
    const gameRef = useRef(lastGame);
    const noteRef = useRef('');
    const [focused, setFocused] = useState<'game' | 'note' | null>(null);
    const [phase, setPhase] = useState<'form' | 'sending' | 'sent' | 'queued'>('form');
    const [problem, setProblem] = useState<string | null>(null);
    const [kbHeight, setKbHeight] = useState(0);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates?.height ?? 0));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
        return () => { show.remove(); hide.remove(); };
    }, []);

    const summary = [
        device.model,
        device.osVersion,
        device.appVersion ? `v${device.appVersion}${device.buildNumber ? ` (${device.buildNumber})` : ''}` : null,
    ].filter(Boolean).join(' · ');

    const send = async () => {
        if (phase === 'sending') return;
        const note = noteRef.current.trim();
        if (note.length < MIN_NOTE) { setProblem(t('bugReport.tooShort')); return; }
        setProblem(null);
        setPhase('sending');
        try {
            const result = await submitBugReport({
                kind: 'manual',
                game: gameRef.current,
                note,
                errorText: recentErrorsText(),
            });
            setPhase(result);
        } catch {
            setPhase('form');
            setProblem(t('bugReport.failed'));
        }
    };

    const sending = phase === 'sending';

    return (
        <SafeAreaView style={styles.root}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('bugReport.back')}>
                    <Ionicons name="chevron-back" size={24} color="#584B40" />
                </Pressable>
                <Text style={styles.headerTitle} accessibilityRole="header">{t('bugReport.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 24 + kbHeight }]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
            >
                <View style={styles.card}>
                    {(phase === 'sent' || phase === 'queued') ? (
                        <View>
                            <Text style={styles.doneTitle}>{t('bugReport.thanksTitle')}</Text>
                            <Text style={styles.body}>{phase === 'sent' ? t('bugReport.thanksSent') : t('bugReport.thanksQueued')}</Text>
                            <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.primary}>
                                <Text style={styles.primaryText}>{t('bugReport.done')}</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View>
                            <Text style={styles.body}>{t('bugReport.intro')}</Text>

                            <Text style={styles.label}>{t('bugReport.gameLabel')}</Text>
                            <View collapsable={false} style={[styles.field, focused === 'game' && styles.fieldFocused]}>
                                <TextInput
                                    style={styles.input}
                                    defaultValue={lastGame}
                                    placeholder={t('bugReport.gamePlaceholder')}
                                    placeholderTextColor="#A39A8B"
                                    onChangeText={(v) => { gameRef.current = v; }}
                                    autoCorrect={false}
                                    autoComplete="off"
                                    importantForAutofill="no"
                                    disableFullscreenUI
                                    maxLength={80}
                                    onFocus={() => setFocused('game')}
                                    onBlur={() => setFocused(null)}
                                />
                            </View>

                            <Text style={styles.label}>{t('bugReport.noteLabel')}</Text>
                            <View collapsable={false} style={[styles.field, focused === 'note' && styles.fieldFocused]}>
                                <TextInput
                                    style={[styles.input, styles.noteInput]}
                                    placeholder={t('bugReport.notePlaceholder')}
                                    placeholderTextColor="#A39A8B"
                                    onChangeText={(v) => { noteRef.current = v; if (problem) setProblem(null); }}
                                    multiline
                                    textAlignVertical="top"
                                    autoComplete="off"
                                    importantForAutofill="no"
                                    disableFullscreenUI
                                    maxLength={1000}
                                    onFocus={() => setFocused('note')}
                                    onBlur={() => setFocused(null)}
                                />
                            </View>

                            <Text style={styles.privacy}>{t('bugReport.privacy')}</Text>
                            {!!summary && <Text style={styles.auto}>{t('bugReport.autoInfo', { info: summary })}</Text>}
                            {!!problem && <Text style={styles.problem} accessibilityRole="alert">{problem}</Text>}

                            <Pressable onPress={send} disabled={sending} accessibilityRole="button" style={[styles.primary, sending && styles.disabled]}>
                                {sending
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={styles.primaryText}>{t('bugReport.submit')}</Text>}
                            </Pressable>
                        </View>
                    )}
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
    body: { fontSize: 14, color: '#756753', lineHeight: 21 },
    label: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1, color: '#A27D59', textTransform: 'uppercase', marginTop: 18, marginBottom: 8 },
    // Kenarlık kalınlığı SABİT; odakta yalnız renk değişir (gölge/elevation yok).
    field: { borderWidth: 1.5, borderColor: '#E5DCCB', borderRadius: 14, backgroundColor: '#FBF8F0' },
    fieldFocused: { borderColor: '#3F7D72' },
    input: { fontSize: 15, color: '#584B40', paddingHorizontal: 14, paddingVertical: 11, minHeight: 46 },
    noteInput: { minHeight: 130 },
    privacy: { fontSize: 12, color: '#8A7C68', lineHeight: 18, marginTop: 14 },
    auto: { fontSize: 12, color: '#8A7C68', lineHeight: 18, marginTop: 8 },
    problem: { fontSize: 13, fontWeight: '700', color: '#B3392B', marginTop: 12 },
    primary: { backgroundColor: '#3F7D72', minHeight: 50, paddingVertical: 14, borderRadius: 16, marginTop: 20, alignItems: 'center', justifyContent: 'center' },
    primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    disabled: { opacity: 0.6 },
    doneTitle: { fontSize: 20, fontWeight: '800', color: '#3F7D72', marginBottom: 10 },
});
