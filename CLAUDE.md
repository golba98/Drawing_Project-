# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build step is required — this is a vanilla JS app. Serve it over HTTP (file:// won't work with some browser security restrictions):

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000`. There is no npm, no bundler, no transpilation.

## Architecture

The app has two views — a **file manager dashboard** and a **drawing editor** — coordinated by `AppState`. All data persists in `localStorage`; there is no backend.

### Module Responsibilities

| File | Role |
|------|------|
| `sketch.js` | p5.js global-mode sketch; owns the draw loop, canvas, mouse events, and `drawingLayer` (p5.Graphics) |
| `app/AppState.js` | Navigation coordinator; holds current view and open notebook; views must not talk to each other directly |
| `app/EditorView.js` | Editor lifecycle, toolbar wiring, autosave trigger |
| `app/FileManagerView.js` | Notebook grid, create-notebook modal |
| `app/StorageManager.js` | `localStorage` CRUD for notebook objects |
| `app/ThemeManager.js` | Theme resolution (app-level → per-notebook → system OS preference) |
| `ui/PageBackground.js` | Draws lined/blank page background at render time (never persisted) |
| `tools/Toolbox.js` | Instantiates all tools; routes mouse events to the active tool |
| `tools/*.js` | Individual tool implementations (Pen, Highlighter, Eraser, Line, Spray) |

### Key Invariants

- **`drawingLayer` stores only user strokes** — the page background is regenerated from `pageMode` on every load. Do not bake backgrounds into the layer.
- **Eraser uses `layer.erase()`** — erased pixels become transparent, decoupling erase from page theme.
- **Tools read p5 globals directly** (`penColor`, `penSize`, `drawingLayer`, etc.) because p5 runs in global mode. Tool files are loaded after `sketch.js` establishes these globals.
- **Script load order matters** — `index.html` loads scripts via `<script defer>` in dependency order. Adding a new file requires inserting it in the correct position.
- **Autosave fires on every completed action** (stroke end, page/theme switch, editor close) via `EditorView.autosave()`.
- **Custom events** (`themeChanged`, `pageThemeChanged`) dispatched on `window` decouple theme updates from consumers.

### Notebook Data Shape

```js
{
  id:             string,      // time-based unique ID
  title:          string,
  subject:        string,      // category label
  pageMode:       string,      // 'blank' | 'lined'
  pageTheme:      string,      // 'light' | 'dark' | 'system'
  coverColor:     string,      // CSS class suffix
  drawingDataUrl: string|null, // base64 PNG of drawingLayer
  createdAt:      number,
  updatedAt:      number,
}
```

## Styling

All styles live in `style.css` (~4300 lines) using CSS custom properties. The visual theme is **dark academic** with yellow/gold accents — navy and blue accent colors were intentionally replaced. Do not reintroduce blue/navy as accent colors.

## No Tests

There is no test runner. Manual browser testing is the only verification path.
