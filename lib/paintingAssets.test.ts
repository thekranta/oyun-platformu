/**
 * Minik Müze tablo görselleri: her tablonun tam boy + küçük (1280, web) + önizleme (480) dosyası var, boyut/oran sınırları
 * tutuyor ve haritalar hepsini kapsıyor. Bozulursa: node scripts/optimize-web-images.mjs
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { PAINTINGS } from '../constants/minikMuze';

const ROOT = join(__dirname, '..');
const MUZE = join(ROOT, 'assets', 'images', 'muze');
const text = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('Minik Müze tablo görselleri', () => {
    it('16 tablo katalogda', () => {
        expect(PAINTINGS.length).toBe(16);
    });

    it('her tabloda tam boy, küçük ve önizleme var; boyutlar ve en-boy oranı korunmuş', async () => {
        for (const p of PAINTINGS) {
            const fullPath = join(MUZE, `${p.id}.webp`);
            const smallPath = join(MUZE, 'small', `${p.id}.webp`);
            const thumbPath = join(MUZE, 'thumbs', `${p.id}.webp`);
            const [full, small, thumb] = await Promise.all([fullPath, smallPath, thumbPath].map((f) => sharp(f).metadata()));
            const ratio = (m: { width?: number; height?: number }) => (m.width as number) / (m.height as number);

            expect(Math.max(small.width as number, small.height as number)).toBeLessThanOrEqual(1280);
            expect(Math.max(thumb.width as number, thumb.height as number)).toBeLessThanOrEqual(480);
            // Türevler tam boyla aynı en-boy oranında (kırpma / bozulma yok): ±%1
            expect(Math.abs(ratio(small) / ratio(full) - 1)).toBeLessThan(0.01);
            expect(Math.abs(ratio(thumb) / ratio(full) - 1)).toBeLessThan(0.01);
            // Katalogdaki aspect tam boyla uyumlu (fitContain / yakınlaştırma buna dayanır): ±%2
            expect(Math.abs(p.aspect / ratio(full) - 1)).toBeLessThan(0.02);
            // Boyut sınırları: önizleme kart için, küçük sürüm tam boydan belirgin küçük
            expect(statSync(thumbPath).size).toBeLessThan(80 * 1024);
            expect(statSync(smallPath).size).toBeLessThan(600 * 1024);
            expect(statSync(smallPath).size).toBeLessThan(statSync(fullPath).size);
        }
    });

    it('galerinin indireceği önizlemelerin toplamı 1 MB altında (eskiden 13,9 MB tam boy)', () => {
        const total = PAINTINGS.reduce((sum, p) => sum + statSync(join(MUZE, 'thumbs', `${p.id}.webp`)).size, 0);
        expect(total).toBeLessThan(1024 * 1024);
    });

    it('paintingImages.ts önizleme + tam boy, paintingSmall.web.ts küçük haritasını tüm tablolar için içerir; native küçük haritası null', () => {
        const images = text('components/minikMuze/paintingImages.ts');
        const smallWeb = text('components/minikMuze/paintingSmall.web.ts');
        for (const p of PAINTINGS) {
            expect(images).toContain(`'${p.id}': require('../../assets/images/muze/${p.id}.webp')`);
            expect(images).toContain(`'${p.id}': require('../../assets/images/muze/thumbs/${p.id}.webp')`);
            expect(smallWeb).toContain(`'${p.id}': require('../../assets/images/muze/small/${p.id}.webp')`);
        }
        expect(text('components/minikMuze/paintingSmall.ts')).toContain('PAINTING_SMALL: Record<string, ImageSourcePropType> | null = null');
    });
});
