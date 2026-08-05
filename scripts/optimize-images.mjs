/**
 * optimize-images.mjs
 *
 * Converts assets/images PNG/JPG art to WebP (quality 80, alpha preserved),
 * resizing so the longest side is:
 *   - <= 1600 px for files under assets/images/stories/** (full-screen story backgrounds)
 *   - <= 1024 px for everything else (game object art shown small)
 * Never upscales. On success the original .png/.jpg is DELETED (git history keeps it).
 *
 * Hard exclusions (Expo config requires these to stay PNG, untouched):
 *   icon.png, favicon.png, splash-icon.png,
 *   android-icon-foreground.png, android-icon-background.png, android-icon-monochrome.png,
 *   react-logo*.png / partial-react-logo*.png (Expo template files)
 *
 * Re-runnable / idempotent:
 *   - already-converted files (original gone) are not touched again
 *   - an interrupted run recovers: if both original and .webp exist, the .webp is rebuilt
 *     from the original, then the original is removed
 *
 * Usage: node scripts/optimize-images.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES_ROOT = path.join(PROJECT_ROOT, 'assets', 'images');
const STORIES_ROOT = path.join(IMAGES_ROOT, 'stories');

const WEBP_QUALITY = 80;
const MAX_SIDE_DEFAULT = 1024;
const MAX_SIDE_STORIES = 1600;

const CONVERTIBLE_EXTS = new Set(['.png', '.jpg', '.jpeg']);

// Exact basenames (lowercased) that must remain untouched PNG.
const EXCLUDED_BASENAMES = new Set([
  'icon.png',
  'favicon.png',
  'splash-icon.png',
  'android-icon-foreground.png',
  'android-icon-background.png',
  'android-icon-monochrome.png',
]);

function isExcluded(fileName) {
  const lower = fileName.toLowerCase();
  if (EXCLUDED_BASENAMES.has(lower)) return true;
  // Expo template files: react-logo.png, react-logo@2x.png, partial-react-logo.png, ...
  if (lower.startsWith('react-logo') && lower.endsWith('.png')) return true;
  if (lower.startsWith('partial-react-logo') && lower.endsWith('.png')) return true;
  return false;
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function isUnderStories(filePath) {
  const rel = path.relative(STORIES_ROOT, filePath);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function mb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function fileSize(p) {
  try {
    return (await fs.stat(p)).size;
  } catch {
    return null;
  }
}

async function main() {
  try {
    await fs.access(IMAGES_ROOT);
  } catch {
    console.error(`assets/images not found at ${IMAGES_ROOT}`);
    process.exitCode = 1;
    return;
  }

  const allFiles = await walk(IMAGES_ROOT);
  const results = []; // { rel, folder, action, before, after }
  let converted = 0;
  let excluded = 0;
  let skipped = 0;

  for (const filePath of allFiles) {
    const ext = path.extname(filePath).toLowerCase();
    if (!CONVERTIBLE_EXTS.has(ext)) continue; // .webp and anything else: not our input

    const rel = path.relative(PROJECT_ROOT, filePath).split(path.sep).join('/');
    const folder = path.relative(PROJECT_ROOT, path.dirname(filePath)).split(path.sep).join('/');
    const before = await fileSize(filePath);

    if (isExcluded(path.basename(filePath))) {
      excluded++;
      results.push({ rel, folder, action: 'excluded (kept PNG)', before, after: before });
      continue;
    }

    const maxSide = isUnderStories(filePath) ? MAX_SIDE_STORIES : MAX_SIDE_DEFAULT;
    const webpPath = filePath.slice(0, -ext.length) + '.webp';

    // Convert: rotate() applies EXIF orientation; fit:'inside' caps the longest side;
    // withoutEnlargement prevents upscaling; webp keeps alpha by default.
    try {
      await sharp(filePath)
        .rotate()
        .resize({
          width: maxSide,
          height: maxSide,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toFile(webpPath);
    } catch (err) {
      skipped++;
      results.push({ rel, folder, action: `ERROR: ${err.message}`, before, after: before });
      continue;
    }

    const after = await fileSize(webpPath);
    if (after === null || after === 0) {
      skipped++;
      results.push({ rel, folder, action: 'ERROR: empty webp output, original kept', before, after: before });
      continue;
    }

    await fs.unlink(filePath); // original deleted; git history preserves it
    converted++;
    results.push({ rel: `${rel} -> .webp`, folder, action: `converted (max ${maxSide}px)`, before, after });
  }

  if (results.length === 0) {
    console.log('Nothing to do: no .png/.jpg/.jpeg inputs left under assets/images (already optimized).');
  } else {
    // Per-file table
    const nameWidth = Math.max(...results.map((r) => r.rel.length), 4) + 2;
    console.log('\nPer-file results:');
    console.log(`${'File'.padEnd(nameWidth)}${'Before'.padStart(12)}${'After'.padStart(12)}  Action`);
    for (const r of results) {
      console.log(
        `${r.rel.padEnd(nameWidth)}${kb(r.before).padStart(12)}${kb(r.after).padStart(12)}  ${r.action}`
      );
    }

    // Per-folder table
    const folders = new Map();
    for (const r of results) {
      const f = folders.get(r.folder) ?? { before: 0, after: 0, count: 0 };
      f.before += r.before;
      f.after += r.after;
      f.count += 1;
      folders.set(r.folder, f);
    }
    console.log('\nPer-folder totals (processed files only):');
    for (const [folder, f] of [...folders.entries()].sort()) {
      console.log(`  ${folder}: ${mb(f.before)} -> ${mb(f.after)} (${f.count} files)`);
    }

    const totalBefore = results.reduce((s, r) => s + r.before, 0);
    const totalAfter = results.reduce((s, r) => s + r.after, 0);
    console.log(
      `\nGrand total (processed files): ${mb(totalBefore)} -> ${mb(totalAfter)} ` +
        `(saved ${mb(totalBefore - totalAfter)})`
    );
  }

  // Current on-disk size of the whole assets/images tree
  const finalFiles = await walk(IMAGES_ROOT);
  let treeSize = 0;
  for (const f of finalFiles) treeSize += (await fileSize(f)) ?? 0;
  console.log(`assets/images on disk now: ${mb(treeSize)} (${finalFiles.length} files)`);
  console.log(`Summary: converted=${converted}, excluded=${excluded}, errors=${skipped}`);

  if (skipped > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
