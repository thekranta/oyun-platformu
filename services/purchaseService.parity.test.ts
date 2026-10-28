/**
 * Web paketine react-native-purchases (RevenueCat tarayıcı SDK'sı dahil ~1,2 MB ham) GİRMEMELİ:
 * yalnız services/purchaseService.ts onu çalışma zamanında içe alır; web'de Metro purchaseService.web.ts'i seçer.
 * Bu test (1) iki dosyanın aynı işlevleri dışa aktardığını, (2) web dosyasının SDK'yı yalnız tür olarak
 * içe aldığını, (3) başka hiçbir modülün SDK'yı çalışma zamanında içe almadığını güvenceye alır.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import type * as Native from './purchaseService';
import type * as Web from './purchaseService.web';

// tsc denetimi: web yüzeyi native'inkine atanabilir olmalı (eksik/uyumsuz dışa aktarım derlemeyi kırar).
const webYuzeyi: typeof Native = null as unknown as typeof Web;
void webYuzeyi;

const ROOT = join(__dirname, '..');
const oku = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');

function disaAktarilanIslevler(kaynak: string): string[] {
    const adlar = new Set<string>();
    for (const m of kaynak.matchAll(/^export\s+(?:async\s+)?(?:function|const)\s+(\w+)/gm)) adlar.add(m[1]);
    for (const m of kaynak.matchAll(/^export\s*\{([^}]+)\}\s*from/gm)) {
        for (const ad of m[1].split(',')) if (ad.trim()) adlar.add(ad.trim());
    }
    return [...adlar].sort();
}

// "import X from 'react-native-purchases'", "import {…} from …", "require(…)", "import(…)" — "import type" HARİÇ.
const CALISMA_ZAMANI_ICE_ALMA =
    /(?:^|\n)\s*import\s+(?!type\b)[^;]*?from\s*['"]react-native-purchases['"]|require\(\s*['"]react-native-purchases['"]\s*\)|import\(\s*['"]react-native-purchases['"]\s*\)/;

function kaynakDosyalari(dir: string, acc: string[] = []): string[] {
    for (const ad of readdirSync(dir)) {
        if (ad === 'node_modules' || ad === 'dist' || ad === 'scratchpad' || ad.startsWith('.')) continue;
        const tam = join(dir, ad);
        if (statSync(tam).isDirectory()) kaynakDosyalari(tam, acc);
        else if (/\.(ts|tsx)$/.test(ad) && !/\.test\.tsx?$/.test(ad) && !ad.endsWith('.d.ts')) acc.push(tam);
    }
    return acc;
}

describe('purchaseService: web karşılığı ve SDK sızıntısı', () => {
    it('web dosyası native ile aynı işlevleri dışa aktarır', () => {
        const native = disaAktarilanIslevler(oku('services', 'purchaseService.ts'));
        const web = disaAktarilanIslevler(oku('services', 'purchaseService.web.ts'));
        expect(native.length).toBeGreaterThanOrEqual(7);
        expect(web).toEqual(native);
    });

    it('web dosyası react-native-purchases’ı çalışma zamanında içe almaz', () => {
        expect(CALISMA_ZAMANI_ICE_ALMA.test(oku('services', 'purchaseService.web.ts'))).toBe(false);
    });

    it('paylaşılan paket işlevleri dosyası SDK’yı yalnız tür olarak içe alır', () => {
        expect(CALISMA_ZAMANI_ICE_ALMA.test(oku('services', 'purchaseTiers.ts'))).toBe(false);
    });

    it('SDK’yı çalışma zamanında içe alan tek dosya services/purchaseService.ts', () => {
        const sizanlar: string[] = [];
        for (const dosya of kaynakDosyalari(ROOT)) {
            if (CALISMA_ZAMANI_ICE_ALMA.test(readFileSync(dosya, 'utf8'))) sizanlar.push(relative(ROOT, dosya).split('\\').join('/'));
        }
        expect(sizanlar).toEqual(['services/purchaseService.ts']);
    });
});
