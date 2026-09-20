import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VELI_TIER_FLAGS, VeliTier } from './subscriptionTiers';

// supabase_migrations/add_child_profiles.sql paket sınırını veritabanında zorlar; aynı sayılar
// lib/subscriptionTiers.ts VELI_TIER_FLAGS.maxChildProfiles'ta da durur (arayüz kilidi için).
// Biri değişip öbürü unutulursa (arayüz "ekle" der, veritabanı reddeder ya da tersi) bu test kırılır.
const sql = readFileSync(join(__dirname, '../supabase_migrations/add_child_profiles.sql'), 'utf8');

function parseSqlLimits(): { byTier: Record<string, number | null>; fallback: number } {
    const block = sql.match(/v_limit\s*:=\s*CASE\s+v_tier([\s\S]*?)\bEND\s*;/);
    if (!block) throw new Error('add_child_profiles.sql içinde "v_limit := CASE v_tier ... END;" bulunamadı');
    const byTier: Record<string, number | null> = {};
    for (const m of block[1].matchAll(/WHEN\s+'(\w+)'\s+THEN\s+(\d+|NULL)/g)) {
        byTier[m[1]] = m[2] === 'NULL' ? null : Number(m[2]);
    }
    const fb = block[1].match(/ELSE\s+(\d+)/);
    if (!fb) throw new Error('CASE içinde ELSE (bilinmeyen paket sınırı) yok');
    return { byTier, fallback: Number(fb[1]) };
}

describe('add_child_profiles.sql ↔ lib/subscriptionTiers.ts paket sınırı', () => {
    const { byTier, fallback } = parseSqlLimits();
    const tiers = Object.keys(VELI_TIER_FLAGS) as VeliTier[];

    it.each(tiers)('%s: veritabanı sınırı arayüzdekiyle aynı', (tier) => {
        const sqlLimit = tier in byTier ? byTier[tier] : fallback;
        const uiLimit = VELI_TIER_FLAGS[tier].maxChildProfiles;
        expect(sqlLimit).toBe(uiLimit === Infinity ? null : uiLimit);
    });

    it('bilinmeyen/eksik paket en kısıtlı sınıra (1 çocuk) düşer', () => {
        expect(fallback).toBe(1);
    });

    it('istemcinin eşleyeceği hata kodu SQL içinde tanımlı', () => {
        for (const code of ['child_limit_reached']) {
            expect(sql).toContain(`'${code}'`);
        }
    });
});
