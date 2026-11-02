// Fails when the site's content differs from content/manifest.json.
// Intentional edits must be listed in content/approved-changes.json:
//   [{ "path": "projects.1.desc", "from": "old text", "to": "new text", "reason": "..." }]
// Usage: node scripts/check-parity.mjs [path/to/index.html]
import { readFileSync, existsSync } from 'node:fs';
import { extract } from './lib/extract.mjs';

const file = process.argv[2] || 'index.html';
const manifest = JSON.parse(readFileSync('content/manifest.json', 'utf8')).content;
const approved = existsSync('content/approved-changes.json') ? JSON.parse(readFileSync('content/approved-changes.json', 'utf8')) : [];
const actual = extract(readFileSync(file, 'utf8'));

function get(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function set(obj, path, value) {
  const keys = path.split('.'); const last = keys.pop();
  get(obj, keys.join('.')) && (get(obj, keys.join('.'))[last] = value);
}

// Apply approved edits to a copy of the manifest, replacing text inside the addressed value
const expected = JSON.parse(JSON.stringify(manifest));
for (const a of approved) {
  const cur = get(expected, a.path);
  if (typeof cur === 'string') set(expected, a.path, cur.split(a.from).join(a.to));
  else if (Array.isArray(cur)) set(expected, a.path, cur.map(x => (x === a.from ? a.to : x)));
}

const problems = [];
function diff(a, b, path) {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) { problems.push(`${path}: type differs`); return; }
  if (Array.isArray(a)) {
    if (a.length !== b.length) problems.push(`${path}: expected ${a.length} items, found ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], `${path}.${i}`);
  } else if (a && typeof a === 'object') {
    for (const k of Object.keys(a)) diff(a[k], b[k], `${path}.${k}`);
  } else if (a !== b) problems.push(`${path}: expected "${a}" but found "${b}"`);
}
diff(expected, actual, 'content');

if (problems.length) {
  console.error(`Content parity FAILED (${problems.length} difference${problems.length > 1 ? 's' : ''}):`);
  problems.slice(0, 40).forEach(p => console.error('  - ' + p));
  process.exit(1);
}
const n = JSON.stringify(actual).length;
console.log(`Content parity OK: ${actual.projects.length} projects, ${actual.experience.length} roles, ${actual.skills.reduce((s, g) => s + g.items.length, 0)} skills, ${actual.stats.length} stats (${approved.length} approved change${approved.length === 1 ? '' : 's'}).`);
