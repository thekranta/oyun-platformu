/**
 * Zorunlu güncelleme kapısı (yalnız mobil). Sunucu tarafında eski sürümü bozan bir değişiklik gerektiğinde
 * `public/surum.json` içindeki en düşük sürüm yükseltilir; bu sürümün altındaki kurulumlar, mağazaya yönlendiren
 * bir "Güncelle" ekranı görür. Kural: ağ yok / dosya bozuk / adres boş ise ASLA engelleme (fail-open).
 *
 * Dosya biçimi (https://oyun.childhoodtech.com/surum.json):
 *   { "android": { "minimum": "1.0.0", "url": "https://play.google.com/..." },
 *     "ios":     { "minimum": "1.0.0", "url": "https://apps.apple.com/..." } }
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiUrl } from './apiBase';

export interface UpdateRequirement {
    required: boolean;
    url: string | null;
}

const NOT_REQUIRED: UpdateRequirement = { required: false, url: null };

/** "1.2.10" biçimli iki sürümü karşılaştırır: a<b → -1, eşit → 0, a>b → 1. Çözülemezse null. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 | null {
    const parse = (v: string) => {
        const m = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(v);
        return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : null;
    };
    const pa = parse(a);
    const pb = parse(b);
    if (!pa || !pb) return null;
    for (let i = 0; i < 3; i++) {
        if (pa[i] < pb[i]) return -1;
        if (pa[i] > pb[i]) return 1;
    }
    return 0;
}

/** Uzaktan okunan dosyadan, bu platform için güncelleme şartını çıkarır. Geçersiz her şey "gerekmiyor" sayılır. */
export function evaluateRequirement(data: unknown, os: string, currentVersion: string): UpdateRequirement {
    if (!data || typeof data !== 'object') return NOT_REQUIRED;
    const entry = (data as Record<string, unknown>)[os];
    if (!entry || typeof entry !== 'object') return NOT_REQUIRED;
    const { minimum, url } = entry as { minimum?: unknown; url?: unknown };
    if (typeof minimum !== 'string' || typeof url !== 'string') return NOT_REQUIRED;
    if (!/^https:\/\//.test(url)) return NOT_REQUIRED; // gidilecek güvenli adres yoksa kullanıcıyı çıkmaza sokma
    const cmp = compareVersions(currentVersion, minimum);
    return cmp === -1 ? { required: true, url } : NOT_REQUIRED;
}

export function installedVersion(): string {
    return Constants.expoConfig?.version ?? '0.0.0';
}

export async function fetchUpdateRequirement(timeoutMs = 5000): Promise<UpdateRequirement> {
    if (Platform.OS === 'web') return NOT_REQUIRED; // web her zaman en son sürümü açar
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${apiUrl('/surum.json')}?t=${Math.floor(Date.now() / 60000)}`, {
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return NOT_REQUIRED;
        return evaluateRequirement(await res.json(), Platform.OS, installedVersion());
    } catch {
        return NOT_REQUIRED;
    } finally {
        clearTimeout(timer);
    }
}
