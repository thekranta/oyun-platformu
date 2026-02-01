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
        copyDirSync(SOURCE_ASSETS, DIST_ASSETS);
        console.log('✅ Assets pre-copied to dist');
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
    prepareDistDirectory();
    prepareReactNavigationAssets();
    console.log('✅ Pre-build preparation complete!');
}

main();
