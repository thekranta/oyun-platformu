import type { BoardResult } from './boardMode';

/**
 * Tahta Modu: seçilen çocuğun oyun sonucunu çocuğun dosyasına KAYDETME (sunucu fonksiyonu teacher_save_board_result,
 * supabase_migrations/add_board_results.sql). Öğretmen çocuğun satırına doğrudan yazamaz; bu tek kapı Sınıf Bahçesi'nin
 * "ödül ver" kapısıyla aynı kontrolleri yapar (kendi sınıfı + ücretli sınıf paketi + onaylı, tek çocuklu hesap) ve satırı
 * "sınıfta" diye etiketler. İstemci çocuğun adını/e-postasını GÖNDERMEZ: yalnız sınıf kaydının kimliği (class_students.id)
 * ve sonuç; ad, yaş ve e-posta sunucuda hesaptan okunur.
 */

export type SaveOutcome =
    | 'saved'        // kaydedildi (ya da son 20 sn içindeki aynı kayıt zaten vardı)
    | 'denied'       // kayıt hakkı yok (paket, onay, kardeşli hesap, başkasının sınıfı): tek tip
    | 'limit'        // çocuk için günlük kayıt sınırı doldu
    | 'unavailable'  // sunucu fonksiyonu henüz yok (SQL çalışmadı): kayıt düğmesi bırakılır
    | 'error';       // ağ/sunucu hatası: yeniden denenebilir

interface RpcClientLike {
    rpc(fn: string, args?: Record<string, unknown>): any;
}

/** Sunucu fonksiyonunun adlandırılmış parametreleri. Çocuğun adı/e-postası BURADA YOK (sunucu hesaptan okur). */
export function saveRpcArgs(studentId: string, r: BoardResult): Record<string, unknown> {
    return {
        p_student_id: studentId,
        p_oyun_turu: r.oyunAdi,
        p_sure: r.sure,
        p_hamle: r.hamle,
        p_hata: r.hata,
        p_correct_answers: r.correct,
        p_zorluk: r.zorluk,
        p_kazanim: r.kazanim,
        p_deneme: r.deneme,
        p_distance_effect: r.distanceEffect,
        p_response_time: r.responseTime,
        p_cognitive_speed: r.cognitiveSpeed,
        p_visual_attention: r.visualAttention,
        p_round_history: r.roundHistory,
    };
}

/** Sunucu hatasını sonuca çevirir. 'not_found' tek tip red (paket/onay/sınıf ayırt edilmez). */
export function outcomeOf(error: { code?: string; message?: string } | null | undefined): SaveOutcome {
    if (!error) return 'saved';
    const message = error.message || '';
    if (error.code === 'PGRST202' || /Could not find the function|schema cache/i.test(message)) return 'unavailable';
    if (/rate_limited/.test(message)) return 'limit';
    if (/not_found/.test(message)) return 'denied';
    return 'error';
}

export async function saveBoardResult(client: RpcClientLike, studentId: string, result: BoardResult): Promise<SaveOutcome> {
    try {
        const { error } = await client.rpc('teacher_save_board_result', saveRpcArgs(studentId, result));
        return outcomeOf(error);
    } catch {
        return 'error';
    }
}

/**
 * YALNIZ geliştirme (`__DEV__` + ?dev=1): sahte sınıfta kayıt arayüzünün her durumunu gerçek oturum olmadan denemek için.
 * Üretimde çağrılmaz (app/tahta.tsx `__DEV__ && dev` ile ayırır).
 */
export function devSaveOutcome(studentId: string, attempt: number): SaveOutcome {
    if (studentId === 'd1-3') return attempt === 0 ? 'error' : 'saved';
    if (studentId === 'd1-4') return 'denied';
    if (studentId === 'd1-5') return 'limit';
    if (studentId === 'd1-6') return 'unavailable';
    return 'saved';
}
