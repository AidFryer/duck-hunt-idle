// Turns dist/index.html into dist/artifact.html for publishing as a
// claude.ai page: that host supplies its own <html>/<head>/<body> wrapper,
// so we keep only the title, metas, stylesheet links and scripts.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '';
const body = html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? '';
const keep = head
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => /^<(title|link rel="stylesheet"|script|meta name="(description|theme-color)")/.test(l));

const out = [
  ...keep.filter((l) => l.startsWith('<title')),
  ...keep.filter((l) => !l.startsWith('<title')),
  body.trim(),
].join('\n');
writeFileSync('dist/artifact.html', out + '\n');
const assets = readdirSync('dist/assets');
writeFileSync('dist/artifact-files.json', JSON.stringify(Object.fromEntries(assets.map((f) => [`assets/${f}`, `dist/assets/${f}`])), null, 2));
console.log(`artifact.html written, ${assets.length} asset files`);
