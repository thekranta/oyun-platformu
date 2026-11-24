// Uç nokta testleri: Supabase, kimlik doğrulama ve sipariş katmanı (webSiparis) MOCK; İyzico yalnız global.fetch üzerinden.
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({ admin: true })) }));
jest.mock('./_lib/auth', () => ({ getAuthedUser: jest.fn() }));
jest.mock('./_lib/webSiparis', () => ({
  createOrder: jest.fn(), attachToken: jest.fn(), getOrder: jest.fn(), markPaidAndGrant: jest.fn(),
  markFailed: jest.fn(), hasHigherActivePackage: jest.fn(), profileExists: jest.fn(),
}));

import { createHmac } from 'crypto';
import { getAuthedUser } from './_lib/auth';
import * as ws from './_lib/webSiparis';
import { normalizePriceForSignature, INIT_PATH, RETRIEVE_PATH } from './_lib/iyzico';
import baslat, { aliciDogrula, tcknGecerli, telefonNormalize, _hizSayaciniSifirla } from './iyzico-baslat';
import donus, { _donusSayaciniSifirla } from './iyzico-donus';
import durum from './iyzico-durum';

const m = ws as unknown as Record<string, jest.Mock>;
const SECRET = 'sandbox-secret-key';
const API_KEY = 'sandbox-api-key';
const SIPARIS = '11111111-2222-3333-4444-555555555555';
const KONUSMA = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const TOKEN = 'tok-0000-1111-2222';

function makeRes() {
  const res: any = { headers: {}, statusCode: 0, body: undefined };
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  res.end = () => res;
  return res;
}

const ALICI = { ad: 'Ayşe', soyad: 'Yılmaz', telefon: '0532 123 45 67', adres: 'Atatürk Cad. No:1 Daire 2', sehir: 'İstanbul' };
const ENV_KEYS = ['IYZICO_API_KEY', 'IYZICO_SECRET_KEY', 'IYZICO_BASE_URL', 'SITE_URL', 'EXPO_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VERCEL_ENV', 'IYZICO_ALLOW_SANDBOX', 'IYZICO_SANDBOX_EPOSTALAR'];
const realFetch = global.fetch;
let fetchMock: jest.Mock;

function iyziYanit(path: string, data: unknown, status = 200) {
  return { path, status, data };
}
function fetchKur(...yanitlar: ReturnType<typeof iyziYanit>[]) {
  fetchMock = jest.fn(async (url: string) => {
    const y = yanitlar.find((r) => url.endsWith(r.path));
    if (!y) throw new Error('beklenmeyen istek ' + url);
    return { status: y.status, json: async () => y.data };
  });
  global.fetch = fetchMock as any;
}

const hmac = (msg: string) => createHmac('sha256', SECRET).update(msg).digest('hex');
const initBasarili = () => ({
  status: 'success', conversationId: KONUSMA, token: TOKEN,
  paymentPageUrl: `https://sandbox-cpp.iyzipay.com?token=${TOKEN}&lang=tr`, signature: hmac(`${KONUSMA}:${TOKEN}`),
});
function retrieve(over: Record<string, unknown> = {}) {
  const d: Record<string, any> = {
    status: 'success', paymentStatus: 'SUCCESS', fraudStatus: 1, paymentId: '19831123', currency: 'TRY',
    basketId: SIPARIS, conversationId: KONUSMA, price: 999.0, paidPrice: '999.00000000', token: TOKEN, ...over,
  };
  const msg = [d.paymentStatus, d.paymentId, d.currency, d.basketId, d.conversationId, normalizePriceForSignature(d.paidPrice), normalizePriceForSignature(d.price), d.token].join(':');
  return { ...d, signature: hmac(msg) };
}
const ORDER = { id: SIPARIS, conversationId: KONUSMA, email: 'veli@ornek.com', paket: 'filiz', tutarKurus: 99900, sureAy: 3, durum: 'beklemede', token: TOKEN, iyzicoPaymentId: null, bitis: null };

beforeEach(() => {
  process.env.IYZICO_API_KEY = API_KEY;
  process.env.IYZICO_SECRET_KEY = SECRET;
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  delete process.env.IYZICO_BASE_URL; delete process.env.SITE_URL; delete process.env.VERCEL_ENV;
  Object.values(m).forEach((f) => { if (typeof f === 'function') f.mockReset(); });
  (getAuthedUser as jest.Mock).mockReset().mockResolvedValue({ user: { id: 'user-1', email: 'Veli@Ornek.com' }, supabase: {} });
  m.profileExists.mockResolvedValue(true);
  m.hasHigherActivePackage.mockResolvedValue(false);
  m.createOrder.mockResolvedValue({ id: SIPARIS, conversationId: KONUSMA });
  m.attachToken.mockResolvedValue(undefined);
  m.markFailed.mockResolvedValue(undefined);
  _hizSayaciniSifirla();
  _donusSayaciniSifirla();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  global.fetch = realFetch;
  ENV_KEYS.forEach((k) => delete process.env[k]);
  jest.restoreAllMocks();
});

const postBaslat = (body: unknown, headers: Record<string, string> = { authorization: 'Bearer jeton' }) =>
  ({ method: 'POST', body, headers: { 'x-forwarded-for': '85.1.2.3, 10.0.0.1', ...headers }, query: {} }) as any;

describe('POST /api/iyzico-baslat', () => {
  it('başarılı: fiyat ve e-posta SUNUCUDAN, istemcinin fiyat/e-posta alanları yok sayılır', async () => {
    fetchKur(iyziYanit(INIT_PATH, initBasarili()));
    const res = makeRes();
    await baslat(postBaslat({ paket: 'filiz', price: '1', paidPrice: '1', email: 'saldirgan@kotu.com', alici: ALICI }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ siparisId: SIPARIS, odemeUrl: initBasarili().paymentPageUrl });

    expect(m.createOrder.mock.calls[0][1]).toMatchObject({ email: 'veli@ornek.com', paket: 'filiz', tutarKurus: 99900, sureAy: 3 });
    // KVKK: TCKN ve açık adres siparişe gitmez.
    expect(m.createOrder.mock.calls[0][1].alici).not.toHaveProperty('tckn');
    expect(m.createOrder.mock.calls[0][1].alici).not.toHaveProperty('adres');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://sandbox-api.iyzipay.com' + INIT_PATH);
    const sent = JSON.parse(init.body);
    expect(sent).toMatchObject({ price: '999', paidPrice: '999', currency: 'TRY', conversationId: KONUSMA, basketId: SIPARIS, enabledInstallments: [1] });
    expect(sent.callbackUrl).toBe(`https://oyun.childhoodtech.com/api/iyzico-donus?siparis=${SIPARIS}`);
    expect(sent.buyer).toMatchObject({ id: 'user-1', email: 'veli@ornek.com', gsmNumber: '+905321234567', ip: '85.1.2.3', identityNumber: '11111111111', country: 'Turkey' });
    expect(sent.basketItems).toEqual([expect.objectContaining({ price: '999', itemType: 'VIRTUAL' })]);
    expect(JSON.stringify(sent)).not.toContain('saldirgan');
    expect(init.headers.Authorization).toMatch(/^IYZWSv2 /);
    expect(m.attachToken).toHaveBeenCalledWith({ admin: true }, SIPARIS, TOKEN);
  });

  it('giriş yoksa 401', async () => {
    (getAuthedUser as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await baslat(postBaslat({ paket: 'tohum', alici: ALICI }, {}), res);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ hata: 'giris_gerekli' });
  });

  it.each([['cinar'], ['toString'], [undefined]])('geçersiz paket %s -> 400', async (paket) => {
    const res = makeRes();
    await baslat(postBaslat({ paket, alici: ALICI }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ hata: 'gecersiz_paket' });
  });

  it('geçersiz alıcı -> 400', async () => {
    const res = makeRes();
    await baslat(postBaslat({ paket: 'tohum', alici: { ...ALICI, telefon: '123' } }), res);
    expect(res.body).toEqual({ hata: 'gecersiz_alici' });
    const res2 = makeRes();
    await baslat(postBaslat({ paket: 'tohum', alici: { ...ALICI, tckn: '01234567890' } }), res2);
    expect(res2.body).toEqual({ hata: 'gecersiz_alici' });
  });

  it('yapılandırma yoksa 503 (çökme yok, sipariş açılmaz)', async () => {
    delete process.env.IYZICO_SECRET_KEY;
    const res = makeRes();
    await baslat(postBaslat({ paket: 'tohum', alici: ALICI }), res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ hata: 'odeme_yapilandirilmadi' });
    expect(m.createOrder).not.toHaveBeenCalled();
  });

  it('service_role yoksa da 503', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = makeRes();
    await baslat(postBaslat({ paket: 'tohum', alici: ALICI }), res);
    expect(res.statusCode).toBe(503);
  });

  it('üretim/önizlemede sandbox: yalnız deneme e-postası başlatabilir, diğerlerine 503', async () => {
    for (const env of ['production', 'preview']) {
      process.env.VERCEL_ENV = env;
      process.env.IYZICO_ALLOW_SANDBOX = '1';
      delete process.env.IYZICO_SANDBOX_EPOSTALAR;
      const r1 = makeRes();
      await baslat(postBaslat({ paket: 'tohum', alici: ALICI }), r1);
      expect([r1.statusCode, r1.body]).toEqual([503, { hata: 'odeme_yapilandirilmadi' }]);
      process.env.IYZICO_SANDBOX_EPOSTALAR = 'baska@ornek.com';
      const r2 = makeRes();
      await baslat(postBaslat({ paket: 'tohum', alici: ALICI }), r2);
      expect(r2.statusCode).toBe(503);
      expect(m.createOrder).not.toHaveBeenCalled();
      // Jetondaki e-posta (Veli@Ornek.com) listede: büyük/küçük harf fark etmez.
      process.env.IYZICO_SANDBOX_EPOSTALAR = 'baska@ornek.com, veli@ornek.com';
      fetchKur(iyziYanit(INIT_PATH, initBasarili()));
      const r3 = makeRes();
      await baslat(postBaslat({ paket: 'tohum', alici: ALICI }), r3);
      expect(r3.statusCode).toBe(200);
      m.createOrder.mockClear();
      _hizSayaciniSifirla();
    }
  });

  it('profil yok / daha yüksek paket -> 409', async () => {
    m.profileExists.mockResolvedValue(false);
    const r1 = makeRes();
    await baslat(postBaslat({ paket: 'tohum', alici: ALICI }), r1);
    expect([r1.statusCode, r1.body]).toEqual([409, { hata: 'profil_yok' }]);
    m.profileExists.mockResolvedValue(true);
    m.hasHigherActivePackage.mockResolvedValue(true);
    const r2 = makeRes();
    await baslat(postBaslat({ paket: 'tohum', alici: ALICI }), r2);
    expect([r2.statusCode, r2.body]).toEqual([409, { hata: 'daha_yuksek_paket_var' }]);
    expect(m.createOrder).not.toHaveBeenCalled();
  });

  it('hız sınırı -> 429', async () => {
    fetchKur(iyziYanit(INIT_PATH, initBasarili()));
    for (let i = 0; i < 5; i++) await baslat(postBaslat({ paket: 'tohum', alici: ALICI }), makeRes());
    const res = makeRes();
    await baslat(postBaslat({ paket: 'tohum', alici: ALICI }), res);
    expect([res.statusCode, res.body]).toEqual([429, { hata: 'cok_istek' }]);
  });

  it('İyzico reddederse 502; hata metni ve anahtar sızmaz, sipariş kapatılır', async () => {
    fetchKur(iyziYanit(INIT_PATH, { status: 'failure', errorCode: '12', errorMessage: 'Gecersiz alici ayse@ornek.com' }, 400));
    const res = makeRes();
    await baslat(postBaslat({ paket: 'tohum', alici: ALICI }), res);
    expect([res.statusCode, res.body]).toEqual([502, { hata: 'saglayici_hatasi' }]);
    expect(m.markFailed).toHaveBeenCalledWith({ admin: true }, SIPARIS, 'baslatma_12');
    expect(m.attachToken).not.toHaveBeenCalled();
    const loglar = JSON.stringify((console.error as jest.Mock).mock.calls);
    expect(loglar).not.toContain('ayse@ornek.com');
    expect(loglar).not.toContain(SECRET);
  });

  it('İyzico yabancı alan adına ödeme adresi döndürürse yönlendirilmez (502)', async () => {
    fetchKur(iyziYanit(INIT_PATH, { ...initBasarili(), paymentPageUrl: 'https://kotu.example.com/odeme' }));
    const res = makeRes();
    await baslat(postBaslat({ paket: 'tohum', alici: ALICI }), res);
    expect(res.statusCode).toBe(502);
  });

  it('İyzico zaman aşımı/ağ hatası -> 502', async () => {
    global.fetch = jest.fn(async () => { throw new Error('ETIMEDOUT'); }) as any;
    const res = makeRes();
    await baslat(postBaslat({ paket: 'tohum', alici: ALICI }), res);
    expect([res.statusCode, res.body]).toEqual([502, { hata: 'saglayici_hatasi' }]);
  });
});

describe('alıcı doğrulama yardımcıları', () => {
  it('istemcinin (lib/webOdeme.ts) kabul ettiği her alan sunucudan da geçer', () => {
    const uzun = 'Ç'.repeat(60);
    expect(aliciDogrula({ ad: uzun, soyad: uzun, sehir: uzun, telefon: '+90 532 123 45 67', tckn: '74300864791', adres: 'A'.repeat(250) }))
      .toMatchObject({ ad: uzun, tckn: '74300864791' });
    expect(aliciDogrula({ ...ALICI, ad: 'Ayşe 2', sehir: 'İstanbul 34' })).not.toBeNull();
    expect(aliciDogrula({ ...ALICI, ad: 'Ç'.repeat(61) })).toBeNull();
  });
  it('TCKN: istemciyle aynı kural (11 hane, ilk hane 0 değil; sağlama aranmaz)', () => {
    expect(tcknGecerli('10000000146')).toBe(true);
    expect(tcknGecerli('10000000147')).toBe(true);
    expect(tcknGecerli('74300864791')).toBe(true); // İyzico belgesindeki sandbox örneği
    expect(tcknGecerli('01234567890')).toBe(false);
    expect(tcknGecerli('1234567890')).toBe(false);
  });
  it('telefon normalleştirme', () => {
    expect(telefonNormalize('0532 123 45 67')).toBe('+905321234567');
    expect(telefonNormalize('+90 (532) 123-45-67')).toBe('+905321234567');
    expect(telefonNormalize('5321234567')).toBe('+905321234567');
    expect(telefonNormalize('+4915112345678')).toBe('+4915112345678');
    expect(telefonNormalize('12')).toBeNull();
  });
  it('metin temizleme ve geçerli TCKN', () => {
    expect(aliciDogrula({ ...ALICI, ad: '  Ayşe\n ', tckn: '10000000146' })).toMatchObject({ ad: 'Ayşe', tckn: '10000000146' });
    expect(aliciDogrula({ ...ALICI, tckn: '123' })).toBeNull();
    expect(aliciDogrula(null)).toBeNull();
  });
});

const postDonus = (body: unknown, query: Record<string, string> = { siparis: SIPARIS }) => ({ method: 'POST', body, headers: {}, query }) as any;
const konum = (res: any) => new URL(res.headers.Location);

describe('POST /api/iyzico-donus', () => {
  beforeEach(() => { m.getOrder.mockResolvedValue({ ...ORDER }); });

  it('doğrulanmış ödeme: paket açılır, sabit adrese 303', async () => {
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve()));
    m.markPaidAndGrant.mockResolvedValue({ durum: 'odendi', paket: 'filiz', bitis: '2027-02-19T00:00:00Z' });
    const res = makeRes();
    await donus(postDonus(`token=${TOKEN}`), res);
    expect(res.statusCode).toBe(303);
    expect(res.headers.Location).toBe(`https://oyun.childhoodtech.com/odeme-sonuc?durum=basarili&siparis=${SIPARIS}`);
    expect(m.markPaidAndGrant).toHaveBeenCalledWith({ admin: true }, expect.objectContaining({ id: SIPARIS, iyzicoPaymentId: '19831123', paidKurus: 99900 }));
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent).toEqual({ locale: 'tr', token: TOKEN, conversationId: KONUSMA });
  });

  it('nesne ve JSON gövdeden de token okunur', async () => {
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve()));
    m.markPaidAndGrant.mockResolvedValue({ durum: 'odendi', paket: 'filiz', bitis: null });
    const r1 = makeRes();
    await donus(postDonus({ token: TOKEN }), r1);
    expect(konum(r1).searchParams.get('durum')).toBe('basarili');
    const r2 = makeRes();
    await donus(postDonus(JSON.stringify({ token: TOKEN })), r2);
    expect(konum(r2).searchParams.get('durum')).toBe('basarili');
  });

  it.each([
    ['tutar uyuşmazlığı', { paidPrice: '1.00000000', price: 1 }, 'tutar_uyusmazligi'],
    ['yanlış basketId', { basketId: 'baska-siparis-0000' }, 'siparis_uyusmazligi'],
    ['yanlış conversationId', { conversationId: 'baska-konusma-0000' }, 'siparis_uyusmazligi'],
    ['başarısız ödeme', { paymentStatus: 'FAILURE' }, 'odeme_basarisiz'],
    ['para birimi', { currency: 'EUR' }, 'para_birimi_uyusmazligi'],
  ])('%s: paket açılmaz, sipariş başarısız', async (_ad, degisim, neden) => {
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve(degisim)));
    const res = makeRes();
    await donus(postDonus(`token=${TOKEN}`), res);
    expect(konum(res).searchParams.get('durum')).toBe('basarisiz');
    expect(m.markPaidAndGrant).not.toHaveBeenCalled();
    expect(m.markFailed).toHaveBeenCalledWith({ admin: true }, SIPARIS, neden);
  });

  it('banka reddi (status=failure, 10xxx): sipariş kapanır, veli "başarısız" sayfasına gider, kod kaydedilir', async () => {
    fetchKur(iyziYanit(RETRIEVE_PATH, { status: 'failure', errorCode: '10012', errorGroup: 'INVALID_TRANSACTION', errorMessage: 'Teknik hata' }));
    const res = makeRes();
    await donus(postDonus(`token=${TOKEN}`), res);
    expect(konum(res).searchParams.get('durum')).toBe('basarisiz');
    expect(konum(res).searchParams.get('siparis')).toBe(SIPARIS);
    expect(m.markPaidAndGrant).not.toHaveBeenCalled();
    expect(m.markFailed).toHaveBeenCalledWith({ admin: true }, SIPARIS, 'odeme_basarisiz_10012/INVALID_TRANSACTION');
  });

  it('gövdedeki tutar/durum alanlarına güvenilmez', async () => {
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve({ paymentStatus: 'FAILURE' })));
    const res = makeRes();
    await donus(postDonus({ token: TOKEN, status: 'success', paymentStatus: 'SUCCESS', paidPrice: '999' }), res);
    expect(konum(res).searchParams.get('durum')).toBe('basarisiz');
    expect(m.markPaidAndGrant).not.toHaveBeenCalled();
  });

  it('eksik token: hiçbir şey sorgulanmaz/yazılmaz, basarisiz', async () => {
    const f = jest.fn();
    global.fetch = f as any;
    const res = makeRes();
    await donus(postDonus(''), res);
    expect(res.statusCode).toBe(303);
    expect(konum(res).searchParams.get('durum')).toBe('basarisiz');
    expect(f).not.toHaveBeenCalled();
    expect(m.getOrder).not.toHaveBeenCalled();
  });

  it('başkasının sipariş kimliğiyle sahte token: siparişe dokunulmaz', async () => {
    const f = jest.fn();
    global.fetch = f as any;
    const res = makeRes();
    await donus(postDonus('token=sahte-token-9999'), res);
    expect(konum(res).searchParams.get('durum')).toBe('basarisiz');
    expect(konum(res).searchParams.get('siparis')).toBeNull();
    expect(f).not.toHaveBeenCalled();
    expect(m.markFailed).not.toHaveBeenCalled();
  });

  it.each([
    ['geçici sorgu hatası (sistem kodu)', { status: 'failure', errorCode: '1' }],
    ['ödeme kimliği yok', null],
  ])('kesin olmayan red (%s): sipariş kapatılmaz, beklemede sayfasına gider', async (_ad, d) => {
    fetchKur(iyziYanit(RETRIEVE_PATH, d ?? retrieve({ paymentId: '' })));
    const res = makeRes();
    await donus(postDonus(`token=${TOKEN}`), res);
    expect(konum(res).searchParams.get('durum')).toBe('beklemede');
    expect(konum(res).searchParams.get('siparis')).toBe(SIPARIS);
    expect(m.markFailed).not.toHaveBeenCalled();
    expect(m.markPaidAndGrant).not.toHaveBeenCalled();
  });

  it('ipucusuz geri dönüş IP başına sınırlı (İyzico istek limiti tüketilmesin)', async () => {
    fetchKur(iyziYanit(RETRIEVE_PATH, { status: 'failure', errorCode: '1' }));
    const ipli = (body: unknown) => ({ method: 'POST', body, headers: { 'x-forwarded-for': '9.9.9.9' }, query: {} }) as any;
    for (let i = 0; i < 10; i++) await donus(ipli(`token=deneme-token-${i}`), makeRes());
    expect(fetchMock).toHaveBeenCalledTimes(10);
    const res = makeRes();
    await donus(ipli('token=deneme-token-son'), res);
    expect(konum(res).searchParams.get('durum')).toBe('basarisiz');
    expect(fetchMock).toHaveBeenCalledTimes(10);
    // İpuçlu (gerçek) akış sınırdan etkilenmez.
    m.getOrder.mockResolvedValue({ ...ORDER });
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve()));
    m.markPaidAndGrant.mockResolvedValue({ durum: 'odendi', paket: 'filiz', bitis: null });
    const r2 = makeRes();
    await donus({ method: 'POST', body: `token=${TOKEN}`, headers: { 'x-forwarded-for': '9.9.9.9' }, query: { siparis: SIPARIS } } as any, r2);
    expect(konum(r2).searchParams.get('durum')).toBe('basarili');
  });

  it('fraudStatus 0: beklemede, paket açılmaz ve başarısız sayılmaz', async () => {
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve({ fraudStatus: 0 })));
    const res = makeRes();
    await donus(postDonus(`token=${TOKEN}`), res);
    expect(konum(res).searchParams.get('durum')).toBe('beklemede');
    expect(m.markPaidAndGrant).not.toHaveBeenCalled();
    expect(m.markFailed).not.toHaveBeenCalled();
  });

  it('eşzamanlı çift geri dönüş: ikisi de başarılı görür, atama tek (ikinci zaten_islendi)', async () => {
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve()));
    m.markPaidAndGrant
      .mockResolvedValueOnce({ durum: 'odendi', paket: 'filiz', bitis: 'b' })
      .mockResolvedValueOnce({ durum: 'zaten_islendi', paket: 'filiz', bitis: 'b' });
    const [r1, r2] = [makeRes(), makeRes()];
    await Promise.all([donus(postDonus(`token=${TOKEN}`), r1), donus(postDonus(`token=${TOKEN}`), r2)]);
    expect(konum(r1).searchParams.get('durum')).toBe('basarili');
    expect(konum(r2).searchParams.get('durum')).toBe('basarili');
    // Her iki çağrı aynı ödeme kimliğiyle gelir; tek atamayı veritabanındaki koşullu güncelleme/benzersizlik sağlar.
    expect(m.markPaidAndGrant.mock.calls.map((c) => c[1].iyzicoPaymentId)).toEqual(['19831123', '19831123']);
  });

  it('atama bekliyorsa beklemede sayfasına gider (para alındı, durum sorgusu yeniden dener)', async () => {
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve()));
    m.markPaidAndGrant.mockResolvedValue({ durum: 'atama_bekliyor', paket: 'filiz', bitis: null });
    const res = makeRes();
    await donus(postDonus(`token=${TOKEN}`), res);
    expect(konum(res).searchParams.get('durum')).toBe('beklemede');
  });

  it('yapılandırma yoksa çökmez, beklemede sayfasına gider', async () => {
    delete process.env.IYZICO_API_KEY;
    const res = makeRes();
    await donus(postDonus(`token=${TOKEN}`), res);
    expect(res.statusCode).toBe(303);
    expect(konum(res).searchParams.get('durum')).toBe('beklemede');
  });

  it('açık yönlendirme yok: SITE_URL dışı / sorgudaki adres kullanılmaz', async () => {
    process.env.SITE_URL = 'javascript:alert(1)';
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve()));
    m.markPaidAndGrant.mockResolvedValue({ durum: 'odendi', paket: 'filiz', bitis: null });
    const res = makeRes();
    await donus(postDonus({ token: TOKEN, redirect: 'https://kotu.com' }, { siparis: SIPARIS, next: 'https://kotu.com' }), res);
    expect(konum(res).origin).toBe('https://oyun.childhoodtech.com');
    expect(konum(res).pathname).toBe('/odeme-sonuc');
    const res2 = makeRes();
    await donus(postDonus(`token=${TOKEN}`, { siparis: 'https://kotu.com/x' }), res2);
    expect(konum(res2).origin).toBe('https://oyun.childhoodtech.com');
  });

  it('sorgu ipucu yoksa sipariş basketId ile bulunur', async () => {
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve()));
    m.markPaidAndGrant.mockResolvedValue({ durum: 'odendi', paket: 'filiz', bitis: null });
    const res = makeRes();
    await donus(postDonus(`token=${TOKEN}`, {}), res);
    expect(m.getOrder).toHaveBeenCalledWith({ admin: true }, SIPARIS);
    expect(konum(res).searchParams.get('durum')).toBe('basarili');
  });

  it('GET reddedilir', async () => {
    const res = makeRes();
    await donus({ method: 'GET', headers: {}, query: {} } as any, res);
    expect(res.statusCode).toBe(405);
  });
});

const getDurum = (siparis: string) => ({ method: 'GET', headers: { authorization: 'Bearer j' }, query: { siparis } }) as any;

describe('GET /api/iyzico-durum', () => {
  it('yalnız sahip görür (başkasına 404)', async () => {
    m.getOrder.mockResolvedValue({ ...ORDER, email: 'baska@ornek.com' });
    const res = makeRes();
    await durum(getDurum(SIPARIS), res);
    expect([res.statusCode, res.body]).toEqual([404, { hata: 'siparis_yok' }]);
  });

  it('giriş yoksa 401', async () => {
    (getAuthedUser as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await durum(getDurum(SIPARIS), res);
    expect(res.statusCode).toBe(401);
  });

  it('beklemedeki sipariş yeniden sorgulanır ve işlenir (sekme kapansa da kurtarılır)', async () => {
    m.getOrder.mockResolvedValue({ ...ORDER });
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve()));
    m.markPaidAndGrant.mockResolvedValue({ durum: 'odendi', paket: 'filiz', bitis: '2027-02-19T00:00:00Z' });
    const res = makeRes();
    await durum(getDurum(SIPARIS), res);
    expect(res.body).toEqual({ durum: 'odendi', paket: 'filiz', bitis: '2027-02-19T00:00:00Z' });
  });

  it('atama_bekliyor yeniden denenir', async () => {
    m.getOrder.mockResolvedValue({ ...ORDER, durum: 'atama_bekliyor' });
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve()));
    m.markPaidAndGrant.mockResolvedValue({ durum: 'odendi', paket: 'filiz', bitis: 'b' });
    const res = makeRes();
    await durum(getDurum(SIPARIS), res);
    expect(m.markPaidAndGrant).toHaveBeenCalled();
    expect(res.body.durum).toBe('odendi');
  });

  it('veli hâlâ ödeme sayfasındaysa sipariş başarısız yapılmaz', async () => {
    m.getOrder.mockResolvedValue({ ...ORDER });
    fetchKur(iyziYanit(RETRIEVE_PATH, { status: 'success', token: TOKEN, conversationId: KONUSMA, basketId: SIPARIS }));
    const res = makeRes();
    await durum(getDurum(SIPARIS), res);
    expect(res.body).toEqual({ durum: 'beklemede' });
    expect(m.markFailed).not.toHaveBeenCalled();
  });

  it("token taşıyan başarısız sipariş yeniden doğrulanır: para çekilmişse kurtarılır", async () => {
    m.getOrder.mockResolvedValue({ ...ORDER, durum: 'basarisiz' });
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve()));
    m.markPaidAndGrant.mockResolvedValue({ durum: 'odendi', paket: 'filiz', bitis: 'b' });
    const res = makeRes();
    await durum(getDurum(SIPARIS), res);
    expect(res.body).toEqual({ durum: 'odendi', paket: 'filiz', bitis: 'b' });
  });

  it('başarısız sipariş gerçekten başarısızsa başarısız kalır, yeniden yazılmaz', async () => {
    m.getOrder.mockResolvedValue({ ...ORDER, durum: 'basarisiz' });
    fetchKur(iyziYanit(RETRIEVE_PATH, retrieve({ paymentStatus: 'FAILURE' })));
    const res = makeRes();
    await durum(getDurum(SIPARIS), res);
    expect(res.body).toEqual({ durum: 'basarisiz' });
    expect(m.markFailed).not.toHaveBeenCalled();
  });

  it("tokensiz başarısız sipariş sağlayıcıya sorulmaz", async () => {
    m.getOrder.mockResolvedValue({ ...ORDER, durum: 'basarisiz', token: null });
    const f = jest.fn();
    global.fetch = f as any;
    const res = makeRes();
    await durum(getDurum(SIPARIS), res);
    expect(res.body).toEqual({ durum: 'basarisiz' });
    expect(f).not.toHaveBeenCalled();
  });

  it('ödenmiş sipariş İyzico\'ya sorulmadan döner', async () => {
    m.getOrder.mockResolvedValue({ ...ORDER, durum: 'odendi', bitis: 'b' });
    const f = jest.fn();
    global.fetch = f as any;
    const res = makeRes();
    await durum(getDurum(SIPARIS), res);
    expect(res.body).toEqual({ durum: 'odendi', paket: 'filiz', bitis: 'b' });
    expect(f).not.toHaveBeenCalled();
  });

  it('İyzico yapılandırması yoksa kayıttaki durum (çökme yok)', async () => {
    delete process.env.IYZICO_API_KEY;
    m.getOrder.mockResolvedValue({ ...ORDER });
    const res = makeRes();
    await durum(getDurum(SIPARIS), res);
    expect([res.statusCode, res.body]).toEqual([200, { durum: 'beklemede' }]);
  });

  it('geçersiz sipariş kimliği -> 400', async () => {
    const res = makeRes();
    await durum(getDurum('../etc'), res);
    expect(res.statusCode).toBe(400);
  });
});
