// Fails if first-load JS/CSS exceeds budget (bytes, uncompressed).
import { statSync } from 'node:fs';
const budget = { 'script.js': 90e3, 'styles.css': 90e3, 'css/components.css': 40e3, 'css/tokens.css': 15e3, 'vendor/gsap/gsap.min.js': 80e3 };
let bad = 0;
for (const [f, max] of Object.entries(budget)) {
  try { const s = statSync(f).size; const ok = s <= max; if (!ok) bad++; console.log(`${ok ? 'ok ' : 'OVER'} ${f} ${s}/${max}`); }
  catch { console.log(`skip ${f}`); }
}
process.exit(bad ? 1 : 0);
