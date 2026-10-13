// Öğretmen paneli: sınıf başına öğrenci sayısı. Her sınıf için ayrı istek atmak (N+1) yerine
// class_students satırları toplu çekilir (class_id=in.(...)) ve istemcide sınıf başına sayılır.

/** PostgREST in.(...) URL'sini makul uzunlukta tutmak için tek istekteki en çok sınıf (uuid ~37 karakter). */
export const CLASS_COUNT_CHUNK_SIZE = 50;

/** Sunucu satır sınırı (Supabase varsayılanı 1000): dolu sayfa gelirse sonraki sayfa istenir. */
export const CLASS_COUNT_PAGE_SIZE = 1000;

/** Diziyi en çok `size` elemanlı parçalara böler (boş dizi -> boş liste). */
export function chunkIds<T>(items: T[], size: number = CLASS_COUNT_CHUNK_SIZE): T[][] {
    const step = Math.max(1, Math.floor(size));
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += step) out.push(items.slice(i, i + step));
    return out;
}

/** {class_id} satırlarından sınıf başına sayı üretir; satırı olmayan sınıflar 0 olur, istenmeyen sınıflar yok sayılır. */
export function countByClass(rows: { class_id?: string | null }[], classIds: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const id of classIds) counts[id] = 0;
    for (const row of rows) {
        const id = row?.class_id;
        if (id != null && Object.prototype.hasOwnProperty.call(counts, id)) counts[id] += 1;
    }
    return counts;
}
