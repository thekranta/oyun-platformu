/**
 * Web (İyzico) tek seferlik satın almasında veli paketinin yeni değerleri — SAF mantık (veritabanı yok, test edilir).
 *
 * NEDEN ayrı dosya: "para alındı, paket ne olmalı?" kararı api/_lib/webSiparis.ts içinde veritabanı yazımıyla
 * karışırsa ay sonu / uzatma / yükseltme kuralları test edilemez. Burada yalnız hesap yapılır.
 *
 * KURALLAR (bu sürüm):
 *  - Aynı paket hâlâ geçerli  -> mevcut BİTİŞTEN uzatılır (takvim ayı; 31 Ocak + 1 ay = 28/29 Şubat, Mart'a taşmaz).
 *  - Aynı paket süresiz (bitiş NULL; owner elle atamış) -> süresiz korunur, kısaltılmaz.
 *  - Daha yüksek paket       -> ŞİMDİDEN başlar. Eski paketin kalan süresi bu sürümde yok sayılır
 *                               (oransal mahsup yok; ileride gerekirse burada hesaplanır).
 *  - Süresi dolmuş / paket yok / free -> şimdiden başlar.
 *  - Hâlâ geçerli DAHA YÜKSEK paket varken daha düşük paket -> 'engel'. Bu durum ödemeden ÖNCE
 *    hasHigherActivePackage ile engellenir; buraya yine de gelirse (yarış) paket düşürülmez, sipariş
 *    atama_bekliyor kalır ve elle çözülür.
 *
 * Paket sırası api/_lib/revenuecatExpiry.ts (TIER_RANK) ve lib/paywall.ts (VELI_ORDER) ile aynıdır:
 * tohum < filiz < fidan < orman. Düşürme kontrolü oradaki wouldDowngradeActivePackage ile YENİDEN KULLANILIR.
 */
import { wouldDowngradeActivePackage } from './revenuecatExpiry';

export const WEB_VELI_PAKETLERI = ['tohum', 'filiz', 'fidan', 'orman'] as const;
export type WebVeliPaket = (typeof WEB_VELI_PAKETLERI)[number];

export function isWebVeliPaket(x: unknown): x is WebVeliPaket {
    return typeof x === 'string' && (WEB_VELI_PAKETLERI as readonly string[]).includes(x);
}

/**
 * Takvim ayı ekler, gün taşmasını SON GÜNE kırpar (UTC). revenuecatExpiry.addMonths 31 Ocak + 1 ay'ı 3 Mart'a
 * taşırır; ödenen paket için bu, takvim dışı fazladan gün demektir. Saat/dakika korunur.
 */
export function addCalendarMonths(from: Date, months: number): Date {
    const y = from.getUTCFullYear();
    const m = from.getUTCMonth() + months;
    const sonGun = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const gun = Math.min(from.getUTCDate(), sonGun);
    return new Date(Date.UTC(y, m, gun, from.getUTCHours(), from.getUTCMinutes(), from.getUTCSeconds(), from.getUTCMilliseconds()));
}

export interface MevcutPaket {
    tier: string | null | undefined;
    startedAt?: string | null;
    expiresAt: string | null | undefined;
}

export type AtamaKurali = 'yeni' | 'uzatma' | 'yukseltme' | 'suresiz_korundu';

export type AtamaSonucu =
    | { engel: false; kural: AtamaKurali; tier: WebVeliPaket; startedAt: string; expiresAt: string | null }
    | { engel: true; neden: 'daha_yuksek_paket_var' };

/** Paket şu an geçerli mi? free/boş geçersiz; bitiş NULL ise süresiz geçerli; bitiş gelecekteyse geçerli. */
export function paketGecerli(tier: unknown, expiresAt: unknown, now: Date): boolean {
    if (typeof tier !== 'string' || tier === '' || tier === 'free') return false;
    if (expiresAt === null || expiresAt === undefined || expiresAt === '') return true;
    const t = Date.parse(String(expiresAt));
    return Number.isFinite(t) && t > now.getTime();
}

/** Hâlâ geçerli daha yüksek bir paket satın alınanı ezilmekten korur mu? (ödeme öncesi engel) */
export function dahaYuksekGecerliPaketVar(mevcut: MevcutPaket, paket: WebVeliPaket, now: Date = new Date()): boolean {
    return wouldDowngradeActivePackage(mevcut.tier, mevcut.expiresAt, paket, now);
}

export function yeniPaketHesapla(mevcut: MevcutPaket | null, paket: WebVeliPaket, sureAy: number, now: Date = new Date()): AtamaSonucu {
    if (!Number.isInteger(sureAy) || sureAy < 1 || sureAy > 24) throw new Error('gecersiz_sure');
    const simdi = now.toISOString();
    const yeniden = (kural: AtamaKurali): AtamaSonucu => ({
        engel: false, kural, tier: paket, startedAt: simdi, expiresAt: addCalendarMonths(now, sureAy).toISOString(),
    });

    if (!mevcut || !paketGecerli(mevcut.tier, mevcut.expiresAt, now)) return yeniden('yeni');
    if (dahaYuksekGecerliPaketVar(mevcut, paket, now)) return { engel: true, neden: 'daha_yuksek_paket_var' };

    if (mevcut.tier === paket) {
        const baslangic = mevcut.startedAt && Number.isFinite(Date.parse(mevcut.startedAt)) ? mevcut.startedAt : simdi;
        if (mevcut.expiresAt === null || mevcut.expiresAt === undefined || mevcut.expiresAt === '') {
            return { engel: false, kural: 'suresiz_korundu', tier: paket, startedAt: baslangic, expiresAt: null };
        }
        const bitis = new Date(Date.parse(mevcut.expiresAt));
        return { engel: false, kural: 'uzatma', tier: paket, startedAt: baslangic, expiresAt: addCalendarMonths(bitis, sureAy).toISOString() };
    }
    // Geçerli ama farklı ve (düşürme değilse) daha yüksek paket: kalan süre yok sayılır.
    return yeniden('yukseltme');
}
