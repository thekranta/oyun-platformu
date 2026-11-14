/**
 * Web (ve platform dosyası olmayan her yer) için boş: yedek emoji resimleri yalnız Android'de (lib/emojiFallbackInstall.native.ts)
 * kullanılır. Web tarayıcıları kendi emoji yazı tipini kullanır; `react-native/Libraries/...` derin içe aktarımı web paketine girmesin
 * diye yama ayrı bir `.native.ts` dosyasındadır.
 */
export function installEmojiFallback(): boolean {
    return false;
}
