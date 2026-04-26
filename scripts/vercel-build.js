const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const MARKER_PATH = path.join(PROJECT_ROOT, '.vercel-build-done');
const NPX_COMMAND = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (fs.existsSync(MARKER_PATH)) {
  console.log('vercel-build: already completed, skipping.');
  process.exit(0);
}

run('node', ['scripts/clean-dist.js']);
run(NPX_COMMAND, ['expo', 'export', '--platform', 'web', '--output-dir', 'dist']);
run('node', ['scripts/ensure-favicon.js']);

fs.writeFileSync(MARKER_PATH, 'ok');
