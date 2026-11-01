import { Linking, Platform } from 'react-native';
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
