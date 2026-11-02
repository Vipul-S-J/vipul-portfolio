// Writes content/manifest.json from the current index.html (the "before" snapshot).
// Run once at the start of the upgrade. Usage: node scripts/extract-manifest.mjs [commit-label]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extract } from './lib/extract.mjs';

const label = process.argv[2] || 'unknown';
mkdirSync('content', { recursive: true });
const content = extract(readFileSync('index.html', 'utf8'));
writeFileSync('content/manifest.json', JSON.stringify({ source: label, note: 'Snapshot of the published content before the upgrade. Do not edit by hand.', content }, null, 2) + '\n');
console.log(`Manifest written: ${content.projects.length} projects, ${content.experience.length} roles, ${content.skills.length} skill groups, ${content.stats.length} stats.`);
