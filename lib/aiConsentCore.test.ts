import { AI_CONSENT_VERSION, AI_FEATURE_PATTERN, decideAiAccess, isConsentExemptFeature } from './aiConsentCore';

const granted = (scopes: Array<'voice' | 'report'>) => ({
    version: AI_CONSENT_VERSION,
    voice: scopes.includes('voice') ? '2026-11-01T10:00:00.000Z' : null,
    report: scopes.includes('report') ? '2026-11-01T10:00:00.000Z' : null,
    updatedAt: '2026-11-01T10:00:00.000Z',
});

describe('decideAiAccess (sunucu tarafı yapay zekâ kapısı)', () => {
    it('metin özelliği: hesapta report izni varsa açık, yoksa consent_required (kapsam bildirilir)', () => {
        expect(decideAiAccess({ feature: 'veli_kumulatif_rapor', kind: 'text', consentRaw: granted(['report']), isAdmin: false })).toEqual({ allowed: true, scope: 'report' });
        expect(decideAiAccess({ feature: 'ogretmen_gelisim_ozeti', kind: 'text', consentRaw: granted(['voice']), isAdmin: false })).toEqual({ allowed: false, reason: 'consent_required', scope: 'report' });
        expect(decideAiAccess({ feature: 'veli_kumulatif_rapor', kind: 'text', consentRaw: undefined, isAdmin: false })).toMatchObject({ allowed: false, reason: 'consent_required' });
    });

    it('ses özelliği voice kapsamı ister; report izni yetmez', () => {
        expect(decideAiAccess({ feature: 'bunusoyle_transkript', kind: 'voice', consentRaw: granted(['voice']), isAdmin: false })).toEqual({ allowed: true, scope: 'voice' });
        expect(decideAiAccess({ feature: 'bunusoyle_transkript', kind: 'voice', consentRaw: granted(['report']), isAdmin: false })).toEqual({ allowed: false, reason: 'consent_required', scope: 'voice' });
    });

    it('eski sürümde verilmiş izin geçersizdir', () => {
        const eski = { ...granted(['report']), version: '2025-01-01' };
        expect(decideAiAccess({ feature: 'veli_kumulatif_rapor', kind: 'text', consentRaw: eski, isAdmin: false })).toMatchObject({ allowed: false, reason: 'consent_required' });
    });

    it('admin_* özellikleri yalnız admins üyesine açık; izin kapsamı aranmaz', () => {
        expect(isConsentExemptFeature('admin_oyun_analizi')).toBe(true);
        expect(decideAiAccess({ feature: 'admin_oyun_analizi', kind: 'text', consentRaw: undefined, isAdmin: true })).toEqual({ allowed: true, scope: null });
        expect(decideAiAccess({ feature: 'admin_oyun_analizi', kind: 'text', consentRaw: granted(['report']), isAdmin: false })).toEqual({ allowed: false, reason: 'admin_required', scope: null });
    });

    it('özellik adı gönderilmemişse (eski istemci) yine izin aranır; biçimsiz ad reddedilir, metin olmayan ad yok sayılır', () => {
        expect(decideAiAccess({ feature: undefined, kind: 'text', consentRaw: granted(['report']), isAdmin: true })).toEqual({ allowed: true, scope: 'report' });
        expect(decideAiAccess({ feature: undefined, kind: 'text', consentRaw: undefined, isAdmin: true })).toMatchObject({ allowed: false, reason: 'consent_required' });
        for (const kotu of ['Admin_X', 'a b', 'x'.repeat(65), 'veli-rapor']) {
            expect(decideAiAccess({ feature: kotu, kind: 'text', consentRaw: granted(['report']), isAdmin: true })).toEqual({ allowed: false, reason: 'invalid_feature', scope: null });
        }
        for (const metinDegil of [5, {}, null]) {
            expect(decideAiAccess({ feature: metinDegil, kind: 'text', consentRaw: granted(['report']), isAdmin: false }).allowed).toBe(true);
        }
        expect(AI_FEATURE_PATTERN.test('veli_kumulatif_rapor')).toBe(true);
    });
});
