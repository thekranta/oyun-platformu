import { MAARIF_MAP } from '../constants/maarifMap';
import { getMaarifInfo } from './maarifInfo';
import { RADAR_COLORS, radarColorFor } from './radarColors';

describe('getMaarifInfo', () => {
    it('resmi kodlu oyunda kod ve Maarif belgesindeki resmi metin gelir', () => {
        const m = getMaarifInfo('siralama');
        expect(m.code).toBe('MAB.4');
        expect(m.official).toBe(true);
        expect(m.text).toBe('Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme');
        expect(m.alan).toBe('Matematik');
    });

    it('resmi olmayan (platform içi SDB) kodda öğretmene kod gösterilmez, metin yine verilir', () => {
        const m = getMaarifInfo('hafiza-3');
        expect(m.code).toBeNull();
        expect(m.alan).toBe('Sosyal-Duygusal');
        expect(m.text.length).toBeGreaterThan(10);
    });

    it('bilinmeyen oyunda varsayılan karşılık döner, çökmez', () => {
        const m = getMaarifInfo('olmayan-oyun');
        expect(m.code).toBe('MAB.2');
        expect(m.text.length).toBeGreaterThan(10);
    });

    it('haritadaki her oyunun metni boş değil', () => {
        for (const id of Object.keys(MAARIF_MAP)) {
            expect({ id, bos: getMaarifInfo(id).text.trim() === '' }).toEqual({ id, bos: false });
        }
    });
});

describe('radarColorFor', () => {
    it('beş ölçütün renkleri birbirinden farklı', () => {
        const colors = Object.values(RADAR_COLORS);
        expect(new Set(colors).size).toBe(colors.length);
    });

    it('bilinmeyen ölçüt sırasına göre yedek renk alır', () => {
        expect(radarColorFor('yok', 0)).toMatch(/^#/);
        expect(radarColorFor('yok', 0)).not.toBe(radarColorFor('yok', 1));
    });
});
