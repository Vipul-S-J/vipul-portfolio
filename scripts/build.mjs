// Static build for the portfolio. Node standard library only; no packages to install.
//   node scripts/build.mjs          write generated output
//   node scripts/build.mjs --check  exit 1 if generated files are out of date
// Reads content/*.json and templates/, then updates:
//   index.html            (regions between <!-- build:NAME --> markers)
//   projects/<slug>/index.html
//   sitemap.xml
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const CHECK = process.argv.includes('--check');
const read = p => readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const site = json('content/site.json');
const projects = json('content/projects.json').projects;
const skills = json('content/skills.json').groups;
const certs = existsSync('content/certifications.json') ? json('content/certifications.json').certifications : [];
const written = [];
const stale = [];

function put(path, content) {
  if (existsSync(path) && read(path) === content) return;
  if (CHECK) { stale.push(path); return; }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  written.push(path);
}
function inject(html, name, body) {
  const re = new RegExp('(<!-- build:' + name + ' -->)[\\s\\S]*?(<!-- /build:' + name + ' -->)');
  if (!re.test(html)) throw new Error('marker not found in page: build:' + name);
  return html.replace(re, (m, a, b) => a + '\n' + body + '\n' + b);
}

/* ---------------------------------------------------------------- icons */
const LINE_ICONS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  git: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8.5 6H12a4 4 0 0 1 4 4"/>',
  bucket: '<path d="M4 7c0-2 3.6-3 8-3s8 1 8 3-3.6 3-8 3-8-1-8-3z"/><path d="m4 7 2 11c.2 1.5 2.8 2.5 6 2.5s5.8-1 6-2.5L20 7"/>',
  balance: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="12" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2V12M12 12H5v4.8M12 12h7v4.8M12 12v4.8"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  stream: '<path d="M3 8c3 0 3 3 6 3s3-3 6-3 3 3 6 3M3 15c3 0 3 3 6 3s3-3 6-3 3 3 6 3"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  nat: '<rect x="3" y="9" width="18" height="8" rx="2"/><path d="M12 9V4m0 0-3 3m3-3 3 3M7 21h10"/>',
  files: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 13h5M10 17h5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l3 3M14 9l2 2"/>',
  trail: '<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15 10"/>'
};
const ASSET_ICONS = new Set(['ec2', 'rds', 'codedeploy', 'cloudwatch', 'dms', 'ses', 'vpc', 'aws-cloud']);
const githubIcon = read('templates/github-icon.svg').trim();

/* -------------------------------------------------------------- diagram */
const KIND_VAR = { compute: '--chart-1', storage: '--chart-2', database: '--chart-3', devtools: '--chart-3', network: '--chart-4', security: '--chart-5', analytics: '--chart-5', neutral: '--muted-foreground' };
const VIEWS = {
  d: { cw: 200, ch: 112, nw: 156, nh: 64, m: 28, top: 30, icon: 28 },
  m: { cw: 168, ch: 100, nw: 140, nh: 58, m: 18, top: 30, icon: 24 }
};

function layoutDiagram(d, view) {
  const V = VIEWS[view];
  const rect = {};
  for (const n of d.nodes) {
    const [c, r] = n[view];
    rect[n.id] = { x: V.m + c * V.cw, y: V.m + V.top + r * V.ch, w: V.nw, h: V.nh, c, r };
  }
  const groups = d.groups.map(g => {
    const pad = g.pad || 20;
    const rs = g.members.map(id => rect[id]);
    const x = Math.min(...rs.map(r => r.x)) - pad, y = Math.min(...rs.map(r => r.y)) - pad - 16;
    const x2 = Math.max(...rs.map(r => r.x + r.w)) + pad, y2 = Math.max(...rs.map(r => r.y + r.h)) + pad;
    return { ...g, x, y, w: x2 - x, h: y2 - y };
  }).sort((a, b) => b.w * b.h - a.w * a.h);
  const all = [...Object.values(rect), ...groups];
  const minX = Math.min(...all.map(r => r.x)), maxX = Math.max(...all.map(r => r.x + r.w));
  const minY = Math.min(...all.map(r => r.y)), maxY = Math.max(...all.map(r => r.y + r.h));
  const shift = { x: V.m - minX, y: V.m - minY };
  for (const r of all) { r.x += shift.x; r.y += shift.y; }
  return { V, rect, groups, w: Math.round(maxX - minX + V.m * 2), h: Math.round(maxY - minY + V.m * 2) };
}

const anchor = (r, s) => s === 'l' ? { x: r.x, y: r.y + r.h / 2 } : s === 'r' ? { x: r.x + r.w, y: r.y + r.h / 2 } : s === 't' ? { x: r.x + r.w / 2, y: r.y } : { x: r.x + r.w / 2, y: r.y + r.h };
const horiz = s => s === 'l' || s === 'r';

function route(e, L, view) {
  const A = L.rect[e.from], B = L.rect[e.to];
  let sides = e.sides && e.sides[view];
  if (!sides) {
    const dc = B.c - A.c, dr = B.r - A.r;
    if (dr === 0) sides = dc >= 0 ? ['r', 'l'] : ['l', 'r'];
    else if (dc === 0) sides = dr > 0 ? ['b', 't'] : ['t', 'b'];
    else if (Math.abs(dc) >= Math.abs(dr) && view === 'd') sides = dc > 0 ? ['r', 'l'] : ['l', 'r'];
    else sides = dr > 0 ? ['b', 't'] : ['t', 'b'];
  }
  const S = anchor(A, sides[0]), E = anchor(B, sides[1]);
  let pts;
  if (horiz(sides[0]) && horiz(sides[1])) { const mx = (S.x + E.x) / 2; pts = [S, { x: mx, y: S.y }, { x: mx, y: E.y }, E]; }
  else if (!horiz(sides[0]) && !horiz(sides[1])) { const my = (S.y + E.y) / 2; pts = [S, { x: S.x, y: my }, { x: E.x, y: my }, E]; }
  else if (horiz(sides[0])) pts = [S, { x: E.x, y: S.y }, E];
  else pts = [S, { x: S.x, y: E.y }, E];
  pts = pts.filter((p, i) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y);
  return pts.map((p, i) => (i ? 'L' : 'M') + Math.round(p.x * 10) / 10 + ' ' + Math.round(p.y * 10) / 10).join('');
}

function iconMarkup(icon, x, y, size, base) {
  if (ASSET_ICONS.has(icon)) return `<image href="${base}assets/icons/${icon}.svg" x="${x}" y="${y}" width="${size}" height="${size}" aria-hidden="true"/>`;
  const body = LINE_ICONS[icon] || LINE_ICONS.settings;
  const k = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${k})" class="arch__glyph" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</g>`;
}

function svgDiagram(slug, d, view, base) {
  const L = layoutDiagram(d, view);
  const { V } = L;
  const id = `${slug}-${view}`;
  const out = [];
  out.push(`<svg class="arch__svg arch__svg--${view}" viewBox="0 0 ${L.w} ${L.h}" role="img" aria-labelledby="${id}-t" focusable="false">`);
  out.push(`<title id="${id}-t">${esc(d.alt)}</title>`);
  out.push(`<defs><marker id="${id}-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1 10 5 0 9z" fill="context-stroke"/></marker></defs>`);
  for (const g of L.groups) {
    out.push(`<g class="arch__group" data-group="${g.id}" style="--k:var(${KIND_VAR[g.kind] || KIND_VAR.neutral})"><rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="14"/><text x="${g.x + 14}" y="${g.y + 17}">${esc(g.label)}</text></g>`);
  }
  for (const e of d.edges) {
    const path = route(e, L, view);
    out.push(`<path class="arch__edge" data-edge="${e.id}" d="${path}" marker-end="url(#${id}-ah)"/>`);
  }
  out.push(`<g class="arch__packets" aria-hidden="true">${d.edges.map(e => `<circle class="arch__packet" data-packet="${e.id}" r="4.5" cx="0" cy="0"/>`).join('')}</g>`);
  for (const n of d.nodes) {
    const r = L.rect[n.id];
    const pad = view === 'd' ? 12 : 10;
    const tx = r.x + pad + V.icon + 10;
    const label = esc(view === 'm' && n.mlabel ? n.mlabel : n.label);
    const showSub = view === 'd';
    const cy = r.y + r.h / 2;
    out.push(`<g class="arch__node" data-node="${n.id}" tabindex="0" role="group" aria-label="${esc(n.label)}: ${esc(n.sub)}" style="--k:var(${KIND_VAR[n.kind] || KIND_VAR.neutral})">`
      + `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="12"/>`
      + iconMarkup(n.icon, r.x + pad, cy - V.icon / 2, V.icon, base)
      + `<text class="arch__label" x="${tx}" y="${showSub ? cy - 3 : cy + 4.5}">${label}</text>`
      + (showSub ? `<text class="arch__sub" x="${tx}" y="${cy + 14}">${esc(n.sub)}</text>` : '')
      + `</g>`);
  }
  out.push('</svg>');
  return out.join('');
}

function diagramBlock(slug, d, base) {
  const steps = d.steps.map(s => `<li data-step="${s.n}"><span>${esc(s.text)}</span></li>`).join('');
  return `<figure class="arch" id="arch" data-slug="${slug}" data-steps='${JSON.stringify(d.steps.map(s => ({ n: s.n, nodes: s.nodes, edges: s.edges, retire: s.retire || [] })))}'>`
    + svgDiagram(slug, d, 'd', base) + svgDiagram(slug, d, 'm', base)
    + `<div class="arch__controls" role="group" aria-label="Diagram controls" hidden>`
    + `<button type="button" class="btn-sm btn-sm--primary" data-act="play" aria-pressed="false">Play</button>`
    + `<button type="button" class="btn-sm" data-act="step">Step</button>`
    + `<button type="button" class="btn-sm" data-act="replay">Replay</button>`
    + `<p class="arch__status" aria-live="polite"></p></div>`
    + `<figcaption class="sr-only">${esc(d.alt)}</figcaption></figure>`
    + `<ol class="arch__steps" aria-label="Step by step">${steps}</ol>`;
}

/* -------------------------------------------------------- home partials */
function cardHTML(p) {
  const link = p.caseStudy ? `projects/${p.slug}/` : null;
  const title = link ? `<a class="pcard__link" href="${link}">${esc(p.title)}</a>` : esc(p.title);
  const flow = p.flow.length
    ? `<ol class="flow" data-flow aria-label="${esc(p.flowLabel)}">${p.flow.map((f, i) => `<li style="--i:${i}"><span>${esc(f)}</span></li>`).join('')}</ol>` : '';
  const actions = [];
  if (link) actions.push(`<span class="pcard__cta" aria-hidden="true">Case study <i>→</i></span>`);
  if (p.repo) actions.push(`<a class="gh-btn" href="${esc(p.repo.url)}" target="_blank" rel="noopener" data-press>${githubIcon}${esc(p.repo.label)}</a>`);
  return `<li class="pcard${link ? ' pcard--link' : ''}" data-slug="${p.slug}" style="--item-color: ${p.color}" data-tilt>
  <article class="pcard__inner">
    <div class="pcard__top">
      <img class="pcard__icon" src="${esc(p.icon.src)}" alt="${esc(p.icon.alt)}" width="56" height="56" loading="lazy" />
      <span class="pcard__num" aria-hidden="true">${p.num}</span>
    </div>
    <p class="pcard__kind">${esc(p.kind)}</p>
    <h3 class="pcard__title">${title}</h3>
    <p class="pcard__desc">${esc(p.desc)}</p>
    ${flow}
    <div class="pcard__foot">
      <ul class="tags">${p.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="pcard__actions">${actions.join('')}</div>
    </div>
  </article>
</li>`;
}
const projectsHTML = `<ol class="work__list" aria-label="Projects">\n${projects.map(cardHTML).join('\n')}\n</ol>`;

const skillsHTML = skills.map(g => `<article class="skill-card card" data-tilt>
  <div class="skill-card__head">
    <img src="${esc(g.icon)}" alt="" width="40" height="40" />
    <h3>${esc(g.name)}</h3>
  </div>
  <ul class="chips">
    ${g.items.map(i => `<li><button type="button" class="chip" aria-pressed="false" data-uses="${i.uses.join(' ')}">${esc(i.name)}</button></li>`).join('')}
  </ul>
</article>`).join('\n');

const certsHTML = certs.length ? `<div class="certs" id="certifications" data-stagger>
  <h3 class="certs__title">Certifications</h3>
  <ul class="certs__list">
    ${certs.map(c => `<li class="cert card">
      ${c.badge ? `<img src="${esc(c.badge)}" alt="" width="56" height="56" loading="lazy" />` : ''}
      <div><h4>${esc(c.name)}</h4><p>${esc(c.issuer)} · ${esc(c.issued)}${c.expires ? ' · expires ' + esc(c.expires) : ''}</p>
      ${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">Verify credential <span aria-hidden="true">↗</span></a>` : ''}</div>
    </li>`).join('\n')}
  </ul>
</div>` : '';

let index = read('index.html');
index = inject(index, 'projects', projectsHTML);
index = inject(index, 'skills', skillsHTML);
index = inject(index, 'certs', certsHTML);
put('index.html', index);

/* ------------------------------------------------------- case-study pages */
const template = read('templates/project.html');
const headerMatch = index.match(/<header class="nav" id="nav">[\s\S]*?<\/header>/);
if (!headerMatch) throw new Error('nav header not found in index.html');
const navFor = base => headerMatch[0]
  .replace(/href="#home"/, `href="${base}"`)
  .replace(/href="#([a-z]+)"/g, (m, id) => `href="${base}#${id}"`);

const sectionHTML = s => {
  const body = s.table
    ? `<dl class="cs__table">${s.table.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`
    : `<ul class="cs__list">${s.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`;
  return `<section class="cs__section" id="${s.id}" data-reveal><h2>${esc(s.title)}</h2>${body}</section>`;
};

const pages = projects.filter(p => p.caseStudy);
pages.forEach((p, i) => {
  const base = '../../';
  const cs = json(`content/case-studies/${p.slug}.json`);
  const diagram = json(`content/diagrams/${p.slug}.json`);
  const url = `${site.url}projects/${p.slug}/`;
  const prev = pages[(i + pages.length - 1) % pages.length], next = pages[(i + 1) % pages.length];
  const desc = cs.lead.length > 158 ? cs.lead.slice(0, cs.lead.lastIndexOf(' ', 155)).replace(/[,;:]$/, '') + '…' : cs.lead;
  const ld = { '@context': 'https://schema.org', '@type': 'SoftwareSourceCode', name: p.title, description: cs.lead, codeRepository: p.repo && p.repo.url,
    programmingLanguage: p.tags.join(', '), author: { '@type': 'Person', name: site.name, url: site.url }, url };
  const html = template
    .replaceAll('{{base}}', base).replaceAll('{{title}}', esc(p.title)).replaceAll('{{pageTitle}}', esc(`${p.title} · Case study · ${site.name}`))
    .replaceAll('{{description}}', esc(desc)).replaceAll('{{url}}', url).replaceAll('{{ogImage}}', site.url + 'assets/og-image.jpg')
    .replaceAll('{{siteName}}', esc(site.name)).replaceAll('{{kind}}', esc(p.kind)).replaceAll('{{color}}', p.color)
    .replaceAll('{{iconSrc}}', base + esc(p.icon.src)).replaceAll('{{iconAlt}}', esc(p.icon.alt))
    .replaceAll('{{lead}}', esc(cs.lead)).replaceAll('{{tags}}', p.tags.map(t => `<li>${esc(t)}</li>`).join(''))
    .replaceAll('{{repo}}', p.repo ? `<a class="gh-btn" href="${esc(p.repo.url)}" target="_blank" rel="noopener" data-press>${githubIcon}${esc(p.repo.label)}</a>` : '')
    .replaceAll('{{nav}}', navFor(base)).replaceAll('{{diagram}}', diagramBlock(p.slug, diagram, base)).replaceAll('{{diagramTitle}}', esc(diagram.title))
    .replaceAll('{{sections}}', cs.sections.map(sectionHTML).join('\n'))
    .replaceAll('{{prevHref}}', `${base}projects/${prev.slug}/`).replaceAll('{{prevTitle}}', esc(prev.title))
    .replaceAll('{{nextHref}}', `${base}projects/${next.slug}/`).replaceAll('{{nextTitle}}', esc(next.title))
    .replaceAll('{{jsonld}}', JSON.stringify(ld).replace(/</g, '\\u003c'));
  put(`projects/${p.slug}/index.html`, html);
});

/* ----------------------------------------------------------------- sitemap */
const urls = [site.url, ...pages.map(p => `${site.url}projects/${p.slug}/`)];
put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);

if (CHECK) {
  if (stale.length) { console.error('Out of date, run: node scripts/build.mjs\n  ' + stale.join('\n  ')); process.exit(1); }
  console.log('Build output is up to date.');
} else {
  console.log(written.length ? 'Wrote:\n  ' + written.join('\n  ') : 'Nothing to change.');
  console.log(`${projects.length} project cards, ${skills.reduce((s, g) => s + g.items.length, 0)} skills, ${pages.length} case studies, ${certs.length} certifications.`);
}
