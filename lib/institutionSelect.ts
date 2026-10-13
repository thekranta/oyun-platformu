import { InstitutionInfo, isInstitutionExpired } from './institutionStats';

// Çoklu kurum yöneticisi: bir hesap birden çok kurumun yöneticisi olabilir (my_admin_institutions bir dizi döner).
// Saf mantık burada; arayüz (app/kurum.tsx) yalnız bunları çağırır.

/** Paneline girilebilecek (süresi dolmamış) kurumlar. Süre kontrolü kurum BAŞINA yapılır. */
export function selectableInstitutions(list: InstitutionInfo[] | null | undefined, now: number = Date.now()): InstitutionInfo[] {
    return (list ?? []).filter((i) => !isInstitutionExpired(i, now));
}

/**
 * Hangi kurum seçili olsun?
 *   - istenen kimlik listede varsa o (hatırlanan / kullanıcının seçtiği),
 *   - yoksa (silinmiş, süresi dolmuş, başka hesabın kimliği, boş) listenin ilki,
 *   - liste boşsa null.
 */
export function resolveSelectedId(list: InstitutionInfo[], requestedId: string | null | undefined): string | null {
    if (list.length === 0) return null;
    if (requestedId && list.some((i) => i.id === requestedId)) return requestedId;
    return list[0].id;
}

/** Seçili kurumun kendisi (kimlik geçersizse ilk kurum). */
export function pickInstitution(list: InstitutionInfo[], requestedId: string | null | undefined): InstitutionInfo | null {
    const id = resolveSelectedId(list, requestedId);
    return id === null ? null : list.find((i) => i.id === id) ?? null;
}

/** Kurum seçici yalnız birden çok kurum varsa gösterilir (tek kurumda arayüz değişmez). */
export function needsInstitutionPicker(list: InstitutionInfo[]): boolean {
    return list.length > 1;
}
