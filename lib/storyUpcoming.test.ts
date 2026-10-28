import { StoryNodeLike, assetKey, upcomingAssets } from './storyUpcoming';

// Sayılar paketli varlıkları (require() sonucu) temsil eder.
const NODES: Record<string, StoryNodeLike> = {
    intro: {
        bgImage: 1, audio: 2, questionAudio: 3,
        options: [
            { image: 10, audio: null, next: 'a' },
            { image: 11, audio: null, next: 'b' },
        ],
    },
    a: { bgImage: 20, audio: 21, questionAudio: 22, options: [{ image: 23, next: 'end1' }, { image: 24, next: 'end2' }] },
    b: { bgImage: 30, audio: 31, options: [{ image: 33, next: 'end2' }] },
    end1: { bgImage: 40, badgeImage: 41, audio: 42 },
    end2: { bgImage: 50, audio: 51 },
    linear: { bgImage: 60, audio: 61, next: 'end2' },
};

describe('upcomingAssets', () => {
    it('şimdiki sahnenin soru sesi ve seçenek görselleri + seçeneklerin gittiği sahnelerin tüm varlıkları', () => {
        const { images, audio } = upcomingAssets(NODES, 'intro');
        expect([...(images as number[])].sort((x, y) => x - y)).toEqual([10, 11, 20, 23, 24, 30, 33]);
        expect([...(audio as number[])].sort((x, y) => x - y)).toEqual([3, 21, 22, 31]);   // şimdiki: soru (3); sıradaki: a ve b'nin anlatım + soru
        expect(images).not.toContain(1);                                       // şimdiki sahnenin kendi arka planı / anlatımı zaten yüklü
        expect(audio).not.toContain(2);
    });

    it('doğrusal sahne (next): sıradaki sahne alınır, rozet dahil', () => {
        const { images, audio } = upcomingAssets(NODES, 'linear');
        expect(images).toEqual([50]);
        expect(audio).toEqual([51]);
        const end = upcomingAssets({ ...NODES, linear2: { next: 'end1' } }, 'linear2');
        expect([...(end.images as number[])].sort((x, y) => x - y)).toEqual([40, 41]);
        expect(end.audio).toEqual([42]);
    });

    it('varlık olmayan değerler (null, boş, uri olmayan nesne, mantıksal) ve tekrarlar atlanır; derinlik 1', () => {
        const nodes: Record<string, StoryNodeLike> = {
            s: { options: [{ image: 5, audio: null, next: 't' }, { image: 5, next: 't' }] },
            t: { bgImage: {}, badgeImage: true, audio: '', questionAudio: null, next: 'u' },
            u: { bgImage: 99 },
        };
        const { images, audio } = upcomingAssets(nodes, 's');
        expect(images).toEqual([5]);                                           // tekrarsız; u iki adım ötede: alınmaz
        expect(audio).toEqual([]);
    });

    it('son sahne / bilinmeyen sahne / kendine giden bağ boş ya da güvenli döner', () => {
        expect(upcomingAssets(NODES, 'end1')).toEqual({ images: [], audio: [] });
        expect(upcomingAssets(NODES, 'yok')).toEqual({ images: [], audio: [] });
        expect(upcomingAssets({ x: { bgImage: 1, next: 'x', options: [{ next: 'x', image: 2 }] } }, 'x')).toEqual({ images: [2], audio: [] });
    });
});

describe('upcomingAssets: web / native varlık biçimleri', () => {
    it('web biçimi: ses için metin adres, görsel için { uri, width, height } nesnesi; aynı varlık tekrar alınmaz', () => {
        const img = (n: number) => ({ uri: `/assets/img${n}.webp`, width: 100, height: 100 });
        const nodes: Record<string, StoryNodeLike> = {
            s: { questionAudio: '/assets/q-s.mp3', options: [{ image: img(1), next: 't' }, { image: img(1), next: 'u' }] },
            t: { bgImage: img(2), audio: '/assets/narr-t.mp3', questionAudio: '/assets/q-t.mp3' },
            u: { bgImage: img(2), audio: '/assets/narr-t.mp3' },   // t ile aynı varlıklar
        };
        const { images, audio } = upcomingAssets(nodes, 's');
        expect(images.map((i) => (i as { uri: string }).uri)).toEqual(['/assets/img1.webp', '/assets/img2.webp']);
        expect(audio).toEqual(['/assets/q-s.mp3', '/assets/narr-t.mp3', '/assets/q-t.mp3']);
    });

    it('boş metin, uri olmayan nesne ve null atlanır; assetKey varlık olmayanlar için undefined', () => {
        expect(assetKey('')).toBeUndefined();
        expect(assetKey({ uri: '' })).toBeUndefined();
        expect(assetKey({ width: 1 })).toBeUndefined();
        expect(assetKey(null)).toBeUndefined();
        expect(assetKey(undefined)).toBeUndefined();
        expect(assetKey(7)).toBe(7);
        expect(assetKey('/a.mp3')).toBe('/a.mp3');
        expect(assetKey({ uri: '/b.webp' })).toBe('/b.webp');
    });
});
