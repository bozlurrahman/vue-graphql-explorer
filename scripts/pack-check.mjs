// Checks what `npm publish` would upload (EXP-10). Run after `npm run build`: `npm run pack:check`.
// Fails on files outside the allowlist, source maps, env files, a root entry not pointing at Vue 3, and on
// text that would leak internal hosts or local paths.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const [pack] = JSON.parse(
  execFileSync(npm, ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' }),
);
const files = pack.files.map(f => f.path);

const allowed = [
  /^package\.json$/,
  /^README\.md$/,
  /^LICENSE$/,
  /^CHANGELOG\.md$/,
  /^scripts\/(switch|postinstall)\.mjs$/,
  /^dist\/(index\.js|style\.css)$/,
  /^dist\/vue[23]\/(index\.js|style\.css)$/,
  /^dist\/types\/.+\.d\.ts$/,
];
const forbiddenText = [
  /intelli\.global/i,
  /intellidigital/i,
  /byslglobal/i,
  /\/var\/www\//,
  /\/home\/[a-z0-9_-]+\//i,
  /[A-Z]:\\Users\\/,
  /localhost:\d+/,
  /127\.0\.0\.1/,
  /sourceMappingURL/,
];

const problems = [];
for (const file of files) {
  if (!allowed.some(re => re.test(file))) problems.push(`not in the allowlist: ${file}`);
  if (/\.map$|(^|\/)\.env/.test(file)) problems.push(`must not be published: ${file}`);
  if (file === 'package.json') continue; // repository / homepage URLs are meant to be public
  const text = readFileSync(join(root, file), 'utf8');
  for (const re of forbiddenText) if (re.test(text)) problems.push(`${file} matches ${re}`);
}
for (const required of ['dist/vue3/index.js', 'dist/vue2/index.js', 'dist/types/index.d.ts', 'README.md', 'LICENSE']) {
  if (!files.includes(required)) problems.push(`missing: ${required}`);
}
if (readFileSync(join(root, 'dist/index.js'), 'utf8').trim() !== "export * from './vue3/index.js';") {
  problems.push('dist/index.js must point at vue3 (run `npm run build`)');
}

console.log(`${pack.name}@${pack.version}: ${files.length} files, ${(pack.size / 1024).toFixed(1)} kB packed`);
if (problems.length) {
  console.error(problems.map(p => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log('pack check ok');
