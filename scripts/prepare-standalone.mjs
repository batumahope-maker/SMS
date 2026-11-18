// Cross-platform replacement for the old Unix-only tail of `npm run build`
// (`cp -r .next/static ... && cp -r public ...`).
//
// `next build` with `output: "standalone"` produces .next/standalone/server.js,
// but it does not copy the static assets or the public folder. This script does
// that with node:fs, so it works identically on Windows, macOS and Linux.

import { existsSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

if (!existsSync(standalone)) {
  console.error(
    '[prepare-standalone] .next/standalone not found. Run `next build` first.'
  );
  process.exit(1);
}

const staticSource = path.join(root, '.next', 'static');
const staticTarget = path.join(standalone, '.next', 'static');

if (!existsSync(staticSource)) {
  console.error('[prepare-standalone] .next/static not found. Run `next build` first.');
  process.exit(1);
}

await cp(staticSource, staticTarget, { recursive: true, force: true });
console.log('[prepare-standalone] copied .next/static -> .next/standalone/.next/static');

const publicSource = path.join(root, 'public');
if (existsSync(publicSource)) {
  await cp(publicSource, path.join(standalone, 'public'), {
    recursive: true,
    force: true,
  });
  console.log('[prepare-standalone] copied public -> .next/standalone/public');
} else {
  console.log('[prepare-standalone] no public folder to copy');
}
