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
├── script.js     # mobile menu, nav behavior, scroll reveal
├── src/wavy-boxes.js     # source of the wavy boxes background (Three.js)
├── vendor/wavy-boxes.js  # built bundle that index.html loads (committed)
└── README.md
```

## Wavy boxes background
The site itself needs no build. Only if you edit `src/wavy-boxes.js`, run `npm install` once, then `npm run build:bg` to regenerate `vendor/wavy-boxes.js`. Wave speed, box gap, colours and camera are in the `CONFIG` object at the top of that file.

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
