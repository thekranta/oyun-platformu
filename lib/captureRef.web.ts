/**
 * captureRef'in WEB karşılığı (Metro `.web.ts` dosyasına öncelik verir). react-native-view-shot web'de html2canvas'a
 * dayanır (~196 KB ham) ve bu uygulamada web'de KULLANILMAZ: çizim oyunları web'de html-to-image ile kaydeder
 * (`Platform.OS === 'web'` dalı), captureRef yalnız native dalda çağrılır. Oyunlar kütüphaneyi doğrudan içe alınca
 * 13 oyun parçasının ortak bağımlılığı olduğu için html2canvas, herkesin ilk açılışta indirdiği ortak parçaya
 * (__common) giriyordu. Native için captureRef.ts geçerlidir (lib/captureRef.parity.test.ts yüzeyi sınar).
 */
export async function captureRef(..._args: unknown[]): Promise<string> {
    throw new Error('captureRef web’de kullanılamaz; çizim oyunları web’de html-to-image ile kaydeder.');
}
