/**
 * Pre-build script to prepare assets before expo export
 * This copies necessary assets that might be missing during web build
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

/**
 * Copy react-navigation assets to a location metro can find
 */
function prepareReactNavigationAssets() {
    const sourcePath = path.join(PROJECT_ROOT, 'node_modules', '@react-navigation', 'elements', 'lib', 'module', 'assets');
    const targetPath = path.join(PROJECT_ROOT, 'assets', 'react-navigation');

    if (fs.existsSync(sourcePath)) {
        console.log('📁 Preparing react-navigation assets...');

        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                const srcFile = path.join(sourcePath, entry.name);
                const destFile = path.join(targetPath, entry.name);
                fs.copyFileSync(srcFile, destFile);
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
    prepareReactNavigationAssets();
    console.log('✅ Pre-build preparation complete!');
}

main();
