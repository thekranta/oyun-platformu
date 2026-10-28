/**
 * Web açılış perdesi (public/index.html içindeki #boot-splash): ana JS paketi (~1,3 MB) inip çalışana kadar boş ekran
 * yerine maskot + "Yükleniyor" gösterir. Uygulama ilk gerçek ekranını çizince (app/_layout.tsx) bu fonksiyon perdeyi
 * kaldırır. Perdenin kendi güvenlik ağı da var (şablondaki komut dosyası): #root dolduktan 5 sn sonra kendiliğinden
 * kalkar, 8 sn'de "bağlantı yavaş" der, 25 sn'de ya da komut dosyası yüklenemezse "Yenile" düğmesi çıkar.
 * Native'de ve perde yoksa (ör. şablon özelleştirilmediyse) hiçbir şey yapmaz.
 */
export function hideBootSplash(): void {
    if (typeof document === 'undefined') return;
    // Şablondaki komut dosyası yumuşak kaybolma (opaklık) yapar; o çalışmadıysa (ör. engellendiyse) öğe doğrudan sökülür.
    const hide = (window as unknown as { __bootSplashHide?: () => void }).__bootSplashHide;
    if (typeof hide === 'function') {
        hide();
        return;
    }
    document.getElementById('boot-splash')?.remove();
}
