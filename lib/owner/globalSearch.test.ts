import { searchDatabase, sanitize } from './globalSearch';

describe('sanitize', () => {
    it('baş/son boşlukları temizler', () => {
        expect(sanitize('  tuna  ')).toBe('tuna');
    });

    it('PostgREST ilike özel karakterlerini (% *) temizler', () => {
        expect(sanitize('tu%na*alp')).toBe('tunaalp');
    });

    it('boş string için boş string döner', () => {
        expect(sanitize('')).toBe('');
    });
});

describe('searchDatabase', () => {
    it('2 karakterden kısa sorguda ağa hiç gitmeden boş dizi döner', async () => {
        expect(await searchDatabase('a')).toEqual([]);
        expect(await searchDatabase(' ')).toEqual([]);
    });
});
