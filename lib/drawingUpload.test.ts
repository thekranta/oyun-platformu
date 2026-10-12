import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('çizim yükleme isteği', () => {
    const src = readFileSync(join(__dirname, '../services/gameResults.ts'), 'utf8');
    const sql = readFileSync(join(__dirname, '../supabase_migrations/private_cizimler_bucket.sql'), 'utf8');

    it("x-upsert üstbilgisi göndermez (kovada UPDATE/SELECT izni yok; upsert yüklemeyi reddettirir)", () => {
        // Üstbilgi olarak gönderilmesini yakalar; açıklama yorumundaki anılması serbesttir.
        expect(/['"]x-upsert['"]\s*:/.test(src)).toBe(false);
    });

    it("kova politikaları yalnız INSERT (yükleme) + okuma verir; UPDATE politikası yok", () => {
        expect(sql).toMatch(/FOR INSERT TO authenticated/);
        expect(sql).not.toMatch(/FOR UPDATE/);
    });
});
