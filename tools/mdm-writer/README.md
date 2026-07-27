# MDM Note Writer

A self-hosted version of the MDM note artifact. It runs two ways from the same
code: deployed on Netlify at a real URL, or locally on `127.0.0.1` with no
hosting at all.

```
tools/mdm-writer/
  public/            <- the whole front end; this is what Netlify publishes
    index.html
    prompt.js        <- the system prompt, edit freely
    phi-redact.js    <- Safe Harbor PHI scrub, runs in the browser
  server.mjs         <- local-only server, not published
netlify/edge-functions/
  generate.ts        <- hosted generation endpoint, holds the API key
```

## PHI handling

Redaction runs in the browser, before anything is sent. The raw draft never
leaves the page, and the list of what was removed is not transmitted anywhere.
Only the scrubbed text goes to the API.

The panel under the draft shows what was removed and why. Click any item to put
it back, for the cases where the name matcher eats a clinical term. It is a
regex heuristic, so read the scrubbed text before you rely on it. It will not
catch a name it does not recognize as one.

Netlify does not sign a BAA outside enterprise plans. Anthropic will sign one
for API use. If that distinction matters for your setting, use the local mode,
where nothing but the scrubbed text ever leaves your machine.

## Deploy on Netlify

1. In Netlify, add a new site from this Git repository. `netlify.toml` already
   sets the publish directory and wires up the edge function, so take the
   defaults.
2. Under Site configuration > Environment variables, set the following for
   the Production deploy context. Include the Functions scope so the Edge
   Function can read them:

   | Variable | Required | Notes |
   | --- | --- | --- |
   | `ANTHROPIC_API_KEY` | yes | From console.anthropic.com |
   | `MDM_PASSPHRASE` | yes | Whatever you want to type once per device |
   | `MDM_MODEL` | no | Default `claude-opus-5` |
   | `MDM_EFFORT` | no | `low`, `medium`, `high`, `xhigh`, `max`. Default `medium` |
   | `MDM_MAX_TOKENS` | no | Default `8000`, includes thinking |

3. Trigger a new deploy after saving or changing environment variables. Open
   the site, enter the `MDM_PASSPHRASE` value once, and it is remembered on
   that device.

Netlify's site-level password protection is separate from `MDM_PASSPHRASE`.
The former controls access to the whole site; the latter protects the generation
endpoint from unauthorized API usage. Keep both enabled if you want both layers.

Only `tools/mdm-writer/public` is published. `bloodsweatxed.github.io` is
untouched and keeps being served by GitHub Pages, which ignores `netlify.toml`.

The endpoint refuses to run if `MDM_PASSPHRASE` is unset, so a missing variable
fails closed instead of quietly leaving an open endpoint spending your API
budget.

## Run locally instead

Requires Node 18 or newer.

```
cd tools/mdm-writer
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
./run.sh
```

Open http://127.0.0.1:8787. Ctrl-C to stop. `.env` and `key.txt` are gitignored.
No passphrase is needed here, since the server only listens on loopback. The
same environment variables above control the model.

## Using it

Pick a note type and a clinical mode, paste the draft, press generate. The note
streams in as it is written. Press copy to put it on the clipboard.

## Changing the behavior

The system prompt is `public/prompt.js` on its own. Edit and reload. There is no
build step in either mode.

## Why there is a server at all

Calling the Anthropic API straight from a web page means the API key sits in the
page, where anyone who opens it can read it. The edge function and the local
server both exist so the key stays somewhere the browser cannot see.

The hosted endpoint is an edge function rather than a normal Netlify function
because Netlify cuts synchronous functions off after about ten seconds, and a
long note on Opus with thinking on will run past that. Edge functions stream, so
output starts flowing immediately and never hits the limit.
