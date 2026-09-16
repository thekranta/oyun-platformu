import { supabase } from '../supabase';
import { ActivityEvent, mergeAndSort, ogretmenKayitToEvent, oyunSkoruToEvent, profilToEvent } from './activityFeed';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// queueQuery.ts'teki fetchBucket() ile aynı PostgREST özel-karakter kaçışı.
export function sanitize(q: string): string {
    return q.trim().replace(/[%*]/g, '');
}

async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || SUPABASE_KEY || '';
    return { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${token}` };
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<any[]> {
    try {
        const res = await fetch(url, { headers });
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

// Öğrenci/veli/öğretmen/oyun türü adına göre tüm veritabanında arar (gerekce serbest metni
// KAPSAM DIŞI -- bkz. ownerDetail.ts'teki PostgREST JSON-yol filtreleme ihtiyatı).
export async function searchDatabase(query: string): Promise<ActivityEvent[]> {
    const q = sanitize(query);
    if (q.length < 2) return [];

    const headers = await authHeaders();
    const or1 = `(child_name.ilike.*${q}*,parent_name.ilike.*${q}*,email.ilike.*${q}*)`;
    const or2 = `(name.ilike.*${q}*,email.ilike.*${q}*)`;
    const or3 = `(ogrenci_adi.ilike.*${q}*,email.ilike.*${q}*,oyun_turu.ilike.*${q}*)`;

    const [profiller, ogretmenler, skorlar] = await Promise.all([
        fetchJson(`${SUPABASE_URL}/rest/v1/profiles?select=email,child_name,parent_name,child_age_months,created_at&or=${or1}&order=created_at.desc&limit=20`, headers),
        fetchJson(`${SUPABASE_URL}/rest/v1/teachers?select=user_id,name,created_at&or=${or2}&order=created_at.desc&limit=20`, headers),
        fetchJson(`${SUPABASE_URL}/rest/v1/oyun_skorlari?select=id,created_at,ogrenci_adi,ogrenci_yasi,email,oyun_turu,sure,hata_sayisi,uzman_oylamalari&or=${or3}&order=created_at.desc&limit=30`, headers),
    ]);

    return mergeAndSort(
        profiller.map(profilToEvent),
        ogretmenler.map(ogretmenKayitToEvent),
        skorlar.map(oyunSkoruToEvent),
    );
}
