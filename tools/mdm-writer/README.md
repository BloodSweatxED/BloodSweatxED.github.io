# MDM Note Writer (local)

A self-hosted version of the MDM note artifact. It runs on your own machine at
`http://127.0.0.1:8787` and talks to the Anthropic API through a small local
server that holds your API key.

Nothing about it is published. The page is not on the public site in any usable
form, it is not indexed, and the server only listens on loopback, so nothing on
your network or the internet can reach it.

## Requirements

Node 18 or newer. Check with `node --version`.

## Setup

Get an API key from https://console.anthropic.com and put it in a file next to
`server.mjs`:

```
cd tools/mdm-writer
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
```

`.env` and `key.txt` are both gitignored, so the key never gets committed. You
can also just set the environment variable instead of using a file.

## Run

```
cd tools/mdm-writer
./run.sh
```

Or, without the script:

```
ANTHROPIC_API_KEY=sk-ant-... node server.mjs
```

Then open http://127.0.0.1:8787 in a browser. Stop it with Ctrl-C.

## Using it

Pick a note type and a clinical mode, paste the de-identified draft, and press
generate. The note streams in as it is written. Press copy to put it on the
clipboard.

De-identify before pasting. The draft is sent to the Anthropic API, so treat it
the way you would treat anything leaving your own machine.

## Changing the behavior

The whole system prompt is in `prompt.js`. Edit it and reload the page. There is
no build step.

Model settings are environment variables read by `server.mjs`:

| Variable | Default | Notes |
| --- | --- | --- |
| `MDM_MODEL` | `claude-opus-5` | Any current model ID |
| `MDM_EFFORT` | `medium` | `low`, `medium`, `high`, `xhigh`, `max` |
| `MDM_MAX_TOKENS` | `8000` | Output cap, includes thinking |
| `PORT` | `8787` | Local port |

For example, to run cheaper and faster:

```
MDM_MODEL=claude-sonnet-5 MDM_EFFORT=low node server.mjs
```

## Why it works this way

Calling the Anthropic API straight from a web page means the API key has to be
in the page, where anyone who opens the file can read it. The small Node server
exists so the key stays in a process on your machine and the browser only ever
talks to `127.0.0.1`.
