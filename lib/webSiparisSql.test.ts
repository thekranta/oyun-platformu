import { readFileSync } from 'fs';
import { join } from 'path';
import { WEB_VELI_PAKETLERI } from '../api/_lib/webPaketAtama';

// supabase_migrations/add_web_siparisleri.sql kaynak değişmezleri (boardResultsSql.test.ts deseni): dosya yanlışlıkla
// gevşetilirse (politika eklenir, izin açılır, kişisel veri sütunu eklenir) yakalanır. Canlıda çalıştırılmadı.

const oku = (ad: string) => readFileSync(join(__dirname, '..', 'supabase_migrations', ad), 'utf8');
const yorumsuz = (s: string) => s.split('\n').map((l) => l.replace(/--.*$/, '')).join('\n');
const sql = yorumsuz(oku('add_web_siparisleri.sql'));
const rollback = yorumsuz(oku('add_web_siparisleri_rollback.sql'));
const tabloBlogu = (() => {
    const m = sql.match(/create table if not exists public\.web_siparisleri \(([\s\S]*?)\n\);/);
    if (!m) throw new Error('tablo tanımı bulunamadı');
    return m[1];
})();

describe('web_siparisleri SQL: erişim', () => {
    it('RLS açık', () => {
        expect(sql).toMatch(/alter table public\.web_siparisleri enable row level security;/);
    });

    it('hiçbir istemci politikası yok', () => {
        expect(sql).not.toMatch(/create policy/i);
    });

    it('anon/authenticated izinleri kaldırılır, yalnız service_role', () => {
        expect(sql).toMatch(/revoke all on table public\.web_siparisleri from public, anon, authenticated;/);
        expect(sql).toMatch(/grant all on table public\.web_siparisleri to service_role;/);
        expect(sql).not.toMatch(/grant [^;]*to [^;]*(anon|authenticated)/i);
    });

    it('SECURITY DEFINER fonksiyon / görünüm ile arka kapı açılmaz', () => {
        expect(sql).not.toMatch(/security definer/i);
        expect(sql).not.toMatch(/create (or replace )?view/i);
    });
});

describe('web_siparisleri SQL: bütünlük', () => {
    it('iyzico_payment_id ve conversation_id UNIQUE; token kısmi tekil indeks', () => {
        expect(tabloBlogu).toMatch(/unique \(iyzico_payment_id\)/);
        expect(tabloBlogu).toMatch(/unique \(conversation_id\)/);
        expect(sql).toMatch(/create unique index if not exists web_siparisleri_token_key on public\.web_siparisleri \(token\) where token is not null;/);
    });

    it('paket listesi sunucu koduyla aynı; Çınar/kurum yok', () => {
        const m = tabloBlogu.match(/paket\s+text not null check \(paket in \(([^)]*)\)\)/);
        expect(m).not.toBeNull();
        const liste = m![1].split(',').map((s) => s.trim().replace(/'/g, ''));
        expect(liste).toEqual([...WEB_VELI_PAKETLERI]);
    });

    it('durum kümesi sözleşmeyle aynı, varsayılan olusturuldu', () => {
        expect(tabloBlogu).toMatch(/default 'olusturuldu'/);
        expect(tabloBlogu).toMatch(/durum in \('olusturuldu', 'beklemede', 'odendi', 'atama_bekliyor', 'basarisiz'\)/);
    });

    it('e-posta küçük harfe zorlanır; ham ve hedef boyutu sınırlı', () => {
        expect(tabloBlogu).toMatch(/email\s+text not null check \(email = lower\(email\)/);
        expect(tabloBlogu).toMatch(/octet_length\(ham::text\) <= 4000/);
        expect(tabloBlogu).toMatch(/octet_length\(atama_hedef::text\) <= 500/);
    });
});

describe('web_siparisleri SQL: kişisel veri', () => {
    it('alıcı adı, soyadı, telefon, TCKN, adres, şehir sütunu YOK', () => {
        const sutunlar = tabloBlogu.split('\n').map((l) => l.trim().split(/\s+/)[0]).filter(Boolean);
        for (const yasak of [/^ad$/, /soyad/, /telefon|gsm|phone/, /tckn|kimlik|identity/, /adres|address/, /sehir|city/, /^name$/, /^isim/]) {
            expect(sutunlar.filter((s) => yasak.test(s))).toEqual([]);
        }
    });
});

describe('geri alma', () => {
    it('yalnız sipariş tablosunu kaldırır, profiles\'a dokunmaz', () => {
        expect(rollback).toMatch(/drop table if exists public\.web_siparisleri;/);
        expect(rollback).not.toMatch(/profiles/);
    });
});
