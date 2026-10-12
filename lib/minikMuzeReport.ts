import { getPainting } from '../constants/minikMuze';

// Minik Müze oturumları oyun_skorlari'na 'minik-muze' olarak yazılır; algilanan_kelime alanı o oturumda
// sonuna kadar dinlenen tablo kimliklerini virgülle taşır (components/MinikMuze.tsx finishAndExit).
// Burada o kayıtlardan velinin haftalık raporu için "bu hafta hangi tabloları dinledi" notu çıkarılır.

export interface MuseumScoreLike {
    oyun_turu: string;
    algilanan_kelime?: string | null;
}

export interface WeeklyMuseum {
    paintings: { id: string; title: string; artist: string }[];
    /** Evde birlikte yapılabilecek tek cümlelik öneri (ilk tabloya göre). */
    idea: string;
}

/** Kayıttaki virgüllü tablo kimliklerini çözer; bilinmeyen kimlikler atılır, tekrarlar tekilleştirilir. */
export function parsePaintingIds(raw: string | null | undefined): string[] {
    if (!raw) return [];
    const seen = new Set<string>();
    for (const part of raw.split(',')) {
        const id = part.trim();
        if (id && getPainting(id)) seen.add(id);
    }
    return Array.from(seen);
}

/** Verilen kayıtlardan (genelde son 7 gün) dinlenen tabloların özeti; hiç yoksa null. */
export function summarizeMuseum(rows: MuseumScoreLike[]): WeeklyMuseum | null {
    const ids: string[] = [];
    for (const r of rows || []) {
        if (!r || r.oyun_turu !== 'minik-muze') continue;
        for (const id of parsePaintingIds(r.algilanan_kelime)) if (!ids.includes(id)) ids.push(id);
    }
    const paintings = ids
        .map((id) => getPainting(id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => ({ id: p.id, title: p.title, artist: p.artist }));
    if (paintings.length === 0) return null;
    const first = paintings[0];
    return {
        paintings,
        idea: `Birlikte "${first.title}" tablosunu yeniden çizmeyi deneyin: önce renklerden, sonra şekillerden söz edin. Çocuk neyi en çok sevdiğini anlatsın.`,
    };
}
