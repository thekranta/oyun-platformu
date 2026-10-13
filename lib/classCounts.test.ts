import { chunkIds, countByClass, CLASS_COUNT_CHUNK_SIZE } from './classCounts';

describe('countByClass', () => {
    it('satırları sınıf başına sayar, boş sınıf 0 olur', () => {
        const rows = [{ class_id: 'a' }, { class_id: 'b' }, { class_id: 'a' }, { class_id: 'a' }];
        expect(countByClass(rows, ['a', 'b', 'c'])).toEqual({ a: 3, b: 1, c: 0 });
    });

    it('hiç satır yoksa hepsi 0', () => {
        expect(countByClass([], ['a', 'b'])).toEqual({ a: 0, b: 0 });
    });

    it('sınıf listesi boşsa boş nesne', () => {
        expect(countByClass([{ class_id: 'a' }], [])).toEqual({});
    });

    it('istenmeyen sınıf, eksik/boş class_id ve prototip adları sayıma karışmaz', () => {
        const rows = [{ class_id: 'x' }, { class_id: null }, {}, { class_id: 'toString' }, { class_id: 'a' }];
        expect(countByClass(rows, ['a'])).toEqual({ a: 1 });
    });
});

describe('chunkIds', () => {
    it('boş dizi -> boş liste', () => {
        expect(chunkIds([])).toEqual([]);
    });

    it('sınırın altında tek parça', () => {
        expect(chunkIds(['a', 'b', 'c'])).toEqual([['a', 'b', 'c']]);
    });

    it('sınırı aşınca parçalara böler, sıra ve toplam korunur', () => {
        const ids = Array.from({ length: CLASS_COUNT_CHUNK_SIZE * 2 + 3 }, (_, i) => `id${i}`);
        const chunks = chunkIds(ids);
        expect(chunks.map((c) => c.length)).toEqual([CLASS_COUNT_CHUNK_SIZE, CLASS_COUNT_CHUNK_SIZE, 3]);
        expect(chunks.flat()).toEqual(ids);
    });

    it('geçersiz boyut en az 1 kabul edilir', () => {
        expect(chunkIds(['a', 'b'], 0)).toEqual([['a'], ['b']]);
    });
});
