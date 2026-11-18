import * as fs from 'fs';
import * as path from 'path';

/**
 * 2026-11-18 denetimi (W5): sonuç ekranının kökü `flex: 1` + ortalı ve kaydırmasızdı; 360x640 dp'de 'Sıradaki Günlük Oyun'
 * düğmesiyle sınırdaydı, yazı tipi 1.3+ ölçekte 'Başka Oyun Oyna' ve 'Oturumu Kapat' kırpılıyordu. Artık içerik
 * ScrollIfNeeded içinde: kısa içerik eskisi gibi ortada, uzunsa kayar (bkz. components/ScrollIfNeeded.tsx).
 */
const INDEX = fs.readFileSync(path.resolve(__dirname, '..', 'app', '(tabs)', 'index.tsx'), 'utf8');

describe('sonuç ekranı küçük ekranda kayar', () => {
    const start = INDEX.indexOf("if (asama === 'sonuc') {");
    const sonuc = INDEX.slice(start, INDEX.indexOf('return null;', start));

    it('ScrollIfNeeded içe aktarılır', () => {
        expect(INDEX).toMatch(/import ScrollIfNeeded from '@\/components\/ScrollIfNeeded';/);
    });

    it('kart ScrollIfNeeded (merkezContainer stiliyle) içinde, düğmeler dahil', () => {
        expect(start).toBeGreaterThan(0);
        expect(sonuc).toMatch(/<DynamicBackground>[\s\S]*<ScrollIfNeeded contentStyle=\{styles\.merkezContainer\}>\s*<View style=\{styles\.card\}>/);
        expect(sonuc).toMatch(/<\/ScrollIfNeeded>\s*<\/DynamicBackground>/);
        const icerik = sonuc.slice(sonuc.indexOf('<ScrollIfNeeded'), sonuc.indexOf('</ScrollIfNeeded>'));
        expect(icerik).toMatch(/Başka Oyun Oyna/);
        expect(icerik).toMatch(/Oturumu Kapat/);
        // eski kaydırmasız kök kalmadı
        expect(sonuc).not.toMatch(/<View style=\{styles\.merkezContainer\}>/);
    });
});
