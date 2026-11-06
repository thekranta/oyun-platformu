import { AI_BOARD_SINGLE_NOTE, aiBoardNote, BOARD_SOURCE, isBoardSource, ORTAM_SINIF, ortamField } from './boardSource';

describe('kaynak etiketi (sınıf tahtasında oynanan oyun)', () => {
    it("yalnız 'tahta' sınıf kaynağıdır", () => {
        expect(BOARD_SOURCE).toBe('tahta');
        expect(isBoardSource('tahta')).toBe(true);
        for (const v of [null, undefined, '', 'TAHTA', 'ev', 0, {}]) expect(isBoardSource(v)).toBe(false);
    });

    it('istem verisinde "ortam" alanı yalnız tahta satırında bulunur (evde oynayanların istemi hiç değişmez)', () => {
        expect(ortamField('tahta')).toEqual({ ortam: ORTAM_SINIF });
        expect(ortamField(null)).toEqual({});
        expect('ortam' in ortamField(undefined)).toBe(false);
    });

    it('ortam notu yalnız pencerede tahta satırı varsa eklenir; kanıt değil bağlam der', () => {
        expect(aiBoardNote([])).toBe('');
        expect(aiBoardNote([{ kaynak: null }, { kaynak: undefined }, {}])).toBe('');
        const not = aiBoardNote([{ kaynak: null }, { kaynak: 'tahta' }]);
        expect(not).toMatch(/^ORTAM NOTU/);
        expect(not).toMatch(/bağlam/);
        expect(not).toMatch(/\n\n$/);
        expect(AI_BOARD_SINGLE_NOTE).toMatch(/^ORTAM NOTU/);
        expect(AI_BOARD_SINGLE_NOTE).toMatch(/bağlam/);
        expect(AI_BOARD_SINGLE_NOTE).toMatch(/\n\n$/);
    });
});
