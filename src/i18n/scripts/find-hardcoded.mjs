import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../../');

const SKIP_DIRS = new Set(['i18n', 'data', 'theme']);
const SKIP_FILES = new Set(['mockData.js']);
const DUTCH_PATTERNS = [
  /\b(Opslaan|Annuleren|Verwijderen|Configureren|Weergave|Geluid|Sessie|Herstelpunten|Fluisteringen|Schatkamer|Voorbereidingen|Kronieken)\b/,
  /\b(Weet je zeker|mislukt|gesloten|blokkeert|niet gevonden)\b/,
  />([A-ZÁÉÍÓÚÄËÏÖÜ][a-záéíóúäëïöü]+ [a-záéíóúäëïöü]+)</,
];

const WHITELIST_PATTERNS = [
  /console\.(log|warn|error)/,
  /className=/,
  /tv-/,
  /lucide-react/,
  /firebase/,
  /Firestore/,
  /import /,
  /\/\//,
  /\/\*/,
  /t\(/,
  /i18n\./,
  /useT\(/,
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, files);
    } else if (/\.(jsx?|tsx?)$/.test(entry.name) && !SKIP_FILES.has(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function isWhitelisted(line) {
  return WHITELIST_PATTERNS.some((p) => p.test(line));
}

function main() {
  const files = walk(srcRoot);
  const hits = [];

  for (const file of files) {
    const rel = path.relative(srcRoot, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (isWhitelisted(line)) return;
      for (const pattern of DUTCH_PATTERNS) {
        if (pattern.test(line)) {
          hits.push({ file: rel, line: index + 1, text: line.trim().slice(0, 120) });
          break;
        }
      }
    });
  }

  if (hits.length === 0) {
    console.log('find-hardcoded: no suspicious Dutch UI strings found.');
    return;
  }

  console.warn(`find-hardcoded: ${hits.length} potential hardcoded strings:`);
  hits.slice(0, 50).forEach((h) => {
    console.warn(`  ${h.file}:${h.line}  ${h.text}`);
  });
  if (hits.length > 50) console.warn(`  ... and ${hits.length - 50} more`);
}

main();
