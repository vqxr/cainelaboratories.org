# Bloomsbury Burger Therapeutics — Research Interface

> CAR-T for Endometriosis. Guided by single-cell genomics.

## Structure

```
bbt-site/
├── index.html        → Overview & manifesto
├── pipeline.html     → Full technical architecture (interactive step-through)
├── math.html         → Complete mathematical derivation with LaTeX (MathJax)
├── dataset.html      → Data provenance & validation strategy
├── console.html      → Live lab dashboard with charts
├── style.css         → Dark research aesthetic
├── script.js         → Animations, charts, dynamic data
├── vercel.json       → Vercel deployment config
└── assets/
    └── top_pairs.json → Candidate marker pair data
```

## Deploy to Vercel

### Option 1 — Vercel CLI (fastest)
```bash
npm i -g vercel
cd bbt-site
vercel
```

### Option 2 — GitHub + Vercel (recommended)

1. Create a new GitHub repo (private or public)
2. Push this folder:
```bash
cd bbt-site
git init
git add .
git commit -m "init: BBT research interface"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bbt-research.git
git push -u origin main
```
3. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
4. Select the repo, leave all settings as default (no build command needed)
5. Deploy — Vercel auto-detects static site

Your site will be live at `https://bbt-research.vercel.app` (or your custom domain).

## Local development

Just open `index.html` in a browser. No build step needed.

For local server (avoids CORS issues with `fetch('./assets/top_pairs.json')`):
```bash
# Python
python3 -m http.server 3000

# Node
npx serve .
```
Then open `http://localhost:3000`.

## Adding custom domain on Vercel

1. Vercel Dashboard → Project → Settings → Domains
2. Add your domain (e.g. `research.bloomsburyburger.com`)
3. Follow DNS instructions

## MathJax

The site uses MathJax 3 (loaded from Cloudflare CDN) for LaTeX rendering.
The `math.html` page contains the full mathematical derivation.
Supported syntax: `$inline$`, `$$display$$`, `\[display\]`.

## Updating candidate pairs

Edit `assets/top_pairs.json` — the console and pipeline pages load this dynamically.

Schema:
```json
{
  "rank": 1,
  "markerA": "GENE1",
  "markerB": "GENE2",
  "specificity_score": 0.97,
  "safety_score": 0.99,
  "combined_score": 0.981,
  "lesion_prevalence": 0.91,
  "healthy_prevalence": 0.02,
  "tabula_clear": true,
  "scfv_available": true
}
```

---

*pre-seed · pre-revenue · pre-sanity*
