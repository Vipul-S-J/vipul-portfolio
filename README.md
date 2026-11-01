# Vipul S Jain — Portfolio

A single-page, dependency-free developer portfolio. Plain HTML, CSS, and vanilla JS —
no build step, no frameworks.

## Run locally

Just open `index.html` in a browser. Or serve it (recommended, so fonts/paths behave):

```bash
# from inside the portfolio/ folder
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Structure

```
portfolio/
├── index.html    # content + markup
├── styles.css    # dark theme, layout, animations
├── intro.js      # entry animation driver (the boy is inline SVG in index.html)
├── script.js     # theme, command palette, nav behavior, scroll reveal
├── 404.html, robots.txt, sitemap.xml
└── README.md
```

## Features
- **Entry animation.** A boy pushes the black screen, gets stuck halfway and strains until it gives, then shoves it off to reveal the name; the page then lifts away (`intro.js`, plain SVG + JS). Plays once per 24 hours per browser (refreshing never replays it); add `?intro` to the URL (or use "Replay intro animation" in the palette) to see it again. Skipped for reduced-motion visitors and `#hash` links; Esc or the Skip button ends it early.
- **Light / dark theme.** Toggle in the nav; the choice is saved and the default is dark. The switch uses the View Transitions API where available.
- **Command palette.** `Ctrl+K` (`⌘K` on Mac) or the search button. Jump to sections, open project repos and profiles, copy the email, switch theme, pause animations. Entries are read from the page, so there is nothing to keep in sync.
- **Back-to-top button**, shown after the first screen.
- **Print styles.** `Ctrl+P` gives a clean, light, single-column copy.
- **Share cards.** Open Graph / Twitter tags and `assets/og-image.jpg` (1200×630), plus `Person` structured data, `robots.txt`, `sitemap.xml` and a `404.html`.

## Before you publish — fill these in

Search for `TODO` and the placeholder links in `index.html`:

- LinkedIn handle  → `https://linkedin.com/in/your-handle`
- GitHub handle    → `https://github.com/your-handle`
- Project links    → the `↗` links in the Projects section currently point to `#`
- Location         → "Bengaluru, India" (update if needed)
- Certifications   → not shown yet; add a section if you want to feature them

## Deploy (free options)

- **GitHub Pages:** push this folder to a repo, enable Pages on the `main` branch.
- **Netlify / Vercel:** drag-and-drop the folder, or connect the repo. No build command needed.
```
