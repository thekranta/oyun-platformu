import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { legalUrl, subscriptionManagementUrl } from '../lib/externalLink';
import { isRecurring, periodKey, tierFromProductId, type PackageLike, type PaywallKind } from '../lib/paywall';

/**
 * Ödeme ekranının SUNUM katmanı (veri yükleme ve satın alma app/paket-satin-al.tsx'te). Fiyat metni mağazadan
 * (ülke para birimiyle) gelir; burada hiçbir fiyat yazılı değildir. Mağaza kuralları gereği: fiyat + süre,
 * otomatik yenileme notu, Kullanım Şartları ve Gizlilik bağlantıları, "Satın alımları geri yükle" bulunur.
 * Web fiyatı ya da web satın alma bağlantısı ASLA gösterilmez (iOS yönlendirme kuralı).
 */

export type PaywallState =
    | { phase: 'loading' }
    | { phase: 'unavailable' }
    | { phase: 'no-session' }
    | { phase: 'ready'; packages: PackageLike[] }
    | { phase: 'error'; message: string };

interface Props {
    kind: PaywallKind;
    state: PaywallState;
    banner: { kind: 'success' | 'error'; text: string } | null;
    purchasingId: string | null;
    restoring: boolean;
    onBack: () => void;
    onPurchase: (identifier: string) => void;
    onRestore: () => void;
    onOpenLink: (url: string) => void;
}

function Notice({ icon, title, text, danger }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; danger?: boolean }) {
    return (
        <View style={styles.centerBox}>
            <Ionicons name={icon} size={48} color={danger ? '#C62828' : '#607D8B'} />
            <Text style={styles.infoTitle}>{title}</Text>
            <Text style={styles.infoText}>{text}</Text>
        </View>
    );
}

export default function PaywallView({ kind, state, banner, purchasingId, restoring, onBack, onPurchase, onRestore, onOpenLink }: Props) {
    const { t } = useTranslation();
    const manageUrl = subscriptionManagementUrl();
    const tierLabelNs = kind === 'ogretmen' ? 'teacher.tier' : 'veli.tier';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('account.back')}>
                    <Ionicons name="chevron-back" size={24} color="#263238" />
                </Pressable>
                <Text style={styles.headerTitle} accessibilityRole="header">{t('paywall.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>{kind === 'ogretmen' ? t('paywall.subtitleOgretmen') : t('paywall.subtitleVeli')}</Text>

                {banner && (
                    <View style={[styles.banner, banner.kind === 'success' ? styles.bannerSuccess : styles.bannerError]} accessibilityLiveRegion="polite">
                        <Ionicons name={banner.kind === 'success' ? 'checkmark-circle' : 'alert-circle'} size={20} color={banner.kind === 'success' ? '#2E7D32' : '#C62828'} />
                        <Text style={[styles.bannerText, { color: banner.kind === 'success' ? '#2E7D32' : '#C62828' }]}>{banner.text}</Text>
                    </View>
                )}

                {state.phase === 'loading' && (
                    <View style={styles.centerBox}><ActivityIndicator size="large" color="#1E88E5" /></View>
                )}
                {state.phase === 'unavailable' && (
                    <Notice icon="time-outline" title={t('paywall.title')} text={t('paywall.unavailable')} />
                )}
                {state.phase === 'no-session' && (
                    <Notice icon="lock-closed-outline" title={t('paywall.noSessionTitle')} text={t('paywall.noSession')} />
                )}
                {state.phase === 'error' && (
                    <Notice icon="warning-outline" title={t('paywall.loadFailedTitle')} text={state.message || t('paywall.loadFailed')} danger />
                )}

                {state.phase === 'ready' && (
                    <>
                        {state.packages.length === 0 ? (
                            <Notice icon="pricetag-outline" title={t('paywall.noneTitle')} text={t('paywall.none')} />
                        ) : (
                            state.packages.map((pkg) => {
                                const tier = tierFromProductId(pkg.product.identifier, kind);
                                const per = periodKey(pkg);
                                const busy = purchasingId === pkg.identifier;
                                return (
                                    <View key={pkg.identifier} style={styles.packageCard}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.packageTitle}>{tier ? t(`${tierLabelNs}.${tier}`) : pkg.product.title}</Text>
                                            {tier && <Text style={styles.packageBenefit}>{t(`paywall.benefit.${tier}`, { defaultValue: pkg.product.description || '' })}</Text>}
                                            <Text style={styles.packagePrice}>
                                                {pkg.product.priceString}{per && per !== 'lifetime' ? ` / ${t(`paywall.${per}`)}` : per === 'lifetime' ? ` · ${t('paywall.lifetime')}` : ''}
                                            </Text>
                                        </View>
                                        <Pressable
                                            style={[styles.buyBtn, busy && styles.buyBtnDisabled]}
                                            disabled={purchasingId !== null}
                                            onPress={() => onPurchase(pkg.identifier)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${tier ? t(`${tierLabelNs}.${tier}`) : pkg.product.title}, ${pkg.product.priceString}`}
                                        >
                                            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buyBtnText}>{isRecurring(pkg) ? t('paywall.subscribe') : t('paywall.buy')}</Text>}
                                        </Pressable>
                                    </View>
                                );
                            })
                        )}

                        <Pressable style={styles.restoreBtn} onPress={onRestore} disabled={restoring} accessibilityRole="button">
                            {restoring ? <ActivityIndicator size="small" color="#1E88E5" /> : <Text style={styles.restoreBtnText}>{t('paywall.restore')}</Text>}
                        </Pressable>

                        <Text style={styles.legal}>{Platform.OS === 'ios' ? t('paywall.legalIos') : t('paywall.legalAndroid')}</Text>
                        <View style={styles.linkRow}>
                            <Pressable onPress={() => onOpenLink(legalUrl('terms'))} accessibilityRole="link"><Text style={styles.link}>{t('paywall.terms')}</Text></Pressable>
                            <Text style={styles.linkDot}>·</Text>
                            <Pressable onPress={() => onOpenLink(legalUrl('privacy'))} accessibilityRole="link"><Text style={styles.link}>{t('paywall.privacy')}</Text></Pressable>
                            {manageUrl && (
                                <>
                                    <Text style={styles.linkDot}>·</Text>
                                    <Pressable onPress={() => onOpenLink(manageUrl)} accessibilityRole="link"><Text style={styles.link}>{t('paywall.manage')}</Text></Pressable>
                                </>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF9E6' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#263238' },
    content: { padding: 16, gap: 14 },
    subtitle: { fontSize: 15, color: '#607D8B', textAlign: 'center', fontWeight: '600' },
    centerBox: { alignItems: 'center', paddingVertical: 60, gap: 10, paddingHorizontal: 24 },
    infoTitle: { fontSize: 17, fontWeight: '700', color: '#263238', marginTop: 4, textAlign: 'center' },
    infoText: { fontSize: 14, color: '#607D8B', textAlign: 'center', lineHeight: 20 },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14 },
    bannerSuccess: { backgroundColor: '#E8F5E9' },
    bannerError: { backgroundColor: '#FFEBEE' },
    bannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
    packageCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: '#ECEFF1' },
    packageTitle: { fontSize: 17, fontWeight: '800', color: '#263238' },
    packageBenefit: { fontSize: 13, color: '#607D8B', lineHeight: 19, marginTop: 4 },
    packagePrice: { fontSize: 15, fontWeight: '700', color: '#3F7D72', marginTop: 8 },
    buyBtn: { backgroundColor: '#3F7D72', paddingVertical: 11, paddingHorizontal: 16, borderRadius: 14, minWidth: 92, alignItems: 'center' },
    buyBtnDisabled: { opacity: 0.7 },
    buyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    restoreBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
    restoreBtnText: { color: '#1E88E5', fontWeight: '700', fontSize: 14 },
    legal: { fontSize: 12, color: '#78909C', lineHeight: 18, textAlign: 'center', marginTop: 4 },
    linkRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 24 },
    link: { fontSize: 12, fontWeight: '700', color: '#3F7D72', textDecorationLine: 'underline', paddingVertical: 6 },
    linkDot: { fontSize: 12, color: '#90A4AE' },
});
