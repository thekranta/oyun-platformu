/**
 * Script to convert all require() calls for assets to URI format
 * This fixes Vercel build issues where Metro bundler can't find hashed assets
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

// Patterns to replace
const REPLACEMENTS = [
    // @/assets/images -> /images
    { pattern: /require\('@\/assets\/images\/([^']+)'\)/g, replacement: "{ uri: '/images/$1' }" },
    // @/assets/backgrounds -> /backgrounds
    { pattern: /require\('@\/assets\/backgrounds\/([^']+)'\)/g, replacement: "{ uri: '/backgrounds/$1' }" },
    // ../assets/images -> /images
    { pattern: /require\('\.\.\/assets\/images\/([^']+)'\)/g, replacement: "{ uri: '/images/$1' }" },
    // ../assets/backgrounds -> /backgrounds
    { pattern: /require\('\.\.\/assets\/backgrounds\/([^']+)'\)/g, replacement: "{ uri: '/backgrounds/$1' }" },
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changes = 0;

    for (const { pattern, replacement } of REPLACEMENTS) {
        const matches = content.match(pattern);
        if (matches) {
            changes += matches.length;
            content = content.replace(pattern, replacement);
        }
    }

    if (changes > 0) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${path.basename(filePath)}: ${changes} require() calls converted`);
    }

    return changes;
}

function main() {
    console.log('🔄 Converting asset require() calls to URI format...\n');

    const files = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
    let totalChanges = 0;

    for (const file of files) {
        const filePath = path.join(COMPONENTS_DIR, file);
        totalChanges += processFile(filePath);
    }

    console.log(`\n✅ Total: ${totalChanges} require() calls converted to URI format`);
}

main();
