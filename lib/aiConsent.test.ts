import {
    AI_CONSENT_VERSION,
    applyConsent,
    emptyConsent,
    isConsentExemptFeature,
    isScopeGranted,
    parseConsent,
    pickNewest,
} from './aiConsent';

const T1 = '2026-11-01T10:00:00.000Z';
const T2 = '2026-11-02T10:00:00.000Z';

describe('parseConsent', () => {
    it('geçerli kaydı okur', () => {
        const c = parseConsent({ version: AI_CONSENT_VERSION, voice: T1, report: null, updatedAt: T1 });
        expect(c).toEqual({ version: AI_CONSENT_VERSION, voice: T1, report: null, updatedAt: T1 });
        expect(isScopeGranted(c, 'voice')).toBe(true);
        expect(isScopeGranted(c, 'report')).toBe(false);
    });

    it('eski sürümde verilmiş izni geçersiz sayar (metin değişince yeniden sorulur)', () => {
        expect(parseConsent({ version: '2025-01-01', voice: T1, report: T1, updatedAt: T1 })).toEqual(emptyConsent());
    });

    it('bozuk/boş girdide hiçbir izin vermez', () => {
        for (const raw of [null, undefined, 'evet', 42, [], {}, { version: AI_CONSENT_VERSION, voice: 'tarih-degil', report: 5 }]) {
            const c = parseConsent(raw);
            expect(isScopeGranted(c, 'voice')).toBe(false);
            expect(isScopeGranted(c, 'report')).toBe(false);
        }
    });
});

describe('applyConsent', () => {
    it('yalnız istenen kapsamı verir; ötekine dokunmaz', () => {
        const c = applyConsent(emptyConsent(), ['voice'], true, T1);
        expect(c.voice).toBe(T1);
        expect(c.report).toBeNull();
        expect(c.updatedAt).toBe(T1);
    });

    it('geri alma kapsamı siler ve zamanı günceller', () => {
        const granted = applyConsent(emptyConsent(), ['voice', 'report'], true, T1);
        const revoked = applyConsent(granted, ['report'], false, T2);
        expect(revoked.voice).toBe(T1);
        expect(revoked.report).toBeNull();
        expect(revoked.updatedAt).toBe(T2);
    });
});

describe('pickNewest', () => {
    it('daha yeni değişikliği seçer: eski cihaz kaydı geri alınmış izni geri getirmez', () => {
        const device = applyConsent(emptyConsent(), ['voice'], true, T1);
        const account = applyConsent(device, ['voice'], false, T2);
        expect(isScopeGranted(pickNewest(account, device), 'voice')).toBe(false);
        expect(isScopeGranted(pickNewest(device, account), 'voice')).toBe(false);
    });

    it('eşit zamanda birinci (hesap) kazanır', () => {
        const a = applyConsent(emptyConsent(), ['voice'], true, T1);
        const b = applyConsent(emptyConsent(), ['report'], true, T1);
        expect(pickNewest(a, b)).toBe(a);
    });
});

describe('isConsentExemptFeature', () => {
    it('yalnız yönetici paneli özellikleri muaf', () => {
        expect(isConsentExemptFeature('admin_oyun_analizi')).toBe(true);
        expect(isConsentExemptFeature('veli_kumulatif_rapor')).toBe(false);
        expect(isConsentExemptFeature('ogretmen_gelisim_ozeti')).toBe(false);
        expect(isConsentExemptFeature(undefined)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Depolama: hesap (user_metadata) + cihaz yansıması
// ---------------------------------------------------------------------------
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAiConsent, hasAiConsent, setAiConsent } from './aiConsent';
import { supabase } from './supabase';

type AuthMock = { getSession: jest.Mock; updateUser?: jest.Mock };
const auth = supabase.auth as unknown as AuthMock;

function sessionOf(metadata: Record<string, unknown> | undefined, id = 'u-1') {
    return { data: { session: { user: { id, user_metadata: metadata } } } };
}

describe('izin depolama', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        auth.updateUser = jest.fn().mockResolvedValue({ data: {}, error: null });
    });

    it('oturum yoksa izin yok ve yazma reddedilir', async () => {
        auth.getSession.mockResolvedValue({ data: { session: null } });
        expect(await hasAiConsent('voice')).toBe(false);
        expect(await setAiConsent('voice', true)).toBe(false);
        expect(auth.updateUser).not.toHaveBeenCalled();
    });

    it('izin verilince hesaba (user_metadata.ai_consent) ve cihaza yazılır', async () => {
        auth.getSession.mockResolvedValue(sessionOf({}));
        expect(await setAiConsent('voice', true)).toBe(true);
        const sent = auth.updateUser!.mock.calls[0][0].data.ai_consent;
        expect(sent.version).toBe(AI_CONSENT_VERSION);
        expect(sent.voice).not.toBeNull();
        expect(sent.report).toBeNull();
        const local = JSON.parse((await AsyncStorage.getItem('aiConsent.v1:u-1')) as string);
        expect(local.voice).toBe(sent.voice);
    });

    it('çevrimdışı (hesaba yazılamıyor) olsa da cihazdaki izin geçerli kalır', async () => {
        auth.getSession.mockResolvedValue(sessionOf({}));
        auth.updateUser!.mockRejectedValue(new Error('çevrimdışı'));
        expect(await setAiConsent('report', true)).toBe(true);
        expect(await hasAiConsent('report')).toBe(true);
        expect(await hasAiConsent('voice')).toBe(false);
    });

    it('hesapta verilmiş izin yeni cihazda da geçerlidir', async () => {
        const granted = applyConsent(emptyConsent(), ['voice'], true, T1);
        auth.getSession.mockResolvedValue(sessionOf({ ai_consent: granted }));
        const { consent } = await getAiConsent();
        expect(isScopeGranted(consent, 'voice')).toBe(true);
    });

    it('geri alınan izin eski cihaz kaydıyla geri gelmez', async () => {
        const granted = applyConsent(emptyConsent(), ['voice'], true, T1);
        await AsyncStorage.setItem('aiConsent.v1:u-1', JSON.stringify(granted));
        const revoked = applyConsent(granted, ['voice'], false, T2);
        auth.getSession.mockResolvedValue(sessionOf({ ai_consent: revoked }));
        expect(await hasAiConsent('voice')).toBe(false);
    });

    it('izin metni sürümü değişince eski izin geçersiz sayılır', async () => {
        auth.getSession.mockResolvedValue(sessionOf({ ai_consent: { version: '2020-01-01', voice: T1, report: T1, updatedAt: T1 } }));
        expect(await hasAiConsent('voice')).toBe(false);
        expect(await hasAiConsent('report')).toBe(false);
    });

    it('başka kullanıcının cihaz kaydı bu kullanıcıya geçmez', async () => {
        await AsyncStorage.setItem('aiConsent.v1:baska', JSON.stringify(applyConsent(emptyConsent(), ['voice'], true, T1)));
        auth.getSession.mockResolvedValue(sessionOf({}, 'u-1'));
        expect(await hasAiConsent('voice')).toBe(false);
    });
});
