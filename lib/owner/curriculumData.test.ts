import fs from 'node:fs';
import path from 'node:path';
import { GAME_CATALOG } from '../../constants/gameCatalog';
import { MAARIF_CIKTILAR_2026 } from '../../constants/maarifCurriculum2026';
import { DEFAULT_MAARIF, getMaarif, MAARIF_MAP } from '../../constants/maarifMap';
import { normalizeOyunTuru } from '../normalizeOyunTuru';

// Müfredat verisinin tutarlılığı: owner paneli, öğretmen rehberi ve AI analizi aynı haritadan beslenir.

describe('Maarif 2026 kod sözlüğü', () => {
    const codes = Object.values(MAARIF_CIKTILAR_2026);

    it('76 resmi kod + 7 platform becerisi (SDB), alan başına sayılar TTKB tablosuyla aynı', () => {
        expect(codes.filter((c) => c.resmi)).toHaveLength(76);
        expect(codes.filter((c) => !c.resmi).map((c) => c.code)).toEqual(['SDB.1', 'SDB.2', 'SDB.3', 'SDB.4', 'SDB.5', 'SDB.6', 'SDB.7']);
        const perAlan: Record<string, number> = {};
        for (const c of codes.filter((x) => x.resmi)) perAlan[c.alan] = (perAlan[c.alan] || 0) + 1;
        expect(perAlan).toEqual({ 'Türkçe': 17, 'Matematik': 13, 'Fen': 9, 'Sosyal': 15, 'Hareket ve Sağlık': 9, 'Sanat': 4, 'Müzik': 9 });
    });

    it('her oyunun Maarif kodu sözlükte var ve oyunun alanı kodun alanıyla uyuşur', () => {
        const kotu = Object.entries(MAARIF_MAP)
            .filter(([, e]) => !MAARIF_CIKTILAR_2026[e.cikti] || MAARIF_CIKTILAR_2026[e.cikti].alan !== e.alan)
            .map(([k, e]) => `${k}: ${e.alan} / ${e.cikti}`);
        expect(kotu).toEqual([]);
    });
});

describe('skor kayıt adları haritaya çözülür', () => {
    it('oyunların onGameEnd/oyunAdi ile yazdığı her sabit ad varsayılan koda (MAB.2) DÜŞMEZ', () => {
        const files: string[] = [];
        const walk = (d: string) => {
            for (const f of fs.readdirSync(d)) {
                const p = path.join(d, f);
                if (fs.statSync(p).isDirectory()) { if (!['node_modules', '.claude', 'dist'].includes(f)) walk(p); }
                else if (/\.tsx?$/.test(f) && !/test/.test(f)) files.push(p);
            }
        };
        walk(path.join(__dirname, '../../components'));
        walk(path.join(__dirname, '../../app'));
        const names = new Map<string, string>();
        for (const f of files) {
            const src = fs.readFileSync(f, 'utf8');
            for (const m of src.matchAll(/onGameEnd\(\s*(['"])([^'"]+)\1/g)) names.set(m[2], path.basename(f));
            for (const m of src.matchAll(/oyunAdi="([^"]+)"/g)) names.set(m[1], path.basename(f));
        }
        expect(names.size).toBeGreaterThan(100);
        const dusen = [...names.entries()].filter(([n]) => getMaarif(n).cikti === DEFAULT_MAARIF.cikti && !MAARIF_MAP[normalizeOyunTuru(n)])
            .map(([n, f]) => `${n} (${f})`);
        expect(dusen).toEqual([]);
    });

    it('"kimlik - ek" ve görünen ad biçimleri doğru kayda gider', () => {
        expect(getMaarif('Yapboz - Karpuz')).toBe(MAARIF_MAP['yapboz']);
        expect(getMaarif('Kodlama Oyunu')).toBe(MAARIF_MAP['kodlama']);
        expect(getMaarif('bilinmeyen-bir-oyun').displayName).toBe('bilinmeyen-bir-oyun');
    });

    it('her katalog oyununun Maarif kaydı var (kimlik ya da kayıt adıyla)', () => {
        const eksik = GAME_CATALOG.filter((g) => !MAARIF_MAP[g.id] && !MAARIF_MAP[g.routeKey]).map((g) => g.id);
        expect(eksik).toEqual([]);
    });
});
