/**
 * Tahta Modu satırlarının kaynağı (oyun_skorlari.kaynak, supabase_migrations/add_board_results.sql).
 *
 * NULL = çocuğun/velinin kendi oyunu; 'tahta' = sınıf akıllı tahtasında, öğretmen eşliğinde ve grupla oynanıp çocuğun
 * dosyasına işlenmiş oyun. İkisi aynı değildir: tahtadaki sonuç arkadaş yardımı ve öğretmen yönlendirmesi içerebilir. Bu yüzden
 * veli panelinde "Sınıfta" etiketiyle görünür ve yapay zekâ özetlerine bağlam notu olarak verilir (kanıt değil, bağlam).
 */

export const BOARD_SOURCE = 'tahta';

export function isBoardSource(kaynak: unknown): boolean {
    return kaynak === BOARD_SOURCE;
}

export const ORTAM_SINIF = 'sınıf tahtası (öğretmen eşliğinde, grupla)';

/**
 * Yapay zekâ istemindeki veri satırına eklenecek "ortam" alanı: YALNIZ tahta satırında vardır, böylece yalnız evde oynayan
 * çocukların istemi (ve token maliyeti) hiç değişmez.
 */
export function ortamField(kaynak: unknown): { ortam?: string } {
    return isBoardSource(kaynak) ? { ortam: ORTAM_SINIF } : {};
}

/**
 * Birden çok oyunluk istem penceresi (veli raporu, öğretmen özeti) için not. Pencerede tahta satırı yoksa BOŞ metin döner.
 */
export function aiBoardNote(games: ReadonlyArray<{ kaynak?: unknown }>): string {
    if (!games.some((g) => isBoardSource(g.kaynak))) return '';
    return 'ORTAM NOTU: Verilerde "ortam" alanı bulunan oyunlar ("' + ORTAM_SINIF + '"), çocuğun sınıfta, öğretmen eşliğinde ve arkadaşlarının yanında oynadığı oyunlardır; '
        + 'alanı olmayanlar çocuğun kendi (bireysel) oyunlarıdır. Sınıf oyunlarını bireysel oyunlarla doğrudan karşılaştırma ve tek başına yeterlilik kanıtı sayma; yalnızca bağlam olarak kullan.\n\n';
}

/** Tek oyunluk istem (uzman paneli) için not: kayıt tahta satırıysa istemin başına eklenir. */
export const AI_BOARD_SINGLE_NOTE =
    'ORTAM NOTU: Bu oyun, çocuğun sınıfta, öğretmen eşliğinde ve arkadaşlarının yanında sınıf tahtasında oynadığı bir oyundur. '
    + 'Evdeki bireysel oyunlarla doğrudan karşılaştırma ve tek başına yeterlilik kanıtı sayma; yalnızca bağlam olarak kullan.\n\n';
