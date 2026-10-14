import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_CATALOG } from '../constants/gameCatalog';
import {
    FREE_GAME_IDS,
    FREE_SHOWCASE_GAME_IDS,
    requiredVeliTierForGame,
    veliTierMeetsMinimum,
    VeliTier,
} from './subscriptionTiers';
import { roomGames } from './toyRoomSelection';

// Odanın ilk sayfası (round 0): lib/toyRoomSelection.ts içindeki sabit açılış oyunları.
const ROOM_OPENING = ['yapboz', 'yaratici-cizim', 'hafiza-2', 'siralama'];

const TIERS: VeliTier[] = ['free', 'tohum', 'filiz', 'fidan', 'orman'];
const openGames = (tier: VeliTier) =>
    GAME_CATALOG.filter(g => veliTierMeetsMinimum(tier, requiredVeliTierForGame(g)));

describe('ücretsiz paket başlangıç seti', () => {
    it('tam olarak 10 oyun ve hepsi katalogda var', () => {
        expect(FREE_GAME_IDS.size).toBe(10);
        const catalogIds = new Set(GAME_CATALOG.map(g => g.id));
        const missing = [...FREE_GAME_IDS].filter(id => !catalogIds.has(id));
        expect(missing).toEqual([]);
    });

    it('ücretsiz sette Akıllı/hikaye/müzik oyunu yok (bunlar Filiz/Fidan)', () => {
        const restricted = GAME_CATALOG
            .filter(g => FREE_GAME_IDS.has(g.id) && (g.adaptive || g.status === 'story' || g.status === 'music'))
            .map(g => g.id);
        expect(restricted).toEqual([]);
    });

    it('free 10 oyun + vitrin oyunlarını açar, Tohum ondan fazlasını (100+)', () => {
        expect(openGames('free').length).toBe(10 + FREE_SHOWCASE_GAME_IDS.size);
        expect(openGames('tohum').length).toBeGreaterThan(100);
    });

    it('vitrin oyunları katalogda, ücretsiz 10 sette değil ve Akıllı/hikaye/müzik değil', () => {
        const byId = new Map(GAME_CATALOG.map(g => [g.id, g]));
        for (const id of FREE_SHOWCASE_GAME_IDS) {
            const g = byId.get(id);
            expect(g).toBeDefined();
            expect(FREE_GAME_IDS.has(id)).toBe(false);
            expect(!!g?.adaptive || g?.status === 'story' || g?.status === 'music').toBe(false);
        }
    });

    it('paket yükseldikçe açık oyun sayısı azalmaz', () => {
        const counts = TIERS.map(t => openGames(t).length);
        for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    });
});

describe('çocuk odası her pakette çökmez', () => {
    it('ilk açılışın (round 0) 4 oyunu her pakette tam ve açık', () => {
        for (const tier of TIERS) {
            const open = openGames(tier);
            const first = roomGames(open, 0).map(g => g.id);
            expect({ tier, first }).toEqual({ tier, first: ROOM_OPENING });
        }
    });

    it('her pakette her sayfa 4 açık oyun gösterir; sabit Müzik Kutusu / hikâye oyunları dönen yuvalarda çıkmaz', () => {
        for (const tier of TIERS) {
            const open = openGames(tier);
            const openIds = new Set(open.map(g => g.id));
            for (let round = 0; round < 60; round++) {
                const page = roomGames(open, round);
                expect({ tier, round, adet: page.length }).toEqual({ tier, round, adet: 4 });
                expect(new Set(page.map(g => g.id)).size).toBe(4);
                for (const g of page) {
                    expect(openIds.has(g.id)).toBe(true);
                    expect(['story', 'music']).not.toContain(g.status);
                }
            }
        }
    });

    it('sabit iki oyuncağın hedefleri katalogda: Müzik Kutusu (Fidan) ve en az bir hikâye (Filiz)', () => {
        const music = GAME_CATALOG.find(g => g.id === 'muzik-calar');
        expect(music && requiredVeliTierForGame(music)).toBe('fidan');
        const stories = GAME_CATALOG.filter(g => g.status === 'story');
        expect(stories.length).toBeGreaterThan(0);
        for (const s of stories) expect(requiredVeliTierForGame(s)).toBe('filiz');
    });
});

describe('ücretsiz set gerçekten oynanabilir (renderer kayıtlı)', () => {
    // ToyRoom yalnız gameRegistry'de renderer'ı olan oyunları gösterir; bir anahtar silinir/yeniden
    // adlandırılırsa oda o oyunu sessizce düşürür. Ağır import yerine kayıt dosyasını metin olarak okuruz.
    const registry = readFileSync(join(__dirname, '../components/gameRegistry.tsx'), 'utf8');
    // Anahtar tırnaksız (siralama:) ya da tırnaklı ('eksik-sayi-bul':) olabilir; satır başında aranır.
    const hasRenderer = (routeKey: string) => new RegExp(String.raw`(^|\n)\s*['"]?${routeKey}['"]?\s*:`).test(registry);

    it('ücretsiz setteki her oyunun renderer kaydı var', () => {
        const missing = [...FREE_GAME_IDS].filter(id => !hasRenderer(id));
        expect(missing).toEqual([]);
    });

    it('ilk açılış oyunlarının renderer kaydı var', () => {
        expect(ROOM_OPENING.filter(id => !hasRenderer(id))).toEqual([]);
    });
});
