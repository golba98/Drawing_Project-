# Drawing App

A student academic notebook and drawing workspace for organizing modules, topics, notes, and full-page drawing pages in the browser.

The app is a static vanilla JavaScript project. It uses local browser storage only; there is no backend, account system, or required environment configuration.

## What It Does

- Organizes academic work by year, semester, subject/module, and topic.
- Provides topic-level Overview, Notes, and Pages workspaces.
- Opens Notes and Pages in a document/editor workspace so the active item becomes the main working area, similar to Microsoft Word or Google Docs.
- Supports text notes with autosave.
- Supports full-page drawing pages with pen, pencil, eraser, line, color, size, undo, redo, clear, and page management.
- Persists app data locally through `localStorage`.

## Tech Stack

- HTML, CSS, and vanilla JavaScript
- Browser `localStorage`
- Canvas 2D API for Study Library drawing pages
- p5.js for the legacy notebook drawing editor
- Google Fonts loaded from the browser

## Screenshots

Screenshots are not included yet. Add screenshots here before publishing a polished portfolio version.

## Local Setup

This project does not currently use npm, a bundler, or a build step. Serve the folder over HTTP; opening `index.html` directly with `file://` can hit browser restrictions.

From the project root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

If Python is not available, any static file server can be used.

## Available Commands

There is no `package.json`, so there are no `npm run` scripts at the moment.

Useful manual checks:

```bash
node --check app/library/StudyLibraryView.js
node --check app/library/SketchesView.js
node --check app/library/DrawingCanvas.js
```

Or check all tracked JavaScript files:

```bash
git ls-files "*.js" | xargs -n 1 node --check
```

On Windows PowerShell:

```powershell
$files = git ls-files "*.js"; foreach ($file in $files) { node --check $file }
```

## Project Structure

```text
.
|-- index.html                 # Static HTML shell and script load order
|-- style.css                  # Main application styles
|-- sketch.js                  # Legacy p5.js notebook drawing editor
|-- app/
|   |-- AppState.js            # Legacy notebook editor navigation state
|   |-- ThemeManager.js        # App and paper theme handling
|   |-- library/
|       |-- StudyLibraryView.js # Study Library navigation and topic workspace
|       |-- NotesView.js        # Topic note editor
|       |-- SketchesView.js     # Topic drawing pages editor
|       |-- DrawingCanvas.js    # Canvas 2D drawing engine for Pages
|       |-- LibraryStorage.js   # Study Library localStorage CRUD
|       |-- LibraryState.js     # Study Library view state
|-- tools/                     # p5.js drawing tools
|-- ui/                        # Shared visual helpers
|-- assets/                    # Icons and drawing cursors
```

## Development Notes

- Keep the existing Study Library hierarchy: years, semesters, subjects/modules, topics, Overview, Notes, Pages, and library/resource navigation.
- Notes and Pages should remain document-like workspaces. Do not reduce opened notes or drawing pages to small cards, previews, or dashboard widgets.
- Drawing pages should behave like full-page notebook canvases.
- Avoid storing fast pointer-move drawing state in high-level app state. The current Canvas 2D drawing page batches pointer movement with `requestAnimationFrame`.
- Debounce persistence writes so drawing and note editing do not write to `localStorage` on every pointer move or keystroke.
- Keep script load order in `index.html` deliberate. This project uses browser globals rather than ES modules.

## Known Limitations

- Data is stored only in the current browser through `localStorage`.
- There is no sync, export/import workflow, authentication, or backend.
- The app depends on external CDNs for p5.js and fonts.
- There is no automated test suite yet.
- Some legacy notebook editor code remains alongside the newer Study Library flow.

## Roadmap

- Add import/export for local notebook data.
- Add a small automated smoke test or browser verification script.
- Add screenshots and short usage notes for the public repo.
- Consider converting scripts to ES modules after the current UX is stable.

## License

MIT. See [LICENSE](LICENSE).
