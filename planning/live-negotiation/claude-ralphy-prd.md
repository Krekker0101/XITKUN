# PRD: Live Salary Negotiation Coaching

**Project:** Abdulloh Ashurov Assistant
**Feature:** Real-time salary negotiation coaching via conversation tracking

## How to Use

```bash
ralphy --prd planning/live-negotiation/claude-ralphy-prd.md
```

## What We Are Building

When a recruiter makes an offer on a live call, Abdulloh Ashurov Assistant currently has no awareness of it. The feature here replaces a static salary script with a dynamic, conversation-aware coach that listens through system audio STT, tracks negotiation phases turn by turn, and generates an exact script the user can speak.

## Tech Stack

- Electron
- React
- TypeScript

## Working Directory

`<repo-root>`

## Quality Gate

Run after each section:

```bash
npx tsc --noEmit && npx tsc -p tsconfig.node.json --noEmit
```
