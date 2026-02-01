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
 * Main execution
 */
function main() {
    console.log('🔧 Running Vercel post-build asset fix...');

    if (!fs.existsSync(DIST_DIR)) {
        console.log('⚠️ No dist directory found, skipping...');
        return;
    }

    flattenAssets();
    fixReactNavigationAssets();
    fixNodeModulesAssets();

    console.log('✅ Post-build fix complete!');
}

main();
