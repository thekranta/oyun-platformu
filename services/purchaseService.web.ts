/**
 * purchaseService'in WEB karşılığı (Metro `.web.ts` dosyasına öncelik verir). Web'de paket satışı
 * RevenueCat ile değil childhoodtech.com/#pricing üzerinden yapılır; gerçek dosyada da
 * isPurchasesAvailable() web'de hep false'tu. Gerçek dosya react-native-purchases'ı içe aldığı için
 * web paketine ~1,2 MB (ham) ekliyordu (RevenueCat'in tarayıcı SDK'sı) ve ilk açılışı geciktiriyordu.
 * Burada SDK HİÇ içe alınmaz; yüzey native ile aynıdır (services/purchaseService.parity.test.ts sınar).
 */
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

export { activeOgretmenTierFromCustomerInfo, activeVeliTierFromCustomerInfo } from './purchaseTiers';

export type PurchaseResult =
  | { ok: true; customerInfo: CustomerInfo }
  | { ok: false; cancelled: boolean; message?: string };

export function isPurchasesAvailable(): boolean {
  return false;
}

export function initPurchases(_email: string): void {}

export async function getVeliOffering(): Promise<PurchasesOffering | null> {
  return null;
}

export async function getOgretmenOffering(): Promise<PurchasesOffering | null> {
  return null;
}

export async function purchase(_pkg: PurchasesPackage): Promise<PurchaseResult> {
  return { ok: false, cancelled: false, message: 'Mağaza satın alımı web sürümünde kullanılamaz.' };
}

export async function restore(): Promise<CustomerInfo | null> {
  return null;
}
