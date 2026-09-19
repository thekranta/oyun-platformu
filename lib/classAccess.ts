import { supabase } from './supabase';
import { OgretmenTier } from './subscriptionTiers';

export interface ClassGameTier {
    tier: OgretmenTier;
    expiresAt: string | null;
}

// Sınıfa eklenmiş bir çocuk, öğretmeninin Çınar/Meşe paketi üzerinden oyun erişimi kazanır.
//   ClassGameTier -> çocuk aktif bir Çınar/Meşe sınıfında
//   null          -> çocuk hiçbir (aktif, ücretli) sınıfta değil
//   undefined     -> sorgu yapılamadı (ağ hatası, supabase_migrations/add_class_game_tier_rpc.sql
//                    henüz çalıştırılmamış vb.) — çağıran ÖNCEKİ değeri korumalı; geçici bir hata
//                    daha önce alınmış sınıf erişimini silmesin.
export async function fetchClassGameTier(): Promise<ClassGameTier | null | undefined> {
    try {
        const { data, error } = await supabase.rpc('my_class_game_tier');
        if (error) return undefined;
        if (!Array.isArray(data) || data.length === 0) return null;
        const row = data[0] as { tier?: string; expires_at?: string | null };
        if (row.tier !== 'cinar' && row.tier !== 'mese') return null;
        return { tier: row.tier, expiresAt: row.expires_at ?? null };
    } catch {
        return undefined;
    }
}
