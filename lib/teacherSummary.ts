import { getMaarif } from '../constants/maarifMap';

// Öğretmen paneli "Gelişim Özeti": tek bir oyunu değil, öğrencinin SON 12 oyununu birlikte yorumlar
// (velideki toplu rapor ile aynı pencere; bkz. components/VeliDashboard.tsx analyzeWithAI).
// Gizlilik: öğrencinin adı AI istemine KONMAZ (yalnız ay cinsinden yaş + oyun verisi).

export const SUMMARY_GAME_LIMIT = 12;
export const SUMMARY_MIN_GAMES = 3;

export interface SummaryGame {
    oyun_turu: string;
    created_at: string;
    hamle_sayisi: number;
    hata_sayisi: number;
    sure?: number | null;
    correct_answers?: number | null;
}

/** En yeni başta gelen kayıtlardan özet penceresini (son 12) alır. */
export function selectSummaryGames<T>(newestFirst: T[]): T[] {
    return newestFirst.slice(0, SUMMARY_GAME_LIMIT);
}

export function developmentalPeriod(ageMonths: number | null | undefined): string {
    if (ageMonths == null || ageMonths <= 0) return 'Okul Öncesi';
    if (ageMonths < 36) return 'Erken Çocukluk (24-36 ay)';
    if (ageMonths < 48) return 'Okul Öncesi Erken Dönem (36-48 ay)';
    if (ageMonths < 60) return 'Okul Öncesi Geç Dönem (48-60 ay)';
    return 'Okula Hazırlık Dönemi (60-72 ay)';
}

/** Oyun türü başına ortalama hata ve Maarif eşleşmesi (istem ve demo özeti için ortak). */
export function gameStats(games: SummaryGame[]) {
    const map = new Map<string, { name: string; area: string; code: string; count: number; errors: number }>();
    for (const g of games) {
        const m = getMaarif(g.oyun_turu);
        const e = map.get(g.oyun_turu) || { name: m.displayName, area: m.badgeAlan || m.alan, code: m.cikti, count: 0, errors: 0 };
        e.count += 1;
        e.errors += g.hata_sayisi || 0;
        map.set(g.oyun_turu, e);
    }
    return Array.from(map.entries())
        .map(([turu, e]) => ({ turu, ...e, avgErrors: e.errors / e.count }))
        .sort((a, b) => a.avgErrors - b.avgErrors);
}

/** Yapay zekâya gidecek istem. Eski→yeni sırayla verilir (trend okunabilsin); Maarif kodları VERİDEN gelir. */
export function buildTeacherSummaryPrompt(ageMonths: number | null | undefined, newestFirst: SummaryGame[]): string {
    const games = selectSummaryGames(newestFirst).slice().reverse();
    const data = games.map((g, i) => {
        const m = getMaarif(g.oyun_turu);
        return {
            sira: i + 1,
            oyun: m.displayName,
            alan: m.badgeAlan || m.alan,
            maarif_cikti: m.cikti,
            tarih: new Date(g.created_at).toLocaleDateString('tr-TR'),
            hata_sayisi: g.hata_sayisi,
            hamle_sayisi: g.hamle_sayisi,
            sure_saniye: g.sure ?? null,
            dogru_cevap: g.correct_answers ?? null,
        };
    });
    const codes = Array.from(new Set(data.map((d) => d.maarif_cikti).filter(Boolean)));
    const age = ageMonths && ageMonths > 0 ? ageMonths + ' aylık' : 'yaşı bilinmiyor';

    return 'Sen bir okul öncesi eğitim uzmanısın ve Türkiye Yüzyılı Maarif Modeli\'ne hakimsin.\n'
        + 'Bir sınıf öğretmenine, öğrencisinin son ' + data.length + ' oyununa dayanan kısa bir GELİŞİM ÖZETİ yaz.\n'
        + 'Öğrencinin adı verilmedi; "öğrenci" de. Yaş: ' + age + ' (' + developmentalPeriod(ageMonths) + ').\n\n'
        + 'VERİLER (eskiden yeniye, JSON):\n' + JSON.stringify(data, null, 2) + '\n\n'
        + 'KURALLAR:\n'
        + '- Yalnız şu Maarif çıktı kodlarını kullanabilirsin: ' + (codes.length ? codes.join(', ') : '(yok)') + '. Başka kod UYDURMA.\n'
        + '- Tek bir oyundan değil, oyunlar arası EĞİLİMDEN söz et (ilk oyunlardan son oyunlara değişim). Veri azsa bunu açıkça belirt.\n'
        + '- Tanı koyma; gözlem ve öneri dili kullan ("görülüyor", "desteklenebilir").\n'
        + '- Veli bölümü, "Değerli Velimiz" hitabı ya da imza YAZMA; yalnız öğretmene yaz.\n'
        + '- Türkçe, sade, en çok 200 kelime.\n\n'
        + 'BİÇİM (başlıklarla, her biri kısa):\n'
        + 'Genel görünüm: ...\nGüçlü yönler: ...\nDesteklenecek alanlar: ...\nSınıfta öneriler: (2-3 somut etkinlik)';
}
