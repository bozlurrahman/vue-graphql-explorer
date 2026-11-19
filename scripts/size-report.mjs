// Prints raw and gzip sizes of the built files. In GitHub Actions it also writes them to the job summary.
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['dist/vue3/index.js', 'dist/vue2/index.js', 'dist/vue3/style.css', 'dist/vue2/style.css'];
const kb = n => `${(n / 1024).toFixed(1)} kB`;

const rows = files.map(file => {
  const content = readFileSync(join(root, file));
  return `| \`${file}\` | ${kb(content.length)} | ${kb(gzipSync(content, { level: 9 }).length)} |`;
});
const table = ['| File | Size | Gzip |', '|---|---|---|', ...rows].join('\n');

console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Bundle size\n\n${table}\n`);
