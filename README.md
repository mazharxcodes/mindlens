# MindLens

MindLens is a Chrome extension for Instagram Web that detects repetitive feed patterns, estimates bias locally in the browser, and injects a short “wider lens” prompt to interrupt doomscrolling loops.

It is a local-first prototype:

- heuristic analysis by default
- optional Ollama-based generation
- no paid API required
- no Instagram backend access

## Features

- Manifest V3 Chrome extension for Instagram Web
- DOM-based post extraction from feed `article` nodes
- local classification for category, sentiment, tone, intensity, and confidence
- rolling bias score over recent viewed posts
- subtle intervention card with expandable copy
- popup control room for settings and metrics
- replay lab for repeatable scenario testing
- local storage for settings and intervention metrics

## Tech Stack

- TypeScript
- Chrome Extension APIs
- esbuild
- `chrome.storage.local`
- optional Ollama for local model generation

## Quick Start

- Node.js 18+
- npm
- Google Chrome

```bash
npm install
npm run build
```

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the `dist/` directory
5. Open `https://www.instagram.com/`
6. Click the MindLens extension icon to open Control Room

After rebuilding, reload the extension from the extensions page.

### Basic Use

- Keep `Mode: Local` for the fastest zero-setup experience
- Scroll Instagram Web normally
- When the feed becomes repetitive enough, MindLens will show a wider-perspective prompt
- Use the popup to adjust the intervention threshold if prompts feel too rare or too frequent

## Core Flow

MindLens:

1. extracts visible Instagram feed content
2. analyzes viewed posts locally
3. computes a rolling bias score
4. generates a fuller-perspective intervention
5. tracks whether the user expands or dismisses it

By default, analysis stays in-browser and generation falls back to a built-in local writer.

## Ollama Setup

Pull a local model:

```bash
ollama pull llama3.2:3b
```

Start Ollama with extension-origin access enabled:

```bash
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

If you prefer a stricter setup, replace `*` with your extension id.

Use these values in MindLens Control Room:

```text
Mode: Ollama
Ollama Model: llama3.2:3b
Ollama Endpoint: http://127.0.0.1:11434/api/generate
```

If MindLens shows an Ollama `403`, verify it with:

```bash
curl http://127.0.0.1:11434/api/generate \
  -H 'Content-Type: application/json' \
  -H 'Origin: chrome-extension://test' \
  -d '{"model":"llama3.2:3b","prompt":"Say hello briefly.","stream":false}'
```

If Ollama is unavailable or rejected, MindLens falls back to local generation.

## Popup and Testing

The popup lets you inspect the live bias snapshot, change the intervention threshold, switch generation modes, review metrics, and open the replay lab.

If the popup looks stale after reloading the extension, refresh the Instagram tab once.

## Debugging Forced Interventions

To test prompt generation without waiting for the feed to build a loop, open DevTools on the Instagram tab and run:

```js
await window.__MINDLENS_DEBUG__.forceIntervention();
```

Or test a custom synthetic scenario:

```js
await window.__MINDLENS_DEBUG__.forceIntervention({
  dominantCategory: "relationships",
  dominantSentiment: "negative",
  dominantTone: "victimhood",
  score: 0.92,
  repeatedSignalRatio: 0.81,
});
```

This is the fastest way to verify whether Ollama is working and inspect the style of generated interventions.

## Privacy

- Runs only on `instagram.com`
- Reads visible feed text from the current page
- Stores settings and metrics locally in the browser
- Does not require a backend in the default setup
- Only contacts Ollama or another provider if you explicitly enable that mode

## Architecture

High-level and low-level diagrams are available in:

- [`docs/architecture.md`](https://github.com/mazharxcodes/mindlens/blob/main/docs/architecture.md)

## Development

```bash
npm run build
npm run dev
npm run typecheck
```

## License

MIT. See [LICENSE](https://github.com/mazharxcodes/mindlens/blob/main/LICENSE).
