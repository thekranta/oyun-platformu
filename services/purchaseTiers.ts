/**
 * RevenueCat müşteri bilgisinden paket (tier) çıkaran SAF işlevler. react-native-purchases'ı
 * çalışma zamanında İÇE ALMAZ (yalnız tür), bu yüzden hem native purchaseService.ts hem de
 * web karşılığı purchaseService.web.ts bu dosyayı paylaşır.
 */
import type { CustomerInfo } from 'react-native-purchases';
import type { OgretmenTier, VeliTier } from '../lib/subscriptionTiers';

// En yüksekten en düşüğe: entitlements.active içinde birden fazlası varsa en üsttekini seçeriz.
const VELI_TIERS_DESC: VeliTier[] = ['orman', 'fidan', 'filiz', 'tohum'];
const OGRETMEN_TIERS_DESC: OgretmenTier[] = ['mese', 'cinar'];

export function activeVeliTierFromCustomerInfo(info: CustomerInfo): VeliTier | null {
  for (const tier of VELI_TIERS_DESC) {
    if (info.entitlements.active[tier]) return tier;
  }
  return null;
}

export function activeOgretmenTierFromCustomerInfo(info: CustomerInfo): OgretmenTier | null {
  for (const tier of OGRETMEN_TIERS_DESC) {
    if (info.entitlements.active[tier]) return tier;
  }
  return null;
}
