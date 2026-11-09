import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import PaywallView, { type PaywallState } from '../components/PaywallView';
import { openExternalLink } from '../lib/externalLink';
import { emitPackageChanged, waitForTier } from '../lib/packageSync';
import { requestParentGate } from '../lib/parentGate';
import { sortPackages, type PaywallKind } from '../lib/paywall';
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

/**
 * Paket satın alma (iOS/Android, RevenueCat). Çocuğun erişebildiği yerlerden (kilitli oyun uyarısı vb.) açılabildiği
 * için mobilde ekrana girerken EBEVEYN KAPISI sorulur; geçilmezse geri dönülür. Web'de bu ekran kullanılmaz
 * (web satışı childhoodtech.com'dadır) ve "kullanılamıyor" gösterir. Sunum: components/PaywallView.tsx.
 */
export default function PaketSatinAl() {
    const { t } = useTranslation();
    const params = useLocalSearchParams<{ kind?: string }>();
    const kind: PaywallKind = params.kind === 'ogretmen' ? 'ogretmen' : 'veli';

    const [gatePassed, setGatePassed] = useState(Platform.OS === 'web');
    const [state, setState] = useState<PaywallState>({ phase: 'loading' });
    const [purchasingId, setPurchasingId] = useState<string | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const rawPackages = useRef<PurchasesPackage[]>([]);
    const emailRef = useRef<string | null>(null);

    const leave = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }, []);

    // 1) Ebeveyn kapısı (mobil)
    useEffect(() => {
        if (Platform.OS === 'web') return;
        let alive = true;
        requestParentGate().then((ok) => {
            if (!alive) return;
            if (ok) setGatePassed(true);
            else leave();
        });
        return () => { alive = false; };
    }, [leave]);

    // 2) Paketleri yükle
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
        emailRef.current = email;
        try {
            await initPurchases(email);
            const offering = kind === 'ogretmen' ? await getOgretmenOffering() : await getVeliOffering();
            const packages = sortPackages(offering?.availablePackages ?? [], kind);
            rawPackages.current = packages;
            setState({ phase: 'ready', packages });
        } catch (e: unknown) {
            // Mağaza/SDK hata metni İngilizce ve teknik olabilir: kullanıcıya yerelleştirilmiş genel mesaj gösterilir.
            console.warn('[paywall] paketler yüklenemedi', e instanceof Error ? e.message : e);
            setState({ phase: 'error', message: '' });
        }
    }, [kind]);

    useEffect(() => {
        if (gatePassed) load();
    }, [gatePassed, load]);

    const tierFrom = (info: Parameters<typeof activeVeliTierFromCustomerInfo>[0]) =>
        kind === 'ogretmen' ? activeOgretmenTierFromCustomerInfo(info) : activeVeliTierFromCustomerInfo(info);

    const tierName = (tier: string) => t(`${kind === 'ogretmen' ? 'teacher.tier' : 'veli.tier'}.${tier}`);

    /** Veritabanı paketi webhook ile güncelleyince çocuk odası da yenilensin. */
    const syncInBackground = (tier: string) => {
        emitPackageChanged();
        const email = emailRef.current;
        if (email) waitForTier(kind, email, tier).then(() => emitPackageChanged());
    };

    const onPurchase = async (identifier: string) => {
        const pkg = rawPackages.current.find((p) => p.identifier === identifier);
        if (!pkg) return;
        setBanner(null);
        setPurchasingId(identifier);
        const result = await purchase(pkg);
        setPurchasingId(null);
        if (result.ok) {
            const tier = tierFrom(result.customerInfo);
            setBanner({ kind: 'success', text: tier ? t('paywall.successWithTier', { tier: tierName(tier) }) : t('paywall.successPending') });
            if (tier) syncInBackground(tier);
        } else if (!result.cancelled) {
            if (result.message) console.warn('[paywall] satın alma hatası', result.message);
            setBanner({ kind: 'error', text: t('paywall.purchaseFailed') });
        }
    };

    const onRestore = async () => {
        setBanner(null);
        setRestoring(true);
        try {
            const info = await restore();
            if (!info) { setBanner({ kind: 'error', text: t('paywall.restoreFailed') }); return; }
            const tier = tierFrom(info);
            if (tier) {
                setBanner({ kind: 'success', text: t('paywall.restoredWithTier', { tier: tierName(tier) }) });
                syncInBackground(tier);
            } else {
                setBanner({ kind: 'error', text: t('paywall.restoreNone') });
            }
        } catch (e: unknown) {
            console.warn('[paywall] geri yükleme hatası', e instanceof Error ? e.message : e);
            setBanner({ kind: 'error', text: t('paywall.restoreFailed') });
        } finally {
            setRestoring(false);
        }
    };

    // Kapı geçilene kadar fiyatlar gösterilmez.
    if (!gatePassed) return <View style={{ flex: 1, backgroundColor: '#FFF9E6' }} />;

    return (
        <PaywallView
            kind={kind}
            state={state}
            banner={banner}
            purchasingId={purchasingId}
            restoring={restoring}
            onBack={leave}
            onPurchase={onPurchase}
            onRestore={onRestore}
            onOpenLink={(url) => { openExternalLink(url); }}
        />
    );
}
