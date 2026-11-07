import { Linking, Platform } from 'react-native';
import i18n from './i18n';
import { requestParentGate } from './parentGate';

/**
 * Uygulama dışına çıkan bağlantıların TEK kapısı. Mobilde (iOS/Android) bağlantı, bir yetişkin
 * ebeveyn kapısını geçmeden açılmaz (Apple 1.3 / Google Aile Politikası: çocuğun erişebildiği
 * ekranlardan dış bağlantı). Web'de doğrudan açılır.
 *
 * Yeni bir `Linking.openURL` yazmayın; bu işlevi kullanın (lib/storeReadiness.test.ts denetler).
 */

export const LEGAL_URLS = {
    privacy: 'https://childhoodtech.com/gizlilik-politikasi.html',
    terms: 'https://childhoodtech.com/kullanim-sartlari.html',
} as const;

/** İngilizce karşılıkları (childhoodtech.com/en/*, Türkçe aslın çevirisi). */
export const LEGAL_URLS_EN = {
    privacy: 'https://childhoodtech.com/en/privacy-policy.html',
    terms: 'https://childhoodtech.com/en/terms-of-service.html',
} as const;

export type LegalDoc = keyof typeof LEGAL_URLS;

/** Yasal sayfa adresi, uygulama diline göre (varsayılan ve bilinmeyen dilde Türkçe asıl). */
export function legalUrl(doc: LegalDoc, language: string | undefined = i18n.language): string {
    return (language || '').toLowerCase().startsWith('en') ? LEGAL_URLS_EN[doc] : LEGAL_URLS[doc];
}

/** Mağaza abonelik yönetimi sayfaları (aboneliği iptal etmek hesap silmekle olmaz: kullanıcıya gösterilir). */
export function subscriptionManagementUrl(os: string = Platform.OS): string | null {
    if (os === 'ios') return 'https://apps.apple.com/account/subscriptions';
    if (os === 'android') return 'https://play.google.com/store/account/subscriptions';
    return null;
}

/** Bağlantıyı açar; mobilde önce ebeveyn kapısı. Açıldıysa true. */
export async function openExternalLink(url: string): Promise<boolean> {
    if (Platform.OS !== 'web') {
        const allowed = await requestParentGate();
        if (!allowed) return false;
    }
    try {
        await Linking.openURL(url);
        return true;
    } catch {
        return false;
    }
}
