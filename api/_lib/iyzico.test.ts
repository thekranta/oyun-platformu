jest.mock('./webSiparis', () => ({ markPaidAndGrant: jest.fn(), markFailed: jest.fn() }));

import {
  buildAuthHeaders, evaluateRetrieve, getIyzicoConfig, getSiteUrl, iyziPost, isIyzicoPaymentUrl, IyzicoError,
  normalizePriceForSignature, verifyInitSignature, verifyRetrieveSignature, dogrulaVeIsle, INIT_PATH,
  sandboxDenemeIzni, hizSinirlayici, hataKodu,
} from './iyzico';
import { kurusToIyzicoPrice, iyzicoPriceToKurus, isWebPaket, WEB_PAKETLER } from './webPaketler';
import { markFailed, markPaidAndGrant } from './webSiparis';

const SECRET = 'sandbox-secret-key';
const cfg = { apiKey: 'sandbox-api-key', secretKey: SECRET, baseUrl: 'https://sandbox-api.iyzipay.com', imzaDogrula: true };

// Bağımsız olarak openssl ile hesaplanmış vektörler (aynı formülü JS'te yeniden hesaplamak totoloji olurdu):
//   printf '%s' "$rnd$path$body" | openssl dgst -sha256 -hmac sandbox-secret-key
const RND = '1700000000000123456789';
const PATH = '/payment/bin/check';
const BODY = '{"locale":"tr","binNumber":"589004"}';

describe('IYZWSv2 imzası (saf)', () => {
  it('bilinen vektörle Authorization ve x-iyzi-rnd üretir', () => {
    const h = buildAuthHeaders('sandbox-api-key', SECRET, RND, PATH, BODY);
    expect(h['x-iyzi-rnd']).toBe(RND);
    expect(h.Authorization).toBe(
      'IYZWSv2 YXBpS2V5OnNhbmRib3gtYXBpLWtleSZyYW5kb21LZXk6MTcwMDAwMDAwMDAwMDEyMzQ1Njc4OSZzaWduYXR1cmU6OTI3OTU0YWViMTU5MDljYjQ0Y2M1NWM3YTQwMTJhYzgyMTU0ZWM2MzNhNTY1NGIxNGEzMDRhYTUzMzlmN2FlZA==',
    );
    const decoded = Buffer.from(h.Authorization.slice('IYZWSv2 '.length), 'base64').toString();
    expect(decoded).toBe(`apiKey:sandbox-api-key&randomKey:${RND}&signature:927954aeb15909cb44cc55c7a4012ac82154ec633a5654b14a304aa5339f7aed`);
  });

  it('boş gövdede yalnız randomKey + uriPath imzalanır', () => {
    const h = buildAuthHeaders('k', SECRET, RND, PATH, '');
    expect(Buffer.from(h.Authorization.slice(8), 'base64').toString()).toContain('signature:446ecadfb50711649bbecf7093c2adac5aeab1abf4765148b03d6357e9b357e8');
  });

  it('yanıt imzaları bilinen vektörle doğrulanır', () => {
    expect(verifyInitSignature(SECRET, { conversationId: 'ORD-12345678', token: 'tok_abcdefgh', signature: '0e86240996114ad8a1afd1735a177f7211d517534469ecc55d08102ad52c017e' })).toBe(true);
    const d = { paymentStatus: 'SUCCESS', paymentId: '19831123', currency: 'TRY', basketId: 'ORD-12345678', conversationId: 'ORD-12345678', paidPrice: 399.0, price: '399.00000000', token: 'tok_abcdefgh', signature: 'e25ff9f1dd53819a4740222a5bdd8efaab15d4bd8346d38ce8e058593c0c3832' };
    expect(verifyRetrieveSignature(SECRET, d)).toBe(true);
    expect(verifyRetrieveSignature(SECRET, { ...d, paidPrice: 1 })).toBe(false);
    expect(verifyRetrieveSignature('baska', d)).toBe(false);
  });

  it('fiyat normalleştirme sondaki sıfırları atar', () => {
    expect(normalizePriceForSignature('10.50')).toBe('10.5');
    expect(normalizePriceForSignature('10.0')).toBe('10');
    expect(normalizePriceForSignature(399)).toBe('399');
    expect(normalizePriceForSignature('1749.50000000')).toBe('1749.5');
    expect(normalizePriceForSignature('100')).toBe('100');
  });
});

describe('webPaketler', () => {
  it('kuruşu İyzico fiyat dizesine çevirir', () => {
    expect(kurusToIyzicoPrice(39900)).toBe('399');
    expect(kurusToIyzicoPrice(174900)).toBe('1749');
    expect(kurusToIyzicoPrice(174950)).toBe('1749.5');
    expect(kurusToIyzicoPrice(1999)).toBe('19.99');
    expect(kurusToIyzicoPrice(105)).toBe('1.05');
    expect(() => kurusToIyzicoPrice(1.5)).toThrow();
  });
  it('İyzico fiyatını kuruşa çevirir', () => {
    expect(iyzicoPriceToKurus(399.0)).toBe(39900);
    expect(iyzicoPriceToKurus('1749.50000000')).toBe(174950);
    expect(iyzicoPriceToKurus('abc')).toBeNull();
    expect(iyzicoPriceToKurus(undefined)).toBeNull();
  });
  it('sabit tablo ve paket doğrulaması', () => {
    expect(WEB_PAKETLER.orman).toEqual({ kurus: 289900, sureAy: 12, ad: 'Orman' });
    expect(isWebPaket('filiz')).toBe(true);
    expect(isWebPaket('cinar')).toBe(false);
    expect(isWebPaket('toString')).toBe(false);
  });
});

describe('yapılandırma', () => {
  it('anahtar yoksa null', () => {
    expect(getIyzicoConfig({} as any)).toBeNull();
    expect(getIyzicoConfig({ IYZICO_API_KEY: 'a' } as any)).toBeNull();
  });
  it('varsayılan sandbox, bilinmeyen taban adres reddedilir', () => {
    expect(getIyzicoConfig({ IYZICO_API_KEY: 'a', IYZICO_SECRET_KEY: 'b' } as any)?.baseUrl).toBe('https://sandbox-api.iyzipay.com');
    expect(getIyzicoConfig({ IYZICO_API_KEY: 'a', IYZICO_SECRET_KEY: 'b', IYZICO_BASE_URL: 'https://kotu.example.com' } as any)).toBeNull();
    expect(getIyzicoConfig({ IYZICO_API_KEY: 'a', IYZICO_SECRET_KEY: 'b', IYZICO_BASE_URL: 'https://api.iyzipay.com/' } as any)?.baseUrl).toBe('https://api.iyzipay.com');
  });
  it('üretimde sandbox yalnız açık bayrakla', () => {
    const env = { IYZICO_API_KEY: 'a', IYZICO_SECRET_KEY: 'b', VERCEL_ENV: 'production' } as any;
    expect(getIyzicoConfig(env)).toBeNull();
    expect(getIyzicoConfig({ ...env, IYZICO_ALLOW_SANDBOX: '1' })).not.toBeNull();
    expect(getIyzicoConfig({ ...env, IYZICO_BASE_URL: 'https://api.iyzipay.com' })).not.toBeNull();
  });
  it('imza kapatma bayrağı yalnız sandbox adresinde etkili', () => {
    const env = { IYZICO_API_KEY: 'a', IYZICO_SECRET_KEY: 'b', IYZICO_IMZA_DOGRULAMA: 'kapali' } as any;
    expect(getIyzicoConfig(env)?.imzaDogrula).toBe(false);
    expect(getIyzicoConfig({ ...env, IYZICO_BASE_URL: 'https://api.iyzipay.com' })?.imzaDogrula).toBe(true);
    expect(getIyzicoConfig({ IYZICO_API_KEY: 'a', IYZICO_SECRET_KEY: 'b' } as any)?.imzaDogrula).toBe(true);
  });
  it('sandbox + üretim/önizleme: yalnız deneme e-postaları başlatabilir', () => {
    const sb = { baseUrl: 'https://sandbox-api.iyzipay.com' };
    const canli = { baseUrl: 'https://api.iyzipay.com' };
    const liste = { IYZICO_SANDBOX_EPOSTALAR: ' Deneme@Ornek.com , ikinci@ornek.com' };
    // Yerel geliştirme (VERCEL_ENV yok / development): herkes.
    expect(sandboxDenemeIzni(sb, 'herkes@ornek.com', {} as any)).toBe(true);
    expect(sandboxDenemeIzni(sb, 'herkes@ornek.com', { VERCEL_ENV: 'development' } as any)).toBe(true);
    for (const VERCEL_ENV of ['production', 'preview']) {
      expect(sandboxDenemeIzni(sb, 'herkes@ornek.com', { VERCEL_ENV } as any)).toBe(false); // liste boş: kimse
      expect(sandboxDenemeIzni(sb, 'herkes@ornek.com', { VERCEL_ENV, ...liste } as any)).toBe(false);
      expect(sandboxDenemeIzni(sb, 'deneme@ornek.com', { VERCEL_ENV, ...liste } as any)).toBe(true);
      // Canlı adreste liste aranmaz.
      expect(sandboxDenemeIzni(canli, 'herkes@ornek.com', { VERCEL_ENV } as any)).toBe(true);
    }
  });
  it('hız sınırlayıcı: pencere içinde sınır, pencere dolunca yeniden açılır', () => {
    const s = hizSinirlayici(2, 1000);
    expect([s.asildi('a', 0), s.asildi('a', 10), s.asildi('a', 20)]).toEqual([false, false, true]);
    expect(s.asildi('b', 20)).toBe(false);
    expect(s.asildi('a', 1011)).toBe(false);
  });
  it('site adresi yalnız https kökü', () => {
    expect(getSiteUrl({} as any)).toBe('https://oyun.childhoodtech.com');
    expect(getSiteUrl({ SITE_URL: 'http://kotu.com' } as any)).toBe('https://oyun.childhoodtech.com');
    expect(getSiteUrl({ SITE_URL: 'https://ornek.com/yol?x=1' } as any)).toBe('https://ornek.com');
  });
  it('ödeme sayfası yalnız iyzipay.com alt alanı', () => {
    expect(isIyzicoPaymentUrl('https://sandbox-cpp.iyzipay.com?token=abc&lang=tr')).toBe(true);
    expect(isIyzicoPaymentUrl('https://iyzipay.com.kotu.com/x')).toBe(false);
    expect(isIyzicoPaymentUrl('http://cpp.iyzipay.com')).toBe(false);
    expect(isIyzicoPaymentUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('iyziPost', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('aynı gövdeyi imzalar ve gönderir', async () => {
    const f = jest.fn(async () => ({ status: 200, json: async () => ({ status: 'success' }) }));
    global.fetch = f as any;
    await iyziPost(cfg, INIT_PATH, { a: 1 });
    const [url, init] = f.mock.calls[0] as any[];
    expect(url).toBe('https://sandbox-api.iyzipay.com' + INIT_PATH);
    expect(init.body).toBe('{"a":1}');
    const rnd = init.headers['x-iyzi-rnd'];
    expect(init.headers.Authorization).toBe(buildAuthHeaders(cfg.apiKey, SECRET, rnd, INIT_PATH, '{"a":1}').Authorization);
    expect(init.signal).toBeDefined();
  });
  it('5xx, ağ hatası ve JSON olmayan yanıt IyzicoError; mesajda anahtar yok', async () => {
    global.fetch = jest.fn(async () => ({ status: 503, json: async () => ({}) })) as any;
    await expect(iyziPost(cfg, INIT_PATH, {})).rejects.toBeInstanceOf(IyzicoError);
    global.fetch = jest.fn(async () => { throw new Error('ECONNRESET sandbox-secret-key'); }) as any;
    await expect(iyziPost(cfg, INIT_PATH, {})).rejects.toThrow('ag_hatasi');
    global.fetch = jest.fn(async () => ({ status: 200, json: async () => { throw new Error('x'); } })) as any;
    await expect(iyziPost(cfg, INIT_PATH, {})).rejects.toThrow('gecersiz_yanit');
  });
});

// --- Sonuç doğrulaması ---
const ORDER = { id: 'ORD-12345678', paket: 'tohum', tutarKurus: 39900, durum: 'beklemede', token: 'tok_abcdefgh' };
function imzali(d: Record<string, any>) {
  const { createHmac } = require('crypto');
  const msg = [d.paymentStatus, d.paymentId, d.currency, d.basketId, d.conversationId, normalizePriceForSignature(d.paidPrice), normalizePriceForSignature(d.price), d.token].join(':');
  return { ...d, signature: createHmac('sha256', SECRET).update(msg).digest('hex') };
}
const BASARILI = () => imzali({
  status: 'success', paymentStatus: 'SUCCESS', fraudStatus: 1, paymentId: '19831123', currency: 'TRY',
  basketId: ORDER.id, conversationId: ORDER.id, price: 399.0, paidPrice: '399.00000000', token: ORDER.token,
  binNumber: '589004', lastFourDigits: '0016', cardFamily: 'Bonus',
});

describe('evaluateRetrieve', () => {
  it('tüm koşullar sağlanınca onay; kart bilgisi saklanmaz', () => {
    const r = evaluateRetrieve(ORDER, BASARILI(), cfg);
    expect(r).toMatchObject({ tip: 'onay', paymentId: '19831123', paidKurus: 39900 });
    expect(JSON.stringify((r as any).ham)).not.toMatch(/589004|0016|Bonus/);
  });
  it.each([
    ['tutar uyuşmazlığı (paidPrice)', { paidPrice: '1.00' }, 'tutar_uyusmazligi'],
    ['tutar uyuşmazlığı (price)', { price: '39.9' }, 'tutar_uyusmazligi'],
    ['yanlış basketId', { basketId: 'ORD-BASKA0000' }, 'siparis_uyusmazligi'],
    ['yanlış conversationId', { conversationId: 'ORD-BASKA0000' }, 'siparis_uyusmazligi'],
    ['yanlış token', { token: 'tok_baskaaaa' }, 'siparis_uyusmazligi'],
    ['para birimi', { currency: 'USD' }, 'para_birimi_uyusmazligi'],
    ['başarısız ödeme', { paymentStatus: 'FAILURE' }, 'odeme_basarisiz'],
    ['dolandırıcılık reddi', { fraudStatus: -1 }, 'dolandiricilik_red'],
    ['ödeme kimliği yok', { paymentId: '' }, 'odeme_kimligi_yok'],
  ])('%s -> red', (_ad, degisim, neden) => {
    expect(evaluateRetrieve(ORDER, imzali({ ...BASARILI(), ...degisim }), cfg)).toEqual({ tip: 'red', neden });
  });
  it('sorgu başarısız: banka kodu (10xxx) kesin red; sistem/bilinmeyen kod kesin olmayan red; istek limiti bekle', () => {
    // Banka reddi (iyzico belgesi: banka hata kodları 10000 ile başlar): kesin başarısız, kod ve grup kaydedilir.
    expect(evaluateRetrieve(ORDER, { status: 'failure', errorCode: '10051', errorGroup: 'NOT_SUFFICIENT_FUNDS' }, cfg))
      .toEqual({ tip: 'red', neden: 'odeme_basarisiz', ayrinti: '10051/NOT_SUFFICIENT_FUNDS' });
    expect(evaluateRetrieve(ORDER, { status: 'failure', errorCode: 10012 }, cfg))
      .toEqual({ tip: 'red', neden: 'odeme_basarisiz', ayrinti: '10012' });
    // Sistem hatası, imza/kimlik hatası, kodsuz yanıt: geçici olabilir, sipariş kapatılmaz.
    for (const errorCode of ['1', '2', '1000', '5002', undefined]) {
      expect(evaluateRetrieve(ORDER, { status: 'failure', errorCode }, cfg)).toEqual({ tip: 'red', neden: 'sorgu_basarisiz' });
    }
    expect(evaluateRetrieve(ORDER, { status: 'failure', errorCode: '50000' }, cfg)).toEqual({ tip: 'bekle', neden: 'istek_limiti' });
  });
  it('hataKodu yalnız güvenli kod ve grubu alır; errorMessage asla', () => {
    expect(hataKodu({ errorCode: '10051', errorGroup: 'NOT_SUFFICIENT_FUNDS', errorMessage: 'ayse@ornek.com' })).toBe('10051/NOT_SUFFICIENT_FUNDS');
    expect(hataKodu({ errorCode: '10005' })).toBe('10005');
    expect(hataKodu({ errorCode: 'ayse@ornek.com', errorGroup: 'ayse@ornek.com' })).toBe('');
    expect(hataKodu({})).toBe('');
  });
  it('fraudStatus 0 -> bekle (paket açılmaz)', () => {
    expect(evaluateRetrieve(ORDER, imzali({ ...BASARILI(), fraudStatus: 0 }), cfg)).toEqual({ tip: 'bekle', neden: 'dolandiricilik_inceleme' });
  });
  it('imza tutmazsa bekle; bayrakla kapatılabilir', () => {
    const d = { ...BASARILI(), signature: 'deadbeef' };
    expect(evaluateRetrieve(ORDER, d, cfg)).toEqual({ tip: 'bekle', neden: 'imza_dogrulanamadi' });
    expect(evaluateRetrieve(ORDER, d, { ...cfg, imzaDogrula: false }).tip).toBe('onay');
  });
});

describe('dogrulaVeIsle', () => {
  const realFetch = global.fetch;
  beforeEach(() => { (markPaidAndGrant as jest.Mock).mockReset(); (markFailed as jest.Mock).mockReset(); });
  afterEach(() => { global.fetch = realFetch; });
  const yanit = (d: unknown) => { global.fetch = jest.fn(async () => ({ status: 200, json: async () => d })) as any; };

  it('onayda markPaidAndGrant sunucu tutarıyla çağrılır', async () => {
    yanit(BASARILI());
    (markPaidAndGrant as jest.Mock).mockResolvedValue({ durum: 'odendi', paket: 'tohum', bitis: '2026-12-19T00:00:00Z' });
    const r = await dogrulaVeIsle({}, cfg, ORDER);
    expect(r).toEqual({ durum: 'odendi', paket: 'tohum', bitis: '2026-12-19T00:00:00Z' });
    expect((markPaidAndGrant as jest.Mock).mock.calls[0][1]).toMatchObject({ id: ORDER.id, iyzicoPaymentId: '19831123', paidKurus: 39900 });
  });
  it.each([
    ['geçici sorgu hatası (sorgu_basarisiz)', { status: 'failure', errorCode: '1' }],
    ['ödeme durumu yok', { status: 'success', token: ORDER.token, conversationId: ORDER.id }],
    ['ödeme kimliği yok', null],
  ])('kesin olmayan red (%s): sipariş KAPATILMAZ, beklemede kalır', async (_ad, d) => {
    yanit(d ?? imzali({ ...BASARILI(), paymentId: '' }));
    expect(await dogrulaVeIsle({}, cfg, ORDER)).toEqual({ durum: 'beklemede' });
    expect(markFailed).not.toHaveBeenCalled();
    expect(markPaidAndGrant).not.toHaveBeenCalled();
  });
  it('kesin red siparişi kapatır', async () => {
    yanit(imzali({ ...BASARILI(), paymentStatus: 'FAILURE' }));
    expect(await dogrulaVeIsle({}, cfg, ORDER)).toEqual({ durum: 'basarisiz' });
    expect(markFailed).toHaveBeenCalledWith({}, ORDER.id, 'odeme_basarisiz');
  });
  it('banka reddi (10xxx): sipariş kapanır, kod kaydedilir, e-posta içeren mesaj kaydedilmez', async () => {
    yanit({ status: 'failure', errorCode: '10051', errorGroup: 'NOT_SUFFICIENT_FUNDS', errorMessage: 'Kart ayse@ornek.com' });
    expect(await dogrulaVeIsle({}, cfg, ORDER)).toEqual({ durum: 'basarisiz' });
    expect(markFailed).toHaveBeenCalledTimes(1);
    expect(markFailed).toHaveBeenCalledWith({}, ORDER.id, 'odeme_basarisiz_10051/NOT_SUFFICIENT_FUNDS');
    expect(JSON.stringify((markFailed as jest.Mock).mock.calls)).not.toContain('ayse@ornek.com');
    expect(markPaidAndGrant).not.toHaveBeenCalled();
  });
  it('sağlayıcıya ulaşılamazsa beklemede; hiçbir şey yazılmaz', async () => {
    global.fetch = jest.fn(async () => { throw new Error('x'); }) as any;
    expect(await dogrulaVeIsle({}, cfg, ORDER)).toEqual({ durum: 'beklemede' });
    expect(markFailed).not.toHaveBeenCalled();
    expect(markPaidAndGrant).not.toHaveBeenCalled();
  });
  it('başarısız sipariş: doğrulanmış ödeme gelirse işlenir (kurtarma); ulaşılamazsa başarısız kalır', async () => {
    const kapali = { ...ORDER, durum: 'basarisiz' };
    yanit(BASARILI());
    (markPaidAndGrant as jest.Mock).mockResolvedValue({ durum: 'odendi', paket: 'tohum', bitis: 'b' });
    expect(await dogrulaVeIsle({}, cfg, kapali)).toEqual({ durum: 'odendi', paket: 'tohum', bitis: 'b' });
    global.fetch = jest.fn(async () => { throw new Error('x'); }) as any;
    expect(await dogrulaVeIsle({}, cfg, kapali)).toEqual({ durum: 'basarisiz' });
    yanit(imzali({ ...BASARILI(), paymentStatus: 'FAILURE' }));
    expect(await dogrulaVeIsle({}, cfg, kapali)).toEqual({ durum: 'basarisiz' });
    expect(markFailed).not.toHaveBeenCalled(); // zaten kapalı, yeniden yazılmaz
  });
  it('zaten ödenmiş sipariş yeniden sorgulanmaz', async () => {
    const f = jest.fn();
    global.fetch = f as any;
    expect(await dogrulaVeIsle({}, cfg, { ...ORDER, durum: 'odendi', bitis: 'b' })).toEqual({ durum: 'odendi', paket: 'tohum', bitis: 'b' });
    expect(f).not.toHaveBeenCalled();
  });
});
