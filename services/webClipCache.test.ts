/**
 * Web klip önbelleği: önceden indirme kuyruğu (eşzamanlılık, öncelik), bellek sınırı, hata/veri tasarrufu korumaları.
 */
import {
    MAX_CLIPS,
    __resetWebClipCacheForTests,
    markClipInUse,
    pendingClip,
    preloadClipUris,
    readyClipUrl,
} from './webClipCache';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = global as any;

type Pending = { uri: string; resolve: (ok?: boolean) => void };

describe('webClipCache', () => {
    let calls: Pending[];
    let revoked: string[];
    let n: number;
    let saved: { fetch: unknown; create: unknown; revoke: unknown; document: unknown; navigator: unknown };

    /** Her fetch çağrısı elle çözülen bir söz olur: kuyruğun eşzamanlılığını gözlemlemek için. */
    function installFetch() {
        g.fetch = jest.fn((uri: string) => new Promise((resolve) => {
            calls.push({
                uri,
                resolve: (ok = true) => resolve({ ok, arrayBuffer: async () => new ArrayBuffer(4) }),
            });
        }));
    }
    const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

    beforeEach(() => {
        saved = { fetch: g.fetch, create: URL.createObjectURL, revoke: URL.revokeObjectURL, document: g.document, navigator: g.navigator };
        calls = [];
        revoked = [];
        n = 0;
        (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn(() => 'blob:' + ++n);
        (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn((u: string) => { revoked.push(u); });
        installFetch();
        __resetWebClipCacheForTests();
    });
    afterEach(() => {
        __resetWebClipCacheForTests();
        g.fetch = saved.fetch;
        (URL as unknown as { createObjectURL: unknown }).createObjectURL = saved.create;
        (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = saved.revoke;
        g.document = saved.document;
        g.navigator = saved.navigator;
    });

    it('en çok 2 klip eşzamanlı iner; biri bitince sıradaki başlar', async () => {
        preloadClipUris(['a', 'b', 'c', 'd']);
        expect(calls.map((c) => c.uri)).toEqual(['a', 'b']);
        calls[0].resolve();
        await settle();
        expect(calls.map((c) => c.uri)).toEqual(['a', 'b', 'c']);
        expect(readyClipUrl('a')).toBe('blob:1');
    });

    it('urgent: sıradaki (henüz başlamamış) işlerin önüne geçer', async () => {
        preloadClipUris(['a', 'b', 'c', 'd']);                     // a, b iniyor; c, d bekliyor
        preloadClipUris(['x', 'y'], { urgent: true });
        calls[0].resolve();
        await settle();
        expect(calls[2].uri).toBe('x');
        calls[1].resolve();
        await settle();
        expect(calls[3].uri).toBe('y');
    });

    it('aynı klip iki kez istenmez (inen ya da hazır olan atlanır); inen klibin sözü verilir', async () => {
        preloadClipUris(['a']);
        preloadClipUris(['a', 'a']);
        expect(calls).toHaveLength(1);
        const p = pendingClip('a');
        expect(p).toBeDefined();
        calls[0].resolve();
        await expect(p).resolves.toBe('blob:1');
        expect(pendingClip('a')).toBeUndefined();
        preloadClipUris(['a']);
        expect(calls).toHaveLength(1);                               // hazır: yeniden inmez
    });

    it('indirme başarısız olursa (ağ hatası / 404) sessizce vazgeçilir ve klip hazır sayılmaz', async () => {
        preloadClipUris(['a', 'b']);
        calls[0].resolve(false);                                     // 404
        await settle();
        expect(readyClipUrl('a')).toBeUndefined();
        g.fetch = jest.fn(() => Promise.reject(new Error('ağ yok')));
        preloadClipUris(['c']);
        await settle();
        expect(readyClipUrl('c')).toBeUndefined();
    });

    it('bellek sınırı aşılınca en eski klip bırakılır, çalan klip bırakılmaz', async () => {
        const total = MAX_CLIPS + 2;
        const uris = Array.from({ length: total }, (_, i) => 'k' + i);
        for (const u of uris) {
            preloadClipUris([u]);
            while (calls.length) { calls.shift()?.resolve(); await settle(); }
            if (u === 'k0') markClipInUse(readyClipUrl('k0'));       // k0 çalıyor: bırakılmamalı
        }
        await settle();
        expect(readyClipUrl('k0')).toBeDefined();                    // çalan korundu
        expect(readyClipUrl('k1')).toBeUndefined();                  // sıradaki en eski bırakıldı
        expect(readyClipUrl('k' + (total - 1))).toBeDefined();
        expect(revoked.length).toBe(2);
    });

    it('veri tasarrufu açıkken, 2G\'de, arka plan sekmesinde ve fetch yokken önceden indirme yapılmaz', () => {
        g.navigator = { connection: { saveData: true } };
        preloadClipUris(['a']);
        g.navigator = { connection: { effectiveType: '2g' } };
        preloadClipUris(['b']);
        g.navigator = { connection: { effectiveType: 'slow-2g' } };
        preloadClipUris(['c']);
        g.navigator = { connection: { effectiveType: '4g' } };
        g.document = { hidden: true };
        preloadClipUris(['d']);
        g.document = { hidden: false };
        g.fetch = undefined;
        preloadClipUris(['e']);
        expect(calls).toHaveLength(0);
        installFetch();
        preloadClipUris(['f']);                                      // her şey normal: iner
        expect(calls.map((c) => c.uri)).toEqual(['f']);
    });
});
