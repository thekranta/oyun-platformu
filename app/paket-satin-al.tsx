import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { supabase } from '../lib/supabase';
import {
    activeOgretmenTierFromCustomerInfo,
    activeVeliTierFromCustomerInfo,
    getOgretmenOffering,
    getVeliOffering,
    initPurchases,
    isPurchasesAvailable,
    purchase,
    restore,
} from '../services/purchaseService';

const COLORS = {
    background: '#FFF9E6',
    card: '#FFFFFF',
    primary: '#1E88E5',
    premium: '#9C27B0',
    text: '#263238',
    textLight: '#607D8B',
    success: '#2E7D32',
    error: '#C62828',
    border: '#ECEFF1',
};

type Kind = 'veli' | 'ogretmen';

type ScreenState =
    | { phase: 'loading' }
    | { phase: 'unavailable' }
    | { phase: 'no-session' }
    | { phase: 'ready'; offering: PurchasesOffering | null }
    | { phase: 'error'; message: string };

export default function PaketSatinAl() {
    const params = useLocalSearchParams<{ kind?: string }>();
    const kind: Kind = params.kind === 'ogretmen' ? 'ogretmen' : 'veli';

    const [state, setState] = useState<ScreenState>({ phase: 'loading' });
    const [purchasingId, setPurchasingId] = useState<string | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

    const load = useCallback(async () => {
        if (!isPurchasesAvailable()) {
            setState({ phase: 'unavailable' });
            return;
        }
        const { data } = await supabase.auth.getSession();
        const email = data.session?.user?.email;
        if (!email) {
            setState({ phase: 'no-session' });
            return;
        }
        initPurchases(email);
        try {
            const offering = kind === 'ogretmen' ? await getOgretmenOffering() : await getVeliOffering();
            setState({ phase: 'ready', offering });
        } catch (e: any) {
            setState({ phase: 'error', message: e?.message || 'Paketler yüklenemedi.' });
        }
    }, [kind]);

    useEffect(() => { load(); }, [load]);

    const handlePurchase = async (pkg: PurchasesPackage) => {
        setBanner(null);
        setPurchasingId(pkg.identifier);
        const result = await purchase(pkg);
        setPurchasingId(null);
        if (result.ok) {
            const tier = kind === 'ogretmen'
                ? activeOgretmenTierFromCustomerInfo(result.customerInfo)
                : activeVeliTierFromCustomerInfo(result.customerInfo);
            setBanner({ kind: 'success', text: tier ? `Satın alma tamamlandı! Paketiniz: ${tier}` : 'Satın alma tamamlandı! Paketiniz birkaç saniye içinde güncellenecek.' });
        } else if (!result.cancelled) {
            setBanner({ kind: 'error', text: result.message || 'Satın alma sırasında bir hata oluştu.' });
        }
    };

    const handleRestore = async () => {
        setBanner(null);
        setRestoring(true);
        try {
            const info = await restore();
            setRestoring(false);
            if (!info) { setBanner({ kind: 'error', text: 'Satın alımlar geri yüklenemedi.' }); return; }
            const tier = kind === 'ogretmen' ? activeOgretmenTierFromCustomerInfo(info) : activeVeliTierFromCustomerInfo(info);
            setBanner(tier
                ? { kind: 'success', text: `Önceki satın alımınız bulundu: ${tier}` }
                : { kind: 'error', text: 'Bu hesaba bağlı aktif bir satın alım bulunamadı.' });
        } catch (e: any) {
            setRestoring(false);
            setBanner({ kind: 'error', text: e?.message || 'Satın alımlar geri yüklenemedi.' });
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Geri dön">
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Paket Satın Al</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {banner && (
                    <View style={[styles.banner, banner.kind === 'success' ? styles.bannerSuccess : styles.bannerError]}>
                        <Ionicons name={banner.kind === 'success' ? 'checkmark-circle' : 'alert-circle'} size={20} color={banner.kind === 'success' ? COLORS.success : COLORS.error} />
                        <Text style={[styles.bannerText, { color: banner.kind === 'success' ? COLORS.success : COLORS.error }]}>{banner.text}</Text>
                    </View>
                )}

                {state.phase === 'loading' && (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                )}

                {state.phase === 'unavailable' && (
                    <View style={styles.centerBox}>
                        <Ionicons name="time-outline" size={48} color={COLORS.textLight} />
                        <Text style={styles.infoTitle}>Yakında burada!</Text>
                        <Text style={styles.infoText}>Uygulama içi satın alma henüz aktif değil. Paketlerinizi şimdilik childhoodtech.com üzerinden inceleyebilirsiniz.</Text>
                    </View>
                )}

                {state.phase === 'no-session' && (
                    <View style={styles.centerBox}>
                        <Ionicons name="lock-closed-outline" size={48} color={COLORS.textLight} />
                        <Text style={styles.infoTitle}>Oturum bulunamadı</Text>
                        <Text style={styles.infoText}>Paket satın almak için giriş yapmış olmanız gerekiyor.</Text>
                    </View>
                )}

                {state.phase === 'error' && (
                    <View style={styles.centerBox}>
                        <Ionicons name="warning-outline" size={48} color={COLORS.error} />
                        <Text style={styles.infoTitle}>Bir şeyler ters gitti</Text>
                        <Text style={styles.infoText}>{state.message}</Text>
                    </View>
                )}

                {state.phase === 'ready' && (
                    <>
                        {!state.offering || state.offering.availablePackages.length === 0 ? (
                            <View style={styles.centerBox}>
                                <Ionicons name="pricetag-outline" size={48} color={COLORS.textLight} />
                                <Text style={styles.infoTitle}>Henüz paket tanımlı değil</Text>
                                <Text style={styles.infoText}>Mağaza paketleri yakında eklenecek.</Text>
                            </View>
                        ) : (
                            state.offering.availablePackages.map(pkg => (
                                <View key={pkg.identifier} style={styles.packageCard}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                                        <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                                    </View>
                                    <Pressable
                                        style={[styles.buyBtn, purchasingId === pkg.identifier && styles.buyBtnDisabled]}
                                        disabled={purchasingId !== null}
                                        onPress={() => handlePurchase(pkg)}
                                        accessibilityRole="button"
                                    >
                                        {purchasingId === pkg.identifier
                                            ? <ActivityIndicator size="small" color="#fff" />
                                            : <Text style={styles.buyBtnText}>Satın Al</Text>}
                                    </Pressable>
                                </View>
                            ))
                        )}

                        <Pressable style={styles.restoreBtn} onPress={handleRestore} disabled={restoring} accessibilityRole="button">
                            {restoring
                                ? <ActivityIndicator size="small" color={COLORS.primary} />
                                : <Text style={styles.restoreBtnText}>Satın Alımları Geri Yükle</Text>}
                        </Pressable>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 12,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    content: { padding: 16, gap: 14 },
    centerBox: { alignItems: 'center', paddingVertical: 60, gap: 10, paddingHorizontal: 24 },
    infoTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 4 },
    infoText: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', lineHeight: 20 },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, marginBottom: 4 },
    bannerSuccess: { backgroundColor: '#E8F5E9' },
    bannerError: { backgroundColor: '#FFEBEE' },
    bannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
    packageCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
        borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: COLORS.border,
    },
    packageTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    packagePrice: { fontSize: 14, color: COLORS.textLight, marginTop: 2 },
    buyBtn: { backgroundColor: COLORS.premium, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 14, minWidth: 88, alignItems: 'center' },
    buyBtnDisabled: { opacity: 0.7 },
    buyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    restoreBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
    restoreBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});
