import * as fs from 'fs';
import * as path from 'path';

/**
 * Android geri tuşu (2026-11-14 taraması): oyun ve sonuç ekranları ana rotanın durumudur (gezinme geçmişi yok), bu yüzden geri tuşu/hareketi
 * hiçbir şey yakalanmayınca UYGULAMAYI KAPATIYORDU (Minik Müze'de geri → Android ana ekranı). Ana ekran artık geri tuşunu yakalar:
 * oyun/sonuçta odaya döner; odada ve girişte sistem davranışı (false → çıkış).
 */
const src = fs.readFileSync(path.resolve(__dirname, '..', 'app', '(tabs)', 'index.tsx'), 'utf8');

describe('Android geri tuşu (ana ekran)', () => {
    it('hardwareBackPress dinlenir ve temizlenir', () => {
        expect(src).toMatch(/BackHandler\.addEventListener\('hardwareBackPress'/);
        expect(src).toMatch(/return \(\) => sub\.remove\(\)/);
    });

    it('odada ve girişte sistem davranışı (false), diğer her ekranda odaya döner (true)', () => {
        const block = src.slice(src.indexOf("BackHandler.addEventListener('hardwareBackPress'"));
        const handler = block.slice(0, block.indexOf('});') + 3);
        expect(handler).toMatch(/if \(asama === 'menu' \|\| asama === 'giris'\) return false;/);
        expect(handler).toMatch(/setAsama\('menu'\);\s*return true;/);
    });

    it('yalnız Android\'de kurulur ve tüm ekran dönüşlerinden ÖNCE tanımlıdır (hook sırası)', () => {
        const effectAt = src.indexOf("BackHandler.addEventListener('hardwareBackPress'");
        const firstScreenReturn = src.indexOf("if (asama === 'giris') {", effectAt);
        expect(effectAt).toBeGreaterThan(0);
        expect(firstScreenReturn).toBeGreaterThan(effectAt);
        expect(src.slice(effectAt - 200, effectAt)).toMatch(/Platform\.OS !== 'android'/);
    });
});
