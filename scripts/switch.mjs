#!/usr/bin/env node
// Points the root entry (dist/index.js, dist/style.css) at the Vue 2 or Vue 3 build.
// Usage: vue-graphql-explorer-switch 2|3
// Runs from postinstall with the version of the host's `vue`; can be run by hand.
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const arg = process.argv[2];

if (arg !== '2' && arg !== '3') {
  console.error('[vue-graphql-explorer] usage: vue-graphql-explorer-switch 2|3');
  process.exit(1);
}

const target = `vue${arg}`;
if (!existsSync(join(dist, target, 'index.js'))) {
  console.warn(`[vue-graphql-explorer] dist/${target} not built; switch skipped`);
  process.exit(0);
}

writeFileSync(join(dist, 'index.js'), `export * from './${target}/index.js';\n`);
writeFileSync(join(dist, 'style.css'), `@import './${target}/style.css';\n`);
console.log(`[vue-graphql-explorer] switched to ${target}`);
