import { AI_CONSENT_VERSION } from '../../lib/aiConsentCore';
import { enforceAiAccess } from './aiAccess';

function fakeRes() {
    const out: { status?: number; body?: unknown } = {};
    const res = {
        status(code: number) { out.status = code; return res; },
        json(body: unknown) { out.body = body; return res; },
    };
    return { res: res as never, out };
}

function fakeAuthed(opts: { consent?: unknown; admin?: boolean }) {
    const calls: string[] = [];
    const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: opts.admin ? { user_id: 'u1' } : null, error: null }),
    };
    const supabase = { from: (t: string) => { calls.push(t); return query; } };
    return { authed: { user: { id: 'u1', user_metadata: { ai_consent: opts.consent } }, supabase } as never, calls };
}

const izin = { version: AI_CONSENT_VERSION, voice: null, report: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z' };

describe('enforceAiAccess', () => {
    it('izinli veli isteği geçer; admins tablosuna hiç bakılmaz', async () => {
        const { res, out } = fakeRes();
        const { authed, calls } = fakeAuthed({ consent: izin });
        expect(await enforceAiAccess(res, authed, 'veli_kumulatif_rapor', 'text')).toBe(true);
        expect(out.status).toBeUndefined();
        expect(calls).toEqual([]);
    });

    it('izinsiz istek 403 consent_required + kapsam döner', async () => {
        const { res, out } = fakeRes();
        expect(await enforceAiAccess(res, fakeAuthed({}).authed, 'veli_kumulatif_rapor', 'text')).toBe(false);
        expect(out).toEqual({ status: 403, body: { error: 'consent_required', scope: 'report' } });
        const sesli = fakeRes();
        await enforceAiAccess(sesli.res, fakeAuthed({ consent: izin }).authed, 'bunusoyle_transkript', 'voice');
        expect(sesli.out).toEqual({ status: 403, body: { error: 'consent_required', scope: 'voice' } });
    });

    it('admin özelliği: admins üyesi geçer, üye olmayan 403 admin_required', async () => {
        const okRes = fakeRes();
        const admin = fakeAuthed({ admin: true });
        expect(await enforceAiAccess(okRes.res, admin.authed, 'admin_oyun_analizi', 'text')).toBe(true);
        expect(admin.calls).toEqual(['admins']);
        const noRes = fakeRes();
        expect(await enforceAiAccess(noRes.res, fakeAuthed({ admin: false, consent: izin }).authed, 'admin_oyun_analizi', 'text')).toBe(false);
        expect(noRes.out).toEqual({ status: 403, body: { error: 'admin_required', scope: null } });
    });

    it('biçimsiz özellik adı 400', async () => {
        const { res, out } = fakeRes();
        expect(await enforceAiAccess(res, fakeAuthed({ consent: izin }).authed, 'Kötü Ad!', 'text')).toBe(false);
        expect(out.status).toBe(400);
    });
});
