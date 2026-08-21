/**
 * İnceleme kuyruğu sorguları — mevcut `oyun_skorlari` tablosu üzerinde (ŞEMASIZ, faz 1).
 * "Bana düşen / Son oy sende / Başkasını bekliyor" gibi ekip-görünürlüğü kovaları
 * sunucu tarafında bir view/RPC gerektirir (faz 2, uzman_oylari tablosu ile); faz 1'de
 * bu ayrım BEKLEMEDE sayfasının kendisinden istemci tarafında çıkarılır — kayıt sayısı
 * (~yüzlerce) bunun için hâlâ güvenle küçük.
 */
import { supabase } from '../supabase';
import { normalizeVotes } from './flags';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export type BucketKey = 'beklemede' | 'analizYok' | 'onayli' | 'reddedildi' | 'deneme';

// Liste görünümünde İHTİYAÇ DUYULMAYAN ağır alanlar (cizim_verisi, algilanan_kelime)
// hiç çekilmez — yalnız bir kayıt seçildiğinde ikinci bir istekle alınır.
const LISTE_ALANLARI =
  'id,created_at,ogrenci_adi,ogrenci_yasi,email,oyun_turu,sure,hamle_sayisi,hata_sayisi,' +
  'zorluk_seviyesi,deneme_no,mevcut_tur,toplam_tur_sayisi,onay_durumu,uzman_oylamalari,yapay_zeka_yorumu';

export interface KuyrukKaydi {
  id: number;
  created_at: string;
  ogrenci_adi: string;
  ogrenci_yasi: number;
  email?: string;
  oyun_turu: string;
  sure?: number;
  hamle_sayisi: number;
  hata_sayisi: number;
  zorluk_seviyesi?: number;
  deneme_no?: number;
  mevcut_tur?: number;
  toplam_tur_sayisi?: number;
  onay_durumu?: 'beklemede' | 'onaylandi' | 'reddedildi';
  uzman_oylamalari?: Record<string, any>;
  yapay_zeka_yorumu?: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || SUPABASE_KEY || '';
  return { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${token}` };
}

/** "Şüpheli deneme kaydı" — yüksek güvenli iki sinyal (e-posta yok / adı tekrar-karakter). */
export function supheliMi(k: KuyrukKaydi): boolean {
  const epostaYok = !k.email || !k.email.trim();
  const tekrarKarakter = /^(.)\1+$/.test((k.ogrenci_adi || '').trim());
  return epostaYok || tekrarKarakter;
}

export interface KuyrukSonucu {
  kayitlar: KuyrukKaydi[];
  toplam: number;
}

export async function fetchBucket(opts: {
  bucket: BucketKey;
  benimAdim: string;
  limit?: number;
  offset?: number;
  search?: string;
  sort?: 'eski' | 'yeni';
  alanFiltre?: string; // Maarif kod öneki, örn. 'MAB'
}): Promise<KuyrukSonucu> {
  const { bucket, limit = 25, offset = 0, search, sort = 'eski' } = opts;
  const headers = await authHeaders();

  const params = new URLSearchParams();
  params.set('select', LISTE_ALANLARI);

  if (bucket === 'analizYok') {
    params.append('yapay_zeka_yorumu', 'is.null');
    params.append('oyun_turu', 'neq.yaratici-cizim');
  } else if (bucket === 'onayli') {
    params.append('onay_durumu', 'eq.onaylandi');
  } else if (bucket === 'reddedildi') {
    params.append('onay_durumu', 'eq.reddedildi');
  } else if (bucket === 'deneme') {
    // Şüpheli olabilecek geniş küme çekilir; kesin ayrım istemci tarafında supheliMi() ile.
    params.append('or', '(email.is.null,email.eq.)');
  } else {
    // beklemede (varsayılan): onay_durumu NULL olan eski kayıtları da kapsar.
    params.append('or', '(onay_durumu.eq.beklemede,onay_durumu.is.null)');
    params.append('yapay_zeka_yorumu', 'not.is.null');
  }

  if (search && search.trim()) {
    const q = search.trim().replace(/[%*]/g, '');
    params.append('or', `(ogrenci_adi.ilike.*${q}*,email.ilike.*${q}*,oyun_turu.ilike.*${q}*)`);
  }

  params.set('order', sort === 'eski' ? 'created_at.asc' : 'created_at.desc');
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?${params.toString()}`, {
    headers: { ...headers, Prefer: 'count=exact' },
  });
  if (!res.ok) throw new Error(`Kuyruk çekilemedi (${res.status})`);

  const range = res.headers.get('content-range'); // "0-24/312"
  const toplam = range && range.includes('/') ? parseInt(range.split('/')[1], 10) || 0 : 0;
  const kayitlar: KuyrukKaydi[] = await res.json();
  return { kayitlar, toplam };
}

/** Beklemede sayfasını istemci tarafında ekip-görünürlüğü alt-kovalarına ayırır (faz 1). */
export function altKovalaraAyir(kayitlar: KuyrukKaydi[], benimAdim: string) {
  const sonOySende: KuyrukKaydi[] = [];
  const banaDusen: KuyrukKaydi[] = [];
  const baskasiniBekliyor: KuyrukKaydi[] = [];

  for (const k of kayitlar) {
    const votes = normalizeVotes(k.uzman_oylamalari);
    const oySayisi = Object.keys(votes).length;
    const benimOyumVarMi = benimAdim in votes;
    if (benimOyumVarMi) {
      // Ben oy verdim; başkası daha vermediyse "son oy sende" değil, "başkasını bekliyor".
      if (oySayisi < 3) baskasiniBekliyor.push(k);
    } else if (oySayisi === 2) {
      sonOySende.push(k); // iki kişi oy vermiş, üçüncü (muhtemelen ben) bekleniyor
      banaDusen.push(k);
    } else {
      banaDusen.push(k);
    }
  }
  return { sonOySende, banaDusen, baskasiniBekliyor };
}

/** Son 3 deneme kıyası (email üzerinden — ogrenci_adi DEĞİL, bkz. denetim notu). */
export async function fetchSonUcKiyas(email: string | undefined, oyunTuru: string, haricId: number) {
  if (!email) return [] as { created_at: string; sure?: number; hata_sayisi?: number }[];
  const headers = await authHeaders();
  const params = new URLSearchParams({
    select: 'created_at,sure,hata_sayisi',
    email: `eq.${email}`,
    oyun_turu: `eq.${oyunTuru}`,
    id: `neq.${haricId}`,
    order: 'created_at.desc',
    limit: '3',
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?${params.toString()}`, { headers });
  if (!res.ok) return [];
  return res.json();
}

/** Aynı hesabın diğer kayıtları (kimlik şeridi ⑥ bloğu). */
export async function fetchAyniHesap(email: string | undefined, haricId: number) {
  if (!email) return [] as { id: number; oyun_turu: string; created_at: string }[];
  const headers = await authHeaders();
  const params = new URLSearchParams({
    select: 'id,oyun_turu,created_at',
    email: `eq.${email}`,
    id: `neq.${haricId}`,
    order: 'created_at.desc',
    limit: '6',
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?${params.toString()}`, { headers });
  if (!res.ok) return [];
  return res.json();
}

/** Bir öğrencinin tüm kayıtları (İstatistikler modalı için — email üzerinden). */
export async function fetchAllForStudent(email: string): Promise<KuyrukKaydi[]> {
  const headers = await authHeaders();
  const params = new URLSearchParams({
    select: 'id,created_at,oyun_turu,hamle_sayisi,hata_sayisi,sure,ogrenci_adi,ogrenci_yasi',
    email: `eq.${email}`,
    order: 'created_at.desc',
    limit: '100',
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?${params.toString()}`, { headers });
  if (!res.ok) return [];
  return res.json();
}

/** Ağır alanları (çizim/telaffuz) yalnız seçili kayıt için çeker. */
export async function fetchAgirAlanlar(id: number) {
  const headers = await authHeaders();
  const params = new URLSearchParams({ select: 'cizim_verisi,algilanan_kelime', id: `eq.${id}` });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?${params.toString()}`, { headers });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] || null;
}

/** Bir hesabın tüm kayıtlarını gizler (D3 — hesap düzeyinde çöp temizliği). */
export async function hideAccount(email: string): Promise<{ ok: boolean; hata?: string }> {
  const headers = await authHeaders();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ gizli: true }),
  });
  if (res.ok) return { ok: true };
  const text = await res.text();
  if (text.includes('gizli')) {
    return { ok: false, hata: 'Bu özellik için tek satırlık bir SQL çalıştırman gerekiyor (bkz. supabase_migrations/admin_panel_gizli_kolon.sql).' };
  }
  return { ok: false, hata: text.slice(0, 200) };
}

/** Tek bir kaydı gizler/geri getirir. `gizli` kolonu yoksa nazikçe başarısız olur. */
export async function setGizli(id: number, gizli: boolean): Promise<{ ok: boolean; hata?: string }> {
  const headers = await authHeaders();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ gizli }),
  });
  if (res.ok) return { ok: true };
  const text = await res.text();
  if (text.includes('gizli')) {
    return { ok: false, hata: 'gizli kolonu henüz yok — supabase_migrations/admin_panel_gizli_kolon.sql çalıştırılmalı.' };
  }
  return { ok: false, hata: text.slice(0, 200) };
}
