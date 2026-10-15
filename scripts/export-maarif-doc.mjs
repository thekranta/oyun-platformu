#!/usr/bin/env node
/**
 * export-maarif-doc.mjs: "Oyunlar ve Maarif Modeli 2026 karşılıkları" Word belgesini üretir (pazarlama / satış için).
 *
 * Liste oyun kataloğundan (constants/gameCatalog.ts) ve Maarif haritasından (constants/maarifMap.ts) otomatik gelir;
 * yeni oyun eklenince bu komutu yeniden çalıştırmak yeterlidir. Öğretmen paneli "Oyun Rehberi" ile aynı veriyi kullanır.
 *
 * Kullanım:
 *   node scripts/export-maarif-doc.mjs                 # exports/Oyun-Maarif-Karsiliklari.docx
 *   node scripts/export-maarif-doc.mjs C:/yol/dosya.docx
 *
 * Gereksinim: Python + `pip install python-docx` (belgeyi python-docx üretir), proje bağımlılıkları (tsx).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(root, 'exports', 'Oyun-Maarif-Karsiliklari.docx'));
const tmp = mkdtempSync(join(tmpdir(), 'maarif-doc-'));
const json = join(tmp, 'guide.json');

const tsxCli = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
if (!existsSync(tsxCli)) {
    console.error('tsx bulunamadı (node_modules/tsx). Önce `npm install` çalıştırın.');
    process.exit(1);
}

function run(cmd, args, label) {
    const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
    if (r.status !== 0) {
        console.error(`\n${label} başarısız (çıkış kodu ${r.status ?? 'yok'}).`);
        rmSync(tmp, { recursive: true, force: true });
        process.exit(r.status || 1);
    }
}

try {
    console.log('1/2 Oyun listesi katalogdan çıkarılıyor…');
    run(process.execPath, [tsxCli, join('scripts', 'maarif-doc-data.ts'), json], 'Veri üretimi');

    mkdirSync(dirname(out), { recursive: true });
    console.log('2/2 Word belgesi hazırlanıyor…');
    const py = ['python', 'py'].find((c) => spawnSync(c, ['--version'], { stdio: 'ignore' }).status === 0);
    if (!py) {
        console.error('Python bulunamadı. Python kurup `pip install python-docx` çalıştırın.');
        process.exit(1);
    }
    run(py, [join('scripts', 'maarif_doc.py'), json, out], 'Word üretimi (python-docx kurulu mu? `pip install python-docx`)');
    console.log(`\nHazır: ${out}`);
} finally {
    rmSync(tmp, { recursive: true, force: true });
}
