import { apiUrl } from './apiBase';
import { supabase } from './supabase';

/**
 * Web ödeme (İyzico, tek seferlik) — İSTEMCİ tarafı. Yalnız web ekranları (app/odeme.tsx, app/odeme-sonuc.tsx) kullanır;
 * mobilde bu rotalar boş döner (Apple 3.1.1: uygulama içinde web fiyatı/satın alma bağlantısı olmaz).
 *
 * Sunucu sözleşmesi:
 *   POST /api/iyzico-baslat  { paket, alici }  → { siparisId, odemeUrl }   (Bearer jeton)
 *   GET  /api/iyzico-durum?siparis=<id>         → { durum, paket?, bitis? } (Bearer jeton)
 * Fiyat istemciden ASLA gönderilmez: yalnız paket kimliği gider, tutar sunucudaki tablodan (api/_lib/webPaketler.ts) gelir.
 * Aşağıdaki fiyatlar yalnız EKRANDA GÖSTERMEK içindir ve sunucu tablosuyla aynı olmalıdır (PRICING.md).
 */

export type WebPaketId = 'tohum' | 'filiz' | 'fidan' | 'orman';

export interface WebPaketBilgi {
    id: WebPaketId;
    sureAy: number;
    /** TL, tam sayı (görüntü içindir). */
    fiyat: number;
}

// Fiyatlar KDV DAHİLDİR (kullanıcı kararı 2026-11-23; oran ve mükellefiyet mali müşavirce teyit edilecek). Ekranda "KDV dahil" yazılır.
export const WEB_PAKET_LISTESI: readonly WebPaketBilgi[] = [
    { id: 'tohum', sureAy: 1, fiyat: 399 },
    { id: 'filiz', sureAy: 3, fiyat: 999 },
    { id: 'fidan', sureAy: 6, fiyat: 1749 },
    { id: 'orman', sureAy: 12, fiyat: 2899 },
];

export function isWebPaketId(deger: unknown): deger is WebPaketId {
    return WEB_PAKET_LISTESI.some((p) => p.id === deger);
}

/** Destek adresi (hesap silme ekranındakiyle aynı). Metinlere {{email}} olarak girer; çeviri dosyalarında alan adı geçmez. */
export const DESTEK_EPOSTA = 'admin@childhoodtech.com';

/**
 * Ön Bilgilendirme ve Mesafeli Satış Sözleşmesi sayfasının adresi.
 * TODO: Sözleşme sayfası yayına girince https adresini buraya yazın. Boşken ÖDEME KAPALIDIR (sozlesmeHazirMi): veli
 * okuyamadığı sözleşmeyi onaylamasın; ekranda bunu açıklayan bir not görünür.
 */
export const MESAFELI_SATIS_URL = 'https://childhoodtech.com/mesafeli-satis-sozlesmesi.html';

/** 1749 → "₺1.749" (tr) / "₺1,749" (en). Intl'e bağlı değil: sunucu/tarayıcı farkı olmaz. */
export function fiyatMetni(fiyat: number, dil: string = 'tr'): string {
    const ayirici = dil.toLowerCase().startsWith('en') ? ',' : '.';
    return '₺' + String(Math.round(fiyat)).replace(/\B(?=(\d{3})+(?!\d))/g, ayirici);
}

/** ISO tarihini "19 Kasım 2026" / "November 19, 2026" biçimine çevirir; geçersizse null. */
export function bitisMetni(iso: string | null | undefined, dil: string = 'tr'): string | null {
    if (!iso) return null;
    const tarih = new Date(iso);
    if (Number.isNaN(tarih.getTime())) return null;
    try {
        return tarih.toLocaleDateString(dil.toLowerCase().startsWith('en') ? 'en-US' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return null;
    }
}

// ─── Alıcı formu ────────────────────────────────────────────────────────────────────────

export interface AliciFormu {
    ad: string;
    soyad: string;
    telefon: string;
    tckn: string;
    adres: string;
    sehir: string;
}

export type AliciAlani = keyof AliciFormu;
export type AliciHatasi = { alan: AliciAlani; neden: 'bos' | 'gecersiz' };

/** Sunucuya giden alıcı (TCKN isteğe bağlı: boşsa alan hiç gönderilmez). */
export interface AliciGonderim {
    ad: string;
    soyad: string;
    telefon: string;
    tckn?: string;
    adres: string;
    sehir: string;
}

export const BOS_ALICI: AliciFormu = { ad: '', soyad: '', telefon: '', tckn: '', adres: '', sehir: '' };

/** Cep telefonunu +905XXXXXXXXX biçimine getirir (0532…, 532…, +90 532…, 90532… kabul); olmuyorsa null. */
export function telefonuNormallestir(girdi: string): string | null {
    const rakamlar = girdi.replace(/[\s\-().]/g, '');
    const m = rakamlar.match(/^(?:\+?90|0)?(5\d{9})$/);
    return m ? '+90' + m[1] : null;
}

/**
 * T.C. kimlik numarası: BASİT biçim denetimi (11 hane, ilk hane 0 değil). Sunucudaki tcknGecerli (api/iyzico-baslat.ts)
 * ile AYNI kural: sunucu sıkı, istemci gevşek olursa form geçer ama sunucu alan belirtmeyen gecersiz_alici döner.
 * Sağlama basamağı BİLEREK denetlenmez: İyzico belgesindeki sandbox örnek numarası (74300864791) sağlama kuralına uymaz.
 * Gerçek doğrulamayı İyzico yapar. Kural değişirse iki dosya birlikte güncellenmeli (test sunucuyla karşılaştırır).
 */
export function tcknGecerliMi(deger: string): boolean {
    return /^[1-9]\d{10}$/.test(deger);
}

/** Sunucuyla aynı temizlik: kontrol karakterleri ve ardışık boşluklar tek boşluğa iner. */
function bosluklariDuzelt(girdi: string): string {
    return girdi.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Ad, soyad ve şehir: 2-60 karakter (sunucudaki sınırla aynı; sunucu bunun içinde kalır). */
function isimGecerliMi(deger: string): boolean {
    return deger.length >= 2 && deger.length <= 60;
}

/**
 * Ödeme düğmesi açılabilir mi? Ön Bilgilendirme ve Mesafeli Satış Sözleşmesi'nin okunabileceği bir adres yazılmadan
 * veli bu sözleşmeyi onaylatılmaz (hukuki risk): adres boşken ödeme KAPALIDIR.
 */
export function sozlesmeHazirMi(url: string = MESAFELI_SATIS_URL): boolean {
    return /^https:\/\//i.test(url.trim());
}

/** Formu doğrular; ilk hatalı alanı döndürür (ekran o alanı vurgular ve kullanıcıya söyler). */
export function aliciyiDogrula(form: AliciFormu): { ok: true; alici: AliciGonderim } | { ok: false; hata: AliciHatasi } {
    const ad = bosluklariDuzelt(form.ad);
    const soyad = bosluklariDuzelt(form.soyad);
    const adres = bosluklariDuzelt(form.adres);
    const sehir = bosluklariDuzelt(form.sehir);
    const tckn = form.tckn.replace(/\s/g, '');

    if (!ad) return { ok: false, hata: { alan: 'ad', neden: 'bos' } };
    if (!isimGecerliMi(ad)) return { ok: false, hata: { alan: 'ad', neden: 'gecersiz' } };
    if (!soyad) return { ok: false, hata: { alan: 'soyad', neden: 'bos' } };
    if (!isimGecerliMi(soyad)) return { ok: false, hata: { alan: 'soyad', neden: 'gecersiz' } };
    if (!form.telefon.trim()) return { ok: false, hata: { alan: 'telefon', neden: 'bos' } };
    const telefon = telefonuNormallestir(form.telefon);
    if (!telefon) return { ok: false, hata: { alan: 'telefon', neden: 'gecersiz' } };
    if (tckn && !tcknGecerliMi(tckn)) return { ok: false, hata: { alan: 'tckn', neden: 'gecersiz' } };
    if (!adres) return { ok: false, hata: { alan: 'adres', neden: 'bos' } };
    if (adres.length < 10 || adres.length > 250) return { ok: false, hata: { alan: 'adres', neden: 'gecersiz' } };
    if (!sehir) return { ok: false, hata: { alan: 'sehir', neden: 'bos' } };
    if (!isimGecerliMi(sehir)) return { ok: false, hata: { alan: 'sehir', neden: 'gecersiz' } };

    const alici: AliciGonderim = { ad, soyad, telefon, adres, sehir };
    if (tckn) alici.tckn = tckn;
    return { ok: true, alici };
}

// ─── Hata kodları ───────────────────────────────────────────────────────────────────────

/** Sunucunun döndürdüğü kodlar + istemci tarafı iki kod (ag_hatasi, genel). Çeviri anahtarı: webOdeme.hata.<kod> */
export const ODEME_HATA_KODLARI = [
    'giris_gerekli',
    'gecersiz_paket',
    'gecersiz_alici',
    'daha_yuksek_paket_var',
    'profil_yok',
    'odeme_yapilandirilmadi',
    'saglayici_hatasi',
    'cok_istek',
    'ag_hatasi',
    'genel',
] as const;

export type OdemeHataKodu = (typeof ODEME_HATA_KODLARI)[number];

/** Bilinmeyen/boş kod "genel"e düşer: kullanıcıya ham sunucu metni ASLA gösterilmez. */
export function hataKodunuNormallestir(kod: unknown): OdemeHataKodu {
    return (ODEME_HATA_KODLARI as readonly string[]).includes(kod as string) ? (kod as OdemeHataKodu) : 'genel';
}

export function odemeHataAnahtari(kod: unknown): string {
    return `webOdeme.hata.${hataKodunuNormallestir(kod)}`;
}

/** Gövdede kod yoksa (ör. Vercel'in kendi 429/502 yanıtı) HTTP durumundan türetir. */
export function hataKoduYanittan(status: number, govde: { hata?: unknown } | null): OdemeHataKodu {
    const kod = hataKodunuNormallestir(govde?.hata);
    if (kod !== 'genel') return kod;
    if (status === 401) return 'giris_gerekli';
    if (status === 429) return 'cok_istek';
    if (status === 503) return 'odeme_yapilandirilmadi';
    if (status === 502 || status === 504) return 'saglayici_hatasi';
    return 'genel';
}

// ─── Sunucu istekleri ───────────────────────────────────────────────────────────────────

export type BaslatSonucu = { ok: true; siparisId: string; odemeUrl: string } | { ok: false; kod: OdemeHataKodu };

export type SiparisDurumu = 'beklemede' | 'odendi' | 'basarisiz' | 'atama_bekliyor';
export type DurumSonucu = { ok: true; durum: SiparisDurumu; paket?: string; bitis?: string | null } | { ok: false; kod: OdemeHataKodu };

const DURUMLAR: readonly SiparisDurumu[] = ['beklemede', 'odendi', 'basarisiz', 'atama_bekliyor'];

async function erisimJetonu(): Promise<string | null> {
    try {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
    } catch {
        return null;
    }
}

/** Ödemeyi başlatır. Tarayıcı dönen odemeUrl'e (İyzico'nun barındırdığı sayfa) gider; kart bilgisi bizden geçmez. */
export async function odemeBaslat(paket: WebPaketId, alici: AliciGonderim): Promise<BaslatSonucu> {
    const jeton = await erisimJetonu();
    if (!jeton) return { ok: false, kod: 'giris_gerekli' };
    let yanit: Response;
    try {
        yanit = await fetch(apiUrl('/api/iyzico-baslat'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
            // Yalnız paket kimliği + alıcı: tutar/süre sunucuda belirlenir.
            body: JSON.stringify({ paket, alici }),
        });
    } catch {
        return { ok: false, kod: 'ag_hatasi' };
    }
    const govde = (await yanit.json().catch(() => null)) as { siparisId?: unknown; odemeUrl?: unknown; hata?: unknown } | null;
    if (!yanit.ok) return { ok: false, kod: hataKoduYanittan(yanit.status, govde) };
    // Yönlendirilecek adres yalnız https olabilir (bozuk/yanlış yanıt tarayıcıyı başka yere atmasın).
    if (typeof govde?.siparisId !== 'string' || typeof govde.odemeUrl !== 'string' || !/^https:\/\//i.test(govde.odemeUrl)) {
        return { ok: false, kod: 'saglayici_hatasi' };
    }
    return { ok: true, siparisId: govde.siparisId, odemeUrl: govde.odemeUrl };
}

/** Siparişin durumunu sorar (sunucu gerekirse İyzico'dan yeniden doğrular). Yalnız siparişin sahibi görebilir. */
export async function durumSorgula(siparisId: string): Promise<DurumSonucu> {
    const jeton = await erisimJetonu();
    if (!jeton) return { ok: false, kod: 'giris_gerekli' };
    let yanit: Response;
    try {
        yanit = await fetch(apiUrl(`/api/iyzico-durum?siparis=${encodeURIComponent(siparisId)}`), {
            headers: { Authorization: `Bearer ${jeton}` },
        });
    } catch {
        return { ok: false, kod: 'ag_hatasi' };
    }
    const govde = (await yanit.json().catch(() => null)) as { durum?: unknown; paket?: unknown; bitis?: unknown; hata?: unknown } | null;
    if (!yanit.ok) return { ok: false, kod: hataKoduYanittan(yanit.status, govde) };
    if (!DURUMLAR.includes(govde?.durum as SiparisDurumu)) return { ok: false, kod: 'genel' };
    return {
        ok: true,
        durum: govde!.durum as SiparisDurumu,
        paket: typeof govde!.paket === 'string' ? govde!.paket : undefined,
        bitis: typeof govde!.bitis === 'string' ? govde!.bitis : null,
    };
}

// ─── Durum bekleme (sınırlı yeniden deneme) ─────────────────────────────────────────────

export const DURUM_ARALIK_MS = 3000;
export const DURUM_EN_COK_DENEME = 10;

export interface BeklemeSonucu {
    /** Son alınan sunucu yanıtı; hiç yanıt alınamadıysa null. */
    son: DurumSonucu | null;
    /** Sınır dolduğunda sipariş hâlâ kesinleşmemişse true. */
    zamanAsimi: boolean;
}

/** Sipariş kesinleşti mi (başarı ya da başarısızlık)? 'beklemede' ve 'atama_bekliyor' henüz kesin değildir. */
export function durumKesinMi(durum: SiparisDurumu): boolean {
    return durum === 'odendi' || durum === 'basarisiz';
}

/**
 * Sipariş kesinleşene kadar sınırlı sayıda (varsayılan 10) ve aralıkla (varsayılan 3 sn) sorar.
 * Ağ/sunucu hatası tek başına bırakmaz (sonraki denemede düzelebilir); yalnız oturum yoksa (giris_gerekli) hemen durur.
 * `iptal` ekran kapanınca true döner; bekleme sessizce biter. Bekleme/sorgu işlevleri teste enjekte edilir.
 */
export async function durumuBekle(
    siparisId: string,
    secenek: {
        sorgu?: (id: string) => Promise<DurumSonucu>;
        bekle?: (ms: number) => Promise<void>;
        aralikMs?: number;
        enCok?: number;
        iptal?: () => boolean;
        /** Her yanıtta çağrılır (ekran "sorgulanıyor"dan ara durumlara geçebilsin). */
        ara?: (sonuc: DurumSonucu, deneme: number) => void;
    } = {},
): Promise<BeklemeSonucu> {
    const sorgu = secenek.sorgu ?? durumSorgula;
    const bekle = secenek.bekle ?? ((ms: number) => new Promise<void>((coz) => setTimeout(coz, ms)));
    const aralik = secenek.aralikMs ?? DURUM_ARALIK_MS;
    const enCok = secenek.enCok ?? DURUM_EN_COK_DENEME;

    let son: DurumSonucu | null = null;
    for (let deneme = 1; deneme <= enCok; deneme++) {
        if (secenek.iptal?.()) return { son, zamanAsimi: false };
        son = await sorgu(siparisId);
        if (secenek.iptal?.()) return { son, zamanAsimi: false };
        secenek.ara?.(son, deneme);
        if (son.ok && durumKesinMi(son.durum)) return { son, zamanAsimi: false };
        if (!son.ok && son.kod === 'giris_gerekli') return { son, zamanAsimi: false };
        if (deneme < enCok) await bekle(aralik);
    }
    return { son, zamanAsimi: true };
}

// ─── Sonuç ekranı ───────────────────────────────────────────────────────────────────────

export type SonucEkrani = 'yukleniyor' | 'basarili' | 'basarisiz' | 'atama' | 'bekliyor' | 'giris' | 'hata';

/** Sunucu yanıtını (ve zaman aşımını) tek bir ekran durumuna çevirir; URL'deki "durum" parametresine güvenilmez. */
export function sonucEkraniniSec(sonuc: DurumSonucu | null, zamanAsimi: boolean): SonucEkrani {
    if (!sonuc) return zamanAsimi ? 'hata' : 'yukleniyor';
    if (!sonuc.ok) {
        if (sonuc.kod === 'giris_gerekli') return 'giris';
        return zamanAsimi ? 'hata' : 'yukleniyor';
    }
    if (sonuc.durum === 'odendi') return 'basarili';
    if (sonuc.durum === 'basarisiz') return 'basarisiz';
    if (sonuc.durum === 'atama_bekliyor') return zamanAsimi ? 'atama' : 'yukleniyor';
    return zamanAsimi ? 'bekliyor' : 'yukleniyor';
}
