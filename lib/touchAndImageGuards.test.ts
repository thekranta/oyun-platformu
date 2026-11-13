import * as fs from 'fs';
import * as path from 'path';

/**
 * Android/web'de tekrar eden iki sessiz hatanın koruması (2026-11-13 kapalı test bulguları):
 *
 * 1) Yerel görsel + absoluteFill: React Native yerel `require()` görsellerine kendi piksel boyutunu varsayılan verir.
 *    `StyleSheet.absoluteFill` yalnız top/left/right/bottom içerir; width/height yoksa görsel DOĞAL boyutta çizilir ve kap
 *    yalnızca sol üst köşeyi gösterir (Minik Müze: Mona Lisa "doku" gibi görünüyordu). → Image'e absoluteFill VERİLMEZ.
 *
 * 2) Çizim tuvali + dokunuş hedefi: `nativeEvent.locationX/Y` dokunulan EN İÇTEKİ görünüme göredir. Tuvalin içine konan
 *    şekil/damga/yüz parçası dokunuşu kaparsa konum o parçaya göre gelir ve çizim/yeni parça sol üst köşeye atlar.
 *    → Tuval içeriği tek bir `pointerEvents="none"` kabında olmalı.
 */

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function tsxFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of fs.readdirSync(path.join(ROOT, dir))) {
        const rel = `${dir}/${name}`;
        const stat = fs.statSync(path.join(ROOT, rel));
        if (stat.isDirectory()) out.push(...tsxFiles(rel));
        else if (name.endsWith('.tsx') && !name.endsWith('.test.tsx')) out.push(rel);
    }
    return out;
}

describe('Image + absoluteFill (doğal boyut tuzağı)', () => {
    it('hiçbir <Image>/<Animated.Image> stil olarak StyleSheet.absoluteFill kullanmaz (width/height yüzdesi verin)', () => {
        const offenders: string[] = [];
        for (const file of [...tsxFiles('components'), ...tsxFiles('app')]) {
            const src = read(file);
            for (const m of src.matchAll(/<(Animated\.Image|Image)\b[^>]*?style=\{[^}]*absoluteFill[^}]*\}/g)) {
                offenders.push(`${file}: ${m[0].replace(/\s+/g, ' ').slice(0, 100)}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('ProgressiveImage görseli açık width/height ile doldurur', () => {
        const src = read('components/ProgressiveImage.tsx');
        expect(src).toMatch(/width:\s*'100%',\s*height:\s*'100%'/);
        expect(src).not.toMatch(/style=\{(?:\[)?StyleSheet\.absoluteFill/);
    });
});

describe('çizim tuvalleri: içerik dokunuş hedefi olmaz', () => {
    // Tuval içine View/Text olarak şekil/damga/parça koyan oyunlar: kapta pointerEvents="none" şart.
    const CASES: { file: string; marker: RegExp }[] = [
        { file: 'components/YaraticiCizim.tsx', marker: /<View pointerEvents="none" style=\{StyleSheet\.absoluteFill\}>\s*\{placedShapes\.map/ },
        { file: 'components/DamgaSanati.tsx', marker: /<View pointerEvents="none" style=\{StyleSheet\.absoluteFill\}>\s*\{stamps\.map/ },
        { file: 'components/YuzYap.tsx', marker: /<View pointerEvents="none" style=\{StyleSheet\.absoluteFill\}>\s*\{placed\.map/ },
    ];

    it.each(CASES)('$file: konan parçalar pointerEvents="none" kabında', ({ file, marker }) => {
        expect(read(file)).toMatch(marker);
    });

    it('locationX/Y kullanan tüm çizim bileşenlerinde, tuvalin altındaki SVG/animasyon kapları pointerEvents="none"', () => {
        const files = tsxFiles('components').filter((f) => /locationX/.test(read(f)) && /panHandlers/.test(read(f)));
        expect(files.length).toBeGreaterThan(8);          // koruma gerçekten çizim oyunlarını kapsıyor mu
        const missing: string[] = [];
        for (const file of files) {
            const src = read(file);
            const start = src.indexOf('panHandlers');
            const canvasChunk = src.slice(start, start + 2500);
            // Tuvalin içinde <Svg ...> varsa pointerEvents="none" olmalı
            for (const m of canvasChunk.matchAll(/<Svg\b[^>]*>/g)) {
                if (!/pointerEvents="none"/.test(m[0]) && !/pointerEvents="none"[\s\S]{0,40}$/.test(canvasChunk.slice(0, m.index! + m[0].length))) {
                    // SVG, pointerEvents="none" olan bir üst kabın içinde mi? (KurdeleDansi gibi)
                    const before = canvasChunk.slice(0, m.index);
                    if (!/pointerEvents="none"/.test(before)) missing.push(`${file}: ${m[0].slice(0, 80)}`);
                }
            }
        }
        expect(missing).toEqual([]);
    });
});
