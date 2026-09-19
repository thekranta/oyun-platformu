import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_CATALOG } from '../constants/gameCatalog';
import { TOY_ROOM_FIRST_GAMES, TOY_ROOM_GROUPS } from '../constants/toyRoomLayout';
import {
    FREE_GAME_IDS,
    requiredVeliTierForGame,
    veliTierMeetsMinimum,
    VeliTier,
} from './subscriptionTiers';

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

    it('free 10 oyun açar, Tohum ondan fazlasını (100+)', () => {
        expect(openGames('free').length).toBe(10);
        expect(openGames('tohum').length).toBeGreaterThan(100);
    });

    it('paket yükseldikçe açık oyun sayısı azalmaz', () => {
        const counts = TIERS.map(t => openGames(t).length);
        for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    });
});

describe('çocuk odası her pakette çökmez', () => {
    it('ilk açılışın sabit oyunları her pakette açık', () => {
        for (const tier of TIERS) {
            const open = new Set(openGames(tier).map(g => g.id));
            expect(TOY_ROOM_FIRST_GAMES.filter(id => !open.has(id))).toEqual([]);
        }
    });

    it('her oda grubunda (ilk oyun hariç) en az bir açık oyun kalır', () => {
        for (const tier of TIERS) {
            const open = openGames(tier);
            TOY_ROOM_GROUPS.forEach((group, i) => {
                const pool = open.filter(g => group.includes(g.forestCategory) && g.id !== TOY_ROOM_FIRST_GAMES[i]);
                expect({ tier, grup: i, sayi: pool.length > 0 }).toEqual({ tier, grup: i, sayi: true });
            });
        }
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

    it('ilk açılışın sabit oyunlarının renderer kaydı var', () => {
        expect(TOY_ROOM_FIRST_GAMES.filter(id => !hasRenderer(id))).toEqual([]);
    });
});
