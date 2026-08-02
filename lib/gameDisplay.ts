/**
 * gameDisplay — Oyun görünen ad + emoji için TEK KAYNAK çözümleyici.
 * ------------------------------------------------------------
 * Bugüne kadar oyun adı/emoji birçok yerde ayrı ayrı tanımlıydı (VeliDashboard,
 * StudentStatsModal, admin, weeklyReport, ReportEngine). Bu, her yeni oyunda
 * 6+ dosyayı elle güncellemek demekti. Artık:
 *   - İsim = constants/maarifMap.ts `displayName` (tek kaynak)
 *   - Emoji = buradaki tek harita (DB oyun_turu slug'ına göre) + alan yedeği
 *
 * getGameDisplay(oyun_turu) => { name, emoji }
 * oyun_turu ister slug ('miktar-avcisi') ister görünen ad ('Onluk Çerçeve') olsun
 * dahili olarak normalize edilir.
 */

import { getMaarif } from '../constants/maarifMap';

export const normalizeOyunTuru = (name: string): string => {
    if (!name) return 'bilinmeyen-oyun';
    return name.toLowerCase().trim()
        .replace(/_/g, '-')
        .replace(/\s+/g, '-')
        .replace(/ı/g, 'i').replace(/İ/g, 'i')
        .replace(/ş/g, 's').replace(/Ş/g, 's')
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/Ü/g, 'u')
        .replace(/ö/g, 'o').replace(/Ö/g, 'o')
        .replace(/ç/g, 'c').replace(/Ç/g, 'c');
};

// Alanına göre yedek emoji (oyun özel emojisi yoksa)
const AREA_EMOJI: Record<string, string> = {
    'Matematik': '🔢', 'Fen': '🔬', 'Türkçe': '📖', 'Müzik': '🎵',
    'Sanat': '🎨', 'Sağlık': '🏃', 'Hareket': '🏃', 'Sosyal': '🤝', 'Sosyal-Duygusal': '💛',
};

// Oyun özel emoji (DB oyun_turu slug'ına göre) — tek kaynak
const GAME_EMOJI: Record<string, string> = {
    'miktar-avcisi': '🎯', 'miktar-karsilastirma': '🎯', 'golge-dedektifi': '🔍', 'sihirli-tuval': '🎨',
    'uzay-bloklari': '🌌', 'yapboz': '🧩', 'hafiza': '🃏', 'eslestirme': '🃏',
    'onluk-cerceve': '🧮', 'tarti-dengesi': '⚖️', 'rakam-yazma': '✏️', 'yaratici-cizim': '🖍️',
    'duygu-yuzleri': '😊', 'sayi-komsulari': '🔗', 'sayilari-birlestir': '🔗', 'diziyi-tamamla': '🔁',
    'sihirli-siseler': '✨', 'ceviz-macera': '🌰', 'aile-sepeti': '🧺', 'aile-sepeti-macerasi': '🧺',
    'bunu-soyle': '🗣️', 'renk-sepetleri': '🌈', 'zitlari-eslestir': '↔️', 'sekil-treni': '🚂',
    'ayi-ailesi': '🐻', 'ciftlikte-sayalim': '🐔', 'ayni-farkli': '🔎', 'hangisi-farkli': '🧐',
    'sayi-boya': '🖌️', 'sayi-boya-2': '🖌️', 'kutuyu-bul': '📦', 'gruplama': '🗂️', 'siralama': '📊',
    'kodlama': '🤖', 'eksik-sayi-bul': '❓', 'mutfak-dedektifi': '🍳', 'renkli-baglantalar': '🔀',
    // Temalı varyantlar
    'rakam-yazma-2': '🔟', 'hafiza-2': '🐾', 'eksik-sayi-bul-2': '❔', 'miktar-avcisi-2': '🐟',
    'diziyi-tamamla-2': '✨', 'golge-dedektifi-2': '🔦', 'onluk-cerceve-2': '⭐',
    // Adaptif oyunlar
    'akilli-sayi-avi': '🔢', 'akilli-miktar': '⚖️', 'akilli-oruntu': '🔵',
    'akilli-eksik-sayi': '❓', 'akilli-siralama': '📊', 'akilli-toplama': '➕', 'akilli-farkli': '🔎',
    'akilli-cikarma': '➖', 'akilli-hafiza': '🧠',
};

export interface GameDisplay {
    name: string;
    emoji: string;
}

export function getGameDisplay(oyunTuru: string): GameDisplay {
    const key = normalizeOyunTuru(oyunTuru);
    const m = getMaarif(key);
    const name = m.displayName || (oyunTuru || 'Oyun').replace(/-/g, ' ');
    const emoji = GAME_EMOJI[key] || AREA_EMOJI[m.badgeAlan || m.alan] || '🎮';
    return { name, emoji };
}
