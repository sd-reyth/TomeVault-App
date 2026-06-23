#!/usr/bin/env node
/**
 * TomeVault UI governance check.
 *
 * Warns (Wave 0) / errors (Wave 5) on ad-hoc styling outside ui/ and theme/.
 *
 * Rules checked:
 *   1. No arbitrary Tailwind sizes (text-[Npx], w-[Npx], h-[Npx]) outside ui/ and theme/
 *   2. No font-fantasy outside ui/, theme/, and whitelisted display-only usages
 *
 * Set STRICT=1 to fail the process (CI mode, activate in Wave 5).
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const STRICT = process.env.STRICT === '1';
const SRC = new URL('../src', import.meta.url).pathname;

// Directories where these patterns ARE allowed
const ALLOWED_DIRS = ['ui', 'theme'];
// Files always allowed (legacy, to be cleaned per wave)
const LEGACY_ALLOW_LIST = [];

function walkSrc(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkSrc(full, files);
    } else if (/\.(jsx?|tsx?|css)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const CHECKS = [
  {
    name: 'arbitrary-size',
    pattern: /\b(?:text|w|h|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space)-\[\d+(?:px|rem|em|%)\]/,
    message: 'Arbitrary Tailwind size — use tv-type-* or a semantic token instead.',
  },
  {
    name: 'font-fantasy-ui',
    pattern: /font-fantasy/,
    message: 'font-fantasy outside ui/ or theme/ — only display/title/subtitle Text variants may use this.',
  },
];

let warnCount = 0;
const files = walkSrc(SRC);

for (const file of files) {
  const rel = relative(SRC, file);
  const topDir = rel.split('/')[0];

  // Always allow in ui/ and theme/ directories
  if (ALLOWED_DIRS.includes(topDir)) continue;
  // Skip legacy allow-list
  if (LEGACY_ALLOW_LIST.some((p) => rel.includes(p))) continue;

  const lines = readFileSync(file, 'utf8').split('\n');

  for (const check of CHECKS) {
    for (let i = 0; i < lines.length; i++) {
      if (check.pattern.test(lines[i])) {
        const loc = `${rel}:${i + 1}`;
        console.warn(`  ⚠  [${check.name}] ${loc}\n     ${lines[i].trim()}\n     → ${check.message}`);
        warnCount++;
      }
    }
  }
}

if (warnCount === 0) {
  console.log('✅ check:ui — geen schendingen gevonden.');
} else {
  console.log(`\n⚠  check:ui — ${warnCount} schending(en) gevonden (${STRICT ? 'FOUT' : 'waarschuwing'}).`);
  if (STRICT) process.exit(1);
}
