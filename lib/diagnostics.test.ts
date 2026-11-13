import { Platform } from "react-native";
import {
    cleanText, clip, describeScreen, describeWebAgent, errorToText, getDeviceInfo, LIMITS, maskEmails, recentErrorsText, recordError,
    resetDiagnosticsForTest, setDiagnosticContext, getDiagnosticContext,
} from './diagnostics';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.2.3' } } }));
jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', nativeBuildVersion: '7' }));
jest.mock('expo-device', () => ({ manufacturer: 'samsung', modelName: 'SM-A546B', osName: 'Android', osVersion: '14', platformApiLevel: 34 }));

beforeEach(() => resetDiagnosticsForTest());

describe('metin temizleme', () => {
    it('clip: boşsa/metin değilse null, sınıra kırpar', () => {
        expect(clip('  abc  ', 10)).toBe('abc');
        expect(clip('abcdef', 3)).toBe('abc');
        expect(clip('   ', 5)).toBeNull();
        expect(clip(42, 5)).toBeNull();
        expect(clip(undefined, 5)).toBeNull();
    });

    it('e-postaları maskeler (hata/not metnine kişisel veri sızmaz)', () => {
        expect(maskEmails('hata: ayse.yilmaz+test@gmail.com giriş yaptı')).toBe('hata: [e-posta] giriş yaptı');
        expect(maskEmails('a@b.co ve c.d@e-f.org.tr')).toBe('[e-posta] ve [e-posta]');
        expect(maskEmails('e-posta yok')).toBe('e-posta yok');
    });

    it('cleanText: önce maskeler sonra kırpar', () => {
        expect(cleanText('x@y.com', 50)).toBe('[e-posta]');
        expect(cleanText('a'.repeat(5000), LIMITS.error)).toHaveLength(LIMITS.error);
        expect(cleanText('', 5)).toBeNull();
    });
});

describe('describeWebAgent', () => {
    it('tarayıcı ve işletim sistemini kısa özetler (UA 60 karaktere sığmaz)', () => {
        expect(describeWebAgent('Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36')).toBe('Chrome 130 / Android');
        expect(describeWebAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1')).toBe('Safari 17 / iOS');
        expect(describeWebAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0')).toBe('Edge 131 / Windows');
        expect(describeWebAgent(null)).toBeNull();
    });
});

describe('getDeviceInfo (Android)', () => {
    it('model, işletim sistemi + API düzeyi, sürüm ve derleme numarası; hepsi sunucu sınırı içinde', () => {
        (Platform as { OS: string }).OS = 'android';
        const d = getDeviceInfo();
        expect(d.platform).toBe('android');
        expect(d.model).toBe('samsung SM-A546B');
        expect(d.osVersion).toBe('Android 14 (API 34)');
        expect(d.appVersion).toBe('1.0.0');
        expect(d.buildNumber).toBe('7');
        expect(d.model!.length).toBeLessThanOrEqual(LIMITS.model);
    });
});

describe('bağlam: ekran ve son oyun', () => {
    it('oyun olmayan aşamalar "son oyun" sayılmaz', () => {
        setDiagnosticContext({ route: '/', stage: 'akilli-sayi-avi' });
        setDiagnosticContext({ stage: 'sonuc' });
        setDiagnosticContext({ stage: 'menu' });
        expect(getDiagnosticContext().lastGame).toBe('akilli-sayi-avi');
        expect(describeScreen()).toBe('/ · menu');
    });

    it('ekran özeti tekrarı yazmaz, boşken null', () => {
        expect(describeScreen()).toBeNull();
        setDiagnosticContext({ route: '/veli-dashboard' });
        expect(describeScreen()).toBe('/veli-dashboard');
    });
});

describe('son hatalar', () => {
    it('errorToText: Error → ad + ileti + yığının ilk satırları; metin → olduğu gibi', () => {
        const e = new Error('boom');
        expect(errorToText(e)).toContain('Error: boom');
        expect(errorToText('düz metin')).toBe('düz metin');
        expect(errorToText({ a: 1 })).toBe('{"a":1}');
    });

    it('en fazla 10 hata tutar, e-postaları maskeler, sınıra kırpar', () => {
        for (let i = 0; i < 15; i++) recordError('oyun', `hata ${i} ali@x.com`);
        const text = recentErrorsText()!;
        expect(text).not.toContain('ali@x.com');
        expect(text).toContain('hata 14');
        expect(text).not.toContain('hata 4 ');            // en eskiler atıldı
        expect(text.length).toBeLessThanOrEqual(LIMITS.error);
    });

    it('hata yoksa null', () => {
        expect(recentErrorsText()).toBeNull();
    });
});
