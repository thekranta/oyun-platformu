import type { SupabaseClient } from '@supabase/supabase-js';
import {
    attachToken, createOrder, getOrder, hasHigherActivePackage, kucukHam, markFailed, markPaidAndGrant, profileExists,
} from './webSiparis';

// Bellek içi Supabase taklidi: yalnız webSiparis.ts'in kullandığı zincir (select/insert/update + eq/in/is/limit/single).
type Row = Record<string, any>;
type Filtre = (r: Row) => boolean;

interface Kanca {
    /** profiles UPDATE'inde tetikleyiciyi taklit eder (ör. lock_tier_columns değeri geri alır). */
    profilGuncelle?: (eski: Row, yeni: Row) => Row;
    /** Belirli bir tabloya UPDATE'te hata döndür. */
    updateHatasi?: (tablo: string, payload: Row) => any;
}

function sahteDb(kanca: Kanca = {}) {
    const tablolar: Record<string, Row[]> = { web_siparisleri: [], profiles: [] };
    let sayac = 0;
    const benzersizler: Record<string, string[]> = { web_siparisleri: ['iyzico_payment_id', 'conversation_id', 'token'] };

    function from(tablo: string) {
        let op: 'select' | 'insert' | 'update' = 'select';
        let payload: Row = {};
        let donus = false;
        let tek: 'single' | 'maybe' | null = null;
        let sinir: number | null = null;
        const filtreler: Filtre[] = [];

        const calistir = async () => {
            const satirlar = tablolar[tablo];
            if (op === 'insert') {
                sayac += 1;
                const r: Row = { id: `sip-${sayac}`, conversation_id: `conv-${sayac}`, token: null, iyzico_payment_id: null, atama_hedef: null, atanan_bitis: null, ...payload };
                satirlar.push(r);
                return { data: tek ? r : [r], error: null };
            }
            if (op === 'update') {
                const hata = kanca.updateHatasi?.(tablo, payload);
                if (hata) return { data: null, error: hata };
                const hedef = satirlar.filter((r) => filtreler.every((f) => f(r)));
                for (const k of benzersizler[tablo] || []) {
                    if (payload[k] != null && satirlar.some((r) => !hedef.includes(r) && r[k] === payload[k])) {
                        return { data: null, error: { code: '23505', message: 'duplicate key' } };
                    }
                }
                for (const r of hedef) {
                    let yeni = { ...r, ...payload };
                    if (tablo === 'profiles' && kanca.profilGuncelle) yeni = kanca.profilGuncelle(r, yeni);
                    Object.assign(r, yeni);
                }
                return { data: donus ? hedef.map((r) => ({ ...r })) : null, error: null };
            }
            let sonuc = satirlar.filter((r) => filtreler.every((f) => f(r))).map((r) => ({ ...r }));
            if (sinir != null) sonuc = sonuc.slice(0, sinir);
            if (tek) return { data: sonuc[0] ?? null, error: null };
            return { data: sonuc, error: null };
        };

        const q: any = {
            select() { if (op !== 'select') donus = true; return q; },
            insert(p: Row) { op = 'insert'; payload = p; return q; },
            update(p: Row) { op = 'update'; payload = p; return q; },
            eq(c: string, v: any) { filtreler.push((r) => r[c] === v); return q; },
            in(c: string, v: any[]) { filtreler.push((r) => v.includes(r[c])); return q; },
            is(c: string, v: null) { filtreler.push((r) => (r[c] ?? null) === v); return q; },
            limit(n: number) { sinir = n; return q; },
            single() { tek = 'single'; return q; },
            maybeSingle() { tek = 'maybe'; return q; },
            then(ok: any, hata: any) { return calistir().then(ok, hata); },
        };
        return q;
    }
    return { db: { from } as unknown as SupabaseClient, tablolar };
}

const EMAIL = 'veli@ornek.com';
let hataLog: jest.SpyInstance;
beforeEach(() => { hataLog = jest.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { hataLog.mockRestore(); jest.useRealTimers(); });

async function hazirla(kanca: Kanca = {}, profil: Row | null = { email: EMAIL, subscription_tier: 'free', package_started_at: null, package_expires_at: null }) {
    const s = sahteDb(kanca);
    if (profil) s.tablolar.profiles.push(profil);
    const { id, conversationId } = await createOrder(s.db, {
        email: 'Veli@Ornek.com', paket: 'filiz', tutarKurus: 99900, sureAy: 3,
        alici: { ad: 'Ayşe', soyad: 'Yılmaz', telefon: '+905551112233', tckn: '12345678901', adres: 'Bir sokak', sehir: 'İzmir' },
    });
    await attachToken(s.db, id, 'tok-1');
    return { ...s, id, conversationId };
}

describe('sipariş oluşturma ve okuma', () => {
    it('e-posta küçük harfe çevrilir, alıcı kişisel verisi tabloya YAZILMAZ', async () => {
        const { tablolar, id, conversationId } = await hazirla();
        const r = tablolar.web_siparisleri[0];
        expect(r.email).toBe(EMAIL);
        expect(conversationId).toBe('conv-1');
        expect(JSON.stringify(r)).not.toMatch(/Ayşe|Yılmaz|5551112233|12345678901|Bir sokak|İzmir/);
        expect(Object.keys(r)).not.toEqual(expect.arrayContaining(['ad']));
        const o = await getOrder(sahteDbAyni(tablolar), id);
        expect(o).toMatchObject({ id, conversationId, email: EMAIL, paket: 'filiz', tutarKurus: 99900, sureAy: 3, durum: 'beklemede', token: 'tok-1', iyzicoPaymentId: null, bitis: null });
    });

    it('geçersiz paket ve tutar reddedilir', async () => {
        const { db } = sahteDb();
        await expect(createOrder(db, { email: EMAIL, paket: 'cinar', tutarKurus: 1, sureAy: 1, alici: {} })).rejects.toThrow('gecersiz_paket');
        await expect(createOrder(db, { email: EMAIL, paket: 'tohum', tutarKurus: 0, sureAy: 1, alici: {} })).rejects.toThrow('gecersiz_tutar');
    });

    it('olmayan sipariş null', async () => {
        const { db } = sahteDb();
        expect(await getOrder(db, 'yok')).toBeNull();
    });
});

// getOrder'ı aynı tablolar üzerinde çağırmak için küçük yardımcı.
function sahteDbAyni(tablolar: Record<string, Row[]>): SupabaseClient {
    const s = sahteDb();
    s.tablolar.web_siparisleri = tablolar.web_siparisleri;
    s.tablolar.profiles = tablolar.profiles;
    return s.db;
}

describe('markPaidAndGrant', () => {
    it('ödemeyi kaydeder, paketi açar, geri okur; sipariş odendi', async () => {
        jest.useFakeTimers({ now: new Date('2026-11-19T10:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
        const { db, tablolar, id } = await hazirla();
        const r = await markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900, ham: { paymentId: 'pay-1', lastFourDigits: '0016', binNumber: '589004', price: 999 } });
        expect(r).toEqual({ durum: 'odendi', paket: 'filiz', bitis: '2027-02-19T10:00:00.000Z' });
        expect(tablolar.profiles[0]).toMatchObject({ subscription_tier: 'filiz', package_expires_at: '2027-02-19T10:00:00.000Z' });
        const sip = tablolar.web_siparisleri[0];
        expect(sip).toMatchObject({ durum: 'odendi', iyzico_payment_id: 'pay-1', odenen_kurus: 99900, atanan_bitis: '2027-02-19T10:00:00.000Z' });
        expect(sip.ham).toEqual({ paymentId: 'pay-1', price: 999 }); // kart haneleri süzüldü
    });

    it('İDEMPOTENT: ikinci çağrı zaten_islendi döner, paketi ikinci kez UZATMAZ', async () => {
        const { db, tablolar, id } = await hazirla({}, { email: EMAIL, subscription_tier: 'filiz', package_started_at: null, package_expires_at: '2027-01-10T08:00:00.000Z' });
        const a = await markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 });
        expect(a).toMatchObject({ durum: 'odendi', bitis: '2027-04-10T08:00:00.000Z' });
        const b = await markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 });
        expect(b).toEqual({ durum: 'zaten_islendi', paket: 'filiz', bitis: '2027-04-10T08:00:00.000Z' });
        expect(tablolar.profiles[0].package_expires_at).toBe('2027-04-10T08:00:00.000Z');
    });

    it('eşzamanlı iki çağrı: tek ödeme kaydı, paket bir kez uzatılır', async () => {
        const { db, tablolar, id } = await hazirla({}, { email: EMAIL, subscription_tier: 'filiz', package_started_at: null, package_expires_at: '2027-01-10T08:00:00.000Z' });
        const [a, b] = await Promise.all([
            markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 }),
            markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 }),
        ]);
        expect([a.durum, b.durum].every((d) => d === 'odendi' || d === 'zaten_islendi')).toBe(true);
        expect(tablolar.profiles[0].package_expires_at).toBe('2027-04-10T08:00:00.000Z');
        expect(tablolar.web_siparisleri[0].durum).toBe('odendi');
    });

    it('tetikleyici paketi geri alırsa: atama_bekliyor + belirgin log; tetikleyici düzelince yeniden deneme yalnız atamayı tamamlar', async () => {
        let kilitli = true;
        const kanca: Kanca = {
            profilGuncelle: (eski, yeni) => kilitli
                ? { ...yeni, subscription_tier: eski.subscription_tier, package_started_at: eski.package_started_at, package_expires_at: eski.package_expires_at }
                : yeni,
        };
        const { db, tablolar, id } = await hazirla(kanca);
        const a = await markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 });
        expect(a).toEqual({ durum: 'atama_bekliyor', paket: 'filiz', bitis: null });
        expect(tablolar.profiles[0].subscription_tier).toBe('free');
        expect(tablolar.web_siparisleri[0]).toMatchObject({ durum: 'atama_bekliyor', iyzico_payment_id: 'pay-1' });
        expect(hataLog.mock.calls.map((c) => String(c[0])).join('\n')).toMatch(/PARA ALINDI AMA PAKET ACILMADI[\s\S]*fix_lock_tier_service_role\.sql/);
        const hedef = tablolar.web_siparisleri[0].atama_hedef;

        kilitli = false;
        const b = await markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 });
        expect(b).toEqual({ durum: 'odendi', paket: 'filiz', bitis: hedef.expiresAt });
        expect(tablolar.web_siparisleri[0].durum).toBe('odendi');
        expect(tablolar.profiles[0]).toMatchObject({ subscription_tier: 'filiz', package_expires_at: hedef.expiresAt });
    });

    it('profil yazıldı ama sipariş odendi işaretlenemedi: yeniden denemede tekrar UZATILMAZ', async () => {
        let bozuk = true;
        const kanca: Kanca = { updateHatasi: (t, p) => (bozuk && t === 'web_siparisleri' && p.durum === 'odendi' ? { message: 'ag hatasi' } : null) };
        const { db, tablolar, id } = await hazirla(kanca, { email: EMAIL, subscription_tier: 'filiz', package_started_at: null, package_expires_at: '2027-01-10T08:00:00.000Z' });
        const a = await markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 });
        expect(a.durum).toBe('odendi');
        expect(tablolar.web_siparisleri[0].durum).toBe('atama_bekliyor');
        bozuk = false;
        const b = await markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 });
        expect(b).toEqual({ durum: 'odendi', paket: 'filiz', bitis: '2027-04-10T08:00:00.000Z' });
        expect(tablolar.profiles[0].package_expires_at).toBe('2027-04-10T08:00:00.000Z');
        expect(tablolar.web_siparisleri[0].durum).toBe('odendi');
    });

    it('profil yoksa ödeme kaydedilir, atama_bekliyor kalır', async () => {
        const { db, tablolar, id } = await hazirla({}, null);
        const r = await markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 });
        expect(r.durum).toBe('atama_bekliyor');
        expect(tablolar.web_siparisleri[0]).toMatchObject({ durum: 'atama_bekliyor', hata_nedeni: 'profil_yok' });
    });

    it('geçerli daha yüksek paket varsa (yarış) paket DÜŞÜRÜLMEZ, atama_bekliyor kalır', async () => {
        const { db, tablolar, id } = await hazirla({}, { email: EMAIL, subscription_tier: 'orman', package_started_at: null, package_expires_at: '2099-01-01T00:00:00.000Z' });
        const r = await markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 });
        expect(r.durum).toBe('atama_bekliyor');
        expect(tablolar.profiles[0].subscription_tier).toBe('orman');
    });

    it('eksik ödenen tutar paketi açmaz ve ödeme kaydı yazmaz', async () => {
        const { db, tablolar, id } = await hazirla();
        await expect(markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 39900 })).rejects.toThrow('tutar_uyusmuyor');
        expect(tablolar.web_siparisleri[0].durum).toBe('beklemede');
        expect(tablolar.profiles[0].subscription_tier).toBe('free');
    });

    it('aynı paymentId başka siparişte kayıtlıysa ikinci sipariş paket AÇMAZ', async () => {
        const { db, tablolar, id } = await hazirla();
        await markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 });
        const ikinci = await createOrder(db, { email: EMAIL, paket: 'filiz', tutarKurus: 99900, sureAy: 3, alici: {} });
        const r = await markPaidAndGrant(db, { id: ikinci.id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 });
        expect(r.durum).toBe('zaten_islendi');
        expect(tablolar.web_siparisleri[1].durum).toBe('olusturuldu');
    });
});

describe('markFailed ve ön kontroller', () => {
    it('ödenmemiş siparişi basarisiz yapar; ödenmiş siparişi EZMEZ', async () => {
        const { db, tablolar, id } = await hazirla();
        await markPaidAndGrant(db, { id, iyzicoPaymentId: 'pay-1', paidKurus: 99900 });
        await markFailed(db, id, 'kullanici_iptal');
        expect(tablolar.web_siparisleri[0].durum).toBe('odendi');
        const ikinci = await createOrder(db, { email: EMAIL, paket: 'tohum', tutarKurus: 39900, sureAy: 1, alici: {} });
        await markFailed(db, ikinci.id, 'x'.repeat(500));
        expect(tablolar.web_siparisleri[1].durum).toBe('basarisiz');
        expect(tablolar.web_siparisleri[1].hata_nedeni.length).toBe(200);
    });

    it('profileExists ve hasHigherActivePackage', async () => {
        const { db } = await hazirla({}, { email: EMAIL, subscription_tier: 'fidan', package_started_at: null, package_expires_at: '2099-01-01T00:00:00.000Z' });
        expect(await profileExists(db, 'VELI@ornek.com')).toBe(true);
        expect(await profileExists(db, 'baska@ornek.com')).toBe(false);
        expect(await hasHigherActivePackage(db, EMAIL, 'tohum')).toBe(true);
        expect(await hasHigherActivePackage(db, EMAIL, 'fidan')).toBe(false);
        expect(await hasHigherActivePackage(db, EMAIL, 'orman')).toBe(false);
        expect(await hasHigherActivePackage(db, 'baska@ornek.com', 'tohum')).toBe(false);
    });

    it('kucukHam yalnız izinli, kısa alanları tutar', () => {
        expect(kucukHam({ paymentId: '1', cardFamily: 'Bonus', lastFourDigits: '0016', signature: 'abc', fraudStatus: 1 })).toEqual({ paymentId: '1', fraudStatus: 1 });
        expect(kucukHam(null)).toBeNull();
    });
});
