import { Platform } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || '';

// Web'de ayni origin'den relative fetch calisir (aynen kalir); native'de origin
// olmadigi icin canli Vercel domainine mutlak URL gerekir.
export function apiUrl(path: string): string {
    return Platform.OS === 'web' ? path : `${API_BASE}${path}`;
}
