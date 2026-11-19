// Picks the build that matches the host's installed `vue` (2.7 -> dist/vue2, 3.x -> dist/vue3).
// Never fails the install: on any problem it keeps the default (Vue 3) entry.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

try {
  const require = createRequire(join(process.cwd(), 'noop.js'));
  const { version } = require('vue/package.json');
  const major = String(version).startsWith('2.') ? '2' : '3';
  execFileSync(process.execPath, [join(here, 'switch.mjs'), major], { stdio: 'inherit' });
} catch {
  // vue not installed yet, or dist missing (package repo itself): keep the default.
}
