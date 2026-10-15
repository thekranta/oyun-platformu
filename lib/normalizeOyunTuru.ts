// Oyun skoru kaydındaki oyun adını (oyun_turu) karşılaştırılabilir anahtara çevirir ("Çiftini Bul!" -> "ciftini-bul!").
// constants/maarifMap.ts ve lib/gameDisplay.ts bunu kullanır; ayrı dosyada olması döngüsel içe aktarmayı önler.

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
