/**
 * Eski sekme + yeni deploy: oyun parçası (chunk) indirilemezse sayfa yenilenir, ama sonsuz döngüye girmez.
 * Test listesi 111/112 "Oyuna giremiyorum": bayrak hiç silinmediği için aynı sekmede ikinci deploy sonrası otomatik yenileme çalışmıyordu.
 */
let mockPlatform = 'web';
jest.mock('react-native', () => ({
  Platform: {
    get OS() { return mockPlatform; },
  },
}));

import { RELOAD_GAP_MS, loadOrReload } from './lazyWithReload';

const KEY = 'oyun-chunk-reload-attempted';
const g = globalThis as any;

let store: Map<string, string>;
let reload: jest.Mock;
let storageThrows: boolean;
const saved = { window: g.window, sessionStorage: g.sessionStorage };

const hata = () => Promise.reject(new Error("Unexpected token '<'"));
const sonuc = (p: Promise<unknown>) =>
  Promise.race([
    p.then(() => 'cozuldu', (e: Error) => 'reddedildi: ' + e.message),
    new Promise<string>((r) => setTimeout(() => r('bekliyor'), 30)),
  ]);

beforeEach(() => {
  mockPlatform = 'web';
  store = new Map();
  reload = jest.fn();
  storageThrows = false;
  g.window = { location: { reload } };
  g.sessionStorage = {
    getItem: (k: string) => { if (storageThrows) throw new Error('kapali'); return store.get(k) ?? null; },
    setItem: (k: string, v: string) => { if (storageThrows) throw new Error('kapali'); store.set(k, v); },
  };
});

afterAll(() => {
  g.window = saved.window;
  g.sessionStorage = saved.sessionStorage;
});

describe('loadOrReload', () => {
  it('parça yüklenirse sonucu verir, sayfa yenilenmez', async () => {
    await expect(loadOrReload(() => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(reload).not.toHaveBeenCalled();
  });

  it('ilk başarısızlıkta sayfayı yeniler ve zamanı yazar (bileşen render edilmez: söz bekler)', async () => {
    const t0 = Date.now();
    expect(await sonuc(loadOrReload(hata))).toBe('bekliyor');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(Number(store.get(KEY))).toBeGreaterThanOrEqual(t0);
  });

  it('yenilemeden hemen sonra tekrar başarısız olursa gerçek hata sayılır (döngü yok)', async () => {
    store.set(KEY, String(Date.now() - 1000));
    expect(await sonuc(loadOrReload(hata))).toBe("reddedildi: Unexpected token '<'");
    expect(reload).not.toHaveBeenCalled();
  });

  it('aynı sekmede ikinci deploy: yeterli süre geçtiyse yeniden yenilenir', async () => {
    store.set(KEY, String(Date.now() - RELOAD_GAP_MS - 1000));
    expect(await sonuc(loadOrReload(hata))).toBe('bekliyor');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(Date.now() - Number(store.get(KEY))).toBeLessThan(5000);
  });

  it("eski sürümün yazdığı '1' bayrağı yenilemeyi engellemez", async () => {
    store.set(KEY, '1');
    expect(await sonuc(loadOrReload(hata))).toBe('bekliyor');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('web dışında yenileme denenmez, hata aynen atılır', async () => {
    mockPlatform = 'ios';
    expect(await sonuc(loadOrReload(hata))).toBe("reddedildi: Unexpected token '<'");
    expect(reload).not.toHaveBeenCalled();
  });

  it('sessionStorage erişilemezse normal hataya düşer', async () => {
    storageThrows = true;
    expect(await sonuc(loadOrReload(hata))).toBe("reddedildi: Unexpected token '<'");
    expect(reload).not.toHaveBeenCalled();
  });
});
