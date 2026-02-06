const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const CLIENT_DIR = path.join(DIST_DIR, 'client');
const COPY_MARKER = path.join(CLIENT_DIR, '.public-assets-copied');

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

function copyPublicAssetsToClient() {
    if (!fs.existsSync(PUBLIC_DIR)) return;

    const folders = ['images', 'sounds', 'backgrounds'];

    for (const folder of folders) {
        const srcPath = path.join(PUBLIC_DIR, folder);
        const destPath = path.join(CLIENT_DIR, folder);
        if (fs.existsSync(srcPath)) {
            copyDirSync(srcPath, destPath);
        }
    }

    fs.mkdirSync(CLIENT_DIR, { recursive: true });
    fs.writeFileSync(COPY_MARKER, 'ok');
}

function ensureClientAssets() {
    if (!fs.existsSync(COPY_MARKER)) {
        copyPublicAssetsToClient();
    }
}

function run() {
    const cliPath = path.join(PROJECT_ROOT, 'node_modules', 'expo', 'bin', 'cli');
    const args = [
        cliPath,
        'export',
        '--platform',
        'web',
        '--output-dir',
        'dist',
        '--no-ssg',
    ];

    const child = spawn('node', args, {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        env: process.env,
    });

    const interval = setInterval(ensureClientAssets, 250);

    child.on('exit', (code) => {
        clearInterval(interval);
        process.exit(code ?? 1);
    });
}

run();
