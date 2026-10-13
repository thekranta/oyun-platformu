import { needsInstitutionPicker, pickInstitution, resolveSelectedId, selectableInstitutions } from './institutionSelect';
import { InstitutionInfo } from './institutionStats';

const NOW = new Date(2026, 9, 10, 12, 0, 0).getTime();
const mk = (id: string, expiresAt: string | null = null): InstitutionInfo => ({ id, name: 'Kurum ' + id, expiresAt, teacherCount: 1, classCount: 1 });

describe('institutionSelect', () => {
    it('selectableInstitutions: süresi dolanı kurum bazında eler, süresizi korur', () => {
        const list = [mk('a'), mk('b', '2026-01-01T00:00:00Z'), mk('c', '2027-01-01T00:00:00Z')];
        expect(selectableInstitutions(list, NOW).map((i) => i.id)).toEqual(['a', 'c']);
        expect(selectableInstitutions(undefined, NOW)).toEqual([]);
        expect(selectableInstitutions(null, NOW)).toEqual([]);
    });

    it('resolveSelectedId: geçerli istek korunur, geçersiz/boş istek ilk kuruma düşer', () => {
        const list = [mk('a'), mk('b')];
        expect(resolveSelectedId(list, 'b')).toBe('b');
        expect(resolveSelectedId(list, 'zzz')).toBe('a');
        expect(resolveSelectedId(list, null)).toBe('a');
        expect(resolveSelectedId(list, undefined)).toBe('a');
        expect(resolveSelectedId(list, '')).toBe('a');
        expect(resolveSelectedId([], 'a')).toBeNull();
    });

    it('pickInstitution: seçilen kurumu döner, geçersizde ilkini, boşta null', () => {
        const list = [mk('a'), mk('b')];
        expect(pickInstitution(list, 'b')?.id).toBe('b');
        expect(pickInstitution(list, 'x')?.id).toBe('a');
        expect(pickInstitution([], 'a')).toBeNull();
    });

    it('needsInstitutionPicker: yalnız birden çok kurumda', () => {
        expect(needsInstitutionPicker([])).toBe(false);
        expect(needsInstitutionPicker([mk('a')])).toBe(false);
        expect(needsInstitutionPicker([mk('a'), mk('b')])).toBe(true);
    });

    it('süresi dolan kurum seçili kimlikse listeden düşer ve ilk geçerli kuruma geçilir', () => {
        const all = [mk('a', '2026-01-01T00:00:00Z'), mk('b'), mk('c')];
        const list = selectableInstitutions(all, NOW);
        expect(resolveSelectedId(list, 'a')).toBe('b');
    });
});
