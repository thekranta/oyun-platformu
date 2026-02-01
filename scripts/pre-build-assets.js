/**
 * Pre-build script to prepare assets before expo export
 * This copies necessary assets and creates directory structure
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const SOURCE_ASSETS = path.join(PROJECT_ROOT, 'assets');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const DIST_ASSETS = path.join(DIST_DIR, 'assets');

// Critical assets that must exist for build to succeed
const CRITICAL_ASSETS = [
    'images/stories/adalet_hikayesi/s02_sonuca2_bg_doygun.png',
    'images/stories/adalet_hikayesi/s02_giris_bg_karpuz.png',
    'images/stories/adalet_hikayesi/s02_giris_bg_tartisma.png',
    'images/stories/adalet_hikayesi/s02_yola_bg_olcum.png',
    'images/stories/adalet_hikayesi/s02_yolb_bg_danisma.png',
];

/**
 * Verify critical assets exist in source
 */
function verifyCriticalAssets() {
    console.log('🔍 Verifying critical assets...');
    let allExist = true;

    for (const asset of CRITICAL_ASSETS) {
        const fullPath = path.join(SOURCE_ASSETS, asset);
        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            console.log(`  ✓ ${asset} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        } else {
            console.error(`  ✗ MISSING: ${asset}`);
            allExist = false;
        }
    }

    if (!allExist) {
        console.error('❌ Some critical assets are missing!');
    } else {
        console.log('✅ All critical assets verified');
    }
    return allExist;
}

/**
 * Recursively copy directory with file count
 */
function copyDirSync(src, dest, fileCount = { count: 0 }) {
    if (!fs.existsSync(src)) return fileCount;

    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath, fileCount);
        } else {
            fs.copyFileSync(srcPath, destPath);
            fileCount.count++;
        }
    }
    return fileCount;
}

/**
 * Create dist directory structure and pre-copy assets
 * This ensures Metro can find the directories during export
 */
function prepareDistDirectory() {
    console.log('📁 Creating dist directory structure...');

    // Create main dist directories
    fs.mkdirSync(DIST_ASSETS, { recursive: true });

    // Pre-copy all assets to dist to ensure they exist before Metro needs them
    if (fs.existsSync(SOURCE_ASSETS)) {
        console.log('📁 Pre-copying assets to dist...');
        const result = copyDirSync(SOURCE_ASSETS, DIST_ASSETS);
        console.log(`✅ Assets pre-copied to dist (${result.count} files)`);
    } else {
        console.error('❌ SOURCE_ASSETS directory not found:', SOURCE_ASSETS);
    }
}

/**
 * Copy react-navigation assets to a location metro can find
 */
function prepareReactNavigationAssets() {
    const sourcePath = path.join(PROJECT_ROOT, 'node_modules', '@react-navigation', 'elements', 'lib', 'module', 'assets');
    const targetPath = path.join(PROJECT_ROOT, 'assets', 'react-navigation');
    const distTargetPath = path.join(DIST_ASSETS, 'node_modules', '@react-navigation', 'elements', 'lib', 'module', 'assets');

    if (fs.existsSync(sourcePath)) {
        console.log('📁 Preparing react-navigation assets...');

        // Copy to project assets
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        // Also copy to expected dist location
        fs.mkdirSync(distTargetPath, { recursive: true });

        const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                const srcFile = path.join(sourcePath, entry.name);
                const destFile = path.join(targetPath, entry.name);
                const distDestFile = path.join(distTargetPath, entry.name);
                fs.copyFileSync(srcFile, destFile);
                fs.copyFileSync(srcFile, distDestFile);
                console.log(`  ✓ Copied ${entry.name}`);
            }
        }
        console.log('✅ React navigation assets prepared');
    } else {
        console.log('⚠️ React navigation assets not found at:', sourcePath);
    }
}

/**
 * Main execution
 */
function main() {
    console.log('🔧 Running pre-build asset preparation...');
    console.log('📂 PROJECT_ROOT:', PROJECT_ROOT);
    console.log('📂 SOURCE_ASSETS:', SOURCE_ASSETS);
    console.log('📂 DIST_ASSETS:', DIST_ASSETS);

    // First verify critical assets exist
    const assetsOk = verifyCriticalAssets();
    if (!assetsOk) {
        console.log('⚠️ Warning: Some critical assets missing, build may fail');
    }

    prepareDistDirectory();
    prepareReactNavigationAssets();

    // Verify critical assets were copied to dist
    console.log('🔍 Verifying copied assets...');
    for (const asset of CRITICAL_ASSETS) {
        const distPath = path.join(DIST_ASSETS, asset);
        if (fs.existsSync(distPath)) {
            console.log(`  ✓ dist/${asset}`);
        } else {
            console.error(`  ✗ MISSING in dist: ${asset}`);
        }
    }

    console.log('✅ Pre-build preparation complete!');
}

main();
