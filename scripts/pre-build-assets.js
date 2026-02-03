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
// Critical assets that must exist for build to succeed
const CRITICAL_ASSETS = [
    // Moved to public/ folder to avoid Metro bundling issues
    // 'images/stories/adalet_hikayesi/s02_sonuca2_bg_doygun.png',
    // ... others moved to public/images/stories/adalet_hikayesi/
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
 * This ensures Metro can find the files during export
 */
function prepareDistDirectory() {
    console.log('📁 Creating dist directory structure and copying assets...');

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
 * List and verify all story assets
 */
function listAllStoryAssets() {
    const storiesDir = path.join(SOURCE_ASSETS, 'images', 'stories');
    if (!fs.existsSync(storiesDir)) {
        console.log('⚠️ Stories directory not found');
        return;
    }

    console.log('📋 Listing all story assets...');
    const listRecursive = (dir, prefix = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                listRecursive(fullPath, prefix + entry.name + '/');
            } else {
                const stats = fs.statSync(fullPath);
                // Verify file is readable
                try {
                    fs.accessSync(fullPath, fs.constants.R_OK);
                    console.log(`  ✓ ${prefix}${entry.name} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                } catch (err) {
                    console.error(`  ✗ UNREADABLE: ${prefix}${entry.name}`);
                }
            }
        }
    };
    listRecursive(storiesDir);
}

/**
 * Ensure all assets exist and are accessible
 */
function verifyAllAssetsAccessible() {
    console.log('🔐 Verifying all assets are accessible...');
    let issues = 0;

    const checkRecursive = (dir) => {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                checkRecursive(fullPath);
            } else {
                try {
                    fs.accessSync(fullPath, fs.constants.R_OK);
                    const stats = fs.statSync(fullPath);
                    if (stats.size === 0) {
                        console.error(`  ⚠️ EMPTY FILE: ${fullPath}`);
                        issues++;
                    }
                } catch (err) {
                    console.error(`  ✗ ACCESS ERROR: ${fullPath} - ${err.message}`);
                    issues++;
                }
            }
        }
    };

    checkRecursive(SOURCE_ASSETS);

    if (issues === 0) {
        console.log('✅ All assets are accessible');
    } else {
        console.log(`⚠️ Found ${issues} asset issues`);
    }
    return issues === 0;
}

/**
 * Copy @expo/vector-icons fonts to dist/assets
 * Metro bundler looks for these fonts with hashed filenames
 */
function prepareVectorIconFonts() {
    const fontsSourcePath = path.join(PROJECT_ROOT, 'node_modules', '@expo', 'vector-icons', 'build', 'vendor', 'react-native-vector-icons', 'Fonts');

    if (!fs.existsSync(fontsSourcePath)) {
        console.log('⚠️ Vector icons fonts not found at:', fontsSourcePath);
        return;
    }

    console.log('📁 Copying vector icon fonts to dist/assets...');

    // Ensure dist/assets exists
    fs.mkdirSync(DIST_ASSETS, { recursive: true });

    const entries = fs.readdirSync(fontsSourcePath, { withFileTypes: true });
    let copied = 0;

    for (const entry of entries) {
        if (!entry.isDirectory() && entry.name.endsWith('.ttf')) {
            const srcFile = path.join(fontsSourcePath, entry.name);
            const destFile = path.join(DIST_ASSETS, entry.name);
            fs.copyFileSync(srcFile, destFile);
            copied++;
            console.log(`  ✓ Copied ${entry.name}`);
        }
    }

    console.log(`✅ Copied ${copied} vector icon font files`);
}

/**
 * Main execution
 */
function main() {
    console.log('🔧 Running pre-build asset preparation...');
    console.log('📂 PROJECT_ROOT:', PROJECT_ROOT);
    console.log('📂 SOURCE_ASSETS:', SOURCE_ASSETS);
    console.log('📂 DIST_ASSETS:', DIST_ASSETS);
    console.log('📂 Current working directory:', process.cwd());

    // First verify all assets are accessible (not just critical ones)
    verifyAllAssetsAccessible();

    // Verify critical assets exist
    const assetsOk = verifyCriticalAssets();
    if (!assetsOk) {
        console.log('⚠️ Warning: Some critical assets missing, build may fail');
    }

    // List all story assets for debugging
    listAllStoryAssets();

    prepareDistDirectory(); // Enabled to ensure directory structure exists
    prepareVectorIconFonts(); // Copy vector icon fonts to dist
    // prepareReactNavigationAssets(); // Still disabled, let fix-script handle it

    console.log('✅ Pre-build preparation complete!');
}

main();

