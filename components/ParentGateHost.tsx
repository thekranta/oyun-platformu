import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
    createGateChallenge,
    GATE_MAX_WRONG,
    gateLockoutRemaining,
    isGateAnswerCorrect,
    setParentGateOpener,
    type GateChallenge,
} from '../lib/parentGate';

/**
 * Ebeveyn kapısı arayüzü. Kök yerleşimde (app/_layout.tsx) bir kez bağlanır; `requestParentGate()`
 * çağrıları burada bir çoktan seçmeli çarpma sorusu olarak görünür. Mantık: lib/parentGate.ts.
 */
export default function ParentGateHost() {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [challenge, setChallenge] = useState<GateChallenge>(() => createGateChallenge());
    const [wrongCount, setWrongCount] = useState(0);
    const [lockedAt, setLockedAt] = useState<number | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [showWrong, setShowWrong] = useState(false);
    const resolverRef = useRef<((ok: boolean) => void) | null>(null);

    const finish = useCallback((ok: boolean) => {
        const resolve = resolverRef.current;
        resolverRef.current = null;
        setVisible(false);
        resolve?.(ok);
    }, []);

    const open = useCallback(() => {
        // Açık bir istek varken yenisi gelirse eskisi vazgeçilmiş sayılır.
        resolverRef.current?.(false);
        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
            setChallenge(createGateChallenge());
            setWrongCount(0);
            setLockedAt(null);
            setShowWrong(false);
            setNow(Date.now());
            setVisible(true);
        });
    }, []);

    useEffect(() => {
        setParentGateOpener(open);
        return () => {
            setParentGateOpener(null);
            resolverRef.current?.(false);
            resolverRef.current = null;
        };
    }, [open]);

    const remainingMs = gateLockoutRemaining(wrongCount, lockedAt, now);
    const locked = remainingMs > 0;

    // Bekleme süresi boyunca geri sayımı güncelle; süre bitince yeni soru ver.
    useEffect(() => {
        if (!visible || lockedAt === null) return;
        const timer = setInterval(() => {
            const current = Date.now();
            setNow(current);
            if (gateLockoutRemaining(GATE_MAX_WRONG, lockedAt, current) === 0) {
                setLockedAt(null);
                setWrongCount(0);
                setShowWrong(false);
                setChallenge(createGateChallenge());
            }
        }, 500);
        return () => clearInterval(timer);
    }, [visible, lockedAt]);

    const pick = (value: number) => {
        if (locked) return;
        if (isGateAnswerCorrect(challenge, value)) {
            finish(true);
            return;
        }
        const nextWrong = wrongCount + 1;
        setWrongCount(nextWrong);
        setShowWrong(true);
        if (nextWrong >= GATE_MAX_WRONG) {
            const current = Date.now();
            setNow(current);
            setLockedAt(current);
        } else {
            setChallenge(createGateChallenge());
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => finish(false)}>
            <View style={styles.overlay}>
                <View style={styles.card} accessibilityViewIsModal>
                    <Text style={styles.icon}>🔐</Text>
                    <Text style={styles.title} accessibilityRole="header">{t('parentGate.title')}</Text>
                    <Text style={styles.body}>{t('parentGate.body')}</Text>
                    <Text style={styles.question} accessibilityLabel={t('parentGate.questionLabel', { a: challenge.a, b: challenge.b })}>
                        {challenge.a} × {challenge.b} = ?
                    </Text>
                    <View style={styles.options}>
                        {challenge.options.map((value) => (
                            <Pressable
                                key={value}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: locked }}
                                disabled={locked}
                                onPress={() => pick(value)}
                                style={[styles.option, locked && styles.optionLocked]}
                            >
                                <Text style={[styles.optionText, locked && styles.optionTextLocked]}>{value}</Text>
                            </Pressable>
                        ))}
                    </View>
                    {locked ? (
                        <Text style={styles.warn} accessibilityLiveRegion="polite">
                            {t('parentGate.locked', { seconds: Math.ceil(remainingMs / 1000) })}
                        </Text>
                    ) : showWrong ? (
                        <Text style={styles.warn} accessibilityLiveRegion="polite">{t('parentGate.wrong')}</Text>
                    ) : null}
                    <Pressable accessibilityRole="button" onPress={() => finish(false)} style={styles.cancel}>
                        <Text style={styles.cancelText}>{t('parentGate.cancel')}</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#2B2317CC', justifyContent: 'center', alignItems: 'center', padding: 24 },
    card: { backgroundColor: '#FFFCF5', borderRadius: 26, paddingVertical: 26, paddingHorizontal: 22, width: '100%', maxWidth: 380, alignItems: 'center' },
    icon: { fontSize: 38 },
    title: { fontSize: 22, fontWeight: '800', color: '#584B40', marginTop: 6, textAlign: 'center' },
    body: { fontSize: 14, color: '#756753', lineHeight: 21, marginTop: 8, textAlign: 'center' },
    question: { fontSize: 34, fontWeight: '900', color: '#3F7D72', marginTop: 16, marginBottom: 14 },
    options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
    option: { minWidth: 92, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#EFE7D9', alignItems: 'center' },
    optionLocked: { opacity: 0.45 },
    optionText: { fontSize: 22, fontWeight: '800', color: '#584B40' },
    optionTextLocked: { color: '#8A7A63' },
    warn: { fontSize: 14, fontWeight: '700', color: '#A5503F', marginTop: 14, textAlign: 'center' },
    cancel: { alignSelf: 'stretch', paddingVertical: 12, marginTop: 14, alignItems: 'center' },
    cancelText: { color: '#756753', fontSize: 15, fontWeight: '700' },
});
