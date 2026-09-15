/**
 * Sahip paneli ("godmode") — birleşik aktivite akışı.
 * ------------------------------------------------------------
 * profiles / oyun_skorlari (+ gömülü uzman_oylamalari) / classes / class_students /
 * (varsa) teachers tablolarından ham satırları çekip TEK bir kronolojik
 * ActivityEvent listesine dönüştürür. Dönüştürme fonksiyonları saf (test edilebilir);
 * ağ istekleri ayrı fetch* fonksiyonlarında.
 *
 * RLS: bu sorgular yalnızca supabase_migrations/create_owner_dashboard.sql'deki
 * owner_reads_* politikaları uygulanmış bir owners satırına sahip oturumla veri döner.
 */
import { supabase } from '../supabase';
import { normalizeVotes } from '../admin/flags';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export type ActivityRole = 'cocuk_veli' | 'ogretmen' | 'uzman';

export type ActivityEventType =
  | 'oyun_oynadi'
  | 'veli_kayit_oldu'
  | 'ogretmen_kayit_oldu'
  | 'sinif_acti'
  | 'ogrenci_eklendi'
  | 'uzman_karar_verdi';

export interface ActivityEvent {
  /** Sentetik, benzersiz id: `${kaynak}:${satırId}` ya da uzman kararı için `${skorId}:${uzmanAdı}` */
  id: string;
  type: ActivityEventType;
  role: ActivityRole;
  /** ISO 8601 zaman damgası — sırala/filtrele buradan */
  timestamp: string;
  /** Akışta görünen kişi/kurum adı (çocuk, öğretmen, uzman) */
  actorLabel: string;
  /** Tıkla-detay sorgusu için anahtar: email (veli/çocuk), teacher_id (öğretmen), uzman display_name */
  actorKey: string;
  /** Satır başlığı — hazır-render Türkçe metin */
  title: string;
  /** İkincil satır */
  subtitle?: string;
  /** Ham veri — detay panelinde kullanılır, türe göre değişir */
  meta?: Record<string, unknown>;
}

export interface SummaryTotals {
  cocukVeli: number;
  ogretmen: number;
  uzman: number;
}

// ---------------------------------------------------------------------------
// Saf dönüştürme fonksiyonları (jest ile test edilir, ağ isteği yok)
// ---------------------------------------------------------------------------

interface OyunSkoruSatiri {
  id: number;
  created_at: string;
  ogrenci_adi?: string;
  ogrenci_yasi?: number;
  email?: string;
  oyun_turu?: string;
  sure?: number;
  hata_sayisi?: number;
  uzman_oylamalari?: Record<string, unknown> | null;
}

const OY_METNI: Record<string, string> = {
  onay: 'onayladı',
  revize: 'revize istedi',
  reddet: 'reddetti',
};

export function oyunSkoruToEvent(s: OyunSkoruSatiri): ActivityEvent {
  const yas = s.ogrenci_yasi ? ` (${s.ogrenci_yasi} ay)` : '';
  const detaylar = [
    s.sure != null ? `${s.sure} sn` : null,
    s.hata_sayisi != null ? `${s.hata_sayisi} hata` : null,
  ].filter(Boolean).join(' · ');
  return {
    id: `skor:${s.id}`,
    type: 'oyun_oynadi',
    role: 'cocuk_veli',
    timestamp: s.created_at,
    actorLabel: s.ogrenci_adi || 'Bilinmeyen',
    actorKey: s.email || '',
    title: `${s.ogrenci_adi || 'Bilinmeyen'}${yas} — ${s.oyun_turu || 'oyun'} oynadı`,
    subtitle: detaylar || undefined,
    meta: { skorId: s.id, email: s.email, oyunTuru: s.oyun_turu, childName: s.ogrenci_adi, childAgeMonths: s.ogrenci_yasi },
  };
}

/** Bir oyun_skorlari satırının uzman_oylamalari alanını ayrı ActivityEvent'lere açar. */
export function uzmanKararlariniCikar(s: OyunSkoruSatiri): ActivityEvent[] {
  const votes = normalizeVotes(s.uzman_oylamalari as any);
  const out: ActivityEvent[] = [];
  for (const [uzmanAdi, oy] of Object.entries(votes)) {
    if (!oy.tarih) continue; // eski kayıtlarda tarih olmayabilir — kronolojik akışta yeri olmaz
    out.push({
      id: `${s.id}:${uzmanAdi}`,
      type: 'uzman_karar_verdi',
      role: 'uzman',
      timestamp: oy.tarih,
      actorLabel: uzmanAdi,
      actorKey: uzmanAdi,
      title: `${uzmanAdi} — ${s.ogrenci_adi || 'bir'} kaydını ${OY_METNI[oy.oy] || oy.oy}`,
      subtitle: oy.gerekce,
      meta: { skorId: s.id, oy: oy.oy },
    });
  }
  return out;
}

interface ProfilSatiri {
  email: string;
  child_name?: string;
  parent_name?: string;
  child_age_months?: number;
  created_at?: string;
}

export function profilToEvent(p: ProfilSatiri): ActivityEvent | null {
  if (!p.created_at) return null;
  return {
    id: `profil:${p.email}`,
    type: 'veli_kayit_oldu',
    role: 'cocuk_veli',
    timestamp: p.created_at,
    actorLabel: p.child_name || p.email,
    actorKey: p.email,
    title: `${p.parent_name || 'Bir veli'} kayıt oldu — çocuğu ${p.child_name || '—'}`,
    subtitle: p.child_age_months ? `${p.child_age_months} aylık` : undefined,
    meta: { email: p.email, childName: p.child_name, childAgeMonths: p.child_age_months },
  };
}

interface SinifSatiri {
  id: string;
  name: string;
  teacher_id: string;
  created_at?: string;
}

export function sinifToEvent(c: SinifSatiri, ogretmenAdi?: string): ActivityEvent | null {
  if (!c.created_at) return null;
  return {
    id: `sinif:${c.id}`,
    type: 'sinif_acti',
    role: 'ogretmen',
    timestamp: c.created_at,
    actorLabel: ogretmenAdi || c.teacher_id,
    actorKey: c.teacher_id,
    title: `${ogretmenAdi || 'Bir öğretmen'} "${c.name}" sınıfını oluşturdu`,
    meta: { classId: c.id, teacherId: c.teacher_id },
  };
}

interface SinifOgrencisiSatiri {
  id: string;
  class_id: string;
  child_email: string;
  added_at?: string;
}

export function ogrenciEklendiToEvent(
  cs: SinifOgrencisiSatiri,
  ctx: { className?: string; teacherId?: string; ogretmenAdi?: string; childName?: string }
): ActivityEvent | null {
  if (!cs.added_at) return null;
  return {
    id: `sinif-ogrenci:${cs.id}`,
    type: 'ogrenci_eklendi',
    role: 'ogretmen',
    timestamp: cs.added_at,
    actorLabel: ctx.ogretmenAdi || ctx.teacherId || '',
    actorKey: ctx.teacherId || '',
    title: `${ctx.childName || cs.child_email} → "${ctx.className || 'bir sınıf'}" sınıfına eklendi`,
    meta: { classId: cs.class_id, childEmail: cs.child_email },
  };
}

interface OgretmenSatiri {
  user_id: string;
  name?: string;
  created_at?: string;
}

export function ogretmenKayitToEvent(t: OgretmenSatiri): ActivityEvent | null {
  if (!t.created_at) return null;
  return {
    id: `ogretmen:${t.user_id}`,
    type: 'ogretmen_kayit_oldu',
    role: 'ogretmen',
    timestamp: t.created_at,
    actorLabel: t.name || 'Bir öğretmen',
    actorKey: t.user_id,
    title: `${t.name || 'Bir öğretmen'} öğretmen olarak katıldı`,
    meta: { teacherId: t.user_id },
  };
}

/** Tüm olay listelerini birleştirir, zamana göre (en yeni önce) sıralar. */
export function mergeAndSort(...lists: (ActivityEvent | null)[][]): ActivityEvent[] {
  return lists
    .flat()
    .filter((e): e is ActivityEvent => e !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/** Son N gün içinde en az bir olayı olan benzersiz actorKey sayısı. */
export function activeActorCount(events: ActivityEvent[], role: ActivityRole, days: number): number {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const keys = new Set<string>();
  for (const e of events) {
    if (e.role !== role) continue;
    if (!e.actorKey) continue;
    if (new Date(e.timestamp).getTime() < since) continue;
    keys.add(e.actorKey);
  }
  return keys.size;
}

// ---------------------------------------------------------------------------
// Ağ istekleri
// ---------------------------------------------------------------------------

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || SUPABASE_KEY || '';
  return { apikey: SUPABASE_KEY || '', Authorization: `Bearer ${token}` };
}

const LIST_LIMIT = 200;

export async function fetchActivityFeed(): Promise<ActivityEvent[]> {
  const headers = await authHeaders();

  const [skorlar, profiller, siniflar, sinifOgrencileri, ogretmenler] = await Promise.all([
    fetchJson(`${SUPABASE_URL}/rest/v1/oyun_skorlari?select=id,created_at,ogrenci_adi,ogrenci_yasi,email,oyun_turu,sure,hata_sayisi,uzman_oylamalari&order=created_at.desc&limit=${LIST_LIMIT}`, headers),
    fetchJson(`${SUPABASE_URL}/rest/v1/profiles?select=email,child_name,parent_name,child_age_months,created_at&order=created_at.desc&limit=${LIST_LIMIT}`, headers),
    fetchJson(`${SUPABASE_URL}/rest/v1/classes?select=id,name,teacher_id,created_at&order=created_at.desc&limit=${LIST_LIMIT}`, headers),
    fetchJson(`${SUPABASE_URL}/rest/v1/class_students?select=id,class_id,child_email,added_at&order=added_at.desc&limit=${LIST_LIMIT}`, headers),
    fetchJson(`${SUPABASE_URL}/rest/v1/teachers?select=user_id,name,created_at&order=created_at.desc&limit=${LIST_LIMIT}`, headers),
  ]);

  // Öğretmen adı / sınıf adı eşlemeleri (öğrenci-eklendi olayını zenginleştirmek için)
  const teacherNameById = new Map<string, string>((ogretmenler || []).map((t: any) => [t.user_id, t.name]));
  const classById = new Map<string, any>((siniflar || []).map((c: any) => [c.id, c]));
  const childNameByEmail = new Map<string, string>((profiller || []).map((p: any) => [p.email, p.child_name]));

  const skorEventleri = (skorlar || []).flatMap((s: OyunSkoruSatiri) => [
    oyunSkoruToEvent(s),
    ...uzmanKararlariniCikar(s),
  ]);
  const profilEventleri = (profiller || []).map((p: ProfilSatiri) => profilToEvent(p));
  const sinifEventleri = (siniflar || []).map((c: SinifSatiri) => sinifToEvent(c, teacherNameById.get(c.teacher_id)));
  const ogrenciEventleri = (sinifOgrencileri || []).map((cs: SinifOgrencisiSatiri) => {
    const sinif = classById.get(cs.class_id);
    return ogrenciEklendiToEvent(cs, {
      className: sinif?.name,
      teacherId: sinif?.teacher_id,
      ogretmenAdi: sinif ? teacherNameById.get(sinif.teacher_id) : undefined,
      childName: childNameByEmail.get(cs.child_email),
    });
  });
  const ogretmenEventleri = (ogretmenler || []).map((t: OgretmenSatiri) => ogretmenKayitToEvent(t));

  return mergeAndSort(skorEventleri, profilEventleri, sinifEventleri, ogrenciEventleri, ogretmenEventleri);
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<any[]> {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return []; // kolon/tablo yoksa (ör. teachers.created_at) sessizce atla
    return await res.json();
  } catch {
    return [];
  }
}

async function countRows(table: string, headers: Record<string, string>): Promise<number> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
      headers: { ...headers, Prefer: 'count=exact' },
    });
    const range = res.headers.get('content-range');
    return range && range.includes('/') ? parseInt(range.split('/')[1], 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function fetchSummaryTotals(): Promise<SummaryTotals> {
  const headers = await authHeaders();
  const [cocukVeli, ogretmen, uzman] = await Promise.all([
    countRows('profiles', headers),
    countRows('teachers', headers),
    countRows('admins', headers),
  ]);
  return { cocukVeli, ogretmen, uzman };
}
