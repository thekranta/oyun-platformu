/**
 * i18n kurulumu — TEK KAYNAK.
 * ------------------------------------------------------------
 * Varsayılan dil HER ZAMAN Türkçe (mevcut davranış bozulmasın diye).
 * Kullanıcı daha önce bir dil seçtiyse (AsyncStorage) o hatırlanır;
 * hiç seçim yoksa cihaz dili İngilizce ise İngilizce'ye geçilir,
 * aksi halde Türkçe kalır.
 *
 * Yeni metin eklerken: locales/tr.json (kaynak) + locales/en.json'a
 * aynı anahtarı ekle, component'te useTranslation() ile t('ns.key') çağır.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import tr from '../locales/tr.json';

export const LANGUAGE_STORAGE_KEY = 'app-language';
export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function detectInitialLanguage(): SupportedLanguage {
    const deviceLangs = Localization.getLocales?.() ?? [];
    const deviceCode = deviceLangs[0]?.languageCode;
    return deviceCode === 'en' ? 'en' : 'tr';
}

let initialized = false;

/** i18next'i başlatır (idempotent — birden çok kez çağrılsa da tek sefer kurar). */
export async function initI18n(): Promise<void> {
    if (initialized) return;
    initialized = true;

    let savedLanguage: string | null = null;
    try {
        savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
        // AsyncStorage erişilemezse (ör. SSR) sessizce cihaz diline düş.
    }

    const initialLanguage: SupportedLanguage =
        savedLanguage === 'en' || savedLanguage === 'tr' ? savedLanguage : detectInitialLanguage();

    await i18n.use(initReactI18next).init({
        resources: {
            tr: { translation: tr },
            en: { translation: en },
        },
        lng: initialLanguage,
        fallbackLng: 'tr',
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
    });
}

/** Dili değiştirir ve tercihi kalıcı olarak saklar. */
export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
    await i18n.changeLanguage(lang);
    try {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
        // Kalıcı saklama başarısız olsa bile bu oturumda dil değişikliği geçerli kalır.
    }
}

export default i18n;
