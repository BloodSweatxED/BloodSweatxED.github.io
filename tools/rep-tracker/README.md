# Rep Tracker — Proof of Concept

A single-page test of camera-based rep counting (squats and bicep curls),
built to check whether the core loop feels good before building a real iOS
version. Pose tracking runs entirely client-side with TensorFlow.js + MoveNet;
nothing is uploaded anywhere.

```
tools/rep-tracker/
  public/
    index.html   <- the whole thing, front end only, no backend
  netlify.toml    <- publishes public/, scoped to this directory
```

## Deploy on Netlify

1. In Netlify, add a new site from this Git repository.
2. Under **Site configuration > Build & deploy > Continuous deployment**, set
   **Base directory** to `tools/rep-tracker`. Netlify will pick up the
   `netlify.toml` in that directory (publish = `public`, no build command).
3. Deploy. No environment variables are required — the page is fully static
   and does all pose detection in the browser.

Only `tools/rep-tracker/public` is published. `bloodsweatxed.github.io` is
untouched and keeps being served by GitHub Pages, which ignores
`netlify.toml`. The MDM Note Writer's own Netlify site (base directory =
repo root) is unaffected too.

## Run locally instead

Just open `public/index.html` in a browser — no server needed, though some
browsers restrict camera access (`getUserMedia`) on file:// URLs, so serving
it over `http://localhost` (e.g. `npx serve public`) is more reliable.
