import * as fs from 'fs';
import * as path from 'path';
import { GAME_CATALOG } from '../constants/gameCatalog';
import { MAARIF_MAP } from '../constants/maarifMap';
import { GAME_CARD_META, GAME_EMOJI } from './menuHelpers';

// Yeni oyun kontrol listesi: oyunun 5 kayıt yerinden biri unutulursa burada yakalanır.
// (1) bileşen dosyası + kayıt defteri, (2) katalog, (3) kart meta, (4) Maarif kaydı.

const ROOT = path.resolve(__dirname, '..');
const registrySrc = fs.readFileSync(path.join(ROOT, 'components', 'gameRegistry.tsx'), 'utf8');

// GAME_RENDERERS içindeki anahtarlar: `  'kafiye-bahcesi': (c) =>` ya da `  hafiza: (c) =>`
const registryKeys = new Set<string>();
for (const m of registrySrc.matchAll(/^\s{2}(?:'([a-z0-9-]+)'|([a-z][a-z0-9]*)):\s*\(\s*c\s*\)\s*=>/gm)) {
  registryKeys.add(m[1] ?? m[2]);
}

describe('yeni oyun kontrol listesi', () => {
  it('katalogda yinelenen id ya da routeKey yok', () => {
    const ids = GAME_CATALOG.map((g) => g.id);
    const routes = GAME_CATALOG.map((g) => g.routeKey);
    expect(ids.filter((x, i) => ids.indexOf(x) !== i)).toEqual([]);
    expect(routes.filter((x, i) => routes.indexOf(x) !== i)).toEqual([]);
  });

  it('kayıt defteri okunabiliyor (regex regresyonu)', () => {
    expect(registryKeys.size).toBeGreaterThan(100);
  });

  it('her katalog oyununun kayıt defterinde (gameRegistry) satırı var', () => {
    const eksik = GAME_CATALOG.filter((g) => !registryKeys.has(g.routeKey)).map((g) => g.routeKey);
    expect(eksik).toEqual([]);
  });

  it('kayıt defterinde katalogda olmayan (öksüz) oyun yok', () => {
    const rotalar = new Set(GAME_CATALOG.map((g) => g.routeKey));
    const oksuz = [...registryKeys].filter((k) => !rotalar.has(k));
    expect(oksuz).toEqual([]);
  });

  it('her katalog oyununun kart meta kaydı (GAME_CARD_META) var', () => {
    const eksik = GAME_CATALOG.filter((g) => !GAME_CARD_META[g.id]).map((g) => g.id);
    expect(eksik).toEqual([]);
  });

  it('her katalog oyununun kendi Maarif kaydı (maarifMap) var — yoksa sessizce MAB.2 olur', () => {
    const eksik = GAME_CATALOG.filter((g) => !MAARIF_MAP[g.id]).map((g) => g.id);
    expect(eksik).toEqual([]);
  });

  it('her katalog oyununun emojisi (GAME_EMOJI) var', () => {
    const eksik = GAME_CATALOG.filter((g) => !GAME_EMOJI[g.id]).map((g) => g.id);
    expect(eksik).toEqual([]);
  });

  it('kart başlığı varsa boş değil', () => {
    const bos = GAME_CATALOG.filter((g) => GAME_CARD_META[g.id]?.displayTitle !== undefined && !GAME_CARD_META[g.id].displayTitle!.trim());
    expect(bos.map((g) => g.id)).toEqual([]);
  });
});
