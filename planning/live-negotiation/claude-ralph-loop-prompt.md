# Mission

Build Live Salary Negotiation Coaching for Abdulloh Ashurov Assistant: a real-time AI coach that listens to the recruiter's words through system audio STT, tracks offers and pushback, and surfaces a coaching card with a tactical note plus an exact script the user can speak on the live call.

## Codebase Context

- Electron + React + TypeScript app
- Working directory: `<repo-root>`
- Key files:
  - `premium/electron/knowledge/KnowledgeOrchestrator.ts`
  - `premium/electron/knowledge/IntentClassifier.ts`
  - `premium/electron/knowledge/ContextAssembler.ts`
  - `premium/electron/knowledge/SalaryIntelligenceEngine.ts`
  - `premium/electron/knowledge/NegotiationEngine.ts`
  - `electron/LLMHelper.ts`
  - `src/components/NativelyInterface.tsx`

## Quality Gate

Run after each major section:

```bash
npx tsc --noEmit && npx tsc -p tsconfig.node.json --noEmit
```
