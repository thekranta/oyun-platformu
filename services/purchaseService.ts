/**
 * RevenueCat (StoreKit/Play Billing) sarmalayıcısı — yalnızca native (iOS/Android).
 * Web'de paket satışı hâlâ childhoodtech.com/#pricing üzerinden yapılıyor (bkz.
 * ToyRoom/VeliDashboard/TeacherDashboard), bu dosya o akışa dokunmaz.
 *
 * KURULUM (App Store/Play Console hesapları açıldıktan sonra, "2. Adım"):
 *  1) RevenueCat dashboard'unda proje oluştur, iOS ve Android için ayrı API key al.
 *  2) EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY'i EAS env'e ekle.
 *  3) RevenueCat'te entitlement kimlikleri TAM OLARAK VeliTier/OgretmenTier string'leriyle
 *     eşleşmeli: 'tohum' | 'filiz' | 'fidan' | 'orman' (veli), 'cinar' | 'mese' (öğretmen).
 *  4) Offering'leri 'veli' ve 'ogretmen' kimlikleriyle oluştur (getVeliOffering/
 *     getOgretmenOffering bu kimlikleri arar, yoksa current offering'e düşer).
 *  5) api/revenuecat-webhook.ts'i RevenueCat webhook URL'i olarak tanımla (REVENUECAT_WEBHOOK_SECRET).
 *
 * API anahtarları tanımlı değilse (henüz kurulmadıysa) isPurchasesAvailable() false döner;
 * ekran bunu "yakında" mesajıyla karşılar, çökme olmaz.
 */
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PURCHASES_ERROR_CODE,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

// NOT: web paketine bu dosya GİRMEZ — Metro web'de purchaseService.web.ts'i seçer (react-native-purchases
// tarayıcıda ~1,2 MB tutuyordu). Buraya dışa aktarım ekleyince web dosyasına da ekle; parity testi sınar.
export { activeOgretmenTierFromCustomerInfo, activeVeliTierFromCustomerInfo } from './purchaseTiers';

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

let configuredForUser: string | null = null;

function currentApiKey(): string | undefined {
  if (Platform.OS === 'ios') return IOS_API_KEY;
  if (Platform.OS === 'android') return ANDROID_API_KEY;
  return undefined;
}

/** API anahtarı tanımlı mı (RevenueCat kurulumu tamamlandı mı) — web'de her zaman false. */
export function isPurchasesAvailable(): boolean {
  return Platform.OS !== 'web' && !!currentApiKey();
}

/** appUserID olarak kullanıcının e-postasını kullanıyoruz — profiles/teachers tablolarındaki
 * mevcut arama anahtarı da e-posta (bkz. lib/owner/packageAssignment.ts), webhook tarafında
 * ek bir eşleme tablosuna gerek kalmıyor. */
export function initPurchases(email: string): void {
  if (!isPurchasesAvailable() || !email) return;
  if (configuredForUser === email) return;
  const apiKey = currentApiKey()!;
  Purchases.configure({ apiKey, appUserID: email });
  configuredForUser = email;
}

export async function getVeliOffering(): Promise<PurchasesOffering | null> {
  if (!isPurchasesAvailable()) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.all['veli'] ?? offerings.current ?? null;
}

export async function getOgretmenOffering(): Promise<PurchasesOffering | null> {
  if (!isPurchasesAvailable()) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.all['ogretmen'] ?? null;
}

export type PurchaseResult =
  | { ok: true; customerInfo: CustomerInfo }
  | { ok: false; cancelled: boolean; message?: string };

export async function purchase(pkg: PurchasesPackage): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { ok: true, customerInfo };
  } catch (e: any) {
    const cancelled = e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
    return { ok: false, cancelled, message: cancelled ? undefined : (e?.message || 'Satın alma sırasında bir hata oluştu.') };
  }
}

export async function restore(): Promise<CustomerInfo | null> {
  if (!isPurchasesAvailable()) return null;
  return Purchases.restorePurchases();
}
