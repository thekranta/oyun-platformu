/**
 * Mağaza satın alması paketi yazabiliyor mu? (DENETIM_RAPORU_2026-11-18, W1)
 *
 * lock_tier_columns() BEFORE UPDATE tetikleyicisi service_role'ü (RevenueCat webhook'u) de kilitliyordu: webhook "ok"
 * diyordu ama paket hiç yazılmıyordu. Bu dosya üç katmanı korur:
 *  1) Göç (fix_lock_tier_service_role.sql): yalnız service_role istisnası; owner/kendi-satır mantığı birebir duruyor;
 *     JWT'siz SQL Editor / current_user muafiyeti YOK; geri alma add_owner_package_write.sql gövdesine dönüyor.
 *     (Davranış ayrıca yerel PGlite replikasında 9 senaryo + bozma denemeleriyle sınandı; PGlite depoda bağımlılık
 *     olmadığı için burada metin sözleşmesi sınanır.)
 *  2) Webhook: güncellemeden dönen satırı geri okuyup paket gerçekten yazıldı mı bakar; yazılmadıysa 500 tier_not_applied.
 *  3) İstemci: RevenueCat anahtar ön eki (appl_/goog_) ve paket yansımadığında "başarılı" denmemesi.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const oku = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');
/** SQL yorumlarını atar ve boşlukları tekleştirir (yorumdaki açıklama sözleşmeyi yanıltmasın). */
const sqlKod = (s: string) => s.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim();
/** CREATE OR REPLACE FUNCTION lock_tier_columns() ... SECURITY DEFINER SET search_path = public; bloğu. */
const fonksiyon = (s: string) => {
    const k = sqlKod(s);
    const m = k.match(/CREATE OR REPLACE FUNCTION lock_tier_columns\(\).*?SET search_path = public;/);
    if (!m) throw new Error('lock_tier_columns gövdesi bulunamadı');
    return m[0];
};

const FIX = oku('supabase_migrations', 'fix_lock_tier_service_role.sql');
const ROLLBACK = oku('supabase_migrations', 'fix_lock_tier_service_role_rollback.sql');
const OWNER_WRITE = oku('supabase_migrations', 'add_owner_package_write.sql');
const SERVICE_DALI = "IF coalesce(auth.role(), '') = 'service_role' THEN RETURN NEW; END IF;";

describe('fix_lock_tier_service_role.sql', () => {
    const fix = fonksiyon(FIX);

    it('fonksiyonun İLK işi service_role erken dönüşü', () => {
        const govde = fix.slice(fix.indexOf(' BEGIN ') + ' BEGIN '.length);
        expect(govde.startsWith(SERVICE_DALI)).toBe(true);
    });

    it('service_role dalı çıkarılınca gövde add_owner_package_write.sql ile birebir aynı (owner/kendi-satır mantığı korunur)', () => {
        expect(fix.replace(SERVICE_DALI + ' ', '')).toBe(fonksiyon(OWNER_WRITE));
    });

    it('JWT\'siz SQL Editor, current_user/session_user ya da anon muafiyeti açılmaz', () => {
        const k = sqlKod(FIX);
        expect(k).not.toMatch(/current_user|session_user/i);
        expect(k).not.toMatch(/auth\.uid\(\) IS NULL/i);
        expect(k).not.toMatch(/auth\.role\(\) IS NULL/i);
        expect(k).not.toMatch(/'anon'|'authenticated'/);
        // Tek muafiyet: service_role, yalnız bir kez.
        expect(k.match(/'service_role'/g)).toHaveLength(1);
    });

    it('owner başkasının satırında kimlik sütunlarını, veli kendi satırında paket sütunlarını eski haline zorlar', () => {
        for (const satir of [
            'NEW.parent_name := OLD.parent_name;', 'NEW.child_name := OLD.child_name;', 'NEW.child_age_months := OLD.child_age_months;',
            'NEW.data_consent := OLD.data_consent;', 'NEW.school_name := OLD.school_name;',
            'NEW.subscription_tier := OLD.subscription_tier;', 'NEW.package_started_at := OLD.package_started_at;',
            'NEW.package_expires_at := OLD.package_expires_at;',
        ]) expect(fix).toContain(satir);
    });

    it('çalıştırmadan önce canlı gövdeyi doğrulama notu var', () => {
        expect(FIX).toContain("select pg_get_functiondef('lock_tier_columns'::regproc);");
    });

    it('geri alma dosyası add_owner_package_write.sql gövdesine BİREBİR döner (ilk kilit sürümüne değil)', () => {
        expect(fonksiyon(ROLLBACK)).toBe(fonksiyon(OWNER_WRITE));
        expect(sqlKod(ROLLBACK)).not.toContain("'service_role'");
        expect(fonksiyon(ROLLBACK)).toContain('is_owner');
    });
});

// ---------------------------------------------------------------------------------------------------------------
// Webhook: sahte Supabase istemcisiyle tetikleyicinin değeri eski haline zorladığı durum canlandırılır.
type Satir = { email: string; subscription_tier: string | null; package_expires_at: string | null };
let mockTablolar: Record<string, Satir[]> = {};
/** true: tetikleyici yazılan paketi eski haline zorlar (göç canlıda yokken olan). */
let mockTetikleyiciKilitler = false;

jest.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: (tablo: string) => {
            let guncelleme: Partial<Satir> | null = null;
            const filtreler: Array<(r: Satir) => boolean> = [];
            const b: any = {
                select: () => b,
                limit: () => b,
                update: (v: Partial<Satir>) => { guncelleme = v; return b; },
                eq: (k: keyof Satir, v: unknown) => { filtreler.push((r) => r[k] === v); return b; },
                lte: (k: keyof Satir, v: string) => { filtreler.push((r) => r[k] != null && Date.parse(r[k] as string) <= Date.parse(v)); return b; },
                then: (ok: (x: unknown) => unknown) => {
                    const satirlar = (mockTablolar[tablo] || []).filter((r) => filtreler.every((f) => f(r)));
                    if (guncelleme && !mockTetikleyiciKilitler) for (const r of satirlar) Object.assign(r, guncelleme);
                    // Supabase timestamptz'yi "+00:00" biçiminde döndürür: biçim farkı yanlış alarm vermemeli.
                    const donen = satirlar.map((r) => ({ ...r, package_expires_at: r.package_expires_at?.replace('Z', '+00:00') ?? null }));
                    return Promise.resolve({ data: donen, error: null }).then(ok);
                },
            };
            return b;
        },
    }),
}));

function yanit() {
    const res: any = { statusCode: 0, body: undefined };
    res.status = (c: number) => { res.statusCode = c; return res; };
    res.json = (x: unknown) => { res.body = x; return res; };
    return res;
}
const istek = (event: Record<string, unknown>) => ({ method: 'POST', headers: { authorization: 'gizli' }, body: { event } }) as any;
const BITIS = Date.parse('2027-01-01T00:00:00.000Z');

describe('api/revenuecat-webhook: paket gerçekten yazıldı mı', () => {
    let handler: (req: any, res: any) => Promise<unknown>;
    let hataLog: jest.SpyInstance;
    beforeAll(() => {
        process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://ornek.supabase.test';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test';
        process.env.REVENUECAT_WEBHOOK_SECRET = 'gizli';
        jest.isolateModules(() => { handler = require('../api/revenuecat-webhook').default; });
    });
    beforeEach(() => {
        mockTetikleyiciKilitler = false;
        mockTablolar = { profiles: [{ email: 'veli@x.test', subscription_tier: 'free', package_expires_at: null }], teachers: [] };
        hataLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });
    afterEach(() => hataLog.mockRestore());

    const satinAlma = { type: 'INITIAL_PURCHASE', app_user_id: 'veli@x.test', entitlement_ids: ['filiz'], expiration_at_ms: BITIS, product_id: 'bilimo_filiz_1m' };

    it('paket yazıldıysa 200 ok', async () => {
        const res = yanit();
        await handler(istek(satinAlma), res);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ ok: true, table: 'profiles', tier: 'filiz' });
        expect(mockTablolar.profiles[0].subscription_tier).toBe('filiz');
    });

    it('tetikleyici paketi eski haline zorlarsa (satır döner ama paket yok) 500 tier_not_applied + hata günlüğü', async () => {
        mockTetikleyiciKilitler = true;
        const res = yanit();
        await handler(istek(satinAlma), res);
        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({ error: 'tier_not_applied' });
        expect(hataLog).toHaveBeenCalled();
    });

    it('süre-doldu sıfırlaması yazılamazsa 500 tier_not_applied; yazılırsa 200 downgraded', async () => {
        mockTablolar.profiles[0] = { email: 'veli@x.test', subscription_tier: 'filiz', package_expires_at: '2026-01-01T00:00:00.000Z' };
        const bitti = { type: 'EXPIRATION', app_user_id: 'veli@x.test', expiration_at_ms: Date.parse('2026-01-01T00:00:00.000Z') };
        mockTetikleyiciKilitler = true;
        const res1 = yanit();
        await handler(istek(bitti), res1);
        expect(res1.statusCode).toBe(500);
        expect(res1.body).toEqual({ error: 'tier_not_applied' });
        expect(hataLog).toHaveBeenCalled();

        mockTetikleyiciKilitler = false;
        const res2 = yanit();
        await handler(istek(bitti), res2);
        expect(res2.statusCode).toBe(200);
        expect(res2.body).toEqual({ ok: true, downgraded: true });
    });

    it('güncellemeler paket sütunlarını geri okur (yalnız email değil)', () => {
        const k = oku('api', 'revenuecat-webhook.ts');
        expect(k).not.toMatch(/\.select\('email'\)/);
        expect((k.match(/\.select\('email, subscription_tier, package_expires_at'\)/g) ?? []).length).toBe(3);
    });
});

describe('istemci: anahtar ön eki ve "başarılı" denmemesi', () => {
    it('purchaseService SDK anahtarını platform ön ekiyle doğrular (appl_/goog_), yoksa kurulmaz', () => {
        const k = oku('services', 'purchaseService.ts');
        expect(k).toMatch(/revenueCatKeyMatchesPlatform\(Platform\.OS, key\)/);
        expect(k).toMatch(/isPurchasesAvailable\(\): boolean \{\s*return Platform\.OS !== 'web' && !!currentApiKey\(\);/);
        expect(k).toMatch(/Purchases\.configure\(\{ apiKey: currentApiKey\(\)!/);
    });

    it('ödeme ekranı "tamamlandı, paketiniz: X"i yalnız veritabanı paketi gösterince söyler; zaman aşımında purchaseDelayed', () => {
        const k = oku('app', 'paket-satin-al.tsx');
        const onPurchase = k.slice(k.indexOf('const onPurchase'), k.indexOf('const onRestore'));
        expect(onPurchase).not.toContain('successWithTier');
        expect(onPurchase).toContain('confirmPurchasedTier(tier)');
        const onay = k.slice(k.indexOf('const confirmPurchasedTier'), k.indexOf('const onPurchase'));
        expect(onay).toMatch(/waitForTier\(kind, email, tier\)\.then\(\(pkg\) =>/);
        expect(onay).toMatch(/if \(pkg\?\.tier === tier\) setBanner\(\{ kind: 'success', text: t\('paywall\.successWithTier'/);
        expect(onay).toMatch(/else setBanner\(\{ kind: 'error', text: t\('paywall\.purchaseDelayed'\) \}\)/);
    });

    it('purchaseDelayed TR ve EN metinleri var ve geri yükleme düğmesinin adını anar', () => {
        const tr = JSON.parse(oku('locales', 'tr.json')).paywall;
        const en = JSON.parse(oku('locales', 'en.json')).paywall;
        expect(tr.purchaseDelayed).toContain(tr.restore);
        expect(en.purchaseDelayed).toContain(en.restore);
    });
});
