const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const DIST_FAVICON = path.join(DIST_DIR, 'favicon.ico');

const FALLBACKS = [
    path.join(PROJECT_ROOT, 'assets', 'images', 'favicon.png'),
    path.join(PROJECT_ROOT, 'assets', 'images', 'icon.png'),
];

function ensureFavicon() {
    fs.mkdirSync(DIST_DIR, { recursive: true });

    if (fs.existsSync(DIST_FAVICON)) {
        return;
    }

    for (const src of FALLBACKS) {
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, DIST_FAVICON);
            return;
        }
    }
}

ensureFavicon();
