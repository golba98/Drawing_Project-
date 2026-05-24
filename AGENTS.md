# Repository Guidelines

## Project Structure & Module Organization

This is a static browser app with no bundler or backend.

- `index.html` defines the HTML shell and script load order.
- `style.css` contains the main visual system and layout styles.
- `app/` contains application state, storage, theme, editor, and Study Library controllers.
- `app/library/` contains the academic library flow, notes editor, drawing pages, modal logic, and localStorage CRUD.
- `tools/` contains legacy p5.js drawing tools.
- `ui/` contains shared visual helpers.
- `assets/` contains icons and cursor SVGs.

There is currently no dedicated `tests/` directory.

## Build, Test, and Development Commands

There is no `package.json`, so do not invent npm scripts.

Run locally with a static server:

```bash
python -m http.server 8000
```

On Windows, use:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000`.

Syntax-check tracked JavaScript files:

```powershell
$files = git ls-files "*.js"; foreach ($file in $files) { node --check $file }
```

## Coding Style & Naming Conventions

Use vanilla JavaScript with browser globals, matching the existing files. Preserve script dependency order in `index.html`.

Use two-space indentation in HTML, CSS, and JavaScript. Prefer focused controller objects such as `StudyLibraryView`, `NotesView`, and `SketchesView`. Keep CSS class names descriptive and scoped to the feature area, for example `doc-editor-topbar` or `sketches-canvas-wrap`.

Avoid broad refactors during cleanup work. Keep comments short and useful.

## Testing Guidelines

No automated test framework or coverage target exists yet. For now, validate changes with:

- `node --check` for JavaScript syntax.
- Manual browser testing through a local static server.
- Smoke checks for Study Library navigation, Overview, Notes, Pages, Settings, and full document/editor mode.

When adding tests later, document the framework and commands in `README.md`, `CLAUDE.md`, and this file.

## Commit & Pull Request Guidelines

Recent history uses concise Conventional Commit-style messages:

- `feat: add Notes tab`
- `fix: preserve editor state`
- `perf: optimize rendering`
- `refactor: remove dead state`
- `chore: update docs`

Pull requests should include a short summary, validation steps, screenshots for visible UI changes, and notes about any localStorage or document/editor behavior changes.

## Security & Configuration Tips

Do not commit real `.env` files, secrets, tokens, private URLs, personal emails, debug dumps, screenshots, or machine-specific paths. Keep `.env.example` limited to safe placeholders. The app currently requires no environment variables.

Preserve the key UX rule: opened notes, files/resources, and drawing pages must behave like full-page document/editor workspaces, not small cards or previews.
