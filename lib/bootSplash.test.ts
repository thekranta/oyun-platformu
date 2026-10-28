/**
 * Web açılış perdesi: uygulama tarafı (hideBootSplash) ve şablondaki (public/index.html) komut dosyasının davranışı.
 * Şablon testi yer tutucuları, dil/gradyan tutarlılığını ve komut dosyasını sahte bir DOM'la çalıştırarak yavaş
 * bağlantı / yükleme hatası / kaldırma yollarını korur.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hideBootSplash } from './bootSplash';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = global as any;
const ROOT = join(__dirname, '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('hideBootSplash (uygulama tarafı)', () => {
    let savedDocument: unknown;
    let savedWindow: unknown;
    beforeEach(() => { savedDocument = g.document; savedWindow = g.window; });
    afterEach(() => {
        if (savedDocument === undefined) delete g.document; else g.document = savedDocument;
        if (savedWindow === undefined) delete g.window; else g.window = savedWindow;
    });

    it('document yoksa (native) hiçbir şey yapmaz', () => {
        delete g.document;
        expect(() => hideBootSplash()).not.toThrow();
    });

    it('şablondaki gizleme fonksiyonu varsa onu çağırır (yumuşak kaybolma)', () => {
        const hide = jest.fn();
        const getElementById = jest.fn();
        g.window = { __bootSplashHide: hide };
        g.document = { getElementById };
        hideBootSplash();
        expect(hide).toHaveBeenCalledTimes(1);
        expect(getElementById).not.toHaveBeenCalled();
    });

    it('şablon komut dosyası çalışmadıysa öğe doğrudan sökülür', () => {
        const remove = jest.fn();
        g.window = {};
        g.document = { getElementById: jest.fn((id: string) => (id === 'boot-splash' ? { remove } : null)) };
        hideBootSplash();
        expect(remove).toHaveBeenCalledTimes(1);
    });

    it('perde yoksa (şablon özelleştirilmemiş / zaten kalkmış) sessizce geçer', () => {
        g.window = {};
        g.document = { getElementById: () => null };
        expect(() => hideBootSplash()).not.toThrow();
    });
});

describe('public/index.html (açılış perdesi şablonu)', () => {
    const html = read('public/index.html');
    const count = (needle: string) => html.split(needle).length - 1;

    it('Expo yer tutucuları ve kapanış etiketleri TAM BİR kez geçer (komut dosyaları ilk </body>\'ye eklenir)', () => {
        for (const t of ['%LANG_ISO_CODE%', '%WEB_TITLE%', '</body>', '</head>', '<div id="root"></div>']) {
            expect([t, count(t)]).toEqual([t, 1]);
        }
    });

    it('perde #root\'tan ÖNCE gelir ve komut dosyası </body>\'den önce biter', () => {
        expect(html.indexOf('id="boot-splash"')).toBeGreaterThan(-1);
        expect(html.indexOf('id="boot-splash"')).toBeLessThan(html.indexOf('<div id="root"></div>'));
        expect(html.lastIndexOf('</script>')).toBeLessThan(html.indexOf('</body>'));
    });

    it('maskot satır içi küçük bir WebP (ek istek yok) ve sayfa küçük kalır', () => {
        const m = html.match(/src="(data:image\/webp;base64,[A-Za-z0-9+/=]+)"/);
        expect(m).not.toBeNull();
        expect((m as RegExpMatchArray)[1].length).toBeLessThan(12_000);
        expect(html.length).toBeLessThan(24_000);
    });

    it('başlık metinleri locales ile aynı (marka adı değişirse perde de güncellenmeli)', () => {
        const tr = JSON.parse(read('locales/tr.json')).login.title as string;
        const en = JSON.parse(read('locales/en.json')).login.title as string;
        expect(html).toContain(`<div id="boot-title">${tr}</div>`);
        expect(html).toContain(`title: '${tr}'`);
        expect(html).toContain(`title: '${en}'`);
    });

    it('zemin gradyanı giriş ekranıyla (DynamicBackground) aynı, dil anahtarı i18n ile aynı', () => {
        const grad = (src: string) => (src.match(/linear-gradient\(180deg, [^)]*\)/) as RegExpMatchArray)[0];
        expect(grad(html)).toBe(grad(read('components/DynamicBackground.tsx')));
        const key = (read('lib/i18n.ts').match(/LANGUAGE_STORAGE_KEY = '([^']+)'/) as RegExpMatchArray)[1];
        expect(html).toContain(`localStorage.getItem('${key}')`);
    });

    it('hareketi azalt tercihine saygı duyar', () => {
        expect(html).toContain('prefers-reduced-motion: reduce');
    });
});

describe('public/index.html komut dosyası (sahte DOM ile)', () => {
    const html = read('public/index.html');
    const script = (html.match(/<script>([\s\S]*?)<\/script>/) as RegExpMatchArray)[1];

    interface El { id: string; className: string; textContent: string; hidden: boolean; onclick: null | (() => void); parentNode: { removeChild: (e: El) => void } | null; childNodes: unknown[] }
    let els: Record<string, El>;
    let removed: string[];
    let errorHandler: null | ((e: unknown) => void);
    let reload: jest.Mock;

    function makeEl(id: string): El {
        return { id, className: '', textContent: '', hidden: id === 'boot-retry', onclick: null, parentNode: { removeChild: (e) => { removed.push(e.id); delete els[e.id]; } }, childNodes: [] };
    }

    function run(opts: { stored?: string | null; language?: string; throwStorage?: boolean } = {}) {
        els = {};
        for (const id of ['boot-splash', 'boot-title', 'boot-msg', 'boot-retry', 'root']) els[id] = makeEl(id);
        removed = [];
        errorHandler = null;
        reload = jest.fn();
        const win: Record<string, unknown> = {
            addEventListener: (t: string, fn: (e: unknown) => void) => { if (t === 'error') errorHandler = fn; },
        };
        const fakeDocument = { getElementById: (id: string) => els[id] ?? null };
        const localStorage = {
            getItem: () => { if (opts.throwStorage) throw new Error('engelli'); return opts.stored ?? null; },
        };
        const navigator = { language: opts.language ?? 'tr-TR' };
        new Function('document', 'window', 'localStorage', 'navigator', 'location', script)(fakeDocument, win, localStorage, navigator, { reload });
        return win;
    }

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('dil: kayıtlı seçim önceliklidir; yoksa cihaz dili İngilizceyse EN, aksi halde TR; depolama engelliyse cihaz dili', () => {
        run({ stored: 'en', language: 'tr-TR' });
        expect(els['boot-title'].textContent).toBe('MiniZeka');
        expect(els['boot-msg'].textContent).toBe('Loading…');
        expect(els['boot-msg'].textContent).toBe('Loading…');
        run({ stored: 'tr', language: 'en-US' });
        expect(els['boot-msg'].textContent).toBe('Yükleniyor…');
        expect(els['boot-msg'].textContent).toBe('Yükleniyor…');
        run({ stored: null, language: 'en-GB' });
        expect(els['boot-msg'].textContent).toBe('Loading…');
        run({ stored: 'de', language: 'fr-FR' });
        expect(els['boot-msg'].textContent).toBe('Yükleniyor…');
        run({ throwStorage: true, language: 'en-US' });
        expect(els['boot-msg'].textContent).toBe('Loading…');
    });

    it('yavaş bağlantı: 8 sn sonra bilgi, 25 sn sonra "Yenile" düğmesi; düğme sayfayı yeniler', () => {
        run();
        expect(els['boot-retry'].hidden).toBe(true);
        jest.advanceTimersByTime(7_900);
        expect(els['boot-msg'].textContent).toBe('Yükleniyor…');
        jest.advanceTimersByTime(200);
        expect(els['boot-msg'].textContent).toBe('Bağlantı yavaş, biraz daha bekliyoruz…');
        expect(els['boot-retry'].hidden).toBe(true);
        jest.advanceTimersByTime(17_000);
        expect(els['boot-msg'].textContent).toBe('Yüklenemedi mi? Sayfayı yenile.');
        expect(els['boot-retry'].hidden).toBe(false);
        els['boot-retry'].onclick?.();
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('komut dosyası (script) yüklenemezse hemen "Yenile" çıkar; başka öğelerin hatası yok sayılır', () => {
        run();
        errorHandler?.({ target: { tagName: 'IMG' } });
        expect(els['boot-retry'].hidden).toBe(true);
        errorHandler?.({ target: { tagName: 'SCRIPT' } });
        expect(els['boot-retry'].hidden).toBe(false);
        expect(els['boot-msg'].textContent).toBe('Yüklenemedi mi? Sayfayı yenile.');
    });

    it('__bootSplashHide: önce kaybolma sınıfı, 0,4 sn sonra öğe sökülür; ikinci çağrı zararsız', () => {
        const win = run();
        const hide = win.__bootSplashHide as () => void;
        hide();
        expect(els['boot-splash'].className).toContain('boot-hide');
        expect(removed).toEqual([]);
        hide();
        jest.advanceTimersByTime(450);
        expect(removed).toEqual(['boot-splash']);
        expect(() => hide()).not.toThrow();
    });

    it('perde kalktıktan sonra yavaş bağlantı zamanlayıcıları hiçbir şeyi değiştirmez', () => {
        const win = run();
        (win.__bootSplashHide as () => void)();
        jest.advanceTimersByTime(500);
        const msgBefore = els['boot-msg'].textContent;
        jest.advanceTimersByTime(30_000);
        expect(els['boot-msg'].textContent).toBe(msgBefore);
        expect(els['boot-retry'].hidden).toBe(true);
    });

    it('güvenlik ağı: uygulama perdeyi kaldırmazsa #root dolduktan 5 sn sonra kendiliğinden kalkar', () => {
        run();
        jest.advanceTimersByTime(3_000);
        expect(removed).toEqual([]);                    // #root hâlâ boş: perde kalmalı (paket iniyor)
        els['root'].childNodes.push({});                // React ilk ekranı çizdi
        jest.advanceTimersByTime(5_000);                // kontrol 500 ms'de bir: dolduğu 3,5 sn'de görüldü, 8 sn'de 4,5 sn geçti
        expect(removed).toEqual([]);                    // 5 sn dolmadı
        expect(els['boot-splash'].className).toBe('');
        jest.advanceTimersByTime(1_200);                // 9 sn'lik kontrol: 5,5 sn > 5 sn -> kaybolma başlar
        expect(els['boot-splash'].className).toContain('boot-hide');
        expect(removed).toEqual([]);
        jest.advanceTimersByTime(500);
        expect(removed).toEqual(['boot-splash']);
    });
});
