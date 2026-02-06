/**
 * Post-build script to fix Expo asset paths for Vercel deployment
 * This script runs after 'npx expo export' and fixes the asset directory structure
 */

const fs = require('fs');
const path = require('path');

// __dirname = scripts klasörü, bir üst klasöre çıkıyoruz
const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const DIST_ASSETS = path.join(DIST_DIR, 'assets');
const SOURCE_ASSETS = path.join(PROJECT_ROOT, 'assets');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

/**
 * Recursively copy directory
 */
function copyDirSync(src, dest) {
    if (!fs.existsSync(src)) return;

    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Flatten nested assets directory if it exists
 * Sometimes expo creates dist/assets/assets/... structure
 */
function flattenAssets() {
    const nestedAssets = path.join(DIST_ASSETS, 'assets');
    if (fs.existsSync(nestedAssets)) {
        console.log('📁 Fixing nested assets directory...');

        const entries = fs.readdirSync(nestedAssets, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(nestedAssets, entry.name);
            const destPath = path.join(DIST_ASSETS, entry.name);

            if (entry.isDirectory()) {
                copyDirSync(srcPath, destPath);
            } else if (!fs.existsSync(destPath)) {
                fs.copyFileSync(srcPath, destPath);
            }
        }

        // Remove the nested directory
        fs.rmSync(nestedAssets, { recursive: true, force: true });
        console.log('✅ Nested assets flattened');
    }
}

/**
 * Copy all source assets to dist preserving directory structure
 * This ensures all assets are available even if Metro doesn't properly hash them
 */
function copySourceAssets() {
    if (!fs.existsSync(SOURCE_ASSETS)) {
        console.log('⚠️ Source assets directory not found');
        return;
    }

    console.log('📁 Copying all source assets to dist...');

    // Copy entire assets folder structure
    const copyRecursive = (src, dest) => {
        if (!fs.existsSync(src)) return;

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                if (!fs.existsSync(destPath)) {
                    fs.mkdirSync(destPath, { recursive: true });
                }
                copyRecursive(srcPath, destPath);
            } else {
                // Only copy if doesn't exist to not overwrite hashed versions
                if (!fs.existsSync(destPath)) {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        }
    };

    copyRecursive(SOURCE_ASSETS, DIST_ASSETS);
    console.log('✅ Source assets copied');
}

/**
 * Copy node_modules assets to dist/assets if they exist in wrong location
 */
function fixNodeModulesAssets() {
    const wrongPath = path.join(DIST_ASSETS, 'node_modules');
    if (fs.existsSync(wrongPath)) {
        console.log('📁 Fixing node_modules assets path...');

        // Move all files from wrong location to correct location
        const queue = [wrongPath];

        while (queue.length > 0) {
            const currentDir = queue.shift();
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    queue.push(entryPath);
                } else {
                    // Copy file to root assets folder
                    const destPath = path.join(DIST_ASSETS, entry.name);
                    if (!fs.existsSync(destPath)) {
                        fs.copyFileSync(entryPath, destPath);
                    }
                }
            }
        }

        console.log('✅ Node modules assets fixed');
    }
}

/**
 * Fix react-navigation specific assets by creating proper directory structure
 */
function fixReactNavigationAssets() {
    // Build sırasında bu path'te bir dosya aranıyor
    const targetPath = path.join(DIST_ASSETS, 'node_modules', '@react-navigation', 'elements', 'lib', 'module', 'assets');

    // Source path from node_modules
    const sourcePath = path.join(PROJECT_ROOT, 'node_modules', '@react-navigation', 'elements', 'lib', 'module', 'assets');

    if (fs.existsSync(sourcePath)) {
        console.log('📁 Copying react-navigation assets...');
        fs.mkdirSync(targetPath, { recursive: true });

        const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                const srcFile = path.join(sourcePath, entry.name);
                const destFile = path.join(targetPath, entry.name);
                fs.copyFileSync(srcFile, destFile);
            }
        }
        console.log('✅ React navigation assets copied');
    }
}

/**
 * Find and copy missing hashed assets
 * Metro creates hashed filenames but sometimes fails to copy the actual files
 */
function fixMissingHashedAssets() {
    console.log('📁 Checking for missing hashed assets...');

    // Find all files in dist/assets
    const findFiles = (dir, files = []) => {
        if (!fs.existsSync(dir)) return files;

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                findFiles(fullPath, files);
            } else {
                files.push(fullPath);
            }
        }
        return files;
    };

    const distFiles = findFiles(DIST_ASSETS);
    const sourceFiles = findFiles(SOURCE_ASSETS);

    // Create a map of source files by basename (without hash)
    const sourceMap = new Map();
    for (const file of sourceFiles) {
        const basename = path.basename(file);
        const relativePath = path.relative(SOURCE_ASSETS, file);
        sourceMap.set(basename, { full: file, relative: relativePath });
    }

    // For each dist file that looks hashed, ensure original exists in proper location
    for (const distFile of distFiles) {
        const basename = path.basename(distFile);
        // Check if this is a hashed filename (has hash before extension)
        const match = basename.match(/^(.+?)\.([a-f0-9]{32})\.(\w+)$/);
        if (match) {
            const originalName = `${match[1]}.${match[3]}`;
            const sourceInfo = sourceMap.get(originalName);
            if (sourceInfo) {
                // Ensure the unhashed version also exists in dist
                const distDir = path.dirname(distFile);
                const unhashedPath = path.join(distDir, originalName);
                if (!fs.existsSync(unhashedPath)) {
                    fs.copyFileSync(sourceInfo.full, unhashedPath);
                }
            }
        }
    }

    console.log('✅ Hashed assets check complete');
}

/**
 * Copy public folder contents to dist and dist/client
 * Needed for web.output=server where assets resolve under dist/client.
 */
function copyPublicAssets() {
    if (!fs.existsSync(PUBLIC_DIR)) {
        console.log('Public directory not found:', PUBLIC_DIR);
        return;
    }

    const folders = ['images', 'sounds', 'backgrounds'];
    const clientDir = path.join(DIST_DIR, 'client');
    let totalCopied = 0;

    console.log('Copying public assets to dist and dist/client...');

    for (const folder of folders) {
        const srcPath = path.join(PUBLIC_DIR, folder);
        const distPath = path.join(DIST_DIR, folder);
        const clientPath = path.join(clientDir, folder);

        if (fs.existsSync(srcPath)) {
            fs.mkdirSync(distPath, { recursive: true });
            copyDirSync(srcPath, distPath);
            fs.mkdirSync(clientPath, { recursive: true });
            copyDirSync(srcPath, clientPath);
            totalCopied += 1;
        }
    }

    console.log(`Public assets copied to dist and dist/client (${totalCopied} folders)`);
}

/**
 * Ensure dist/client/index.html exists by copying dist/index.html when available
 */
function ensureClientIndex() {
    const distIndex = path.join(DIST_DIR, 'index.html');
    const clientIndex = path.join(DIST_DIR, 'client', 'index.html');

    if (fs.existsSync(distIndex)) {
        fs.mkdirSync(path.dirname(clientIndex), { recursive: true });
        fs.copyFileSync(distIndex, clientIndex);
    }
}

/**
 * Main execution
 */
function main() {
    console.log('🔧 Running Vercel post-build asset fix...');

    if (!fs.existsSync(DIST_DIR)) {
        console.log('⚠️ No dist directory found, skipping...');
        return;
    }

    flattenAssets();
    copySourceAssets();
    copyPublicAssets();
    ensureClientIndex();
    fixReactNavigationAssets();
    fixNodeModulesAssets();
    fixMissingHashedAssets();

    console.log('✅ Post-build fix complete!');
}

main();
