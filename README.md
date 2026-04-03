# MindLens

MindLens is a Chrome extension for Instagram Web that detects repetitive feed patterns, estimates content bias locally in the browser, and injects subtle counter-perspectives to break passive doomscrolling loops.

This project is built as a production-shaped prototype:
- heuristic-first and lightweight by default
- optional local AI generation through Ollama
- no paid API required for the current version
- no backend dependency required for the default setup

## What It Does

MindLens watches the Instagram Web feed and:
- extracts visible post text from the DOM
- classifies content locally by category, sentiment, and tone
- tracks dwell time and scroll behavior
- computes a rolling bias score over recent posts
- shows a small intervention card when a one-sided pattern becomes strong enough
- tracks whether the intervention was ignored, expanded, or dismissed

The goal is not to argue with the user. It is to introduce nuance at the right moment, in a restrained way.

## Current Capabilities

- Chrome Extension built with Manifest V3
- Instagram Web content script
- resilient post text extraction from feed `article` nodes
- local heuristic classifier with:
  - weighted category scoring
  - sentiment scoring
  - tone detection
  - confidence calibration
  - hashtag parsing
  - basic negation handling
- sliding-window bias detection
- intervention timing logic with anti-spam controls
- provider system for perspective generation:
  - `local`
  - `ollama`
  - `remote` architecture path
- popup control room for settings and metrics
- replay harness for repeatable scenario testing
- local metrics storage in `chrome.storage.local`

## What It Does Not Do

- It does not work on the Instagram mobile app
- It does not integrate with Instagram backend APIs
- It does not require OpenAI or any paid API to run the current default version
- It does not send browsing data to a backend unless you explicitly add and enable a remote provider later

## Tech Stack

- TypeScript
- Chrome Extension (Manifest V3)
- esbuild
- Chrome Storage API
- Optional Ollama for local model-based generation

## Project Structure

```text
public/
  manifest.json
  popup.html
  popup.css
  harness.html
  harness.css

scripts/
  build.mjs

src/
  background/
    index.ts
  content/
    extractor.ts
    feed-observer.ts
    local-analyzer.ts
    local-analysis-engine.ts
    bias-detector.ts
    intervention-controller.ts
    metrics-tracker.ts
    settings-store.ts
    provider-registry.ts
    ...
  popup/
    index.ts
  harness/
    fixtures.ts
    index.ts
  shared/
    runtime.ts
```

## Architecture Overview

### 1. Content Extraction

The content script scans Instagram feed `article` elements and extracts:
- visible text
- image alt text
- post identity hints such as permalink or timestamp

### 2. Local Analysis

Posts are analyzed in-browser using a heuristic classifier that returns:

```ts
{
  category,
  sentiment,
  tone,
  intensity,
  confidence,
  sentimentScore,
  categoryScores,
  toneScores,
  hashtags,
  matchedSignals
}
```

### 3. Bias Detection

The bias detector maintains a recent sliding window and computes:
- category dominance
- sentiment skew
- tone skew
- repeated signal ratio
- average confidence
- a final bias score

### 4. Perspective Generation

MindLens supports multiple perspective providers:
- `local`: built-in template-based generation
- `ollama`: local model generation via Ollama
- `remote`: reserved for future hosted generation

### 5. Intervention Timing

Interventions are delayed until the user reaches a better moment:
- lower scroll velocity
- short quiet window
- enough dwell time on the active post
- cooldowns to avoid repetitive prompting

### 6. Metrics

The extension tracks:
- shown
- expanded
- dismissed
- ignored
- pause after shown
- generation failures
- usage by provider

## Setup

### Prerequisites

- Node.js 18+
- npm
- Google Chrome

### Install

```bash
npm install
npm run build
```

### Load the Extension

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the `dist/` directory

After rebuilding, reload the extension from the Chrome extensions page.

## Development

### Build Once

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Type Check

```bash
npm run typecheck
```

## Using MindLens

### Default Free Mode

The default version works without any AI provider setup.

Use the extension popup to:
- see live feed bias state
- adjust intervention threshold
- inspect metrics
- open the replay lab

### Optional Ollama Mode

If you want local model-generated intervention copy, install and run Ollama.

Example:

```bash
ollama pull llama3.2:3b
ollama run llama3.2:3b "hello"
```

Then in the popup:
- set generation mode to `ollama`
- confirm the Ollama endpoint is `http://127.0.0.1:11434/api/generate`
- confirm the Ollama model is `llama3.2:3b`
- save and reload the Instagram tab

If Ollama is unavailable, the extension falls back to the built-in local generator.

Recommended MindLens Control Room values:

```text
Mode: Ollama
Ollama Model: llama3.2:3b
Ollama Endpoint: http://127.0.0.1:11434/api/generate
```

### Ollama Origin Setup For Chrome Extensions

If `curl http://127.0.0.1:11434/api/tags` works but MindLens shows an Ollama `403`, Ollama is usually rejecting the browser extension origin.

You can verify that with:

```bash
curl http://127.0.0.1:11434/api/generate \
  -H 'Content-Type: application/json' \
  -H 'Origin: chrome-extension://test' \
  -d '{"model":"llama3.2:3b","prompt":"Say hello briefly.","stream":false}'
```

If that returns `403`, restart Ollama with `OLLAMA_ORIGINS` set to allow the extension origin.

Broad local-dev option:

```bash
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

Stricter option:

```bash
OLLAMA_ORIGINS="chrome-extension://<your-extension-id>" ollama serve
```

After restarting Ollama:
- reload the extension in `chrome://extensions`
- refresh the Instagram tab
- test Ollama mode again

Complete local setup example:

```bash
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

Then use these values in MindLens Control Room:

```text
Mode: Ollama
Ollama Model: llama3.2:3b
Ollama Endpoint: http://127.0.0.1:11434/api/generate
```

## Replay Lab

MindLens includes an internal replay harness for repeatable testing.

Open the popup and click `Open Replay Lab`.

The harness lets you:
- replay curated feed scenarios
- inspect resulting bias scores
- preview generated interventions
- export replay output as JSON

Included sample scenarios:
- Relationship Doom Loop
- Hustle Grind Loop
- Mixed Balanced Feed

This is useful for regression testing and calibration without relying on live Instagram behavior.

## Popup Features

The popup acts as a tester-facing control room.

It includes:
- onboarding for first-time testers
- tester readiness guidance
- live bias snapshot
- provider diagnostics
- intervention threshold control
- generation mode selection
- metrics summary
- recent intervention history

## Permissions and Privacy

MindLens is intentionally scoped narrowly.

- Runs only on `instagram.com`
- Reads visible text from the current Instagram Web feed
- Stores metrics and settings locally in the browser
- Does not require a backend for default operation
- Only calls an external/local generation endpoint if you explicitly enable that provider

## Reliability Notes

- If the popup shows stale or empty live data after reloading the extension, refresh the Instagram tab once
- If you reload the extension while an old content script is still active in the page, Chrome may show `Extension context invalidated` until the page is refreshed
- If Ollama mode fails, MindLens should fall back to local generation

## Current Product Status

This repository is a strong v1 prototype with production-minded architecture:
- modular TypeScript code
- provider abstraction
- replayable test harness
- local-first default behavior
- tester-friendly popup UX

It is ready for:
- internal testing
- product demos
- architecture review
- resume/portfolio presentation

## Roadmap Ideas

Likely next steps:
- more realistic replay fixtures
- exportable session summaries
- richer onboarding and options page
- stronger classifier calibration using collected replay data
- hosted provider integration when spending is justified

## Scripts

```bash
npm run build
npm run dev
npm run typecheck
```

## License

This project is licensed under the MIT License. See [`LICENSE`](https://github.com/mazharxcodes/mindlens/blob/dev/LICENSE).
