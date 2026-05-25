# CLAUDE.md

## Project

Drawing App

## Purpose

A student academic notebook and drawing workspace for managing academic years, semesters, modules/resources, topics, notes, and full-page drawing pages.

The app is a static browser project. It has no backend and currently stores user data in `localStorage`.

## Important Project Path

Work from the repository root. Do not hardcode local absolute paths or machine-specific paths in source or documentation.

## Tech Stack

- HTML, CSS, and vanilla JavaScript
- Browser globals loaded by `index.html`
- Browser `localStorage`
- Canvas 2D API for Study Library drawing pages
- p5.js for the legacy notebook drawing editor
- Google Fonts loaded in `index.html`

## Development Commands

There is no `package.json`, no bundler, and no npm script set yet.

Serve locally:

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

Syntax-check tracked JavaScript files:

```powershell
$files = git ls-files "*.js"; foreach ($file in $files) { node --check $file }
```

Do not document `npm run build`, `npm run lint`, `npm run typecheck`, or `npm test` unless those scripts actually exist.

## Current UX Direction

When a note, file/resource, or drawing page is opened, it should become the main document/editor workspace, similar to Microsoft Word or Google Docs. Do not trap opened documents inside small dashboard cards, widgets, or preview panels.

Keep the existing structure:

- Overview
- Notes
- Pages
- Files/resources/library navigation
- Academic year, semester, subject/module, and topic navigation

Do not rebuild the app into a different semester/subject/topic architecture unless explicitly requested.

## Drawing Pages

Drawing pages must behave like full-page notebook canvases, not small image previews.

Performance rules:

- Do not store fast pointer-move drawing state in high-level app state.
- Keep hot drawing paths inside canvas-specific code.
- Batch pointer movement with `requestAnimationFrame` where possible.
- Debounce persistence writes.
- Avoid full app re-renders on every pointer move.
- Preserve undo/redo behavior when switching tools or updating toolbar state.

The current Study Library drawing page implementation lives mainly in `app/library/DrawingCanvas.js` and `app/library/SketchesView.js`.

## Code Rules

- Keep components focused and consistent with the existing browser-global style.
- Preserve script load order in `index.html`; dependencies must load before files that use them.
- Keep the dark academic/gold visual direction.
- Keep note/page editor mode full-screen and document-like.
- Preserve Overview, Notes, Pages, files/resources, and library navigation behavior.
- Use safe practical wording in UI and docs.
- Do not add fake stats, fake features, or placeholder marketing copy.
- Do not perform broad architecture rewrites during cleanup tasks.

## Public Repo Safety

Before finalizing changes, check for:

- Secrets, tokens, API keys, passwords, and private URLs
- Personal emails
- Absolute local user-profile paths
- Real `.env` values
- Generated files, build output, cache folders, debug dumps, screenshots, and recordings
- `console.log` debugging, stale TODO/FIXME comments, and prototype wording

Real `.env` files must stay ignored. If future environment variables are needed, document only safe placeholders in `.env.example`.

## Do Not Do

- Do not redesign the whole app without instruction.
- Do not remove working Overview, Notes, Pages, files/resources, or navigation behavior.
- Do not replace the document/editor workspace with card previews.
- Do not add fake marketing copy or fake SaaS language.
- Do not add fake features that are not implemented.
- Do not commit or push unless explicitly asked.
