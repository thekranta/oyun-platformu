const mockResolve = jest.fn((n: number) => (n === 99 ? null : n === 98 ? { uri: '' } : { uri: `native://asset-${n}` }));
jest.mock('expo-av/build/AV', () => ({
    getNativeSourceFromSource: (n: number) => {
        if (n === 97) throw new Error('kayıt yok');
        return mockResolve(n);
    },
}));

import { assetUri } from './assetUri';

describe('assetUri', () => {
    beforeEach(() => mockResolve.mockClear());

    it('web biçimleri: metin adres olduğu gibi, { uri, width, height } nesnesinden uri', () => {
        expect(assetUri('/assets/a.mp3')).toBe('/assets/a.mp3');
        expect(assetUri({ uri: '/assets/b.webp', width: 1, height: 1 })).toBe('/assets/b.webp');
        expect(mockResolve).not.toHaveBeenCalled();                    // ağa/çözümlemeye gerek yok
    });

    it('sayı (native modül kimliği) expo-av çözümlemesiyle çevrilir ve önbelleğe alınır', () => {
        expect(assetUri(5)).toBe('native://asset-5');
        expect(assetUri(5)).toBe('native://asset-5');
        expect(mockResolve).toHaveBeenCalledTimes(1);
    });

    it('çözülemeyen ya da varlık olmayan değerler undefined döner (hata fırlatmaz)', () => {
        expect(assetUri(99)).toBeUndefined();                          // çözümleme null
        expect(assetUri(98)).toBeUndefined();                          // boş uri
        expect(assetUri(97)).toBeUndefined();                          // çözümleme hata verdi
        expect(assetUri('')).toBeUndefined();
        expect(assetUri({})).toBeUndefined();
        expect(assetUri({ uri: '' })).toBeUndefined();
        expect(assetUri({ uri: 5 })).toBeUndefined();
        expect(assetUri(null)).toBeUndefined();
        expect(assetUri(undefined)).toBeUndefined();
        expect(assetUri(true)).toBeUndefined();
    });
});
