/**
 * Web ana paketi (entry) küçük kalmalı: ağır kütüphaneler yalnız ihtiyaç duyulduğunda ayrı parça olarak iner.
 * Ölçüm (2026-10-28, ham 4,9 MB): RevenueCat tarayıcı SDK'sı 1,05 MB, react-native-reanimated 0,62 MB idi.
 * Bu testler o kütüphanelerin bir import yüzünden ana pakete geri sızmasını yakalar
 * (RevenueCat için bkz. services/purchaseService.parity.test.ts).
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import type * as NativeCapture from './captureRef';
import type * as WebCapture from './captureRef.web';

// tsc denetimi: captureRef'in web karşılığı native'inkine atanabilir olmalı.
const webCapture: typeof NativeCapture = null as unknown as typeof WebCapture;
void webCapture;

const ROOT = join(__dirname, '..');

function kaynakDosyalari(dir: string, acc: string[] = []): string[] {
    for (const ad of readdirSync(dir)) {
        if (ad === 'node_modules' || ad === 'dist' || ad === 'scratchpad' || ad.startsWith('.')) continue;
        const tam = join(dir, ad);
        if (statSync(tam).isDirectory()) kaynakDosyalari(tam, acc);
        else if (/\.(ts|tsx)$/.test(ad) && !/\.test\.tsx?$/.test(ad) && !ad.endsWith('.d.ts')) acc.push(tam);
    }
    return acc;
}

const rel = (p: string) => relative(ROOT, p).split('\\').join('/');
const HEPSI = kaynakDosyalari(ROOT).map((p) => ({ yol: rel(p), kaynak: readFileSync(p, 'utf8') }));
const iceAlanlar = (desen: RegExp) => HEPSI.filter((d) => desen.test(d.kaynak)).map((d) => d.yol).sort();

describe('web ana paketi: react-native-reanimated sızıntısı', () => {
    it('Reanimated yalnız native başlangıç dosyasında ve iki Sınıf Bahçesi çiziminde içe alınır', () => {
        const desen = /from\s*['"]react-native-(?:reanimated|worklets)['"]|^\s*import\s*['"]react-native-(?:reanimated|worklets)['"]|require\(\s*['"]react-native-(?:reanimated|worklets)['"]\s*\)/m;
        expect(iceAlanlar(desen)).toEqual([
            'components/rewardBoard/concepts/PlantArt.tsx',
            'components/rewardBoard/concepts/SkyArt.tsx',
            'lib/reanimatedInit.ts',
        ]);
    });

    it('web başlangıç dosyası (reanimatedInit.web.ts) Reanimated yüklemez', () => {
        const web = HEPSI.find((d) => d.yol === 'lib/reanimatedInit.web.ts');
        expect(web).toBeDefined();
        expect(/react-native-(?:reanimated|worklets)['"]/.test(web!.kaynak.replace(/\/\/.*$/gm, ''))).toBe(false);
    });

    it('reanimatedInit’i yalnız kök yerleşim (app/_layout.tsx) içe alır', () => {
        expect(iceAlanlar(/['"]@\/lib\/reanimatedInit['"]|['"][./]+\/lib\/reanimatedInit['"]/)).toEqual(['app/_layout.tsx']);
    });

    it('PlantArt/SkyArt’a yalnız concepts/arts.ts üzerinden ulaşılır (statik import ana pakete sokar)', () => {
        const desen = /from\s*['"][^'"]*\/(?:PlantArt|SkyArt)['"]|from\s*['"]\.\/(?:PlantArt|SkyArt)['"]/;
        expect(iceAlanlar(desen)).toEqual(['components/rewardBoard/concepts/arts.ts']);
    });

    it('lazyArt, çizimleri TEK parçada (./arts) indirir; Reanimated iki kez kopyalanmaz', () => {
        const lazy = HEPSI.find((d) => d.yol === 'components/rewardBoard/concepts/lazyArt.tsx')!;
        expect(lazy.kaynak.match(/import\(\s*['"][^'"]+['"]\s*\)/g)).toEqual(["import('./arts')"]);
    });

    it('react-native-view-shot (web’de html2canvas, ~196 KB ham) yalnız lib/captureRef.ts’te içe alınır', () => {
        // Çizim oyunları web'de html-to-image kullanır; view-shot'ı doğrudan içe alan her oyun parçası onu ortak parçaya
        // (__common, herkesin ilk açılışta indirdiği) sokar. Metro web'de lib/captureRef.web.ts'i seçer.
        expect(iceAlanlar(/from\s*['"]react-native-view-shot['"]|require\(\s*['"]react-native-view-shot['"]\s*\)|import\(\s*['"]react-native-view-shot['"]\s*\)/))
            .toEqual(['lib/captureRef.ts']);
        expect(iceAlanlar(/['"]html2canvas['"]/)).toEqual([]);
    });

    it('lib/captureRef.web.ts view-shot içe almaz ve captureRef dışa aktarır', () => {
        const web = HEPSI.find((d) => d.yol === 'lib/captureRef.web.ts')!;
        expect(web).toBeDefined();
        expect(/view-shot/.test(web.kaynak.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))).toBe(false);
        expect(web.kaynak).toMatch(/export\s+(?:async\s+)?function\s+captureRef\b/);
    });

    it('her konsept çizimini lazyArt ile alır', () => {
        const plant = HEPSI.find((d) => d.yol === 'components/rewardBoard/concepts/PlantConcept.tsx')!;
        const sky = HEPSI.find((d) => d.yol === 'components/rewardBoard/concepts/SkyConcept.tsx')!;
        expect(plant.kaynak).toContain("Art: lazyArt('PlantArt')");
        expect(sky.kaynak).toContain("Art: lazyArt('SkyArt')");
    });
});
