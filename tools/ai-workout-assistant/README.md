# AI Workout Assistant

Third-party project by Mochammad Galang Rivaldo
(https://github.com/reevald/ai-workout-assistant), MIT licensed
(see `LICENSE.upstream`). Mirrored here as a pre-built static bundle from
the upstream `public/` output, with the upstream Google Analytics tag and
`aiworkout.live` canonical links stripped so visitor data doesn't flow to
the original author's account.

Pose detection (push-up, squat) and rep counting via TensorFlow.js +
MoveNet, fully client-side.

```
tools/ai-workout-assistant/
  public/            <- pre-built static bundle from upstream, Netlify publishes this
  LICENSE.upstream    <- upstream MIT license, kept per license terms
  netlify.toml         <- publishes public/, scoped to this directory
```

## Deploy on Netlify

1. In Netlify, add a new site from this Git repository.
2. Under **Site configuration > Build & deploy > Continuous deployment**, set
   **Base directory** to `tools/ai-workout-assistant`. Netlify will pick up
   the `netlify.toml` in that directory (publish = `public`, no build
   command).
3. Deploy. No environment variables are required — the page is fully static.

Only `tools/ai-workout-assistant/public` is published. `bloodsweatxed.github.io`
is untouched and keeps being served by GitHub Pages, which ignores
`netlify.toml`. Other Netlify sites for this repo (MDM Note Writer, Rep
Tracker) are unaffected too.

## Updating from upstream

This is a static snapshot, not a git submodule. To pull in upstream changes,
re-clone `reevald/ai-workout-assistant`, copy its built `public/` directory
over this one, and re-strip the Google Analytics tag and `aiworkout.live`
canonical links from `public/index.html`.
