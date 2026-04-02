# Set Solo
# Archetype: Solo SaaS MVP (adapted — static browser game) | Last reviewed: 2026-04-01 — ~80 lines

## Project Overview
Set Solo is a browser-based solo version of the classic Set card game. The player identifies
Sets (3-card combinations where each feature is all-same or all-different) to clear a deck
of 81 unique cards. No opponent — just the player vs. the deck, tracked by time and accuracy.

Stack: Vanilla HTML + CSS + JavaScript · SVG for card rendering · No framework, no build step
Deployment: Static files (index.html) — open locally or via `npx serve`. GitHub Pages later.

## Common Commands
```bash
# Development
npx serve .                              # Serve locally for testing
open index.html                          # Or just open directly in browser

# Version control
git checkout -b feature/<name>           # New feature branch
git add <files> && git commit            # Stage and commit
```

## Game Rules Reference
81 cards: 4 features × 3 values each (Shape: diamond/squiggle/oval · Color: red/green/purple · Fill: solid/striped/open · Number: 1/2/3).
A Set = 3 cards where each feature is either all-the-same or all-different across the 3 cards.
If any feature has "two of one and one of another" — it's not a Set.

## Architecture
Single-page app. No backend, no build, no dependencies.
- `index.html` — page structure
- `styles.css` — layout, responsive grid, animations
- `game.js` — game logic (deck, Set validation, state machine)
- `cards.js` — SVG card rendering (shapes, colors, fills)
- `audio.js` — sound effects management
- `animations.js` — dealing, removal, and feedback animations

All game state lives in memory. No persistence, no local storage needed.

## Coding Standards
- Vanilla JS only — no frameworks, no transpilation
- SVG for all card graphics — shapes must be distinct and non-overlapping
- CSS animations preferred over JS animations where possible
- Semantic HTML; ARIA labels on interactive elements
- No `var` — use `const`/`let`
- Functions over classes unless state encapsulation requires it
- Descriptive function and variable names — no abbreviations

## Card Rendering Rules
IMPORTANT: Shapes must be visually distinct — diamond (pointed), squiggle (wavy), oval (rounded).
IMPORTANT: Multiple shapes on a card must NOT overlap — space them vertically with clear gaps.
IMPORTANT: Colors must be easily distinguishable — red (#D33), green (#0A0), purple (#63C).
IMPORTANT: Fill patterns must be clearly different — solid (filled), striped (horizontal lines), open (outline only).

## Conventions
- Feature branch workflow: branch → commit → PR → squash merge → delete branch
- Commit messages describe why, not just what
- No build step — everything runs directly in the browser

## La Scintilla

This project is managed by La Scintilla. Platform definitions are at:
`/Users/portaantiporta/Documents/Github/scintilla`

**Core agents:**
- `claude --agent consigliere` — orchestrator; primary point of contact
- `claude --agent menestrello` — decision documentation and narrative

**Workflow:**
- Read `.scintilla/tasks/lessons.md` at session start
- Plan before acting: any task with 3+ steps requires a plan in `.scintilla/tasks/todo.md`
- Verify before marking complete: read the output, do not assume

## Workflow Skills
| When | Skill |
|------|-------|
| Designing a new feature or component | `brainstorming` — design first, questions before code |
| Breaking work into tasks | `writing-plans` — small increments, zero-context-required descriptions |
| Something is broken and cause is unclear | `systematic-debugging` — 4-phase root cause investigation |
| Before declaring any task done | `verification-before-completion` — run it, watch it, confirm it |

## Agent Team
<!-- Core agents (Il Consigliere, Il Menestrello, L'Occhio) are always active at the platform layer -->
@.claude/agents/engineer.md
@.claude/agents/code-reviewer.md
