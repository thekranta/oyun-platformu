import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { GAME_CATALOG } from '../constants/gameCatalog';
import {
    ageGroupToMonths,
    autoZoom,
    BOARD_AGE_GROUPS,
    BOARD_BAR_HEIGHT,
    BOARD_EXCLUDED_ROUTES,
    BOARD_TARGET_HEIGHT,
    BOARD_TARGET_WIDTH,
    boardAreas,
    boardGameTier,
    boardMessage,
    boardPlayHref,
    buildBoardGames,
    clampAgeMonths,
    clampZoom,
    DEFAULT_AGE_MONTHS,
    DEFAULT_PREFS,
    filterByArea,
    parseBoardPlayParams,
    offsetForZoom,
    parseBoardPrefs,
    readBoardMessage,
    stepZoom,
    teacherTierFor,
    virtualSize,
    ZOOM_MAX,
    ZOOM_MIN,
    zoomPercent,
    zoomWithOffset,
} from './boardMode';

describe('autoZoom', () => {
    it('yaygın tahta/ekran boyutlarında beklenen büyütmeyi verir', () => {
        expect(autoZoom(1920, 1080)).toBe(2);
        expect(autoZoom(1366, 768)).toBe(1.25);
        expect(autoZoom(1024, 768)).toBe(1);
        expect(autoZoom(3840, 2160)).toBe(4);
        expect(autoZoom(2560, 1440)).toBe(2.5);
        expect(autoZoom(1920, 1200)).toBe(2);
    });

    it('sanal pencere hedef boyuttan (960x500) hiçbir zaman küçük olmaz (büyütme sınırlara takılmadıkça)', () => {
        for (const [w, h] of [[1920, 1080], [1366, 768], [1600, 900], [2560, 1440], [1280, 720], [3840, 2160], [1920, 1200]]) {
            const z = autoZoom(w, h);
            const v = virtualSize(w, h - BOARD_BAR_HEIGHT, z);
            expect(v.width).toBeGreaterThanOrEqual(BOARD_TARGET_WIDTH - 1);
            expect(v.height).toBeGreaterThanOrEqual(BOARD_TARGET_HEIGHT - 1);
        }
    });

    it('küçük/bozuk pencerede 1’e düşer, sınırları aşmaz', () => {
        expect(autoZoom(800, 600)).toBe(ZOOM_MIN);
        expect(autoZoom(0, 0)).toBe(ZOOM_MIN);
        expect(autoZoom(NaN, 1080)).toBe(ZOOM_MIN);
        expect(autoZoom(20000, 20000)).toBe(ZOOM_MAX);
    });
});

describe('clampZoom / stepZoom / zoomPercent', () => {
    it('çeyrek adımlara oturtur ve sınırlar', () => {
        expect(clampZoom(1.3)).toBe(1.25);
        expect(clampZoom(0.2)).toBe(ZOOM_MIN);
        expect(clampZoom(9)).toBe(ZOOM_MAX);
        expect(clampZoom(NaN)).toBe(ZOOM_MIN);
        expect(stepZoom(1.75, 1)).toBe(2);
        expect(stepZoom(1, -1)).toBe(1);
        expect(stepZoom(4, 1)).toBe(4);
        expect(zoomPercent(1.75)).toBe(175);
    });
});

describe('zoomWithOffset / offsetForZoom', () => {
    it('otomatiğe göre adım olarak saklanır ve farklı tahtalarda yeniden uygulanır', () => {
        expect(zoomWithOffset(1.75, 0)).toBe(1.75);
        expect(zoomWithOffset(1.75, 2)).toBe(2.25);
        expect(zoomWithOffset(1.75, -3)).toBe(1);
        expect(zoomWithOffset(3.75, 5)).toBe(ZOOM_MAX);
        expect(offsetForZoom(1.75, 2.25)).toBe(2);
        expect(offsetForZoom(1.25, 1)).toBe(-1);
        // gidiş-dönüş
        for (const auto of [1, 1.25, 1.75, 3.75]) {
            for (const z of [1, 1.5, 2, 3]) expect(zoomWithOffset(auto, offsetForZoom(auto, z))).toBe(clampZoom(z));
        }
    });
});

describe('virtualSize', () => {
    it('ölçeklenince sahneyi tam kaplar (yukarı yuvarlar)', () => {
        for (const z of [1, 1.25, 1.5, 1.75, 2, 3.75]) {
            const v = virtualSize(1920, 1008, z);
            expect(v.width * z).toBeGreaterThanOrEqual(1920);
            expect(v.height * z).toBeGreaterThanOrEqual(1008);
            expect(v.width * z - 1920).toBeLessThan(z + 0.001);
        }
        expect(virtualSize(1920, 1008, 1.75)).toEqual({ width: 1098, height: 576 });
        expect(virtualSize(1920, 1008, 2)).toEqual({ width: 960, height: 504 });
    });

    it('sıfır/bozuk boyutta en az 1 px döner', () => {
        expect(virtualSize(0, 0, 2)).toEqual({ width: 1, height: 1 });
    });
});

describe('yaş grupları', () => {
    it('her grup kayıttaki ay aralığında (36-72) ve artan sırada', () => {
        const months = BOARD_AGE_GROUPS.map(ageGroupToMonths);
        expect(months).toEqual([42, 54, 66, 72]);
        for (const m of months) expect(m).toBeGreaterThanOrEqual(36);
    });

    it('clampAgeMonths aralığı korur', () => {
        expect(clampAgeMonths(10)).toBe(36);
        expect(clampAgeMonths(100)).toBe(72);
        expect(clampAgeMonths(50.4)).toBe(50);
        expect(clampAgeMonths(NaN)).toBe(DEFAULT_AGE_MONTHS);
    });
});

describe('boardGameTier / teacherTierFor', () => {
    it('öğretmen paketi oyun erişimine çevrilir; süresi dolmuş paket ücretsiz sayılır', () => {
        expect(boardGameTier('free', null)).toBe('free');
        expect(boardGameTier(null, null)).toBe('free');
        expect(boardGameTier('cinar', null)).toBe('filiz');
        expect(boardGameTier('mese', null)).toBe('fidan');
        expect(boardGameTier('mese', '2000-01-01T00:00:00Z')).toBe('free');
    });

    it('kilitli oyunu hangi öğretmen paketinin açtığını söyler', () => {
        expect(teacherTierFor('tohum')).toBe('cinar');
        expect(teacherTierFor('filiz')).toBe('cinar');
        expect(teacherTierFor('fidan')).toBe('mese');
        expect(teacherTierFor('orman')).toBe('mese');
    });
});

describe('buildBoardGames', () => {
    const allRenderers = Object.fromEntries(GAME_CATALOG.map((g) => [g.routeKey, true]));

    it('yalnız renderer’ı olan oyunları alır, tahtaya uygun olmayanları dışarıda bırakır', () => {
        const games = buildBoardGames({ hafiza: true, 'bunu-soyle': true, 'ceviz-macera': true, 'olmayan-oyun': true }, 'orman');
        expect(games.map((g) => g.routeKey)).toEqual(['hafiza']);
    });

    it('dışarıda bırakılan rotaların hepsi katalogda gerçekten var (yazım hatası yok)', () => {
        for (const route of BOARD_EXCLUDED_ROUTES) {
            expect(GAME_CATALOG.some((g) => g.routeKey === route)).toBe(true);
        }
    });

    it('ücretsiz öğretmende yalnız ücretsiz set açık, Çınar’da Akıllı/hikâye açık, müzik Meşe ister', () => {
        const free = buildBoardGames(allRenderers, boardGameTier('free', null));
        const cinar = buildBoardGames(allRenderers, boardGameTier('cinar', null));
        const mese = buildBoardGames(allRenderers, boardGameTier('mese', null));
        const open = (list: typeof free) => list.filter((g) => !g.locked).length;
        expect(open(free)).toBeGreaterThanOrEqual(10);
        expect(open(free)).toBeLessThan(open(cinar));
        expect(open(cinar)).toBeLessThan(open(mese));
        expect(free.find((g) => g.routeKey === 'akilli-sayi-avi')?.locked).toBe(true);
        expect(cinar.find((g) => g.routeKey === 'akilli-sayi-avi')?.locked).toBe(false);
        const muzik = GAME_CATALOG.find((g) => g.status === 'music')!;
        expect(cinar.find((g) => g.routeKey === muzik.routeKey)?.locked).toBe(true);
        expect(mese.find((g) => g.routeKey === muzik.routeKey)?.locked).toBe(false);
    });

    it('her oyunun başlığı, emojisi ve geçerli bir alanı var; alanlar ALAN sırasında gruplanır', () => {
        const games = buildBoardGames(allRenderers, 'orman');
        expect(games.length).toBeGreaterThan(100);
        for (const g of games) {
            expect(g.title.trim()).not.toBe('');
            expect(g.emoji).not.toBe('');
            expect(g.alan).not.toBe('');
        }
        const areas = boardAreas(games).map((a) => a.alan);
        expect(areas[0]).toBe('Matematik');
        expect(new Set(areas).size).toBe(areas.length);
        // Aynı alandaki oyunlar bitişik (sıralı) durur.
        const seen: string[] = [];
        for (const g of games) if (seen[seen.length - 1] !== g.alan) seen.push(g.alan);
        expect(seen).toEqual(areas);
    });

    it('filterByArea alana göre süzer; null hepsini verir', () => {
        const games = buildBoardGames(allRenderers, 'orman');
        const mat = filterByArea(games, 'Matematik');
        expect(mat.length).toBeGreaterThan(0);
        expect(mat.every((g) => g.alan === 'Matematik')).toBe(true);
        expect(filterByArea(games, null)).toHaveLength(games.length);
    });
});

describe('tahtada açılmayan oyunlar: kendi başına veritabanına yazanlar', () => {
    it('sonucu doğrudan oyun_skorlari’na POST eden bileşenler dışarıda bırakılan listeyle uyumlu', () => {
        const dir = join(__dirname, '..', 'components');
        const yazanlar = readdirSync(dir)
            .filter((f) => f.endsWith('.tsx'))
            // fetch(.../rest/v1/oyun_skorlari, { method: 'POST' ...}): paneller (Veli/Öğretmen) skorları OKUR ya da PATCH eder, oyun değildir.
            .filter((f) => /rest\/v1\/oyun_skorlari[\s\S]{0,400}?method:\s*'POST'/.test(readFileSync(join(dir, f), 'utf8')))
            .sort();
        // Yeni bir oyun doğrudan yazıyorsa bu test kırılır: oyunu BOARD_EXCLUDED_ROUTES'a ekle (ya da yazmasını kaldır).
        expect(yazanlar).toEqual(['CevizMacera.tsx']);
        expect(BOARD_EXCLUDED_ROUTES.has('ceviz-macera')).toBe(true);
    });
});

describe('tahta modu kaynak değişmezleri', () => {
    const oku = (yol: string) => readFileSync(join(__dirname, '..', yol), 'utf8');

    it('oyun penceresi sonuç KAYDETMEZ: oyun kaydı servisini/veritabanını kullanmaz, çocuk e-postası boş', () => {
        const k = oku('app/tahta-oyun.tsx');
        for (const yasak of ['saveGameResult', 'services/gameResults', 'supabase.from', 'rest/v1']) expect(k).not.toContain(yasak);
        expect(k).toContain("email: ''");
        expect(k).toContain("onGameEnd: () => post('ended')");
    });

    it('iletiler yalnız aynı kaynaktan ve beklenen pencereden kabul edilir (iki yönde)', () => {
        const sahne = oku('components/board/BoardStage.web.tsx');
        expect(sahne).toContain('event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow');
        expect(sahne).toContain('postMessage(boardMessage(type), window.location.origin)');
        const oyun = oku('app/tahta-oyun.tsx');
        expect(oyun).toContain('event.origin !== window.location.origin || event.source !== window.parent');
        expect(oyun).toContain('postMessage(boardMessage(type), window.location.origin)');
    });

    it('geliştirme önizlemesi (?dev=1) yalnız __DEV__ sürümünde çalışır; üretimde öğretmen oturumu şart', () => {
        expect(oku('lib/boardAccess.ts')).toContain('__DEV__ && devBypass');
        expect(oku('app/tahta.tsx')).toContain("const dev = __DEV__ && params.dev === '1'");
        expect(oku('app/tahta-oyun.tsx')).toContain("const dev = __DEV__ && params.dev === '1'");
    });

    it('oyun penceresi erişimi ÖĞRETMENİN paketinden denetler (adresteki parametreden değil) ve dışlanan oyunu açmaz', () => {
        const k = oku('app/tahta-oyun.tsx');
        expect(k).toContain('isRouteOpenForTier(access.tier, game)');
        expect(k).toContain('BOARD_EXCLUDED_ROUTES.has(game)');
        expect(k).not.toContain('params.tier');
        expect(k).not.toContain('tier=');
    });

    it('oyunun çıkış isteği öğretmen onayına bağlanır; öğretmen paneli kartı yalnız web’de ve demoda yok', () => {
        expect(oku('components/board/BoardStage.web.tsx')).toContain("else if (type === 'exit') setConfirm('exit')");
        const panel = oku('components/TeacherDashboard.tsx');
        const i = panel.indexOf("Platform.OS === 'web' && teacherId !== 'demo-teacher'");
        expect(i).toBeGreaterThan(-1);
        expect(panel.slice(i, i + 400)).toContain('styles.boardBanner');
    });
});

describe('oyun penceresi adresi ve iletişim', () => {
    it('adres oluşturur ve geri okur', () => {
        const href = boardPlayHref({ game: 'hafiza-2', ageMonths: 54 });
        expect(href).toBe('/tahta-oyun?g=hafiza-2&yas=54');
        expect(parseBoardPlayParams({ g: 'hafiza-2', yas: '54' })).toEqual({ game: 'hafiza-2', ageMonths: 54 });
        expect(boardPlayHref({ game: 'x', ageMonths: 54, dev: true })).toContain('&dev=1');
    });

    it('eksik/bozuk parametrede güvenli varsayılan', () => {
        expect(parseBoardPlayParams({})).toEqual({ game: null, ageMonths: DEFAULT_AGE_MONTHS });
        expect(parseBoardPlayParams({ g: '  ', yas: 'abc' }).game).toBeNull();
        expect(parseBoardPlayParams({ g: ['a', 'b'], yas: ['60'] })).toEqual({ game: 'a', ageMonths: 60 });
        expect(parseBoardPlayParams({ g: 'a', yas: '900' }).ageMonths).toBe(72);
    });

    it('yalnız kendi kaynağından ve izin verilen türden iletileri kabul eder', () => {
        const allowed = ['ready', 'ended', 'exit'] as const;
        expect(readBoardMessage(boardMessage('ended'), allowed)).toBe('ended');
        expect(readBoardMessage(boardMessage('silence'), allowed)).toBeNull();
        expect(readBoardMessage({ source: 'baska', type: 'ended' }, allowed)).toBeNull();
        expect(readBoardMessage('ended', allowed)).toBeNull();
        expect(readBoardMessage(null, allowed)).toBeNull();
        expect(readBoardMessage({ source: 'minizeka-board', type: 5 }, allowed)).toBeNull();
    });
});

describe('parseBoardPrefs', () => {
    it('geçerli tercihi okur', () => {
        expect(parseBoardPrefs(JSON.stringify({ ageGroup: 5, zoomOffset: 2 }))).toEqual({ ageGroup: 5, zoomOffset: 2 });
        expect(parseBoardPrefs(JSON.stringify({ ageGroup: 5, zoomOffset: -1 }))).toEqual({ ageGroup: 5, zoomOffset: -1 });
    });

    it('bozuk/boş/yabancı değerde varsayılan', () => {
        expect(parseBoardPrefs(null)).toEqual(DEFAULT_PREFS);
        expect(parseBoardPrefs('bozuk{')).toEqual(DEFAULT_PREFS);
        expect(parseBoardPrefs(JSON.stringify({ ageGroup: 9, zoomOffset: 'x' }))).toEqual(DEFAULT_PREFS);
        expect(parseBoardPrefs(JSON.stringify({ ageGroup: 3, zoomOffset: 99 }))).toEqual({ ageGroup: 3, zoomOffset: 12 });
    });
});
