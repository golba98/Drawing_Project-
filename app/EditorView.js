// app/EditorView.js
// Manages the editor view lifecycle: opening/closing notebooks, toolbar wiring, autosave.
// Calls sketch.js globals: initEditor(), closeEditor(), getDrawingDataUrl(),
//   drawingLayer, toolbox, pageBackground, penColor, penSize, toolSizes, saveCanvas().

const EditorView = {
  _container: null,
  _activeTool: 'pen',

  init() {
    this._container = document.getElementById('editor-view');
    document.getElementById('editor-back-btn')
      .addEventListener('click', () => AppState.closeEditor());

    // Cycle paper appearance when clicking the indicator button
    const paperThemeBtn = document.getElementById('paper-theme-indicator');
    if (paperThemeBtn) {
      paperThemeBtn.addEventListener('click', () => {
        if (!AppState.currentNotebookId) return;
        const notebook = StorageManager.getNotebook(AppState.currentNotebookId);
        const currentSetting = notebook.pageTheme || 'system';

        let nextSetting = 'system';
        if (currentSetting === 'system') nextSetting = 'light';
        else if (currentSetting === 'light') nextSetting = 'dark';
        else if (currentSetting === 'dark') nextSetting = 'system';

        StorageManager.updateNotebook(AppState.currentNotebookId, { pageTheme: nextSetting });
        window.dispatchEvent(new CustomEvent('pageThemeChanged', { detail: { setting: nextSetting } }));
      });
    }

    // Listen for theme / page appearance changes to autosave and update workspace live
    window.addEventListener('pageThemeChanged', (e) => {
      if (!AppState.currentNotebookId) return;
      const setting = e.detail.setting;
      StorageManager.updateNotebook(AppState.currentNotebookId, { pageTheme: setting });

      const notebook = StorageManager.getNotebook(AppState.currentNotebookId);
      this.updatePaperThemeIndicator(notebook);
      this.updateBinderPaperClass(notebook);

      const resolved = typeof ThemeManager !== 'undefined' ? ThemeManager.resolvePageTheme(notebook) : 'light';
      const colorPicker = document.getElementById('colorPicker');
      if (colorPicker) {
        const currentHex = colorPicker.value.toLowerCase();
        if (resolved === 'dark' && currentHex === '#000000') {
          penColor = [245, 239, 229];
          colorPicker.value = '#f5efe5';
        } else if (resolved === 'light' && currentHex === '#f5efe5') {
          penColor = [0, 0, 0];
          colorPicker.value = '#000000';
        }
      }

      if (typeof redraw === 'function') redraw();
    });

    window.addEventListener('themeChanged', (e) => {
      if (!AppState.currentNotebookId) return;
      const notebook = StorageManager.getNotebook(AppState.currentNotebookId);
      this.updatePaperThemeIndicator(notebook);
      this.updateBinderPaperClass(notebook);

      const resolved = typeof ThemeManager !== 'undefined' ? ThemeManager.resolvePageTheme(notebook) : 'light';
      const colorPicker = document.getElementById('colorPicker');
      if (colorPicker) {
        const currentHex = colorPicker.value.toLowerCase();
        if (resolved === 'dark' && currentHex === '#000000') {
          penColor = [245, 239, 229];
          colorPicker.value = '#f5efe5';
        } else if (resolved === 'light' && currentHex === '#f5efe5') {
          penColor = [0, 0, 0];
          colorPicker.value = '#000000';
        }
      }

      if (typeof redraw === 'function') redraw();
    });
  },

  updateBinderPaperClass(notebook) {
    const binder = document.getElementById('notebook-desk-binder');
    if (!binder) return;

    binder.className = binder.className.replace(/\bcover-\S+/g, '');

    const coverColor = notebook ? notebook.coverColor : 'navy';
    binder.classList.add(`cover-${coverColor}`);

    const resolved = typeof ThemeManager !== 'undefined' ? ThemeManager.resolvePageTheme(notebook) : 'light';
    if (resolved === 'dark') {
      binder.classList.add('dark-paper');
      binder.classList.remove('light-paper');
    } else {
      binder.classList.add('light-paper');
      binder.classList.remove('dark-paper');
    }
  },

  updatePaperThemeIndicator(notebook) {
    const indicator = document.getElementById('paper-theme-indicator');
    if (!indicator) return;
    const setting = notebook ? notebook.pageTheme : 'system';
    let text = 'Auto Paper';
    if (setting === 'light') text = 'Light Paper';
    if (setting === 'dark') text = 'Dark Paper';
    indicator.textContent = text;
  },

  // Open a notebook in the editor.
  open(notebook) {
    document.getElementById('editor-title').textContent = notebook.title;
    const badge = document.getElementById('editor-subject-badge');
    if (badge) {
      const subject = notebook.subject || 'Other';
      badge.textContent = subject;
      badge.className = 'subject-badge';
      badge.classList.add(`sub-${subject.replace(/\s+/g, '-').toLowerCase()}`);
    }

    this.updatePaperThemeIndicator(notebook);
    this.updateBinderPaperClass(notebook);
    this._container.classList.remove('hidden');

    setTimeout(() => {
      initEditor(notebook); // sketch.js global — resizes canvas, restores drawing
      this._switchTool('pen');
      this._updateActivePageBtn(notebook.pageMode);
      this._wireToolbar();
      this._wireControls();
      this._wireEraserOptions();
    }, 0);
  },

  close() {
    this._container.classList.add('hidden');
    closeEditor(); // sketch.js global — stops draw loop, clears layer
  },

  // Save current drawing and page mode back to localStorage.
  autosave() {
    if (!AppState.currentNotebookId) return;
    const dataUrl  = getDrawingDataUrl();
    const pageMode = pageBackground.mode;
    StorageManager.updateNotebook(AppState.currentNotebookId, { drawingDataUrl: dataUrl, pageMode });
  },

  // ─── Private ───────────────────────────────────────────────────────────────

  /**
   * Central tool-switch helper — updates active tool button, syncs slider & label,
   * toggles eraser options panel visibility, and applies the CSS cursor class.
   */
  _switchTool(name) {
    this._activeTool = name;
    this._updateActiveToolBtn(name);
    this._syncSliderToTool(name);
    this._applyToolCursor(name);
    this._updateEraserOptionsVisibility(name);

    if (typeof toolbox !== 'undefined') {
      toolbox.setTool(name);
    }
  },

  /** Sync size slider, label and min/max to the selected tool's stored size. */
  _syncSliderToTool(name) {
    const slider = document.getElementById('strokeSize');
    const label  = document.getElementById('sizeLabel');
    if (!slider || !label) return;

    const sizes = typeof toolSizes !== 'undefined' ? toolSizes : {};

    // Configure min/max/step per tool
    const configs = {
      pen:         { min: 1,  max: 40,  value: sizes.pen         ?? 4  },
      highlighter: { min: 4,  max: 60,  value: sizes.highlighter ?? 20 },
      eraser:      { min: 4,  max: 80,  value: sizes.eraser      ?? 24 },
      line:        { min: 1,  max: 40,  value: sizes.line        ?? 4  },
      spray:       { min: 10, max: 80,  value: sizes.spray       ?? 30 },
    };

    const cfg = configs[name] || configs.pen;
    slider.min   = cfg.min;
    slider.max   = cfg.max;
    slider.value = cfg.value;
    label.textContent = cfg.value + 'px';
  },

  /**
   * Apply tool-specific CSS cursor by setting data-active-tool on #canvas-container.
   * When eraser is active, CSS cursor is 'none' so only the p5 preview is visible.
   */
  _applyToolCursor(name) {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    container.dataset.activeTool = name;
  },

  /** Show/hide the eraser-specific options panel. */
  _updateEraserOptionsVisibility(name) {
    const panel = document.getElementById('eraser-options');
    if (!panel) return;
    if (name === 'eraser') {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }

    // Hide/show color picker — not relevant when eraser active
    const colorSection = document.getElementById('color-picker-section');
    if (colorSection) {
      colorSection.style.opacity = name === 'eraser' ? '0.35' : '1';
      colorSection.style.pointerEvents = name === 'eraser' ? 'none' : '';
    }
  },

  // cloneNode removes stale listeners accumulated from previous open() calls
  _wireToolbar() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', () => {
        this._switchTool(fresh.dataset.tool);
      });
    });

    document.querySelectorAll('.page-btn').forEach(btn => {
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', () => {
        this._updateActivePageBtn(fresh.dataset.page);
        pageBackground.setMode(fresh.dataset.page);
        this.autosave();
      });
    });

    document.querySelectorAll('.action-btn').forEach(btn => {
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', () => {
        if (fresh.dataset.action === 'clear') {
          drawingLayer.clear();
          this.autosave();
        }
        if (fresh.dataset.action === 'save') {
          saveCanvas('notebook-drawing', 'png');
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

    const notebook = AppState.currentNotebookId ? StorageManager.getNotebook(AppState.currentNotebookId) : null;
    const resolved = typeof ThemeManager !== 'undefined' ? ThemeManager.resolvePageTheme(notebook) : 'light';
    if (resolved === 'dark') {
      penColor = [245, 239, 229];
      freshColor.value = '#f5efe5';
    } else {
      penColor = [0, 0, 0];
      freshColor.value = '#000000';
    }

    freshColor.addEventListener('input', () => {
      penColor = hexToRgb(freshColor.value);
    });

    const freshSlider = strokeSlider.cloneNode(true);
    strokeSlider.parentNode.replaceChild(freshSlider, strokeSlider);
    freshSlider.addEventListener('input', () => {
      const val = parseInt(freshSlider.value, 10);
      const tool = this._activeTool;

      // Update global penSize for tools that use it directly
      penSize = val;

      // Update per-tool size store
      if (typeof toolSizes !== 'undefined') {
        toolSizes[tool] = val;
      }

      // For eraser, update the EraserTool instance directly
      if (tool === 'eraser' && typeof toolbox !== 'undefined') {
        toolbox.getEraser().size = val;
      }

      // For highlighter, update HighlighterTool.strokeWidth
      if (tool === 'highlighter' && typeof toolbox !== 'undefined') {
        toolbox.tools.highlighter.strokeWidth = val;
      }

      document.getElementById('sizeLabel').textContent = val + 'px';
    });
  },

  /** Wire eraser shape chips and precision toggle inside #eraser-options. */
  _wireEraserOptions() {
    const panel = document.getElementById('eraser-options');
    if (!panel) return;

    const eraser = typeof toolbox !== 'undefined' ? toolbox.getEraser() : null;
    if (!eraser) return;

    // Shape chip buttons
    panel.querySelectorAll('.eraser-shape-btn').forEach(btn => {
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', () => {
        eraser.shape = fresh.dataset.shape;
        panel.querySelectorAll('.eraser-shape-btn').forEach(b => b.classList.remove('active'));
        fresh.classList.add('active');
        if (typeof redraw === 'function') redraw();
      });
    });

    // Precision toggle buttons
    panel.querySelectorAll('.eraser-mode-btn').forEach(btn => {
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', () => {
        eraser.mode = fresh.dataset.mode;
        panel.querySelectorAll('.eraser-mode-btn').forEach(b => b.classList.remove('active'));
        fresh.classList.add('active');
        if (typeof redraw === 'function') redraw();
      });
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
