import { allHuntTexts } from '../constants/minikMuzeHunt';
import { MUSEUM_DONE, MUSEUM_DRAW_INTRO, MUSEUM_INTRO, PAINTINGS, allMuseumTexts, getPainting } from '../constants/minikMuze';
import { fitContain, focusTransform } from './minikMuzeMath';

describe('Minik Müze veri bütünlüğü', () => {
    it('tablo kimlikleri benzersiz ve bulunabilir', () => {
        const ids = PAINTINGS.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(getPainting(id)?.id).toBe(id);
        expect(getPainting('yok')).toBeUndefined();
    });

    it('her tabloda 5-6 kısa anlatım parçası var; ilk parça tüm tabloyu gösterir', () => {
        for (const p of PAINTINGS) {
            expect({ id: p.id, ok: p.segments.length >= 5 && p.segments.length <= 6 }).toEqual({ id: p.id, ok: true });
            expect(p.segments[0].focus).toBeNull();
            for (const s of p.segments) {
                // 3-6 yaş: kısa cümleler; konuşma metni (rakam yok, uzun paragraf yok)
                expect(s.text.length).toBeGreaterThan(20);
                expect(s.text.length).toBeLessThanOrEqual(230);
                expect({ id: p.id, text: s.text, digit: /\d/.test(s.text) }).toEqual({ id: p.id, text: s.text, digit: false });
            }
        }
    });

    it('yakınlaşma noktaları görselin içinde ve makul ölçekte', () => {
        for (const p of PAINTINGS) {
            for (const s of p.segments) {
                if (!s.focus) continue;
                expect(s.focus.x).toBeGreaterThanOrEqual(0);
                expect(s.focus.x).toBeLessThanOrEqual(1);
                expect(s.focus.y).toBeGreaterThanOrEqual(0);
                expect(s.focus.y).toBeLessThanOrEqual(1);
                expect(s.focus.scale).toBeGreaterThanOrEqual(1.4);
                expect(s.focus.scale).toBeLessThanOrEqual(3);
            }
            const withPause = p.segments.filter((s) => (s.pauseAfterMs ?? 0) >= 4000);
            expect(withPause.length).toBeGreaterThanOrEqual(1);   // en az bir "sen de bak" duraklaması
        }
    });

    it('telif künyesi: yalnız kamu malı, kaynak ve müze dolu', () => {
        for (const p of PAINTINGS) {
            expect(p.credit.license).toBe('Public domain');
            expect(p.credit.commonsFile).toMatch(/\.(jpe?g|png)$/i);
            expect(p.credit.museum.length).toBeGreaterThan(3);
            expect(p.aspect).toBeGreaterThan(0.3);
            expect(p.aspect).toBeLessThan(3);
        }
    });

    it('her tablonun görseli dosyada var ve paintingImages haritasında kayıtlı', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('node:fs') as typeof import('node:fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('node:path') as typeof import('node:path');
        const map = fs.readFileSync(path.join(__dirname, '../components/minikMuze/paintingImages.ts'), 'utf8');
        for (const p of PAINTINGS) {
            expect({ id: p.id, dosya: fs.existsSync(path.join(__dirname, `../assets/images/muze/${p.id}.webp`)) }).toEqual({ id: p.id, dosya: true });
            expect({ id: p.id, harita: map.includes(`'${p.id}':`) }).toEqual({ id: p.id, harita: true });
        }
    });

    it('paket kademesi: 1 ücretsiz vitrin (Mona Lisa), toplam 6 Tohum-seviyesi (vitrin dahil), kalanı Fidan', () => {
        expect(PAINTINGS.filter((p) => p.tier === 'free').map((p) => p.id)).toEqual(['mona-lisa']);
        expect(PAINTINGS.filter((p) => p.tier !== 'fidan')).toHaveLength(6);
    });

    it('üretilecek ses metinleri tekil ve giriş/bitiş metinlerini içerir', () => {
        const all = allMuseumTexts();
        expect(new Set(all).size).toBe(all.length);
        expect(all).toContain(MUSEUM_INTRO);
        expect(all).toContain(MUSEUM_DONE);
        expect(all).toContain(MUSEUM_DRAW_INTRO);
        expect(all).toHaveLength(3 + allHuntTexts().length + PAINTINGS.reduce((n, p) => n + p.segments.length, 0));
    });
});

describe('fitContain', () => {
    it('en-boy oranını korur ve kutuya sığar', () => {
        expect(fitContain(800, 400, 2)).toEqual({ w: 800, h: 400 });
        const wide = fitContain(1000, 400, 1);     // kutu daha geniş: yüksekliğe sığ
        expect(wide).toEqual({ w: 400, h: 400 });
        const tall = fitContain(300, 900, 1.5);    // kutu daha dar: genişliğe sığ
        expect(tall.w).toBe(300);
        expect(tall.h).toBeCloseTo(200);
    });

    it('geçersiz girdide 0 döner', () => {
        expect(fitContain(0, 100, 1)).toEqual({ w: 0, h: 0 });
        expect(fitContain(100, 100, 0)).toEqual({ w: 0, h: 0 });
        expect(fitContain(100, -5, 1)).toEqual({ w: 0, h: 0 });
    });
});

describe('focusTransform', () => {
    it('focus yoksa tüm tablo (ölçek 1, kayma yok)', () => {
        expect(focusTransform(400, 300, null)).toEqual({ scale: 1, tx: 0, ty: 0 });
        expect(focusTransform(0, 0, { x: 0.5, y: 0.5, scale: 2 })).toEqual({ scale: 1, tx: 0, ty: 0 });
    });

    it('merkez noktası kaymaz', () => {
        const t = focusTransform(400, 300, { x: 0.5, y: 0.5, scale: 2 });
        expect(t.scale).toBe(2);
        expect(Math.abs(t.tx)).toBe(0);
        expect(Math.abs(t.ty)).toBe(0);
    });

    it('sağ-alt noktaya yakınlaşınca tablo sol-üste kayar; kenardan boşluk görünmez (sınırlı)', () => {
        const t = focusTransform(400, 300, { x: 0.75, y: 0.75, scale: 2 });
        expect(t.tx).toBeCloseTo(-2 * 0.25 * 400);      // -200: tam sınır (s-1)*iw/2 = 200
        expect(t.ty).toBeCloseTo(-2 * 0.25 * 300);      // -150: tam sınır
        const edge = focusTransform(400, 300, { x: 1, y: 1, scale: 2 });
        expect(edge.tx).toBe(-200);                     // sınıra kırpıldı (ham değer -400)
        expect(edge.ty).toBe(-150);
        const left = focusTransform(400, 300, { x: 0, y: 0, scale: 3 });
        expect(left.tx).toBe(400);                      // (3-1)*400/2 = 400
        expect(left.ty).toBe(300);
    });

    it('ölçek 1\'in altına inmez, konum 0..1\'e kırpılır', () => {
        expect(focusTransform(400, 300, { x: 0.2, y: 0.2, scale: 0.5 }).scale).toBe(1);
        const t = focusTransform(400, 300, { x: 5, y: -3, scale: 2 });
        expect(t.tx).toBe(-200);
        expect(t.ty).toBe(150);
    });
});

describe('Minik Müze ses klipleri', () => {
    // services/speechService.ts ttsSlug ile AYNI kural (o modül expo-av getirdiğinden testte yerelde yazıldı).
    const slug = (t: string) => t
        .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's').replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/Ü/g, 'u').replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    it('slug kuralı bilinen örnekle eşleşir', () => {
        expect(slug('Doğru! Aferin.')).toBe('dogru-aferin');
    });

    it('her anlatım metninin hazır klibi (lib/ttsAssets.ts) var — klipsiz metin canlı yabancı sese düşer', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const src = require('node:fs').readFileSync(require('node:path').join(__dirname, 'ttsAssets.ts'), 'utf8') as string;
        const missing = allMuseumTexts().filter((t) => !src.includes(`'${slug(t)}':`));
        expect(missing).toEqual([]);
    });
});
