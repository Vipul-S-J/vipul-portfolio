// Pulls the site's content out of index.html as plain data.
// Used by extract-manifest.mjs (baseline) and check-parity.mjs (every build).
// Node standard library only.

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&middot;': '·', '&mdash;': '—', '&rarr;': '→' };

export function text(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, g) => {
      if (ENT[m]) return ENT[m];
      if (g[0] === '#') return String.fromCodePoint(g[1] === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10));
      return m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function between(src, startMarker, endMarker) {
  const a = src.indexOf(startMarker);
  if (a < 0) throw new Error('marker not found: ' + startMarker);
  const b = endMarker ? src.indexOf(endMarker, a + startMarker.length) : src.length;
  return src.slice(a, b < 0 ? src.length : b);
}
const all = (re, s) => [...s.matchAll(re)];
const one = (re, s) => { const m = s.match(re); return m ? m[1] : ''; };

export function extract(indexHtml) {
  const src = indexHtml;
  const hero = between(src, 'id="home"', 'id="projects"');
  const projects = between(src, 'id="projects"', 'id="experience"');
  const experience = between(src, 'id="experience"', 'id="skills"');
  const skills = between(src, 'id="skills"', 'id="about"');
  const about = between(src, 'id="about"', 'id="contact"');
  const contact = between(src, 'id="contact"', '</main>');

  const out = {};
  out.hero = {
    eyebrow: text(one(/class="hero__eyebrow"[^>]*>([\s\S]*?)<\/p>/, hero)),
    title: text(one(/<h1[^>]*>([\s\S]*?)<\/h1>/, hero)),
    typedFallback: text(one(/id="typed">([\s\S]*?)<\/span>/, hero)),
    lead: text(one(/class="hero__lead"[^>]*>([\s\S]*?)<\/p>/, hero)),
    ctas: all(/<a href="(#[a-z]+)" class="btn[^"]*"[^>]*>([\s\S]*?)<\/a>/g, hero).map(m => ({ href: m[1], label: text(m[2]) })),
  };
  const statsBlock = one(/<ul class="stats"[^>]*>([\s\S]*?)<\/ul>/, src);
  out.stats = all(/<li class="stat"[^>]*>([\s\S]*?)<\/li>/g, statsBlock).map(m => ({
    value: (one(/data-prefix="([^"]*)"/, m[1])) + one(/data-count="([^"]*)"/, m[1]) + (one(/data-suffix="([^"]*)"/, m[1])),
    label: text(one(/<span>([\s\S]*?)<\/span>/, m[1])),
  }));

  const cards = projects.split(/<li class="pcard(?:\s[^"]*)?"/).slice(1);
  out.projects = cards.map(c => ({
    title: text(one(/class="pcard__title"[^>]*>([\s\S]*?)<\/h3>/, c)),
    kind: text(one(/class="pcard__kind"[^>]*>([\s\S]*?)<\/p>/, c)),
    desc: text(one(/class="pcard__desc"[^>]*>([\s\S]*?)<\/p>/, c)),
    flow: all(/<li><span>([\s\S]*?)<\/span><\/li>/g, one(/<ol class="flow"[^>]*>([\s\S]*?)<\/ol>/, c)).map(m => text(m[1])),
    tags: all(/<li>([^<]*)<\/li>/g, one(/<ul class="tags">([\s\S]*?)<\/ul>/, c)).map(m => text(m[1])),
    links: all(/href="(https?:\/\/[^"]+)"/g, c).map(m => m[1]),
  }));

  out.experience = experience.split('<article class="tl-item"').slice(1).map(a => ({
    role: text(one(/class="tl-role"[^>]*>([\s\S]*?)<\/h3>/, a)),
    date: text(one(/class="tl-date"[^>]*>([\s\S]*?)<\/p>/, a)),
    bullets: all(/<li>([\s\S]*?)<\/li>/g, one(/<ul class="tl-points">([\s\S]*?)<\/ul>/, a)).map(m => text(m[1])),
    tags: all(/<li>([^<]*)<\/li>/g, one(/<ul class="tags">([\s\S]*?)<\/ul>/, a)).map(m => text(m[1])),
  }));

  out.skills = skills.split('<article class="skill-card').slice(1).map(a => ({
    group: text(one(/<h3>([\s\S]*?)<\/h3>/, a)),
    items: all(/<li[^>]*>([\s\S]*?)<\/li>/g, one(/<ul class="chips">([\s\S]*?)<\/ul>/, a)).map(m => text(m[1])),
  }));

  out.about = {
    paragraphs: all(/<p>([\s\S]*?)<\/p>/g, one(/class="about__text"[^>]*>([\s\S]*?)<ul class="about__tech"/, about)).map(m => text(m[1])),
    tech: all(/<li>([\s\S]*?)<\/li>/g, one(/<ul class="about__tech"[^>]*>([\s\S]*?)<\/ul>/, about)).map(m => text(m[1])),
    facts: all(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g, about).map(m => [text(m[1]), text(m[2])]),
  };

  out.contact = {
    title: text(one(/class="contact__title"[^>]*>([\s\S]*?)<\/h2>/, contact)),
    text: text(one(/class="contact__text"[^>]*>([\s\S]*?)<\/p>/, contact)),
    links: all(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, one(/<ul class="contact__socials">([\s\S]*?)<\/ul>/, contact)).map(m => ({ href: m[1], label: text(m[2]) })),
    email: one(/data-email="([^"]*)"/, contact),
  };
  return out;
}
