import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Tanılama: "Sorun bildir" ve otomatik hata kaydı için cihaz/sürüm bilgisi, son ekran/oyun bağlamı ve son hatalar.
 *
 * GİZLİLİK: çocuk adı, e-posta veya kullanıcı kimliği burada TOPLANMAZ. Serbest metinlerdeki e-postalar maskelenir
 * (`cleanText`). Sunucu tarafı: supabase_migrations/add_bug_reports.sql (yalnız ekleme, okuma yok).
 */

/** Sunucudaki CHECK sınırlarıyla AYNI olmalı (aşan istek reddedilir). */
export const LIMITS = { model: 80, os: 60, appVersion: 30, build: 20, locale: 20, screen: 120, game: 80, note: 1200, error: 3000 } as const;

export type BugPlatform = 'android' | 'ios' | 'web';

export interface DeviceInfo {
    platform: BugPlatform;
    model: string | null;
    osVersion: string | null;
    appVersion: string | null;
    buildNumber: string | null;
    locale: string | null;
}

export function clip(value: unknown, max: number): string | null {
    if (typeof value !== 'string') return null;
    const v = value.trim();
    return v ? v.slice(0, max) : null;
}

/** E-posta benzeri metinleri maskeler (hata mesajına/nota sızmasın). */
export function maskEmails(text: string): string {
    return text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, '[e-posta]');
}

/** Serbest metin: e-postaları maskele, kırp. Boşsa null. */
export function cleanText(value: unknown, max: number): string | null {
    if (typeof value !== 'string') return null;
    return clip(maskEmails(value), max);
}

/** Web tarayıcı kimliğinden kısa "Tarayıcı sürüm / işletim sistemi" özeti (UA tamamı 60 karaktere sığmaz). */
export function describeWebAgent(ua: string | undefined | null): string | null {
    if (!ua) return null;
    const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS X|Macintosh/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'diğer';
    const pick = (re: RegExp, name: string) => { const m = ua.match(re); return m ? `${name} ${m[1]}` : null; };
    const browser = pick(/(?:Edg|EdgA|EdgiOS)\/(\d+)/, 'Edge') || pick(/(?:OPR|Opera)\/(\d+)/, 'Opera') || pick(/(?:SamsungBrowser)\/(\d+)/, 'Samsung Internet')
        || pick(/(?:Firefox|FxiOS)\/(\d+)/, 'Firefox') || pick(/(?:Chrome|CriOS)\/(\d+)/, 'Chrome') || pick(/Version\/(\d+)[^ ]* .*Safari/, 'Safari') || 'tarayıcı';
    return `${browser} / ${os}`;
}

export function getDeviceInfo(): DeviceInfo {
    const platform: BugPlatform = Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web';
    let model: string | null = null;
    let osVersion: string | null = null;
    let appVersion: string | null = null;
    let buildNumber: string | null = null;
    let locale: string | null = null;
    try {
        if (platform === 'web') {
            const nav = typeof navigator !== 'undefined' ? navigator : undefined;
            model = describeWebAgent(nav?.userAgent);
            locale = nav?.language ?? null;
        } else {
            model = [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || null;
            osVersion = [Device.osName, Device.osVersion].filter(Boolean).join(' ') + (platform === 'android' && Device.platformApiLevel ? ` (API ${Device.platformApiLevel})` : '');
            buildNumber = Application.nativeBuildVersion ?? null;
        }
        appVersion = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;
        if (!locale) locale = Intl.DateTimeFormat().resolvedOptions().locale ?? null;
    } catch {
        // tanılama asla uygulamayı düşürmemeli
    }
    return {
        platform,
        model: clip(model, LIMITS.model),
        osVersion: clip(osVersion, LIMITS.os),
        appVersion: clip(appVersion, LIMITS.appVersion),
        buildNumber: clip(buildNumber, LIMITS.build),
        locale: clip(locale, LIMITS.locale),
    };
}

// ----------------------------------------------------------------------------
// Bağlam: kullanıcı en son nerede/hangi oyundaydı?
// ----------------------------------------------------------------------------
interface DiagnosticContext { route: string; stage: string; lastGame: string }
const ctx: DiagnosticContext = { route: '', stage: '', lastGame: '' };
/** Oyun olmayan aşamalar (son oyun olarak sayılmaz). */
const NON_GAME_STAGES = new Set(['giris', 'menu', 'sonuc', '']);

export function setDiagnosticContext(patch: Partial<Pick<DiagnosticContext, 'route' | 'stage'>>): void {
    if (patch.route !== undefined) ctx.route = patch.route;
    if (patch.stage !== undefined) {
        ctx.stage = patch.stage;
        if (!NON_GAME_STAGES.has(patch.stage)) ctx.lastGame = patch.stage;
    }
}
export function getDiagnosticContext(): Readonly<DiagnosticContext> {
    return ctx;
}
/** Son ekran özeti: "/ · akilli-sayi-avi". (Kök yerleşim "Sorun bildir" rotasını bağlam yapmaz; yoksa hep kendini bildirirdi.) */
export function describeScreen(): string | null {
    return clip([...new Set([ctx.route, ctx.stage].filter(Boolean))].join(' · '), LIMITS.screen);
}

// ----------------------------------------------------------------------------
// Son hatalar (bellekte, en fazla 10)
// ----------------------------------------------------------------------------
interface RecentError { source: string; message: string }
const recent: RecentError[] = [];
const RECENT_MAX = 10;

export function errorToText(error: unknown): string {
    if (error instanceof Error) {
        const stack = (error.stack || '').split('\n').slice(0, 6).join('\n');
        return `${error.name}: ${error.message}${stack ? `\n${stack}` : ''}`;
    }
    if (typeof error === 'string') return error;
    try { return JSON.stringify(error)?.slice(0, 500) ?? String(error); } catch { return String(error); }
}

export function recordError(source: string, error: unknown): string {
    const message = errorToText(error);
    recent.push({ source, message });
    while (recent.length > RECENT_MAX) recent.shift();
    return message;
}

/** Elle gönderilen rapora eklenecek son hatalar (boşsa null). */
export function recentErrorsText(): string | null {
    if (recent.length === 0) return null;
    return cleanText(recent.map((e) => `[${e.source}] ${e.message}`).join('\n---\n'), LIMITS.error);
}

export function resetDiagnosticsForTest(): void {
    recent.length = 0;
    ctx.route = ''; ctx.stage = ''; ctx.lastGame = '';
}
