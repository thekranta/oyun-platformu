/**
 * Mağaza (App Store / Google Play) kurallarının kodda KORUNDUĞUNU sınar. Bu testlerden biri kırılıyorsa mağaza
 * incelemesinde reddedilme riski doğmuş demektir; düzeltmeden önce kuralın gerekçesini okuyun:
 *   - Çocuğa yönelik uygulamada dış bağlantı ve satın alma ebeveyn kapısının ardındadır (Apple 1.3, Google Aile Politikası).
 *   - Uygulama içinde web fiyatı / web satın alma bağlantısı gösterilmez (Apple 3.1.1 yönlendirme kuralı).
 *   - Çocuğun bilgisi ebeveyn izni olmadan üçüncü taraf yapay zekâya gitmez (Apple 5.1.2(i)).
 *   - Hesap oluşturan uygulama hesap silmeyi uygulama içinde sunar (Apple 5.1.1(v), Google Hesap Silme Politikası).
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import en from '../locales/en.json';
import tr from '../locales/tr.json';

const ROOT = join(__dirname, '..');
const oku = (yol: string) => readFileSync(join(ROOT, yol), 'utf8');
const yorumsuz = (kaynak: string) => kaynak.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function kaynakDosyalari(dir: string, acc: string[] = []): string[] {
    for (const ad of readdirSync(dir)) {
        if (ad === 'node_modules' || ad === 'dist' || ad === 'scratchpad' || ad === 'android' || ad === 'ios' || ad.startsWith('.')) continue;
        const tam = join(dir, ad);
        if (statSync(tam).isDirectory()) kaynakDosyalari(tam, acc);
        else if (/\.(ts|tsx)$/.test(ad) && !/\.test\.tsx?$/.test(ad) && !ad.endsWith('.d.ts')) acc.push(tam);
    }
    return acc;
}
const rel = (p: string) => relative(ROOT, p).split('\\').join('/');
const HEPSI = kaynakDosyalari(ROOT).map((p) => ({ yol: rel(p), kaynak: oku(rel(p)) }));

describe('dış bağlantılar ebeveyn kapısından geçer', () => {
    it('Linking.openURL yalnız lib/externalLink.ts’te ve web’e özel fiyat yönlendirmelerinde kullanılır', () => {
        const kullananlar = HEPSI.filter((d) => /Linking\.openURL\(/.test(yorumsuz(d.kaynak))).map((d) => d.yol).sort();
        expect(kullananlar).toEqual([
            'components/TeacherDashboard.tsx',
            'components/ToyRoom.tsx',
            'components/VeliDashboard.tsx',
            'lib/externalLink.ts',
            'lib/openPricing.ts',
        ]);
    });

    it('fiyat yönlendirmeleri YALNIZ web’de açar: Linking’ten önce mobil dal ödeme ekranına gidip döner', () => {
        for (const yol of ['components/TeacherDashboard.tsx', 'components/ToyRoom.tsx', 'components/VeliDashboard.tsx', 'lib/openPricing.ts']) {
            const k = oku(yol);
            const m = k.match(/if \(Platform\.OS !== 'web'\) \{ router\.push\('\/paket-satin-al\?kind=\w+'\); return; \}\s*\n\s*Linking\.openURL\(PRICING_URL\)/);
            expect(`${yol}: ${m ? 'tamam' : 'mobil dal eksik'}`).toBe(`${yol}: tamam`);
        }
    });

    it('lib/externalLink.ts mobilde önce ebeveyn kapısını ister', () => {
        const k = yorumsuz(oku('lib/externalLink.ts'));
        expect(k).toMatch(/Platform\.OS !== 'web'[\s\S]*requestParentGate\(\)[\s\S]*Linking\.openURL/);
    });
});

describe('uygulama içinde web fiyatı/satın alma bağlantısı yok', () => {
    it('ödeme ekranı ve sunum bileşeni web adresi içermez', () => {
        for (const yol of ['app/paket-satin-al.tsx', 'components/PaywallView.tsx']) {
            expect(yorumsuz(oku(yol))).not.toMatch(/childhoodtech\.com|#pricing/);
        }
    });

    it('ödeme metinlerinde (TR/EN) web adresi ya da “Premium” geçmez', () => {
        for (const dil of [tr, en]) {
            const metin = JSON.stringify((dil as Record<string, unknown>).paywall);
            expect(metin).not.toMatch(/childhoodtech|\.com|premium/i);
        }
    });

    it('PRICING_URL yalnız web dalında kullanılır (mobil dalın dışında kullanımı yok)', () => {
        for (const yol of ['components/TeacherDashboard.tsx', 'components/ToyRoom.tsx', 'components/VeliDashboard.tsx', 'lib/openPricing.ts']) {
            const kullanimlar = yorumsuz(oku(yol)).match(/PRICING_URL/g) ?? [];
            expect(kullanimlar).toHaveLength(2); // tanım + Linking.openURL(PRICING_URL)
        }
    });
});

describe('ödeme ekranı ebeveyn kapısının ardında', () => {
    it('paket-satin-al ekrana girerken kapıyı ister ve geçilmezse geri döner', () => {
        const k = yorumsuz(oku('app/paket-satin-al.tsx'));
        expect(k).toMatch(/requestParentGate\(\)\.then/);
        expect(k).toMatch(/else leave\(\)/);
        expect(k).toMatch(/if \(!gatePassed\) return/);
    });

    it('çocuk odasında ödeme ekranına gitmeden önce yetişkin penceresi kapanır (Modal ödeme ekranını örtmesin)', () => {
        const k = oku('components/ToyRoom.tsx');
        expect((k.match(/setAdult\(false\); setLocked\(null\); openPricing\(\);/g) ?? []).length).toBe(2);
    });
});

describe('yapay zekâ / ses izni', () => {
    it('Bunu Söyle! ses izni olmadan oyunu açmaz ve mikrofon iznini onaydan sonra ister', () => {
        const k = yorumsuz(oku('components/BunuSoyle.tsx'));
        expect(k).toMatch(/ensureAiConsent\('voice'\)/);
        expect(k).toMatch(/if \(!voiceConsentOk\) return;[\s\S]{0,200}requestPermission\(\)/);
        expect(k).toMatch(/if \(!voiceConsentOk\) \{[\s\S]{0,300}return \(/);
    });

    it('rapor özellikleri çağrıdan önce izin ister; istemci izin yoksa isteği hiç yapmaz', () => {
        expect(yorumsuz(oku('components/VeliDashboard.tsx'))).toMatch(/ensureAiConsent\('report'\)/);
        expect(yorumsuz(oku('components/TeacherDashboard.tsx'))).toMatch(/ensureAiConsent\('report'\)/);
        const istemci = yorumsuz(oku('services/aiAnalysisClient.ts'));
        expect(istemci.indexOf('hasAiConsent')).toBeGreaterThan(-1);
        expect(istemci.indexOf('hasAiConsent')).toBeLessThan(istemci.indexOf('fetch('));
    });

    it('veli raporu isteminde çocuğun adı yok (yalnız yaş ve oyun verisi)', () => {
        const k = oku('components/VeliDashboard.tsx');
        const bas = k.indexOf('const analyzeWithAI');
        const son = k.indexOf('/** Sınıf davetleri', bas);
        const govde = k.slice(bas, son);
        expect(govde).toContain('const prompt = `');
        expect(govde).not.toMatch(/\$\{\s*childName\s*\}/);
        expect(govde).not.toMatch(/\$\{\s*_childName\s*\}/);
    });

    it('öğretmen özeti isteminde öğrenci adı yok', () => {
        const k = oku('lib/teacherSummary.ts');
        expect(k).toMatch(/rencinin adı AI/);
        expect(yorumsuz(k)).not.toMatch(/\.child_name|\.ogrenci_adi/);
    });
});

describe('hesap silme', () => {
    it('uygulama içinde bulunabilir: çocuk odası yetişkin menüsü, veli ve öğretmen panelleri “Hesap ve gizlilik”e bağlanır', () => {
        for (const yol of ['components/ToyRoom.tsx', 'components/VeliDashboard.tsx', 'components/TeacherDashboard.tsx']) {
            expect(oku(yol)).toContain("router.push('/gizlilik-ayarlari')");
        }
        expect(oku('app/gizlilik-ayarlari.tsx')).toContain("router.push('/hesap-sil')");
    });

    it('herkese açık web adresi için rota var (Google Play “Hesap silme bağlantısı”)', () => {
        const rota = oku('app/hesap-sil.tsx');
        expect(rota).toContain('export default function HesapSil');
        expect(rota).toContain('https://oyun.childhoodtech.com/hesap-sil');
    });

    it('sunucu uç noktası taze giriş ve onay ifadesi ister, service_role anahtarı istemciye sızmaz', () => {
        const api = oku('api/delete-account.ts');
        expect(api).toContain('isRecentlyAuthenticated');
        expect(api).toContain('CONFIRM_PHRASE');
        expect(api).toContain('SUPABASE_SERVICE_ROLE_KEY');
        for (const d of HEPSI) {
            if (d.yol.startsWith('api/')) continue;
            expect(`${d.yol}: ${/SERVICE_ROLE/.test(d.kaynak) ? 'sızıntı' : 'temiz'}`).toBe(`${d.yol}: temiz`);
        }
    });

    it('oturum her yerden kapanınca çocuk odası giriş ekranına döner (hesap silindikten sonra eski oturum kalmaz)', () => {
        const k = oku('app/(tabs)/index.tsx');
        expect(k).toMatch(/onAuthStateChange\(\(event\) => \{\s*if \(event === 'SIGNED_OUT'\) sifirlaOturum\(\)/);
    });
});

describe('kayıt onayları', () => {
    it('akademik araştırma izni İSTEĞE BAĞLI (kayıt onsuz tamamlanır); zorunlu olan kullanım şartları + çocuk bilgisinin işlenmesi', () => {
        const k = yorumsuz(oku('app/signup.tsx'));
        expect(k).not.toMatch(/if \(!dataConsent\)/); // araştırma izni kayıt şartı değil
        expect(k).toMatch(/if \(!termsAccepted\)/);
        expect(k).toMatch(/const \[dataConsent, setDataConsent\] = useState\(false\)/); // araştırma izni varsayılan kapalı
        expect(k).toMatch(/\(İsteğe bağlı\) Verilerimin akademik araştırma/);
        expect(k).toMatch(/Kullanım Şartları'nı ve Gizlilik Politikası'nı okudum, kabul ediyorum/);
    });

    it('araştırma izni kullanım şartlarının kabulüyle karıştırılmaz (bilgilendirme metni isteğe bağlı olduğunu söyler)', () => {
        const k = oku('app/signup.tsx');
        expect(k).toMatch(/Bu onay tamamen isteğe bağlıdır/);
        expect(k).not.toMatch(/platformun kullanım şartlarına onay verdiğinizi/);
    });
});

describe('yeni ekranların metinleri iki dilde var', () => {
    const anahtarlar = (nesne: unknown, onek = ''): string[] =>
        Object.entries(nesne as Record<string, unknown>).flatMap(([k, v]) =>
            v && typeof v === 'object' && !Array.isArray(v) ? anahtarlar(v, `${onek}${k}.`) : [`${onek}${k}`]);

    const AD_ALANLARI = ['parentGate', 'aiConsent', 'account', 'deleteAccount', 'paywall'] as const;

    it('TR ve EN aynı anahtarlara sahip', () => {
        for (const alan of AD_ALANLARI) {
            expect(anahtarlar((en as Record<string, unknown>)[alan]).sort()).toEqual(anahtarlar((tr as Record<string, unknown>)[alan]).sort());
        }
        expect((tr as unknown as { toyRoom: Record<string, string> }).toyRoom.accountPrivacy).toBeTruthy();
        expect((en as unknown as { toyRoom: Record<string, string> }).toyRoom.accountPrivacy).toBeTruthy();
    });

    it('ekranlarda kullanılan t(...) anahtarlarının hepsi tanımlı', () => {
        const dosyalar = ['components/ParentGateHost.tsx', 'components/PaywallView.tsx', 'app/ai-izni.tsx', 'app/gizlilik-ayarlari.tsx', 'app/hesap-sil.tsx', 'app/paket-satin-al.tsx'];
        const varOlan = new Set(anahtarlar(tr));
        // Dinamik anahtarların alabileceği değerler
        const genislet = (anahtar: string): string[] => {
            if (anahtar.includes('${scope}')) return ['voice', 'report'].map((s) => anahtar.replace('${scope}', s));
            if (anahtar.includes('${tier}') && anahtar.startsWith('paywall.benefit')) return ['tohum', 'filiz', 'fidan', 'orman', 'cinar'].map((s) => anahtar.replace('${tier}', s));
            if (anahtar.includes('${per}')) return ['perWeek', 'perMonth', 'perTwoMonths', 'perThreeMonths', 'perSixMonths', 'perYear', 'lifetime'].map((s) => anahtar.replace('${per}', s));
            return [anahtar];
        };
        const eksik: string[] = [];
        for (const yol of dosyalar) {
            const k = oku(yol);
            const bulunan = [...k.matchAll(/\bt\(\s*[`'"]((?:parentGate|aiConsent|account|deleteAccount|paywall|toyRoom)\.[^`'"]+)[`'"]/g)].map((m) => m[1]);
            const haritadan = [...k.matchAll(/'((?:deleteAccount)\.[A-Za-z]+)'/g)].map((m) => m[1]);
            for (const a of [...bulunan, ...haritadan].flatMap(genislet)) {
                if (!varOlan.has(a) && !(a === 'deleteAccount.willDelete')) eksik.push(`${yol}: ${a}`);
            }
        }
        expect(eksik).toEqual([]);
    });
});

describe('uygulama yapılandırması (app.json / eas.json)', () => {
    const app = JSON.parse(oku('app.json')).expo;
    const eas = JSON.parse(oku('eas.json'));

    it('iPad kapalı, şifreleme beyanı var (App Store Connect sorusu yanıtlı gelir)', () => {
        expect(app.ios.supportsTablet).toBe(false);
        expect(app.ios.config.usesNonExemptEncryption).toBe(false);
    });

    it('Android: gereksiz depolama/üst pencere izinleri engelli, yalnız mikrofon var; yedekleme kapalı', () => {
        expect(app.android.permissions).toEqual(['android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS']);
        expect(app.android.blockedPermissions).toEqual(expect.arrayContaining([
            'android.permission.READ_EXTERNAL_STORAGE',
            'android.permission.WRITE_EXTERNAL_STORAGE',
            'android.permission.SYSTEM_ALERT_WINDOW',
            'com.google.android.gms.permission.AD_ID', // çocuk uygulamasında reklam kimliği yok (Google Aile Politikası)
        ]));
        expect(app.android.allowBackup).toBe(false);
    });

    it('mikrofon açıklaması çocuğun sesinin ne için kullanıldığını söyler (İngilizce taban + Türkçe)', () => {
        const plugin = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-av');
        expect(plugin[1].microphonePermission).toMatch(/microphone[\s\S]*speech recognition[\s\S]*not stored/i);
        const trLocale = JSON.parse(oku('assets/native-locales/tr.json'));
        expect(trLocale.ios.NSMicrophoneUsageDescription).toMatch(/mikrofon[\s\S]*saklanmaz/);
        expect(trLocale.ios.NSMicrophoneUsageDescription).not.toMatch(/"/); // InfoPlist.strings tırnaklarda kaçış yapmaz
        expect(app.locales.tr).toBe('./assets/native-locales/tr.json');
    });

    it('anlık güncelleme (expo-updates) kurulu: çalışma sürümü uygulama sürümüne bağlı, kanallar tanımlı', () => {
        expect(app.runtimeVersion).toEqual({ policy: 'appVersion' });
        expect(app.updates.url).toBe(`https://u.expo.dev/${app.extra.eas.projectId}`);
        expect(JSON.parse(oku('package.json')).dependencies['expo-updates']).toBeTruthy();
        expect(eas.build.production.channel).toBe('production');
        expect(eas.build.preview.channel).toBe('preview');
    });

    it('ikon dosyaları alfa kanalsız tam kare (App Store) ve doğru boyutta', () => {
        const png = readFileSync(join(ROOT, 'assets/images/icon.png'));
        expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1024, 1024]);
        expect(png[25]).toBe(2); // 2 = RGB (alfa yok); 6 = RGBA olurdu
    });
});
