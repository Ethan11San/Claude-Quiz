# Pocket Checkride — Part 61 PPL

A self-contained FAA Part 61 private-pilot quiz, installable on your phone as
a PWA. React is inlined and the app is precompiled — nothing loads from the
internet to run it.

## Run it

**Open directly:** Double-click `index.html`. Works offline. (Regenerate needs
an API key — see below.)

**Install as an app (recommended):**
```bash
cd pocket-checkride
python3 -m http.server 8000
```
Open `http://localhost:8000` in Chrome / Edge / Safari → browser menu →
"Install app" / "Add to Home Screen." Full-screen launch, offline support, icon.

## Enable Regenerate
Tap the ⚙ gear → paste an Anthropic API key (console.anthropic.com → API Keys)
→ Save. The key is stored only in your browser. New API accounts get $5 in
starter credits, which covers thousands of regenerations on Haiku.

## Editing the app

The source is `app.src.jsx`. After editing it, rebuild `index.html`:
```bash
./build.sh
```
Requires Node 18+. First run installs esbuild + react locally (cached in
`node_modules/`, ignored by git).

Project conventions and structure are documented in `CLAUDE.md` — Claude Code
reads that file automatically when you open the repo locally.

## Files
- `app.src.jsx` — React source (edit this)
- `index.html` — built artifact (don't edit by hand)
- `manifest.webmanifest`, `icon.svg`, `sw.js` — PWA assets
- `build.sh` — rebuild script
- `CLAUDE.md` — project notes for Claude

Study aid only — verify against the current eCFR. Part 141 minimums differ.
