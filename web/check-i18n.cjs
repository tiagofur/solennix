const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const localesDir = path.join(__dirname, 'src/i18n/locales');

// Load translation files
const locales = { es: {}, en: {} };
const languages = ['es', 'en'];

for (const lang of languages) {
  const langDir = path.join(localesDir, lang);
  if (!fs.existsSync(langDir)) continue;
  const files = fs.readdirSync(langDir);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const ns = path.basename(file, '.json');
    const content = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf8'));
    locales[lang][ns] = content;
  }
}

// Helper to check if nested key exists
function hasKey(obj, pathStr) {
  const parts = pathStr.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }
    current = current[part];
  }
  return current !== undefined;
}

// Find all tsx/ts files
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk(srcDir);
const missingKeys = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find namespace in useTranslation
  let defaultNs = 'common';
  const useTranslationMatch = content.match(/useTranslation\(\s*\[?\s*['"`]([^'"`\],]+)['"`]/);
  if (useTranslationMatch) {
    defaultNs = useTranslationMatch[1];
  }
  
  // Simple regex to find t("...") or t('...')
  const tRegex = /\bt\(\s*['"`]([^'"`\)]+)['"`]/g;
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    const rawKey = match[1];
    if (rawKey.includes('${') || rawKey.startsWith('`')) {
      // Skip dynamic template literals
      continue;
    }
    
    let ns = defaultNs;
    let key = rawKey;
    
    if (rawKey.includes(':')) {
      const parts = rawKey.split(':');
      ns = parts[0];
      key = parts[1];
    }
    
    // Check if key exists in es and en
    for (const lang of languages) {
      const nsObj = locales[lang][ns];
      if (!nsObj) {
        missingKeys.push({
          file: path.relative(__dirname, file),
          lang,
          ns,
          key,
          rawKey,
          reason: `Namespace "${ns}" not found`
        });
      } else if (!hasKey(nsObj, key)) {
        missingKeys.push({
          file: path.relative(__dirname, file),
          lang,
          ns,
          key,
          rawKey,
          reason: `Key "${key}" not found in namespace "${ns}"`
        });
      }
    }
  }
}

console.log(JSON.stringify(missingKeys, null, 2));
