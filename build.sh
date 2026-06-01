#!/usr/bin/env bash
# Compile app.src.jsx → app.compiled.js, then stitch index.html with React UMD inlined.
# See CLAUDE.md for the full pipeline rationale.
set -eu
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Installing dependencies (one-time)…"
  npm install --silent
fi

echo "→ Compiling app.src.jsx (JSX transform, no bundle)"
npx --no-install esbuild app.src.jsx --jsx=transform --outfile=app.compiled.js --log-level=error

echo "→ Stitching index.html (React UMD + compiled app, inlined)"
{
  cat <<'HEAD'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#0d1117" />
<title>Pocket Checkride — Part 61 PPL</title>
<link rel="manifest" href="./manifest.webmanifest" />
<link rel="icon" href="./icon.svg" />
<link rel="apple-touch-icon" href="./icon.svg" />
<style>
  html,body{margin:0;background:#0d1117;}
  #root{min-height:100vh;}
  .loading{min-height:100vh;display:grid;place-items:center;color:#f0a44c;font-family:ui-monospace,Menlo,monospace;font-size:14px;}
</style>
<script>
window.addEventListener('error', function (ev) {
  var r = document.getElementById('root');
  if (r && r.querySelector('.loading')) {
    r.innerHTML = '<pre style="color:#f0917c;padding:24px;font:13px ui-monospace,monospace;white-space:pre-wrap;line-height:1.5">Startup error:\n\n' +
      ((ev && (ev.message || ev.error)) || 'unknown') + '\n\nTry serving the folder over http (see README) and reload.</pre>';
  }
});
</script>
</head>
<body>
<div id="root"><div class="loading">Loading Pocket Checkride…</div></div>
<script>/* === React 18 (UMD, inlined) === */
HEAD
  cat node_modules/react/umd/react.production.min.js
  echo
  echo '</script>'
  echo '<script>/* === ReactDOM 18 (UMD, inlined) === */'
  cat node_modules/react-dom/umd/react-dom.production.min.js
  echo
  echo '</script>'
  echo '<script>/* === Pocket Checkride app (precompiled, no Babel) === */'
  cat app.compiled.js
  echo
  echo '</script>'
  cat <<'TAIL'
<script>
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  });
}
</script>
</body>
</html>
TAIL
} > index.html

echo "✓ Built index.html ($(wc -c < index.html) bytes)"
echo
echo "Next: git add -A && git commit -m 'rebuild' && git push"
