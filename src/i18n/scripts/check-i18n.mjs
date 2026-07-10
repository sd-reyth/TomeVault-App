import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesRoot = path.resolve(__dirname, '../locales');
const locales = ['en', 'nl'];

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_')) continue;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getValueAtPath(obj, keyPath) {
  return keyPath.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
}

function loadLocaleFiles(locale) {
  const dir = path.join(localesRoot, locale);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const byFile = {};

  for (const file of files) {
    const namespace = file.replace(/\.json$/, '');
    const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    byFile[namespace] = content;
  }

  return byFile;
}

function main() {
  const errors = [];
  const warnings = [];
  const localeData = Object.fromEntries(locales.map((l) => [l, loadLocaleFiles(l)]));
  const namespaces = new Set(locales.flatMap((l) => Object.keys(localeData[l])));

  for (const ns of namespaces) {
    const enFile = localeData.en[ns];
    const nlFile = localeData.nl[ns];

    if (!enFile) errors.push(`Missing en/${ns}.json`);
    if (!nlFile) errors.push(`Missing nl/${ns}.json`);
    if (!enFile || !nlFile) continue;

    const enKeys = new Set(flattenKeys(enFile));
    const nlKeys = new Set(flattenKeys(nlFile));

    for (const key of enKeys) {
      if (!nlKeys.has(key)) errors.push(`Missing nl key: ${ns}.${key}`);
      const enVal = getValueAtPath(enFile, key);
      if (typeof enVal === 'string' && enVal.trim() === '') {
        errors.push(`Empty en value: ${ns}.${key}`);
      }
    }

    for (const key of nlKeys) {
      if (!enKeys.has(key)) errors.push(`Missing en key: ${ns}.${key}`);
      const nlVal = getValueAtPath(nlFile, key);
      if (typeof nlVal === 'string' && nlVal.trim() === '') {
        errors.push(`Empty nl value: ${ns}.${key}`);
      }
      const enVal = getValueAtPath(enFile, key);
      if (typeof nlVal === 'string' && typeof enVal === 'string' && nlVal === enVal) {
        warnings.push(`Identical en/nl value: ${ns}.${key}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn(`i18n warnings (${warnings.length}):`);
    warnings.slice(0, 20).forEach((w) => console.warn(`  ⚠ ${w}`));
    if (warnings.length > 20) console.warn(`  ... and ${warnings.length - 20} more`);
  }

  if (errors.length > 0) {
    console.error(`i18n check failed (${errors.length} errors):`);
    errors.forEach((e) => console.error(`  ✗ ${e}`));
    process.exit(1);
  }

  console.log('i18n check passed.');
}

main();
