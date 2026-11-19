/**
 * Web (İyzico) siparişleri: public.web_siparisleri tablosu + veli paketinin service_role ile açılması.
 * Tablo: supabase_migrations/add_web_siparisleri.sql (RLS açık, istemci politikası YOK: yalnız bu sunucu kodu erişir).
 *
 * DURUMLAR:
 *   olusturuldu    -> sipariş yazıldı, İyzico jetonu henüz yok
 *   beklemede      -> İyzico ödeme formu açıldı (token kayıtlı) ya da fraudStatus=0 (inceleme)
 *   atama_bekliyor -> PARA ALINDI ve kaydedildi, paket henüz profiles'a yazılamadı (yeniden denenir)
 *   odendi         -> para alındı VE paket açıldı (son durum)
 *   basarisiz      -> ödeme başarısız / iptal (doğrulanmış başarılı ödeme gelirse yine işlenir)
 *
 * NEDEN ödeme kaydı ile paket ataması AYRI: paket yazımı (tetikleyici, ağ hatası) başarısız olursa "para alındı"
 * bilgisi kaybolmasın. Önce koşullu UPDATE ile ödeme tek kazananla kaydedilir (atama_bekliyor), sonra paket yazılır.
 * Yeniden denemede ödeme tekrar kaydedilmez, YALNIZ atama tekrarlanır.
 *
 * NEDEN atama hedefi siparişe yazılıyor (atama_hedef): uzatma mevcut bitişten hesaplanır; profil yazımı tuttuğu
 * halde 'odendi' işaretlenemeden çökersek, yeniden denemede tekrar hesaplamak paketi İKİ KEZ uzatırdı. Hedef bir
 * kez (koşullu) yazılır, sonraki denemeler aynı hedefi kullanır.
 *
 * KİŞİSEL VERİ: alıcının adı, telefonu, TC kimlik numarası, adresi bu tabloya YAZILMAZ (yalnız İyzico'ya gider).
 * 'ham' alanına yalnız küçük, kart/kişi bilgisi içermeyen İyzico alanları süzülerek yazılır (kucukHam).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { dahaYuksekGecerliPaketVar, isWebVeliPaket, yeniPaketHesapla, type WebVeliPaket } from './webPaketAtama';

type Admin = SupabaseClient;

export type SiparisDurumu = 'olusturuldu' | 'beklemede' | 'odendi' | 'atama_bekliyor' | 'basarisiz';

export interface Order {
    id: string;
    /** İyzico conversationId (sözleşmedeki alanlara EK; dönüşte yanıtla eşleştirmek için). */
    conversationId: string;
    email: string;
    paket: string;
    tutarKurus: number;
    sureAy: number;
    durum: SiparisDurumu;
    token: string | null;
    iyzicoPaymentId: string | null;
    bitis: string | null;
}

export interface AliciBilgisi {
    ad?: string; soyad?: string; telefon?: string; tckn?: string; adres?: string; sehir?: string;
}

const TABLO = 'web_siparisleri';
const SUTUNLAR = 'id, conversation_id, email, paket, tutar_kurus, sure_ay, durum, token, iyzico_payment_id, atanan_bitis, atama_hedef';
const KILIT_IPUCU = 'lock_tier_columns service_role istisnasi eksik olabilir: supabase_migrations/fix_lock_tier_service_role.sql';

export class WebSiparisError extends Error {
    constructor(public kod: string, public ayrinti?: unknown) { super(kod); this.name = 'WebSiparisError'; }
}

const kucukHarf = (e: string) => e.trim().toLowerCase();

function satirdanOrder(r: any): Order {
    return {
        id: r.id,
        conversationId: r.conversation_id,
        email: r.email,
        paket: r.paket,
        tutarKurus: r.tutar_kurus,
        sureAy: r.sure_ay,
        durum: r.durum,
        token: r.token ?? null,
        iyzicoPaymentId: r.iyzico_payment_id ?? null,
        bitis: r.atanan_bitis ?? null,
    };
}

/** Bitiş zamanları aynı an mı? (veritabanı +00:00 / Z farklı biçimde döndürebilir) */
function ayniAn(a: string | null | undefined, b: string | null | undefined): boolean {
    if (a == null || b == null) return a == null && b == null;
    return Date.parse(a) === Date.parse(b);
}

/** 'ham' için güvenli alt küme: kart son haneleri/BIN, alıcı bilgisi, imza DIŞARIDA kalır. */
const HAM_IZINLI = ['paymentId', 'paymentStatus', 'fraudStatus', 'price', 'paidPrice', 'currency', 'installment',
    'conversationId', 'basketId', 'systemTime', 'status', 'errorCode', 'phase'];
export function kucukHam(ham: unknown): Record<string, unknown> | null {
    if (!ham || typeof ham !== 'object') return null;
    const out: Record<string, unknown> = {};
    for (const k of HAM_IZINLI) {
        const v = (ham as Record<string, unknown>)[k];
        if (v === undefined || v === null) continue;
        if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
        else if (typeof v === 'string') out[k] = v.slice(0, 64);
    }
    return out;
}

export async function createOrder(
    admin: Admin,
    g: { email: string; paket: string; tutarKurus: number; sureAy: number; alici?: AliciBilgisi },
): Promise<{ id: string; conversationId: string }> {
    // g.alici BİLİNÇLİ OLARAK yazılmaz (KVKK: veri en aza indirme). İmzada durması çağıranın tek nesne geçmesi içindir.
    if (!isWebVeliPaket(g.paket)) throw new WebSiparisError('gecersiz_paket');
    if (!Number.isInteger(g.tutarKurus) || g.tutarKurus <= 0 || !Number.isInteger(g.sureAy) || g.sureAy < 1) {
        throw new WebSiparisError('gecersiz_tutar');
    }
    const { data, error } = await admin.from(TABLO)
        .insert({ email: kucukHarf(g.email), paket: g.paket, tutar_kurus: g.tutarKurus, sure_ay: g.sureAy, durum: 'olusturuldu' })
        .select('id, conversation_id')
        .single();
    if (error || !data) throw new WebSiparisError('siparis_yazilamadi', error);
    return { id: (data as any).id, conversationId: (data as any).conversation_id };
}

export async function attachToken(admin: Admin, id: string, token: string): Promise<void> {
    const { error } = await admin.from(TABLO)
        .update({ token, durum: 'beklemede' })
        .eq('id', id)
        .in('durum', ['olusturuldu', 'beklemede']);
    if (error) throw new WebSiparisError('token_yazilamadi', error);
}

export async function getOrder(admin: Admin, id: string): Promise<Order | null> {
    const { data, error } = await admin.from(TABLO).select(SUTUNLAR).eq('id', id).maybeSingle();
    if (error) throw new WebSiparisError('siparis_okunamadi', error);
    return data ? satirdanOrder(data) : null;
}

export async function markFailed(admin: Admin, id: string, neden: string): Promise<void> {
    // Yalnız henüz ödenmemiş sipariş başarısız işaretlenir: para alınmış (atama_bekliyor/odendi) kayıt ASLA ezilmez.
    const { error } = await admin.from(TABLO)
        .update({ durum: 'basarisiz', hata_nedeni: String(neden || '').slice(0, 200) })
        .eq('id', id)
        .in('durum', ['olusturuldu', 'beklemede']);
    if (error) throw new WebSiparisError('durum_yazilamadi', error);
}

async function profilOku(admin: Admin, email: string) {
    const { data, error } = await admin.from('profiles')
        .select('email, subscription_tier, package_started_at, package_expires_at')
        .eq('email', kucukHarf(email))
        .limit(1);
    if (error) throw new WebSiparisError('profil_okunamadi', error);
    return (data && data[0]) || null;
}

export async function profileExists(admin: Admin, email: string): Promise<boolean> {
    return (await profilOku(admin, email)) !== null;
}

export async function hasHigherActivePackage(admin: Admin, email: string, paket: string): Promise<boolean> {
    if (!isWebVeliPaket(paket)) return false;
    const p = await profilOku(admin, email);
    if (!p) return false;
    return dahaYuksekGecerliPaketVar({ tier: p.subscription_tier, expiresAt: p.package_expires_at }, paket);
}

type Hedef = { tier: WebVeliPaket; startedAt: string; expiresAt: string | null };
type GrantSonuc = { durum: 'odendi' | 'zaten_islendi' | 'atama_bekliyor'; paket: string; bitis: string | null };

/**
 * Doğrulanmış (İyzico detail sorgusuyla) bir ödemeyi kaydeder ve paketi açar. İdempotent ve yarış-güvenli:
 *  - aynı sipariş için ilk çağrı ödemeyi kaydeder; eşzamanlı ikinci çağrı koşullu UPDATE'i kaybeder;
 *  - sipariş zaten 'odendi' ise 'zaten_islendi';
 *  - 'atama_bekliyor' ise yalnız paket ataması yeniden denenir.
 * iyzico_payment_id veritabanında UNIQUE: aynı ödeme iki siparişe yazılamaz.
 */
export async function markPaidAndGrant(
    admin: Admin,
    g: { id: string; iyzicoPaymentId: string; paidKurus: number; ham?: unknown },
): Promise<GrantSonuc> {
    const order = await getOrder(admin, g.id);
    if (!order) throw new WebSiparisError('siparis_yok');
    if (!g.iyzicoPaymentId) throw new WebSiparisError('odeme_kimligi_yok');

    if (order.durum === 'odendi') return { durum: 'zaten_islendi', paket: order.paket, bitis: order.bitis };

    if (order.durum !== 'atama_bekliyor') {
        // Eksik ödemeyle paket açılmaz (çağıran fiyatı zaten doğrular; bu ikinci kilit).
        if (!Number.isInteger(g.paidKurus) || g.paidKurus < order.tutarKurus) {
            console.error(`web-siparis: ${g.id} odenen tutar (${g.paidKurus}) siparis tutarindan (${order.tutarKurus}) dusuk; paket ACILMADI`);
            throw new WebSiparisError('tutar_uyusmuyor');
        }
        // 1) ÖDEME KAYDI — tek kazanan.
        const { data: kazanan, error } = await admin.from(TABLO)
            .update({
                durum: 'atama_bekliyor', iyzico_payment_id: g.iyzicoPaymentId, odenen_kurus: g.paidKurus,
                ham: kucukHam(g.ham), odeme_zamani: new Date().toISOString(), hata_nedeni: null,
            })
            .eq('id', g.id)
            .in('durum', ['olusturuldu', 'beklemede', 'basarisiz'])
            .select('id');
        if (error) {
            // 23505: bu iyzico_payment_id başka bir siparişte kayıtlı (aynı ödeme ikinci kez işlenmeye çalışıldı).
            if ((error as any).code === '23505') {
                console.error(`web-siparis: odeme ${g.iyzicoPaymentId} baska bir sipariste zaten kayitli; ${g.id} islenmedi`);
                return { durum: 'zaten_islendi', paket: order.paket, bitis: order.bitis };
            }
            throw new WebSiparisError('odeme_yazilamadi', error);
        }
        if (!kazanan || kazanan.length === 0) {
            // Yarışı başka çağrı kazandı: güncel duruma göre davran.
            const guncel = await getOrder(admin, g.id);
            if (!guncel) throw new WebSiparisError('siparis_yok');
            if (guncel.durum === 'odendi') return { durum: 'zaten_islendi', paket: guncel.paket, bitis: guncel.bitis };
            if (guncel.durum !== 'atama_bekliyor') throw new WebSiparisError('beklenmeyen_durum', guncel.durum);
            return paketiAta(admin, guncel);
        }
        return paketiAta(admin, { ...order, durum: 'atama_bekliyor', iyzicoPaymentId: g.iyzicoPaymentId });
    }

    if (order.iyzicoPaymentId && order.iyzicoPaymentId !== g.iyzicoPaymentId) {
        console.error(`web-siparis: ${g.id} kayitli odeme ${order.iyzicoPaymentId}, gelen ${g.iyzicoPaymentId}; yalniz atama yeniden denenir`);
    }
    return paketiAta(admin, order);
}

/** 2) PAKET ATAMASI — ödeme kaydedilmiş siparişte; başarısızsa sipariş atama_bekliyor KALIR. */
async function paketiAta(admin: Admin, order: Order): Promise<GrantSonuc> {
    const bekle = (neden: string, ayrinti?: unknown): GrantSonuc => {
        console.error(`web-siparis: PARA ALINDI AMA PAKET ACILMADI (siparis ${order.id}, ${order.email}, ${order.paket}): ${neden}`, ayrinti ?? '');
        // Neden kaydı en iyi çaba: yazılamazsa da sonuç aynı (atama_bekliyor; yeniden denenecek).
        void Promise.resolve(admin.from(TABLO).update({ hata_nedeni: neden.slice(0, 200) }).eq('id', order.id).eq('durum', 'atama_bekliyor'))
            .catch(() => undefined);
        return { durum: 'atama_bekliyor', paket: order.paket, bitis: null };
    };
    if (!isWebVeliPaket(order.paket)) return bekle('gecersiz_paket');

    let profil;
    try { profil = await profilOku(admin, order.email); } catch (e) { return bekle('profil_okunamadi', e); }
    if (!profil) return bekle('profil_yok');

    // Hedef: daha önce kaydedildiyse AYNISI (çift uzatma olmasın), yoksa hesapla ve koşullu kaydet.
    const { data: hedefSatir, error: hedefOkumaHatasi } = await admin.from(TABLO).select('atama_hedef').eq('id', order.id).maybeSingle();
    if (hedefOkumaHatasi) return bekle('hedef_okunamadi', hedefOkumaHatasi);
    let hedef: Hedef | null = (hedefSatir as any)?.atama_hedef ?? null;

    if (!hedef) {
        const hesap = yeniPaketHesapla(
            { tier: profil.subscription_tier, startedAt: profil.package_started_at, expiresAt: profil.package_expires_at },
            order.paket, order.sureAy,
        );
        if (hesap.engel) return bekle('daha_yuksek_paket_var');
        const aday: Hedef = { tier: hesap.tier, startedAt: hesap.startedAt, expiresAt: hesap.expiresAt };
        const { data: yazildi, error } = await admin.from(TABLO)
            .update({ atama_hedef: aday }).eq('id', order.id).eq('durum', 'atama_bekliyor').is('atama_hedef', null).select('atama_hedef');
        if (error) return bekle('hedef_yazilamadi', error);
        if (yazildi && yazildi.length > 0) hedef = aday;
        else {
            // Başka bir deneme hedefi önce yazdı: onunkini kullan.
            const { data: tekrar } = await admin.from(TABLO).select('atama_hedef, durum').eq('id', order.id).maybeSingle();
            if ((tekrar as any)?.durum === 'odendi') return { durum: 'zaten_islendi', paket: order.paket, bitis: (tekrar as any)?.atama_hedef?.expiresAt ?? null };
            hedef = (tekrar as any)?.atama_hedef ?? null;
            if (!hedef) return bekle('hedef_bulunamadi');
        }
    }

    // Profil zaten hedefi (ya da daha uzununu) taşıyorsa yeniden yazma: önceki deneme profili yazıp çökmüş olabilir,
    // ya da başka bir sipariş sonra uzatmış olabilir; eski hedefi yazmak süreyi KISALTIRDI.
    const zatenUygulandi = profil.subscription_tier === hedef.tier && (
        profil.package_expires_at == null
            ? true
            : hedef.expiresAt != null && Date.parse(profil.package_expires_at) >= Date.parse(hedef.expiresAt)
    );

    let bitis: string | null = hedef.expiresAt;
    if (zatenUygulandi) {
        bitis = profil.package_expires_at ?? null;
    } else {
        const { data, error } = await admin.from('profiles')
            .update({ subscription_tier: hedef.tier, package_started_at: hedef.startedAt, package_expires_at: hedef.expiresAt })
            .eq('email', order.email)
            .select('email, subscription_tier, package_expires_at');
        if (error) return bekle('profil_yazilamadi', error);
        if (!data || data.length === 0) return bekle('profil_yok');
        // GERİ OKUMA: satır dönmesi yazının tuttuğunu göstermez; lock_tier_columns değeri eski haline zorlayabilir.
        const tuttu = data.every((r: any) => r.subscription_tier === hedef!.tier && ayniAn(r.package_expires_at, hedef!.expiresAt));
        if (!tuttu) return bekle(`paket_veritabanina_yansimadi (${KILIT_IPUCU})`, data);
    }

    const { error: sonHata } = await admin.from(TABLO)
        .update({ durum: 'odendi', atama_zamani: new Date().toISOString(), atanan_bitis: bitis, hata_nedeni: null })
        .eq('id', order.id)
        .eq('durum', 'atama_bekliyor');
    if (sonHata) {
        // Paket AÇIK; yalnız sipariş durumu yazılamadı. Yeniden denemede zatenUygulandi yolu bunu sessizce kapatır.
        console.error(`web-siparis: ${order.id} paketi acildi ama siparis 'odendi' isaretlenemedi; yeniden denenecek`, sonHata);
    }
    return { durum: 'odendi', paket: hedef.tier, bitis };
}
