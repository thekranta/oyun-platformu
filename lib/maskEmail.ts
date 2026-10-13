// E-posta maskeleme (KVKK / veri minimizasyonu): veli onayı bekleyen öğrencilerin e-postası
// öğretmen panelinde tam görünmesin. SAF fonksiyon — yalnız EKRANDA gösterilecek metni üretir;
// silme/çıkarma gibi işlemler gerçek e-postayı kullanmaya devam eder.
//
//   ahmet@gmail.com        -> ah***@gm***.com
//   ali@gmail.com          -> a***@gm***.com        (kısa parça: yalnız 1 karakter görünür)
//   ayse+okul@mail.tr.com  -> ay***@ma***.com       (+etiket ve alt alan adı sızmaz)
//   boş / geçersiz         -> '' / '***'

// Kod noktası bazlı (Türkçe karakterler ve emoji bölünmesin).
const chars = (s: string) => Array.from(s);

/** 4+ karakterli parçada 2, daha kısada 1 karakter görünür; kalanı *** ile gizlenir. */
function maskPart(part: string): string {
    const cs = chars(part);
    if (cs.length === 0) return '***';
    const visible = cs.length >= 4 ? 2 : 1;
    return cs.slice(0, visible).join('') + '***';
}

export function maskEmail(email: string | null | undefined): string {
    if (typeof email !== 'string') return '';
    const value = email.trim();
    if (!value) return '';

    const at = value.lastIndexOf('@');
    if (at <= 0 || at === value.length - 1) return '***';

    const local = value.slice(0, at);
    const domain = value.slice(at + 1);

    // Alan adı: son etiket (uzantı) görünür kalır, öncesi tek parça olarak maskelenir.
    const lastDot = domain.lastIndexOf('.');
    let maskedDomain: string;
    if (lastDot <= 0 || lastDot === domain.length - 1) {
        maskedDomain = maskPart(domain);
    } else {
        maskedDomain = maskPart(domain.slice(0, lastDot)) + domain.slice(lastDot);
    }

    return `${maskPart(local)}@${maskedDomain}`;
}
