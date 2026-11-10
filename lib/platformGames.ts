/**
 * Mağaza sürümlerinde (iOS/Android) kapalı oyunlar. Web'de hepsi açıktır.
 *
 * 'bunu-soyle': çocuğun ses kaydını üçüncü taraf bir yapay zekâ hizmetine (OpenAI konuşma tanıma) gönderir.
 * OpenAI'ın 18 yaş altı rehberi, 13 yaş altı kişisel verisinin sıfır veri saklama (ZDR) olmadan işlenmemesini ister;
 * Google Play Aile Politikası da çocuktan toplanan mikrofon verisinin beyan edilmesini ve API/SDK uyumunu şart koşar.
 * Bu belirsizlik çözülene kadar (ZDR onayı ya da cihaz içi tanıma) mobilde oyun ve mikrofon izni YOKTUR.
 * Geri açmak için: bu kümeden çıkar, app.json'da RECORD_AUDIO ve expo-av mikrofon açıklamasını geri koy,
 * lib/storeReadiness.test.ts'i güncelle ve Data safety'de ses kaydını beyan et.
 */
export const MOBILE_DISABLED_ROUTES: ReadonlySet<string> = new Set(['bunu-soyle']);

export function isRouteDisabledOnPlatform(routeKey: string, os: string): boolean {
    return os !== 'web' && MOBILE_DISABLED_ROUTES.has(routeKey);
}
