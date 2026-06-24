# Pocket Checkride — Working Notes

Read this first. It encodes the build pipeline, file roles, and conventions so
edits don't accidentally break the deployed app.

## What this is
A static, installable PWA that quizzes 14 CFR Part 61 private-pilot knowledge.
Deployed via GitHub Pages; installs to the iPhone home screen. Zero runtime
build, zero CDN — everything ships precompiled and inlined.

## File roles (and which is the source of truth)

| File                     | Role                                              | Edit? |
| ------------------------ | ------------------------------------------------- | ----- |
| `app.src.jsx`            | **Source of truth.** All app logic lives here.    | ✅ Yes |
| `index.html`             | **Compiled artifact.** React UMD + compiled JSX inlined. Regenerate via build script. | ⚠️ Don't hand-edit |
| `manifest.webmanifest`   | PWA metadata (name, icon, colors)                 | ✅     |
| `icon.svg`               | App icon (used by manifest + apple-touch-icon)    | ✅     |
| `sw.js`                  | Service worker. Network-first; bump `CACHE` on shell changes. | ✅     |
| `build.sh` / `package.json` | Build pipeline (esbuild + inline)              | ✅     |
| `README.md`              | End-user run/install instructions                 | ✅     |

The deployable surface is `index.html` + `manifest.webmanifest` + `sw.js` +
`icon.svg`. Everything else is dev-time.

## Build pipeline

```
app.src.jsx ──[esbuild, jsx=transform]──> app.compiled.js
                                                │
                react.production.min.js  ───────┤
                react-dom.production.min.js ────┼──[concat]──> index.html
                head template ──────────────────┤
                tail (SW register) ─────────────┘
```

### Build command
```bash
npm install      # one-time
bash build.sh    # or: npm run build
```

After any change to `app.src.jsx`, **always** rebuild and commit `index.html`
alongside the source. GitHub Pages serves the built file directly.

## Conventions

**Paths.** All asset references inside `index.html`, `manifest.webmanifest`, and
`sw.js` are relative (`./icon.svg`, not `/icon.svg`). This keeps the app working
under any subpath (e.g. `username.github.io/pocket-checkride/`).

**Service worker.** Network-first for same-origin GETs; cross-origin (API calls)
passes straight through and is never cached. When the app shell changes (new
files, new precache list), bump `CACHE` in `sw.js` (e.g. `pocket-checkride-v2`
→ `v3`). Otherwise installed clients keep serving the previous cached version
until next online launch.

**Persistence keys.** `localStorage`:
- `part61ppl:v2` — `{ saved:[], deleted:[], edits:{}, generated:[], stats:{}, streak:{last,count} }`
  - `stats` — keyed by question `id`: `{ seen, correct, wrong, box, lastResult, lastTs }`.
    `box` is the Leitner level (0–5); `box >= MASTERY_BOX` (3) counts as "mastered".
    Drives Smart Review ordering, Missed-only mode, and the Stats dashboard.
  - `streak` — `{ last:"YYYY-MM-DD", count }`: consecutive-day study streak.
- `part61ppl:settings` — `{ apiKey, model }`

New fields are merged with `DEFAULT_STATE` on load (`loadState`), so adding an
optional field is backward compatible — no key bump needed. If the question
schema changes **incompatibly**, bump the key suffix (`:v3`) so old clients
start fresh instead of crashing.

**Backup/restore.** Settings → Export/Import dumps the entire `:v2` state object
(custom questions, edits, saved set, progress) to/from a JSON file. Import
validates shape (`generated` must be an array) before replacing state.

**Question schema (`BASE` array entries):**
```js
{ id, reg, topic, q, choices: [4], answer: 0-3, explain, quote }
```
- `id`: stable string. Base questions use `b01`, `b02`…; user-generated use `gen-<timestamp>`.
- `reg`: section number string, e.g. `"61.109"`. Used to build the eCFR URL.
- `quote`: short verbatim phrase from the section. Used in the URL's
  `#:~:text=` fragment so browsers scroll to + highlight the exact passage.

**Reg link convention.** Always use `regUrl(sec, quote)`. Never hand-build eCFR
URLs. The text-fragment highlight is the whole point of the reg cite chip.

**Styling.** Inline styles in the `S` object; CSS template literal for things
that need pseudo-classes / keyframes. Accent color: `#f0a44c`. Background:
`#0d1117`. Success green: `#5fd38a`. Error red: `#f0775c`.

## Adding a feature — checklist

1. Edit `app.src.jsx` only. Don't touch `index.html`.
2. If you added a new persisted field, decide: bump the storage key, or merge with defaults on load.
3. Run `bash build.sh` to regenerate `index.html`.
4. If you changed `index.html`/`sw.js`/`manifest`/`icon` shell, bump `CACHE` in `sw.js`.
5. Commit both `app.src.jsx` and the new `index.html` (plus any changed assets) in the same commit.
6. Pages redeploys automatically; installed clients update on next online launch.

## Things to NOT do

- Don't add Babel-standalone or any CDN script to `index.html`. The whole reason
  the first attempt hung on "Loading…" was depending on in-browser compilation
  and external scripts. Everything is inlined and precompiled on purpose.
- Don't import npm packages into `app.src.jsx`. The file is compiled in isolation
  (jsx transform only, no bundling). React/ReactDOM are globals from the inlined
  UMD builds. If a new dep is genuinely needed, switch to `esbuild --bundle` and
  reconsider the inlining strategy.
- Don't commit `node_modules/`, `app.compiled.js`, or any API key. The user's
  Anthropic key lives only in their browser's localStorage.
- Don't change relative paths to absolute (`/icon.svg`). Breaks GitHub Pages
  subpaths.
- Don't reproduce eCFR regulatory text verbatim beyond the short `quote` phrase
  used for highlighting. The `quote` is short, source-attributed, and serves a
  functional purpose (text fragment matching).

## Study features

The Quiz tab opens on a **setup screen** (`QuizHome`): pick a **mode**, topic,
and length, then start.
- **Smart Review** — spaced-repetition order (`buildSession` → `duePriority`):
  unseen questions first, then lowest Leitner `box`, random tiebreak.
- **Practice** — every question, shuffled.
- **Missed Only** — questions with lifetime `wrong > 0`.
- **Exam** — FAA-style; `instant=false` hides per-question feedback and shows a
  full answer-by-answer review on the results screen.

The **Stats** tab (`computeStats`) shows streak, overall accuracy, a mastery
ring, and per-topic accuracy bars (weakest first) each with a one-tap **Drill**.
Answering anywhere updates `stats`/`streak` via `recordAnswer`.

Other niceties: keyboard input in the quiz (`1–4`/`A–D` to answer, `Enter`/`→`
to advance, `R` to retry), `navigator.vibrate` haptics, and Export/Import backup.

## Coverage status

Covers the full §61.109(a) ASEL hour breakdown plus §61.103, §61.23, §61.3,
§61.105, §61.107, §61.113, §61.57, §61.56 (flight review), §61.31
(endorsements), §61.51 (logging), §61.60, §61.15 — and a 25-question Instrument
(§61.65 / §61.57) section. Possible expansions: Commercial (§61.129), more
scenario-format questions, weather/airspace knowledge areas.
