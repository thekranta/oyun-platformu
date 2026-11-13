import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
    cleanText, describeScreen, errorToText, getDeviceInfo, getDiagnosticContext, LIMITS, recentErrorsText, recordError,
    type DeviceInfo,
} from '../lib/diagnostics';

/**
 * Hata raporları: elle ("Sorun bildir") ve otomatik (oyun hata sınırı / yakalanmamış JS hatası).
 * Sunucu: supabase_migrations/add_bug_reports.sql — yalnız ekleme izni olan `bug_reports` tablosu (okuma yok).
 *
 * Çevrimdışı/başarısız raporlar yerel kuyrukta bekler, uygulama açılışında ve sonraki başarılı gönderimde yeniden denenir.
 * GİZLİLİK: çocuk adı/e-posta/kullanıcı kimliği gönderilmez; metinlerdeki e-postalar maskelenir.
 */

const PENDING_KEY = 'oyunPlatformu.bekleyenHataRaporlari.v1';
const PENDING_MAX = 20;
/** Bir oturumda en fazla bu kadar OTOMATİK rapor gönderilir (hata döngüsü tabloyu doldurmasın). */
export const AUTO_REPORT_SESSION_MAX = 5;
const SEND_TIMEOUT_MS = 10_000;

export type BugReportKind = 'manual' | 'auto';

export interface BugReportInput {
    kind: BugReportKind;
    /** Oyun/ekran adı (elle rapor: kullanıcının yazdığı ya da son oyun). */
    game?: string | null;
    note?: string | null;
    errorText?: string | null;
}

/** Sunucuya gidecek satır. SAF işlev: aynı girdiyle test edilebilir; tüm alanlar sunucu CHECK sınırlarına kırpılır. */
export function buildPayload(input: BugReportInput, device: DeviceInfo, screen: string | null): Record<string, string | null> {
    return {
        kind: input.kind,
        platform: device.platform,
        device_model: device.model,
        os_version: device.osVersion,
        app_version: device.appVersion,
        build_number: device.buildNumber,
        locale: device.locale,
        screen,
        game: cleanText(input.game, LIMITS.game),
        note: cleanText(input.note, LIMITS.note),
        error_text: cleanText(input.errorText, LIMITS.error),
    };
}

async function post(payload: Record<string, string | null>): Promise<boolean> {
    // Ortam değişkenleri çağrı anında okunur (testte ayarlanabilsin); derlemede EXPO_PUBLIC_* satır içine gömülür.
    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) return false;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), SEND_TIMEOUT_MS) : null;
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/bug_reports`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                // Tabloda okuma izni yok: yanıt gövdesi istenmez (aksi halde ekleme 401/403 verir).
                Prefer: 'return=minimal',
            },
            body: JSON.stringify(payload),
            signal: controller?.signal,
        });
        return res.ok;
    } catch {
        return false;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function readQueue(): Promise<Record<string, string | null>[]> {
    try {
        const raw = await AsyncStorage.getItem(PENDING_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

async function enqueue(payload: Record<string, string | null>): Promise<void> {
    try {
        const list = await readQueue();
        list.push(payload);
        while (list.length > PENDING_MAX) list.shift();
        await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(list));
    } catch {
        // kuyruk yazılamadıysa rapor kaybolur; tanılama uygulamayı etkilememeli
    }
}

/** Kuyruktaki raporları sırayla göndermeyi dener; ilk başarısızlıkta durur. */
export async function flushPendingBugReports(): Promise<void> {
    try {
        const list = await readQueue();
        if (list.length === 0) return;
        const left = [...list];
        while (left.length > 0) {
            if (!(await post(left[0]))) break;
            left.shift();
        }
        if (left.length === 0) await AsyncStorage.removeItem(PENDING_KEY);
        else await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(left));
    } catch {
        // sessiz
    }
}

/**
 * Raporu gönderir; ağ yoksa yerel kuyruğa alır. 'sent' | 'queued'.
 * `durable`: önce kuyruğa YAZ, sonra göndermeyi dene (ölümcül hatada uygulama gönderim bitmeden kapanırsa
 * rapor kuyrukta kalır ve sonraki açılışta gider).
 */
export async function submitBugReport(input: BugReportInput, options: { durable?: boolean } = {}): Promise<'sent' | 'queued'> {
    const payload = buildPayload(input, getDeviceInfo(), describeScreen());
    if (options.durable) {
        await enqueue(payload);
        flushPendingBugReports();
        return 'queued';
    }
    if (await post(payload)) {
        flushPendingBugReports();
        return 'sent';
    }
    await enqueue(payload);
    return 'queued';
}

// ----------------------------------------------------------------------------
// Otomatik rapor (oyun hata sınırı + yakalanmamış JS hatası)
// ----------------------------------------------------------------------------
let autoSent = 0;
const autoSeen = new Set<string>();

/** Testte oturum sayaçlarını sıfırlamak için. */
export function resetAutoReportForTest(): void {
    autoSent = 0;
    autoSeen.clear();
}

/**
 * Hatayı belleğe kaydeder (elle rapora eklensin) ve — geliştirme sürümü değilse, oturum sınırı ve tekrar
 * denetiminden geçerse — otomatik rapor gönderir. Asla fırlatmaz.
 */
export function reportCaughtError(source: string, error: unknown, game?: string | null): void {
    try {
        const message = recordError(source, error);
        if (__DEV__) return;
        const key = `${source}|${message.slice(0, 200)}`;
        if (autoSeen.has(key) || autoSent >= AUTO_REPORT_SESSION_MAX) return;
        autoSeen.add(key);
        autoSent += 1;
        submitBugReport(
            { kind: 'auto', game: game ?? getDiagnosticContext().lastGame, errorText: `[${source}] ${message}` },
            { durable: source === 'js-fatal' },
        ).catch(() => {});
    } catch {
        // tanılama asla uygulamayı düşürmemeli
    }
}

let captureInstalled = false;

/**
 * Yakalanmamış JS hatalarını yakalar. Yerel (iOS/Android): ErrorUtils genel işleyicisi SARILIR (varsayılan davranış
 * korunur) ve hata otomatik raporlanır; ölümcül hatada rapor kuyruğa yazılıp sonraki açılışta gönderilir.
 * Web: hatalar yalnız belleğe (elle rapora eklenmek üzere) kaydedilir, otomatik gönderilmez (eklenti/tarayıcı gürültüsü).
 */
export function installGlobalErrorCapture(): void {
    if (captureInstalled) return;
    captureInstalled = true;
    try {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') return;
            window.addEventListener('error', (e) => { recordError('window', e.error ?? e.message); });
            window.addEventListener('unhandledrejection', (e) => { recordError('promise', e.reason); });
            return;
        }
        const eu = (globalThis as { ErrorUtils?: { getGlobalHandler?: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler?: (h: (e: unknown, fatal?: boolean) => void) => void } }).ErrorUtils;
        if (!eu?.getGlobalHandler || !eu.setGlobalHandler) return;
        const previous = eu.getGlobalHandler();
        eu.setGlobalHandler((error, isFatal) => {
            reportCaughtError(isFatal ? 'js-fatal' : 'js-error', error);
            previous?.(error, isFatal);
        });
    } catch {
        // sessiz
    }
}

export { errorToText, recentErrorsText };
