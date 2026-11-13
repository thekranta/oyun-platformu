import { Platform } from "react-native";
import { LIMITS, resetDiagnosticsForTest, setDiagnosticContext, recordError } from '../lib/diagnostics';
import {
    AUTO_REPORT_SESSION_MAX, buildPayload, flushPendingBugReports, reportCaughtError, resetAutoReportForTest, submitBugReport,
} from './bugReports';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.2.3' } } }));
jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', nativeBuildVersion: '7' }));
jest.mock('expo-device', () => ({ manufacturer: 'samsung', modelName: 'SM-A546B', osName: 'Android', osVersion: '14', platformApiLevel: 34 }));

let mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn((k: string) => Promise.resolve(mockStore[k] ?? null)),
        setItem: jest.fn((k: string, v: string) => { mockStore[k] = v; return Promise.resolve(); }),
        removeItem: jest.fn((k: string) => { delete mockStore[k]; return Promise.resolve(); }),
    },
}));

const fetchMock = jest.fn();
const KUYRUK = 'oyunPlatformu.bekleyenHataRaporlari.v1';
const kuyruk = (): Record<string, string>[] => JSON.parse(mockStore[KUYRUK] ?? '[]');

beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_KEY = "anon-test-key";
    mockStore = {};
    fetchMock.mockReset().mockResolvedValue({ ok: true });
    (globalThis as { fetch: unknown }).fetch = fetchMock;
    (Platform as { OS: string }).OS = 'android';
    resetDiagnosticsForTest();
    resetAutoReportForTest();
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;   // otomatik rapor yalnız geliştirme dışında gider
});

const cihaz = { platform: 'android' as const, model: 'samsung SM-A546B', osVersion: 'Android 14 (API 34)', appVersion: '1.0.0', buildNumber: '7', locale: 'tr-TR' };

describe('buildPayload', () => {
    it('çocuk adı / e-posta / kullanıcı kimliği alanı YOK; metinler maskelenir ve sınırlara kırpılır', () => {
        const p = buildPayload({ kind: 'manual', game: 'Sayı Avı', note: 'x'.repeat(5000) + ' ayse@gmail.com', errorText: 'hata veli@x.com' }, cihaz, '/ · menu');
        expect(Object.keys(p).sort()).toEqual(['app_version', 'build_number', 'device_model', 'error_text', 'game', 'kind', 'locale', 'note', 'os_version', 'platform', 'screen']);
        expect(p.note!.length).toBeLessThanOrEqual(LIMITS.note);
        expect(p.error_text).toBe('hata [e-posta]');
        expect(p.platform).toBe('android');
        expect(p.screen).toBe('/ · menu');
    });

    it('boş alanlar null olur', () => {
        const p = buildPayload({ kind: 'auto' }, cihaz, null);
        expect(p.note).toBeNull();
        expect(p.error_text).toBeNull();
        expect(p.game).toBeNull();
    });
});

describe('submitBugReport', () => {
    it('anon anahtarla, "return=minimal" ile gönderir (tabloda okuma izni yok)', async () => {
        expect(await submitBugReport({ kind: 'manual', note: 'ekran dondu' })).toBe('sent');
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/rest\/v1\/bug_reports$/);
        expect(init.method).toBe('POST');
        expect(init.headers.Prefer).toBe('return=minimal');
        const body = JSON.parse(init.body);
        expect(body.note).toBe('ekran dondu');
        expect(body.device_model).toBe('samsung SM-A546B');
        expect(body.os_version).toBe('Android 14 (API 34)');
    });

    it('gönderilemezse yerel kuyruğa alır; sonraki açılışta kuyruk gönderilir ve boşalır', async () => {
        fetchMock.mockResolvedValue({ ok: false });
        expect(await submitBugReport({ kind: 'manual', note: 'ses gitti' })).toBe('queued');
        expect(kuyruk()).toHaveLength(1);

        fetchMock.mockReset().mockResolvedValue({ ok: true });
        await flushPendingBugReports();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(mockStore[KUYRUK]).toBeUndefined();
    });

    it('ağ hatasında (istisna) da kuyruğa alır', async () => {
        fetchMock.mockRejectedValue(new Error('network'));
        expect(await submitBugReport({ kind: 'manual', note: 'x yok' })).toBe('queued');
        expect(kuyruk()).toHaveLength(1);
    });

    it('kuyruk gönderimi ilk başarısızlıkta durur, kalanlar yerinde kalır', async () => {
        fetchMock.mockResolvedValue({ ok: false });
        await submitBugReport({ kind: 'manual', note: 'bir' });
        await submitBugReport({ kind: 'manual', note: 'iki' });
        expect(kuyruk()).toHaveLength(2);
        await flushPendingBugReports();
        expect(kuyruk()).toHaveLength(2);
    });

    it('durable: önce kuyruğa yazar (ölümcül hatada gönderim bitmeden kapanırsa kaybolmasın)', async () => {
        fetchMock.mockImplementation(() => new Promise((r) => setTimeout(() => r({ ok: true }), 30)));   // gönderim yavaş
        expect(await submitBugReport({ kind: 'auto', errorText: 'çöktü' }, { durable: true })).toBe('queued');
        expect(kuyruk()).toHaveLength(1);                                 // gönderim bitmeden kuyrukta
        await new Promise((r) => setTimeout(r, 80));
        expect(mockStore[KUYRUK]).toBeUndefined();                        // bitince kuyruk boşalır
    });

    it('kuyruk en fazla 20 rapor tutar', async () => {
        fetchMock.mockResolvedValue({ ok: false });
        for (let i = 0; i < 25; i++) await submitBugReport({ kind: 'manual', note: `rapor ${i}` });
        expect(kuyruk()).toHaveLength(20);
        expect(kuyruk()[19].note).toBe('rapor 24');
    });
});

describe('reportCaughtError (otomatik rapor)', () => {
    const bekle = () => new Promise((r) => setImmediate(r));

    it('gönderir; oyun adı verilmediyse son oyunu kullanır; hata belleğe de girer', async () => {
        setDiagnosticContext({ route: '/', stage: 'akilli-sayi-avi' });
        reportCaughtError('oyun', new Error('boom'));
        await bekle();
        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.kind).toBe('auto');
        expect(body.game).toBe('akilli-sayi-avi');
        expect(body.error_text).toContain('boom');
    });

    it('aynı hata tekrar gönderilmez; oturumda en fazla AUTO_REPORT_SESSION_MAX rapor', async () => {
        reportCaughtError('oyun', 'aynı hata');
        reportCaughtError('oyun', 'aynı hata');
        await bekle();
        expect(fetchMock).toHaveBeenCalledTimes(1);

        for (let i = 0; i < 20; i++) reportCaughtError('oyun', `farklı hata ${i}`);
        await bekle();
        expect(fetchMock).toHaveBeenCalledTimes(AUTO_REPORT_SESSION_MAX);
    });

    it('geliştirme sürümünde (__DEV__) göndermez ama belleğe kaydeder', async () => {
        (globalThis as { __DEV__?: boolean }).__DEV__ = true;
        reportCaughtError('oyun', 'dev hatası');
        await bekle();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('asla fırlatmaz (fetch patlasa bile)', async () => {
        fetchMock.mockImplementation(() => { throw new Error('patladı'); });
        expect(() => reportCaughtError('oyun', 'x')).not.toThrow();
        await bekle();
        recordError('x', 'y');
    });
});
