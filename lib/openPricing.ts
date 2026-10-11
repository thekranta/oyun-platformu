import { router } from 'expo-router';
import { Linking, Platform } from 'react-native';

const PRICING_URL = 'https://childhoodtech.com/#pricing';

/** Paket sayfasını açar: native'de uygulama içi satın alma ekranı, web'de fiyat sayfası. */
export function openPricing(): void {
    if (Platform.OS !== 'web') { router.push('/paket-satin-al?kind=veli'); return; }
    Linking.openURL(PRICING_URL).catch(() => {});
}
