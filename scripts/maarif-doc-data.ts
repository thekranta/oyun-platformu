// Word belgesi (scripts/maarif_doc.py) için oyun listesi: katalogdan ve Maarif haritasından üretilir.
// Doğrudan çalıştırmayın: `node scripts/export-maarif-doc.mjs` bunu tsx ile çağırır. Kullanım: tsx scripts/maarif-doc-data.ts <cikti.json>
import fs from 'node:fs';
import { alanSummary, buildGuide, TIER_LABELS } from '../lib/teacherGameGuide';

const outPath = process.argv[2];
if (!outPath) {
    console.error('Kullanım: tsx scripts/maarif-doc-data.ts <cikti.json>');
    process.exit(2);
}

const guide = buildGuide(null);
const games = guide.flatMap((c) => c.games);
const tierCount: Record<string, number> = {};
for (const g of games) tierCount[g.tier] = (tierCount[g.tier] || 0) + 1;

const out = {
    generated: new Date().toISOString().slice(0, 10),
    totalGames: games.length,
    totalCodes: guide.length,
    officialCodes: guide.filter((c) => c.code).length,
    platformSkills: guide.filter((c) => !c.code).length,
    tierCount,
    tierLabels: TIER_LABELS,
    summary: alanSummary(guide).map((s) => ({ alan: s.alan, kod: s.kod, oyun: s.oyun })),
    codes: guide.map((c) => ({
        key: c.key,
        code: c.code,
        alan: c.alan,
        text: c.text,
        games: c.games.map((g) => ({ name: g.name, detail: g.detail, tier: g.tier })),
    })),
};

fs.writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf8');
console.log(`${out.totalGames} oyun, ${out.totalCodes} kazanım (${out.officialCodes} resmi kod)`);
