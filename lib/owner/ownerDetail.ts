/**
 * Sahip paneli — bir aktivite satırına tıklanınca açılan detay sorguları.
 * Veli/çocuk detayı için lib/admin/queueQuery.ts'teki fetchAllForStudent()
 * yeniden kullanılır (burada tekrarlanmaz).
 */
import { supabase } from '../supabase';
import { normalizeVotes } from '../admin/flags';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || SUPABASE_KEY || '';
  return { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${token}` };
}

export interface UzmanKarar {
  skorId: number;
  ogrenciAdi: string;
  oyunTuru: string;
  oy: string;
  gerekce?: string;
  tarih: string;
}

/** Bir uzmanın (display_name) verdiği TÜM kararları, en yeniden eskiye, çıkarır. */
export async function fetchUzmanKararlari(uzmanAdi: string): Promise<UzmanKarar[]> {
  const headers = await authHeaders();
  try {
    // NOT: uzman_oylamalari->>key ile sunucu-tarafi filtreleme yerine (belirsiz PostgREST
    // JSON-yol sozdizimi riski), karari-olan TUM satirlari cekip istemci tarafinda
    // filtreliyoruz -- olcek kucuk (~yuzlerce kayit), ayni desen mergeAndSort'ta da kullaniliyor.
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/oyun_skorlari?select=id,ogrenci_adi,oyun_turu,uzman_oylamalari&uzman_oylamalari=not.is.null&limit=500`,
      { headers }
    );
    if (!res.ok) return [];
    const rows: any[] = await res.json();
    const kararlar: UzmanKarar[] = [];
    for (const r of rows) {
      const votes = normalizeVotes(r.uzman_oylamalari);
      const oy = votes[uzmanAdi];
      if (!oy) continue;
      kararlar.push({
        skorId: r.id,
        ogrenciAdi: r.ogrenci_adi,
        oyunTuru: r.oyun_turu,
        oy: oy.oy,
        gerekce: oy.gerekce,
        tarih: oy.tarih,
      });
    }
    return kararlar.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
  } catch {
    return [];
  }
}

export interface OgretmenDetay {
  siniflar: { id: string; name: string; created_at?: string; ogrenciSayisi: number }[];
}

/** Bir öğretmenin sınıflarını + her sınıftaki öğrenci sayısını çıkarır. */
export async function fetchOgretmenDetay(teacherId: string): Promise<OgretmenDetay> {
  const headers = await authHeaders();
  try {
    const classesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/classes?select=id,name,created_at&teacher_id=eq.${teacherId}`,
      { headers }
    );
    if (!classesRes.ok) return { siniflar: [] };
    const classes: any[] = await classesRes.json();

    const siniflar = await Promise.all(
      classes.map(async (c) => {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/class_students?select=id&class_id=eq.${c.id}`,
          { headers: { ...headers, Prefer: 'count=exact' } }
        );
        const range = res.headers.get('content-range');
        const ogrenciSayisi = range && range.includes('/') ? parseInt(range.split('/')[1], 10) || 0 : 0;
        return { id: c.id, name: c.name, created_at: c.created_at, ogrenciSayisi };
      })
    );
    return { siniflar };
  } catch {
    return { siniflar: [] };
  }
}
