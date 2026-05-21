// app/EditorView.js
// Manages the editor view lifecycle: opening/closing notebooks, toolbar wiring, autosave.
// Calls sketch.js globals: initEditor(), closeEditor(), getDrawingDataUrl(),
//   drawingLayer, toolbox, pageBackground, penColor, penSize, saveCanvas().

const EditorView = {
  _container: null,

  init() {
    this._container = document.getElementById('editor-view');
    document.getElementById('editor-back-btn')
      .addEventListener('click', () => AppState.closeEditor());
  },

  // Open a notebook in the editor.
  // Uses setTimeout(0) so the container has finished laying out before we measure it for canvas sizing.
  open(notebook) {
    document.getElementById('editor-title').textContent = notebook.title;
    this._container.classList.remove('hidden');

    setTimeout(() => {
      initEditor(notebook); // sketch.js global — resizes canvas, restores drawing
      this._updateActiveToolBtn('pen');
      this._updateActivePageBtn(notebook.pageMode);
      this._wireToolbar();
      this._wireControls();
    }, 0);
  },

  close() {
    this._container.classList.add('hidden');
    closeEditor(); // sketch.js global — stops draw loop, clears layer
  },

  // Save current drawing and page mode back to localStorage.
  autosave() {
    if (!AppState.currentNotebookId) return;
    // getDrawingDataUrl() returns the drawing layer as a base64 PNG (sketch.js global)
    const dataUrl  = getDrawingDataUrl();
    // pageBackground.mode is the PageBackground class instance from sketch.js
    const pageMode = pageBackground.mode;
    StorageManager.updateNotebook(AppState.currentNotebookId, { drawingDataUrl: dataUrl, pageMode });
  },

  // ─── Private ───────────────────────────────────────────────────────────────

  // cloneNode removes stale listeners accumulated from previous open() calls
  _wireToolbar() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', () => {
        this._updateActiveToolBtn(fresh.dataset.tool);
        toolbox.setTool(fresh.dataset.tool); // toolbox is a sketch.js global
      });
    });

    document.querySelectorAll('.page-btn').forEach(btn => {
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', () => {
        this._updateActivePageBtn(fresh.dataset.page);
        pageBackground.setMode(fresh.dataset.page); // pageBackground is a sketch.js global
        this.autosave();
      });
    });

    document.querySelectorAll('.action-btn').forEach(btn => {
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', () => {
        if (fresh.dataset.action === 'clear') {
          drawingLayer.clear(); // drawingLayer is a sketch.js global
          this.autosave();
        }
        if (fresh.dataset.action === 'save') {
          saveCanvas('notebook-drawing', 'png'); // p5 global
        }
      });
    });
  },

  _wireControls() {
    const colorPicker  = document.getElementById('colorPicker');
    const strokeSlider = document.getElementById('strokeSize');

    // Clone to remove prior listeners
    const freshColor = colorPicker.cloneNode(true);
    colorPicker.parentNode.replaceChild(freshColor, colorPicker);
    freshColor.addEventListener('input', () => {
      penColor = hexToRgb(freshColor.value); // penColor and hexToRgb are sketch.js globals
    });

    const freshSlider = strokeSlider.cloneNode(true);
    strokeSlider.parentNode.replaceChild(freshSlider, strokeSlider);
    freshSlider.addEventListener('input', () => {
      penSize = parseInt(freshSlider.value, 10); // penSize is a sketch.js global
      document.getElementById('sizeLabel').textContent = penSize + 'px';
    });
  },

  _updateActiveToolBtn(name) {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.tool-btn[data-tool="${name}"]`);
    if (btn) btn.classList.add('active');
  },

  _updateActivePageBtn(mode) {
    document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.page-btn[data-page="${mode}"]`);
    if (btn) btn.classList.add('active');
  }
};
