import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import en from '../locales/en.json';
import tr from '../locales/tr.json';

// Supabase istemcisi ağ kurmasın: yalnız oturum jetonu okunur.
const mockGetSession = jest.fn();
jest.mock('./supabase', () => ({
    supabase: { auth: { getSession: (...a: unknown[]) => mockGetSession(...a) } },
}));

import {
    BOS_ALICI,
    DESTEK_EPOSTA,
    DURUM_ARALIK_MS,
    DURUM_EN_COK_DENEME,
    MESAFELI_SATIS_URL,
    ODEME_HATA_KODLARI,
    WEB_PAKET_LISTESI,
    aliciyiDogrula,
    bitisMetni,
    durumKesinMi,
    durumSorgula,
    durumuBekle,
    fiyatMetni,
    hataKoduYanittan,
    hataKodunuNormallestir,
    odemeBaslat,
    odemeHataAnahtari,
    sonucEkraniniSec,
    sozlesmeHazirMi,
    tcknGecerliMi,
    telefonuNormallestir,
    type AliciFormu,
    type DurumSonucu,
} from './webOdeme';

const ROOT = join(__dirname, '..');
const oku = (yol: string) => readFileSync(join(ROOT, yol), 'utf8');
const yorumsuz = (kaynak: string) => kaynak.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const GECERLI: AliciFormu = {
    ad: 'Ayşe',
    soyad: 'Yılmaz',
    telefon: '0532 123 45 67',
    tckn: '',
    adres: 'Atatürk Mah. Gül Sk. No:4 D:2',
    sehir: 'İzmir',
};

const duzlestir = (nesne: unknown, onek = ''): [string, string][] =>
    Object.entries(nesne as Record<string, unknown>).flatMap(([k, v]) =>
        v && typeof v === 'object' && !Array.isArray(v) ? duzlestir(v, onek + k + '.') : [[onek + k, String(v)] as [string, string]]);

describe('paket tablosu ve metin yardımcıları', () => {
    it('görüntü fiyatları sözleşmedeki tablo ile aynı (Tohum 1 ay 399, Filiz 3 ay 999, Fidan 6 ay 1.749, Orman 12 ay 2.899)', () => {
        expect(WEB_PAKET_LISTESI.map((p) => [p.id, p.sureAy, p.fiyat])).toEqual([
            ['tohum', 1, 399],
            ['filiz', 3, 999],
            ['fidan', 6, 1749],
            ['orman', 12, 2899],
        ]);
    });

    it('sunucu fiyat tablosu varsa görüntü tablosuyla birebir aynıdır (kuruş)', () => {
        if (!existsSync(join(ROOT, 'api/_lib/webPaketler.ts'))) return; // sunucu dosyası henüz yazılmamış olabilir
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sunucu = require('../api/_lib/webPaketler').WEB_PAKETLER as Record<string, { kurus: number; sureAy: number }>;
        for (const p of WEB_PAKET_LISTESI) {
            expect({ id: p.id, kurus: sunucu[p.id].kurus, sureAy: sunucu[p.id].sureAy }).toEqual({ id: p.id, kurus: p.fiyat * 100, sureAy: p.sureAy });
        }
    });

    it('fiyat metni dile göre binlik ayırıcı kullanır', () => {
        expect(fiyatMetni(399)).toBe('₺399');
        expect(fiyatMetni(1749, 'tr')).toBe('₺1.749');
        expect(fiyatMetni(2899, 'en')).toBe('₺2,899');
        expect(fiyatMetni(2899, 'en-US')).toBe('₺2,899');
    });

    it('bitiş tarihi okunur biçime çevrilir; geçersiz/boş girdide null', () => {
        expect(bitisMetni('2026-12-19T10:00:00.000Z', 'tr')).toMatch(/2026/);
        expect(bitisMetni('2026-12-19T10:00:00.000Z', 'en')).toMatch(/2026/);
        expect(bitisMetni(null)).toBeNull();
        expect(bitisMetni('')).toBeNull();
        expect(bitisMetni('bozuk')).toBeNull();
    });
});

describe('alıcı formu doğrulaması', () => {
    it('geçerli form kabul edilir; telefon +90 biçimine, boş TCKN hiç gönderilmemeye çevrilir', () => {
        const s = aliciyiDogrula(GECERLI);
        expect(s).toEqual({
            ok: true,
            alici: { ad: 'Ayşe', soyad: 'Yılmaz', telefon: '+905321234567', adres: 'Atatürk Mah. Gül Sk. No:4 D:2', sehir: 'İzmir' },
        });
        expect(s.ok && 'tckn' in s.alici).toBe(false);
    });

    it('11 haneli TCKN kabul edilir ve gönderilir', () => {
        const s = aliciyiDogrula({ ...GECERLI, tckn: '10000000146' });
        expect(s.ok && s.alici.tckn).toBe('10000000146');
    });

    it.each([
        ['ad', { ad: '' }, 'bos'],
        ['ad', { ad: 'A' }, 'gecersiz'],
        ['soyad', { soyad: '  ' }, 'bos'],
        ['soyad', { soyad: 'Y' }, 'gecersiz'],
        ['telefon', { telefon: '' }, 'bos'],
        ['telefon', { telefon: '12345' }, 'gecersiz'],
        ['telefon', { telefon: '0212 123 45 67' }, 'gecersiz'], // sabit hat cep telefonu değil
        ['tckn', { tckn: '1234567890' }, 'gecersiz'], // 10 hane
        ['tckn', { tckn: '01234567890' }, 'gecersiz'], // 0 ile başlar
        ['ad', { ad: 'A'.repeat(61) }, 'gecersiz'], // sunucu sınırı 60
        ['sehir', { sehir: 'İ' }, 'gecersiz'],
        ['adres', { adres: '' }, 'bos'],
        ['adres', { adres: 'kısa' }, 'gecersiz'],
        ['sehir', { sehir: '' }, 'bos'],
    ] as const)('hatalı %s alanı (%j) → %s', (alan, degisim, neden) => {
        const s = aliciyiDogrula({ ...GECERLI, ...degisim });
        expect(s).toEqual({ ok: false, hata: { alan, neden } });
    });

    it('boş form ilk alan olan "ad"da takılır', () => {
        expect(aliciyiDogrula(BOS_ALICI)).toEqual({ ok: false, hata: { alan: 'ad', neden: 'bos' } });
    });

    it('telefon çeşitli yazımlarda aynı biçime gelir', () => {
        for (const g of ['05321234567', '5321234567', '+90 532 123 45 67', '90 (532) 123-45-67', '0532.123.45.67']) {
            expect(telefonuNormallestir(g)).toBe('+905321234567');
        }
        expect(telefonuNormallestir('4321234567')).toBeNull();
        expect(telefonuNormallestir('')).toBeNull();
    });

    it('boşluklar sunucudaki gibi tek boşluğa iner; çift soyadı ve kesme işareti geçer', () => {
        const s = aliciyiDogrula({ ...GECERLI, ad: '  Ayşe   Nur ', soyad: "O'Neil-Yılmaz", sehir: 'Afyon  karahisar' });
        expect(s.ok && [s.alici.ad, s.alici.soyad, s.alici.sehir]).toEqual(['Ayşe Nur', "O'Neil-Yılmaz", 'Afyon karahisar']);
    });

    it('istemci kuralları sunucuyla uyumlu: sunucu kodu varsa aynı TCKN/ad/telefon kararını verir', () => {
        if (!existsSync(join(ROOT, 'api/iyzico-baslat.ts'))) return;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sunucu = require('../api/iyzico-baslat') as { tcknGecerli: (t: string) => boolean; aliciDogrula: (a: unknown) => unknown };
        for (const t of ['10000000146', '10000000147', '74300864791', '01234567890', '1234567890', '123456789012']) {
            expect([t, tcknGecerliMi(t)]).toEqual([t, sunucu.tcknGecerli(t)]);
        }
        // İstemcinin geçirdiği her form sunucuda da geçmeli (gecersiz_alici sürprizi olmasın).
        for (const degisim of [{}, { tckn: '10000000146' }, { ad: 'Ayşe Nur' }, { soyad: "O'Neil-Yılmaz" }]) {
            const s = aliciyiDogrula({ ...GECERLI, ...degisim });
            expect(s.ok).toBe(true);
            if (s.ok) expect(sunucu.aliciDogrula(s.alici)).not.toBeNull();
        }
    });

    it('sözleşme adresi https değilse ödeme kapalı sayılır', () => {
        expect(sozlesmeHazirMi('')).toBe(false);
        expect(sozlesmeHazirMi('   ')).toBe(false);
        expect(sozlesmeHazirMi('http://ornek.com/satis')).toBe(false);
        expect(sozlesmeHazirMi('https://childhoodtech.com/mesafeli-satis.html')).toBe(true);
    });

    it('TCKN yalnız basit biçimi denetler (sunucuyla aynı; sandbox örnek numarası geçer)', () => {
        expect(tcknGecerliMi('74300864791')).toBe(true);
        expect(tcknGecerliMi('7430086479')).toBe(false);
        expect(tcknGecerliMi('743008647911')).toBe(false);
        expect(tcknGecerliMi('abcdefghijk')).toBe(false);
    });
});

describe('hata kodları (TR + EN)', () => {
    it('sözleşmedeki sekiz sunucu kodu + iki istemci kodu eşlidir', () => {
        for (const kod of ['giris_gerekli', 'gecersiz_paket', 'gecersiz_alici', 'daha_yuksek_paket_var', 'profil_yok', 'odeme_yapilandirilmadi', 'saglayici_hatasi', 'cok_istek']) {
            expect(ODEME_HATA_KODLARI).toContain(kod);
        }
        expect(ODEME_HATA_KODLARI).toEqual(expect.arrayContaining(['ag_hatasi', 'genel']));
    });

    it('her kod için hem Türkçe hem İngilizce kullanıcı mesajı var', () => {
        const trH = (tr as unknown as { webOdeme: { hata: Record<string, string> } }).webOdeme.hata;
        const enH = (en as unknown as { webOdeme: { hata: Record<string, string> } }).webOdeme.hata;
        for (const kod of ODEME_HATA_KODLARI) {
            expect(odemeHataAnahtari(kod)).toBe(`webOdeme.hata.${kod}`);
            expect(trH[kod]).toBeTruthy();
            expect(enH[kod]).toBeTruthy();
        }
        expect(Object.keys(trH).sort()).toEqual([...ODEME_HATA_KODLARI].sort());
    });

    it('bilinmeyen kod "genel"e düşer; ham sunucu metni gösterilmez', () => {
        expect(hataKodunuNormallestir('uydurma')).toBe('genel');
        expect(hataKodunuNormallestir(undefined)).toBe('genel');
        expect(odemeHataAnahtari('SELECT * FROM x')).toBe('webOdeme.hata.genel');
    });

    it('gövde kodu yoksa HTTP durumundan türetilir', () => {
        expect(hataKoduYanittan(401, null)).toBe('giris_gerekli');
        expect(hataKoduYanittan(429, null)).toBe('cok_istek');
        expect(hataKoduYanittan(503, {})).toBe('odeme_yapilandirilmadi');
        expect(hataKoduYanittan(502, null)).toBe('saglayici_hatasi');
        expect(hataKoduYanittan(500, null)).toBe('genel');
        expect(hataKoduYanittan(409, { hata: 'daha_yuksek_paket_var' })).toBe('daha_yuksek_paket_var');
    });
});

describe('sunucu istekleri', () => {
    const fetchMock = jest.fn();
    const gercekFetch = global.fetch;
    const yanit = (status: number, govde: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => govde });

    beforeEach(() => {
        fetchMock.mockReset();
        mockGetSession.mockReset();
        mockGetSession.mockResolvedValue({ data: { session: { access_token: 'jeton-1' } } });
        global.fetch = fetchMock as unknown as typeof fetch;
    });
    afterAll(() => { global.fetch = gercekFetch; });

    const alici = { ad: 'Ayşe', soyad: 'Yılmaz', telefon: '+905321234567', adres: 'Atatürk Mah. Gül Sk. No:4', sehir: 'İzmir' };

    it('ödeme başlatma: Bearer jetonla POST eder ve gövdede YALNIZ paket + alıcı vardır (fiyat/tutar yok)', async () => {
        fetchMock.mockResolvedValue(yanit(200, { siparisId: 's-1', odemeUrl: 'https://sandbox-cf.iyzipay.com/odeme?token=x' }));
        const s = await odemeBaslat('filiz', alici);
        expect(s).toEqual({ ok: true, siparisId: 's-1', odemeUrl: 'https://sandbox-cf.iyzipay.com/odeme?token=x' });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('/api/iyzico-baslat');
        expect(init.method).toBe('POST');
        expect(init.headers.Authorization).toBe('Bearer jeton-1');
        const govde = JSON.parse(init.body);
        expect(Object.keys(govde).sort()).toEqual(['alici', 'paket']);
        expect(govde.paket).toBe('filiz');
        expect(init.body).not.toMatch(/fiyat|tutar|price|kurus|amount/i);
    });

    it('oturum yoksa istek hiç atılmaz', async () => {
        mockGetSession.mockResolvedValue({ data: { session: null } });
        expect(await odemeBaslat('tohum', alici)).toEqual({ ok: false, kod: 'giris_gerekli' });
        expect(await durumSorgula('s-1')).toEqual({ ok: false, kod: 'giris_gerekli' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sunucu hata kodları olduğu gibi döner', async () => {
        for (const [status, kod] of [[400, 'gecersiz_paket'], [400, 'gecersiz_alici'], [409, 'daha_yuksek_paket_var'], [409, 'profil_yok'], [503, 'odeme_yapilandirilmadi'], [502, 'saglayici_hatasi'], [429, 'cok_istek'], [401, 'giris_gerekli']] as const) {
            fetchMock.mockResolvedValueOnce(yanit(status, { hata: kod }));
            expect(await odemeBaslat('orman', alici)).toEqual({ ok: false, kod });
        }
    });

    it('ağ hatası ag_hatasi olur; https olmayan ya da eksik yönlendirme adresi reddedilir', async () => {
        fetchMock.mockRejectedValueOnce(new Error('network'));
        expect(await odemeBaslat('tohum', alici)).toEqual({ ok: false, kod: 'ag_hatasi' });
        fetchMock.mockResolvedValueOnce(yanit(200, { siparisId: 's-1', odemeUrl: 'http://kotu.example/odeme' }));
        expect(await odemeBaslat('tohum', alici)).toEqual({ ok: false, kod: 'saglayici_hatasi' });
        fetchMock.mockResolvedValueOnce(yanit(200, { siparisId: 's-1', odemeUrl: 'javascript:alert(1)' }));
        expect(await odemeBaslat('tohum', alici)).toEqual({ ok: false, kod: 'saglayici_hatasi' });
        fetchMock.mockResolvedValueOnce(yanit(200, {}));
        expect(await odemeBaslat('tohum', alici)).toEqual({ ok: false, kod: 'saglayici_hatasi' });
    });

    it('durum sorgusu sipariş kimliğini kodlayarak GET eder ve bilinmeyen durumu reddeder', async () => {
        fetchMock.mockResolvedValueOnce(yanit(200, { durum: 'odendi', paket: 'filiz', bitis: '2027-02-19T00:00:00Z' }));
        expect(await durumSorgula('a b&c')).toEqual({ ok: true, durum: 'odendi', paket: 'filiz', bitis: '2027-02-19T00:00:00Z' });
        expect(fetchMock.mock.calls[0][0]).toBe('/api/iyzico-durum?siparis=a%20b%26c');
        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer jeton-1');
        fetchMock.mockResolvedValueOnce(yanit(200, { durum: 'garip' }));
        expect(await durumSorgula('s-1')).toEqual({ ok: false, kod: 'genel' });
        fetchMock.mockResolvedValueOnce(yanit(404, null));
        expect(await durumSorgula('s-1')).toEqual({ ok: false, kod: 'genel' });
    });
});

describe('durum bekleme (sınırlı yeniden deneme)', () => {
    const bekleme = (...sonuclar: DurumSonucu[]) => {
        const sorgu = jest.fn();
        sonuclar.forEach((s) => sorgu.mockResolvedValueOnce(s));
        const bekle = jest.fn().mockResolvedValue(undefined);
        return { sorgu, bekle };
    };
    const beklemede: DurumSonucu = { ok: true, durum: 'beklemede' };
    const odendi: DurumSonucu = { ok: true, durum: 'odendi', paket: 'tohum', bitis: null };

    it('varsayılan sınır 3 sn aralıkla en çok 10 deneme', () => {
        expect(DURUM_ARALIK_MS).toBe(3000);
        expect(DURUM_EN_COK_DENEME).toBe(10);
    });

    it('kesinleşince hemen durur ve gereksiz beklemez', async () => {
        const { sorgu, bekle } = bekleme(beklemede, beklemede, odendi);
        const r = await durumuBekle('s-1', { sorgu, bekle });
        expect(r).toEqual({ son: odendi, zamanAsimi: false });
        expect(sorgu).toHaveBeenCalledTimes(3);
        expect(bekle).toHaveBeenCalledTimes(2);
        expect(bekle).toHaveBeenCalledWith(3000);
    });

    it('başarısız da kesin sonuçtur', async () => {
        const { sorgu, bekle } = bekleme({ ok: true, durum: 'basarisiz' });
        const r = await durumuBekle('s-1', { sorgu, bekle });
        expect(r.zamanAsimi).toBe(false);
        expect(sorgu).toHaveBeenCalledTimes(1);
        expect(bekle).not.toHaveBeenCalled();
    });

    it('hiç kesinleşmezse tam 10 kez sorar, 9 kez bekler ve zaman aşımı bildirir', async () => {
        const sorgu = jest.fn().mockResolvedValue({ ok: true, durum: 'atama_bekliyor' });
        const bekle = jest.fn().mockResolvedValue(undefined);
        const r = await durumuBekle('s-1', { sorgu, bekle });
        expect(sorgu).toHaveBeenCalledTimes(10);
        expect(bekle).toHaveBeenCalledTimes(9);
        expect(r.zamanAsimi).toBe(true);
        expect(r.son).toEqual({ ok: true, durum: 'atama_bekliyor' });
    });

    it('geçici ağ hatasında denemeye devam eder; oturum yoksa hemen bırakır', async () => {
        const a = bekleme({ ok: false, kod: 'ag_hatasi' }, odendi);
        expect((await durumuBekle('s-1', a)).son).toEqual(odendi);
        const b = bekleme({ ok: false, kod: 'giris_gerekli' }, odendi);
        const r = await durumuBekle('s-1', b);
        expect(r).toEqual({ son: { ok: false, kod: 'giris_gerekli' }, zamanAsimi: false });
        expect(b.sorgu).toHaveBeenCalledTimes(1);
    });

    it('ekran kapanınca (iptal) daha fazla sormaz', async () => {
        let iptal = false;
        const sorgu = jest.fn().mockImplementation(async () => { iptal = true; return beklemede; });
        const bekle = jest.fn().mockResolvedValue(undefined);
        const r = await durumuBekle('s-1', { sorgu, bekle, iptal: () => iptal });
        expect(sorgu).toHaveBeenCalledTimes(1);
        expect(r.zamanAsimi).toBe(false);
    });

    it('özel sınırlar kabul edilir ve ara bildirimi her yanıtta gelir', async () => {
        const sorgu = jest.fn().mockResolvedValue(beklemede);
        const ara = jest.fn();
        const r = await durumuBekle('s-1', { sorgu, bekle: async () => undefined, enCok: 3, aralikMs: 1, ara });
        expect(sorgu).toHaveBeenCalledTimes(3);
        expect(ara).toHaveBeenCalledTimes(3);
        expect(r.zamanAsimi).toBe(true);
    });

    it('durumKesinMi yalnız odendi ve basarisiz için true', () => {
        expect(durumKesinMi('odendi')).toBe(true);
        expect(durumKesinMi('basarisiz')).toBe(true);
        expect(durumKesinMi('beklemede')).toBe(false);
        expect(durumKesinMi('atama_bekliyor')).toBe(false);
    });
});

describe('sonuç ekranı seçimi', () => {
    it('her sunucu durumu bir ekrana çıkar', () => {
        expect(sonucEkraniniSec(null, false)).toBe('yukleniyor');
        expect(sonucEkraniniSec(null, true)).toBe('hata');
        expect(sonucEkraniniSec({ ok: true, durum: 'odendi' }, false)).toBe('basarili');
        expect(sonucEkraniniSec({ ok: true, durum: 'basarisiz' }, false)).toBe('basarisiz');
        expect(sonucEkraniniSec({ ok: true, durum: 'atama_bekliyor' }, false)).toBe('yukleniyor');
        expect(sonucEkraniniSec({ ok: true, durum: 'atama_bekliyor' }, true)).toBe('atama');
        expect(sonucEkraniniSec({ ok: true, durum: 'beklemede' }, false)).toBe('yukleniyor');
        expect(sonucEkraniniSec({ ok: true, durum: 'beklemede' }, true)).toBe('bekliyor');
        expect(sonucEkraniniSec({ ok: false, kod: 'giris_gerekli' }, false)).toBe('giris');
        expect(sonucEkraniniSec({ ok: false, kod: 'ag_hatasi' }, false)).toBe('yukleniyor');
        expect(sonucEkraniniSec({ ok: false, kod: 'ag_hatasi' }, true)).toBe('hata');
    });
});

describe('rotalar yalnız web (Apple 3.1.1) — kaynak koruması', () => {
    for (const yol of ['app/odeme.tsx', 'app/odeme-sonuc.tsx']) {
        it(`${yol}: native'de içerik çizmez, ana sayfaya yönlendirir; kancalar koşulsuz alt bileşende`, () => {
            const k = yorumsuz(oku(yol));
            expect(k).toMatch(/if \(Platform\.OS !== 'web'\) return <Redirect href="\/" \/>;/);
            // Koşullu dönüş, varsayılan dışa aktarılan bileşende ve HİÇBİR kancadan önce
            const govde = k.slice(k.indexOf('export default function'));
            const donus = govde.indexOf("Platform.OS !== 'web'");
            expect(donus).toBeGreaterThan(-1);
            expect(govde.slice(0, donus)).not.toMatch(/use[A-Z]\w+\(/);
            expect(k).toContain('headerShown: false');
        });
    }

    it('uygulamada bu rotalara giden başka bağlantı yoksa bile varsa web ayrımıyla korunur', () => {
        const dizin = (d: string, acc: string[] = []): string[] => {
            for (const ad of readdirSync(d)) {
                if (['node_modules', 'dist', 'android', 'ios', 'scratchpad'].includes(ad) || ad.startsWith('.')) continue;
                const tam = join(d, ad);
                if (statSync(tam).isDirectory()) dizin(tam, acc);
                else if (/\.(ts|tsx)$/.test(ad) && !/\.test\.tsx?$/.test(ad)) acc.push(tam);
            }
            return acc;
        };
        const sahip = new Set(['app/odeme.tsx', 'app/odeme-sonuc.tsx', 'lib/webOdeme.ts']);
        const ihlal: string[] = [];
        for (const d of ['app', 'components', 'lib', 'services', 'hooks', 'constants']) {
            if (!existsSync(join(ROOT, d))) continue;
            for (const tam of dizin(join(ROOT, d))) {
                const yol = relative(ROOT, tam).split('\\').join('/');
                if (sahip.has(yol)) continue;
                const k = yorumsuz(readFileSync(tam, 'utf8'));
                if (/['"`]\/odeme(-sonuc)?[?'"`]/.test(k) && !/Platform\.OS\s*===\s*'web'/.test(k)) ihlal.push(yol);
            }
        }
        expect(ihlal).toEqual([]);
    });

    it('istemci fiyat göndermez: istek gövdesi yalnız { paket, alici }', () => {
        const k = yorumsuz(oku('lib/webOdeme.ts'));
        expect(k).toContain('JSON.stringify({ paket, alici })');
        expect(k).not.toMatch(/JSON\.stringify\(\{[^}]*(fiyat|tutar|price|kurus)/);
    });

    it('çift gönderim kilidi ve zorunlu onay ekranda var; service_role anahtarı istemciye sızmaz', () => {
        const k = yorumsuz(oku('app/odeme.tsx'));
        expect(k).toMatch(/kilit\.current = true;/);
        expect(k).toMatch(/if \(!onay\) \{[^}]*return;/);
        expect(k).toMatch(/disabled=\{busy \|\| !odemeAcik\}/);
        expect(k).toMatch(/if \(kilit\.current \|\| !odemeAcik\) return;/);
        for (const yol of ['app/odeme.tsx', 'app/odeme-sonuc.tsx', 'lib/webOdeme.ts']) expect(oku(yol)).not.toMatch(/SERVICE_ROLE|IYZICO_(API|SECRET)/);
    });

    it('"KDV dahil" ekrana yazılmaz ([DOĞRULA]: mali müşavir onayına kadar)', () => {
        expect(JSON.stringify((tr as Record<string, unknown>).webOdeme)).not.toMatch(/KDV|VAT|tax/i);
        expect(JSON.stringify((en as Record<string, unknown>).webOdeme)).not.toMatch(/KDV|VAT|\btax\b/i);
        expect(oku('lib/webOdeme.ts')).toContain('[DOĞRULA]');
    });

    it('sözleşme adresi boşsa ilgili bağlantı gizlenir (kayıtlı sabit + koşullu çizim)', () => {
        expect(typeof MESAFELI_SATIS_URL).toBe('string');
        expect(oku('app/odeme.tsx')).toMatch(/MESAFELI_SATIS_URL \? \(/);
        expect(oku('lib/webOdeme.ts')).toContain('TODO');
    });

    it('sözleşme adresi yazılmadan ödeme düğmesi kapalı ve veliye nedeni söylenir', () => {
        const k = yorumsuz(oku('app/odeme.tsx'));
        expect(k).toMatch(/const odemeAcik = sozlesmeHazirMi\(\);/);
        expect(k).toContain("t('webOdeme.sozlesmeHazirDegil')");
        // Adres şu an boşsa ödeme gerçekten kapalı; adres girilince bu satır doğal olarak true olur.
        expect(sozlesmeHazirMi()).toBe(MESAFELI_SATIS_URL.trim() !== '');
    });

    it('"Tekrar dene" yalnız başarısız ekranında ve tutar düştüyse önce yazmayı söyler', () => {
        expect(JSON.stringify((tr as Record<string, unknown>).webOdeme)).toMatch(/yeniden ödeme yapmadan önce bize yazın/);
        expect(JSON.stringify((en as Record<string, unknown>).webOdeme)).toMatch(/before paying again/);
    });

    it('destek adresi hesap silme ekranındakiyle aynı', () => {
        expect(DESTEK_EPOSTA).toBe('admin@childhoodtech.com');
        expect((tr as unknown as { deleteAccount: { help: string } }).deleteAccount.help).toContain(DESTEK_EPOSTA);
    });
});

describe('webOdeme metinleri (TR/EN)', () => {
    const trD = new Map(duzlestir((tr as Record<string, unknown>).webOdeme));
    const enD = new Map(duzlestir((en as Record<string, unknown>).webOdeme));

    it('TR ve EN anahtarları eşit ve hiçbiri boş değil', () => {
        expect([...enD.keys()].sort()).toEqual([...trD.keys()].sort());
        for (const [k, v] of [...trD, ...enD]) expect(`${k}:${v.trim() ? 'dolu' : 'bos'}`).toBe(`${k}:dolu`);
    });

    it('interpolasyon alanları iki dilde aynı', () => {
        const alanlar = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');
        for (const [k, v] of trD) expect(`${k}:${alanlar(enD.get(k) ?? '')}`).toBe(`${k}:${alanlar(v)}`);
    });

    it('mağaza kuralı: metinlerde web adresi yok (destek adresi {{email}} ile koddan girer); uygulama içi adres/“Premium” geçmez', () => {
        for (const d of [trD, enD]) for (const [k, v] of d) expect(`${k}:${/childhoodtech|\.com|premium|#pricing/i.test(v)}`).toBe(`${k}:false`);
    });

    it('ekranlarda kullanılan sabit t(...) anahtarlarının hepsi tanımlı', () => {
        const varOlan = new Set([...trD.keys()].map((k) => `webOdeme.${k}`));
        const eksik: string[] = [];
        for (const yol of ['app/odeme.tsx', 'app/odeme-sonuc.tsx']) {
            const k = oku(yol);
            for (const m of k.matchAll(/\bt\(\s*['"`](webOdeme\.[^'"`$]+)['"`]/g)) if (!varOlan.has(m[1])) eksik.push(`${yol}: ${m[1]}`);
        }
        expect(eksik).toEqual([]);
    });

    it('dinamik anahtarlar (paket adı, süre, form hataları) tüm değerler için tanımlı', () => {
        for (const p of WEB_PAKET_LISTESI) {
            expect(trD.has(`paket.${p.id}`)).toBe(true);
            expect(trD.has(`sure.ay${p.sureAy}`)).toBe(true);
        }
        for (const alan of Object.keys(BOS_ALICI)) {
            expect(trD.has(`formHata.${alan}.bos`)).toBe(true);
            expect(trD.has(`formHata.${alan}.gecersiz`)).toBe(true);
        }
    });
});
