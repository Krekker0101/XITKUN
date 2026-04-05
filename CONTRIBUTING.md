# Contributing to Abdulloh Ashurov Assistant

Thanks for contributing. The goal of this repository is to stay maintainable, respectful, and easy to extend.

## Before You Start

- Read the code paths you plan to change before editing.
- Prefer focused pull requests over broad unrelated changes.
- Preserve local-first, privacy-conscious behavior unless the change explicitly requires otherwise.

## Good Contribution Areas

- bug fixes
- UI polish and accessibility improvements
- desktop packaging and update flow hardening
- provider integrations
- local storage and performance improvements
- documentation cleanup

## Reporting Issues

When opening an issue, include:

- a clear summary
- steps to reproduce
- expected behavior
- actual behavior
- OS and runtime details
- screenshots or logs when useful

Use the repository issue tracker for bugs, regressions, and enhancement ideas.

## Local Development

1. Fork the repository.
2. Clone your fork.
3. Install dependencies with `npm install`.
4. Start the app with `npm run app:dev`.
5. Build before opening a PR when your change affects production code.

## Project Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Desktop shell: Electron
- Native module: Rust via `napi-rs`
- Local data: SQLite and `sqlite-vec`

## Pull Request Expectations

- keep changes scoped
- explain user impact clearly
- include screenshots for UI changes
- update docs when behavior changes
- avoid reverting unrelated work

## Code Style

- favor clear naming and small, composable changes
- keep comments short and meaningful
- use TypeScript strictly and respect existing patterns
- prefer configuration over repeated hard-coded strings

## Conduct

Please follow the repository code of conduct and keep collaboration constructive, direct, and respectful.
