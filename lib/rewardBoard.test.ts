import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import en from '../locales/en.json';
import tr from '../locales/tr.json';
import { REWARD_CONCEPTS, REWARD_CONCEPT_LIST, getRewardConcept } from '../components/rewardBoard/conceptRegistry';
import { pipsForStage, stageForCount } from '../components/rewardBoard/stageMath';
import { OGRETMEN_TIER_FLAGS } from './subscriptionTiers';

// Sınıf Bahçesi (ödül panosu) sözleşmeleri: SQL ↔ istemci eşikleri, konsept kaydı, çeviriler, paket kapısı.
// Davranış testleri (RPC'ler, RLS, gün sınırı) PGlite düzeneğinde ayrıca koşuldu; bu dosya sözleşmeyi
// kazara bozan düzenlemeleri yakalar.
const sql = readFileSync(join(__dirname, '../supabase_migrations/add_class_rewards.sql'), 'utf8');

// SQL'deki private.reward_stage CASE bloğundan eşikleri okur ve aşamayı hesaplar.
function stageFromSql(count: number): 0 | 1 | 2 | 3 {
    const body = sql.match(/FUNCTION private\.reward_stage[\s\S]*?\$\$;/)![0];
    const le = [...body.matchAll(/p_count <= (\d+) THEN (\d)/g)].map((m) => ({ max: Number(m[1]), stage: Number(m[2]) }));
    if (count <= 0) return 0;
    for (const r of le) if (count <= r.max) return r.stage as 1 | 2;
    return 3;
}

describe('aşama eşikleri: SQL ↔ istemci', () => {
    it('SQL aşamaları: 0 / 1-2 / 3-5 / 6+', () => {
        expect([0, 1, 2, 3, 5, 6, 40].map(stageFromSql)).toEqual([0, 1, 1, 2, 2, 3, 3]);
    });

    it('stageForCount (demo modu yerel hesabı) 0..40 için SQL ile birebir aynı', () => {
        for (let c = 0; c <= 40; c++) expect({ c, s: stageForCount(c) }).toEqual({ c, s: stageFromSql(c) });
    });

    it('pipsForStage, SQL eşikleriyle aynı yerde başlar ve en çok 3 nokta gösterir', () => {
        // her aşamanın ilk sayısında 0 nokta, sonrakinde 1 nokta
        for (const stage of [1, 2] as const) {
            let start = 1;
            while (stageFromSql(start) !== stage) start++;
            expect(pipsForStage(start, stage)).toBe(0);
            expect(pipsForStage(start + 1, stage)).toBe(1);
        }
        expect(pipsForStage(0, 0)).toBe(0);
        expect(pipsForStage(6, 3)).toBe(3);
        expect(pipsForStage(99, 3)).toBe(3);
        for (let c = 0; c <= 12; c++) {
            const p = pipsForStage(c, stageFromSql(c));
            expect(p).toBeGreaterThanOrEqual(0);
            expect(p).toBeLessThanOrEqual(3);
        }
    });
});

describe('konsept kaydı', () => {
    it('SQL reward_theme CHECK listesi = istemcideki konsept kimlikleri', () => {
        const m = sql.match(/reward_theme IN \(([^)]*)\)/);
        expect(m).not.toBeNull();
        const inSql = [...m![1].matchAll(/'(\w+)'/g)].map((x) => x[1]).sort();
        expect(Object.keys(REWARD_CONCEPTS).sort()).toEqual(inSql);
    });

    it('her konseptin kimliği anahtarıyla aynı, sanat bileşeni ve 4 aşama etiketi var', () => {
        for (const [key, c] of Object.entries(REWARD_CONCEPTS)) {
            expect(c.id).toBe(key);
            expect(typeof c.Art === 'function' || typeof c.Art === 'object').toBe(true);
            expect(c.stageLabelKeys).toHaveLength(4);
            expect(c.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
        expect(REWARD_CONCEPT_LIST).toHaveLength(Object.keys(REWARD_CONCEPTS).length);
    });

    it('bilinmeyen / boş tema güvenli varsayılana (bitki) düşer', () => {
        expect(getRewardConcept('bitki').id).toBe('bitki');
        expect(getRewardConcept('gokyuzu').id).toBe('gokyuzu');
        expect(getRewardConcept('uzay').id).toBe('bitki');
        expect(getRewardConcept('').id).toBe('bitki');
        expect(getRewardConcept(null).id).toBe('bitki');
        expect(getRewardConcept(undefined).id).toBe('bitki');
    });
});

describe('çeviriler (rewardBoard)', () => {
    const keysOf = (o: Record<string, unknown>, p = ''): string[] =>
        Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keysOf(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));

    it('tr ve en aynı anahtar kümesine sahip, boş metin yok', () => {
        const a = keysOf(tr.rewardBoard).sort();
        const b = keysOf(en.rewardBoard).sort();
        expect(a).toEqual(b);
        for (const lang of [tr, en]) {
            const flat = keysOf(lang.rewardBoard);
            expect(flat.length).toBeGreaterThan(20);
        }
    });

    it('her konseptin etiket anahtarları iki dilde de çözülür', () => {
        const get = (lang: typeof tr, path: string) => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], lang);
        for (const c of REWARD_CONCEPT_LIST) {
            for (const key of [c.labelKey, ...c.stageLabelKeys]) {
                for (const lang of [tr, en] as const) {
                    const v = get(lang as typeof tr, key);
                    expect({ key, ok: typeof v === 'string' && v.length > 0 }).toEqual({ key, ok: true });
                }
            }
        }
    });
});

describe('paket kapısı', () => {
    it('Sınıf Bahçesi yalnız ücretli sınıf paketlerinde (Çınar/Meşe) açık', () => {
        expect(OGRETMEN_TIER_FLAGS.free.canUseRewardBoard).toBe(false);
        expect(OGRETMEN_TIER_FLAGS.cinar.canUseRewardBoard).toBe(true);
        expect(OGRETMEN_TIER_FLAGS.mese.canUseRewardBoard).toBe(true);
    });

    it('SQL, ücretli olmayan öğretmenden ödül vermeyi sunucuda reddeder (class_owner_is_paid)', () => {
        const fn = sql.match(/FUNCTION public\.teacher_award_reward[\s\S]*?\$\$;/)![0];
        expect(fn).toMatch(/class_owner_is_paid/);
        expect(fn).toMatch(/not_found/);
        const theme = sql.match(/FUNCTION public\.teacher_set_reward_theme[\s\S]*?\$\$;/)![0];
        expect(theme).toMatch(/class_owner_is_paid/);
    });

    it('ham tablolar istemciye kapalı (RLS açık, authenticated yetkisi geri alınır)', () => {
        expect(sql).toMatch(/ALTER TABLE public\.class_reward_events ENABLE ROW LEVEL SECURITY/);
        expect(sql).toMatch(/REVOKE ALL ON public\.class_reward_events FROM PUBLIC, anon, authenticated/);
    });
});
