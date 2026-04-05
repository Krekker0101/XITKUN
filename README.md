# Abdulloh Ashurov Assistant

Private, local-first AI copilot for meetings, interviews, and focused work.

## Overview

Abdulloh Ashurov Assistant is a desktop application built with Electron, Vite, React, TypeScript, and Rust-backed audio tooling. It is designed for live assistance workflows: capture context, route it through your preferred model provider, and keep notes and transcripts organized locally.

This codebase was professionally rebranded and cleaned up to center ownership under **Abdulloh Ashurov**, reduce hard-coded identity strings, and make future branding changes safer.

## What It Does

- Live meeting assistance with overlay-style UI
- Screenshot capture and AI analysis
- Real-time transcription workflows
- Local meeting history and context retrieval
- Multiple AI provider integrations, including local model paths
- Desktop packaging for Windows and macOS

## Architecture

- `src/`: main renderer app used by the Electron shell
- `electron/`: main process, IPC, update flow, calendar integration, local data services
- `native-module/`: Rust-based native audio module
- `assets/`: icons, previews, packaging resources
- `scripts/`: build and maintenance scripts
- `docs/`: release and operational notes

## Branding and Ownership

The main branding layer now lives in two dedicated config files:

- [`src/config/brand.ts`](/c:/Users/Креккер/Desktop/PY/natively-cluely-ai-assistant-main/src/config/brand.ts)
- [`electron/config/brand.ts`](/c:/Users/Креккер/Desktop/PY/natively-cluely-ai-assistant-main/electron/config/brand.ts)

These files centralize:

- app name
- owner name
- repository metadata
- release artifact naming
- optional contact and support links

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Rust toolchain if you need to rebuild the native module

### Install

```bash
npm install
```

### Run in Development

```bash
npm run app:dev
```

### Build the Renderer

```bash
npm run build
```

### Build the Desktop App

```bash
npm run app:build
```

## Configuration Notes

- AI credentials and provider settings are configured through the application settings UI.
- Calendar OAuth expects valid Google credentials in environment variables.
- Release endpoints currently point to the assumed GitHub repository:
  `AbdullohAshurov/abdulloh-ashurov-assistant`

If your actual repository or public profile differs, update:

- [`package.json`](/c:/Users/Креккер/Desktop/PY/natively-cluely-ai-assistant-main/package.json)
- [`src/config/brand.ts`](/c:/Users/Креккер/Desktop/PY/natively-cluely-ai-assistant-main/src/config/brand.ts)
- [`electron/config/brand.ts`](/c:/Users/Креккер/Desktop/PY/natively-cluely-ai-assistant-main/electron/config/brand.ts)

## Privacy Positioning

The product is positioned as a **local-first** assistant:

- transcripts and context are intended to stay on-device where possible
- user-triggered actions are preferred over background collection
- model routing is explicit and configurable

You should still review every provider integration and deployment setting before distributing the app in production environments.

## Project Quality Improvements Applied

- centralized product branding and owner identity
- replaced hard-coded legacy author references in UI, Electron flows, and LLM prompts
- improved package metadata and licensing alignment
- upgraded HTML metadata and manifest naming
- cleaned up update naming and macOS quarantine instructions
- removed old public-facing marketing tone from the README

## Known Follow-Up Opportunities

- remove or archive duplicate `temp/` and legacy `renderer/` branches if they are no longer needed
- add linting and CI validation if this repository is meant for long-term maintenance
- replace placeholder repository assumptions with Abdulloh Ashurov’s real public links if available
- review analytics defaults and make telemetry fully opt-in if desired

## License

This repository ships with the **GNU AGPL v3** license. See [`LICENSE`](/c:/Users/Креккер/Desktop/PY/natively-cluely-ai-assistant-main/LICENSE).
