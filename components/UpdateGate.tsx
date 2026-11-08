import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { openExternalLink } from '../lib/externalLink';
import { fetchUpdateRequirement, type UpdateRequirement } from '../lib/updateGate';

const RECHECK_MS = 10 * 60 * 1000;

/**
 * Zorunlu güncelleme kapısı: mobilde, en düşük sürümün altındaki kurulumda uygulamanın yerine "Güncelle" ekranı gösterir.
 * Mantık ve fail-open kuralı: lib/updateGate.ts. Mağaza bağlantısı ebeveyn kapısından geçer (openExternalLink).
 */
export default function UpdateGate({ children }: { children: ReactNode }) {
    const { t } = useTranslation();
    const [req, setReq] = useState<UpdateRequirement>({ required: false, url: null });
    const lastCheck = useRef(0);

    const check = useCallback(async () => {
        lastCheck.current = Date.now();
        const next = await fetchUpdateRequirement();
        setReq(next);
    }, []);

    useEffect(() => {
        if (Platform.OS === 'web') return;
        check();
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && Date.now() - lastCheck.current > RECHECK_MS) check();
        });
        return () => sub.remove();
    }, [check]);

    if (!req.required || !req.url) return <>{children}</>;

    const url = req.url;
    return (
        <View style={styles.wrap}>
            <View style={styles.card}>
                <Image source={require('../assets/branding/mascot/gulumser.webp')} style={styles.mascot} resizeMode="contain" />
                <Text style={styles.title} accessibilityRole="header">{t('updateGate.title')}</Text>
                <Text style={styles.body}>{t('updateGate.body')}</Text>
                <Pressable
                    style={({ pressed }) => [styles.button, pressed && styles.pressed]}
                    onPress={() => openExternalLink(url)}
                    accessibilityRole="button"
                    accessibilityLabel={t('updateGate.button')}
                >
                    <Text style={styles.buttonText}>{t('updateGate.button')}</Text>
                </Pressable>
                <Text style={styles.hint}>{t('updateGate.hint')}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: '#FAF2E4', justifyContent: 'center', alignItems: 'center', padding: 24 },
    card: { backgroundColor: '#FFFCF5', borderRadius: 26, paddingVertical: 28, paddingHorizontal: 22, width: '100%', maxWidth: 380, alignItems: 'center' },
    mascot: { width: 120, height: 120 },
    title: { fontSize: 22, fontWeight: '800', color: '#584B40', marginTop: 10, textAlign: 'center' },
    body: { fontSize: 15, color: '#756753', lineHeight: 22, marginTop: 8, textAlign: 'center' },
    button: { marginTop: 20, backgroundColor: '#3BBBAA', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 32, minWidth: 200, alignItems: 'center' },
    pressed: { opacity: 0.85 },
    buttonText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
    hint: { fontSize: 12, color: '#8A7A63', marginTop: 14, textAlign: 'center' },
});
