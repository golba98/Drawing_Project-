// app/library/SketchesView.js
// UI controller for the Sketches tab inside a library topic.
// Manages page list, toolbar, and wires a DrawingCanvas instance.

const SketchesView = {

  // ── State (reset on each mount) ───────────────────────────────────────────

  _panel:          null,
  _coords:         null,
  _pages:          null,
  _activePageId:   null,
  _canvas:         null,
  _saveTimer:      null,
  _resizeTimer:    null,
  _resizeListener: null,
  _bound:          null,
  _activeTool:     'pencil',
  _activeColor:    '#F0E6C8',
  _activeSize:     4,
  _skipBodyClass:  false,

  // ── Public API ────────────────────────────────────────────────────────────

  renameActive() {
    if (this._activePageId) this._renamePage(this._activePageId);
  },

  mount(panelEl, topic, coords, opts = {}) {
    // Ensure clean state
    this.unmount();

    this._panel         = panelEl;
    this._coords        = coords;
    this._skipBodyClass = !!(opts && opts.skipBodyClass);

    // Apply layout-shifting class for the true full-page workspace
    if (!this._skipBodyClass) document.body.classList.add('pages-workspace-active');

    // Ensure topic has pages; auto-create Page 1 if none
    if (!topic.pages || topic.pages.length === 0) {
      LibraryStorage.addPage(coords, 'Page 1');
      // Reload from storage so we get the persisted object
      const fresh = this._loadTopic();
      this._pages = fresh ? (fresh.pages || []) : [];
    } else {
      this._pages = topic.pages.slice();
    }

    if (this._pages.length === 0) {
      // Fallback: render error state (shouldn't normally happen)
      panelEl.innerHTML = '<p style="padding:20px;color:var(--muted);">Could not load sketch pages.</p>';
      return;
    }

    this._activePageId = this._pages[0].id;
    this._activeTool   = 'pencil';
    this._activeColor  = '#F0E6C8';
    this._activeSize   = 4;

    // Inject HTML and zero-out panel padding (set by parent for other tabs)
    this._render();

    // Instantiate drawing canvas
    const wrap = panelEl.querySelector('.sketches-canvas-wrap');
    this._canvas = new DrawingCanvas(wrap);
    this._canvas.mount();
    this._canvas.setColor(this._activeColor);
    this._canvas.setSize(this._activeSize);

    // Wire canvas events
    this._canvas.on('stroke-end',      () => this._scheduleAutosave());
    this._canvas.on('history-change',  () => this._updateHistoryButtons());

    // Load first page content after layout has settled so canvas buffer gets correct dimensions
    const firstPage = this._pages[0];
    requestAnimationFrame(() => {
      if (!this._canvas) return;
      this._canvas.resize();
      this._canvas.loadFromDataUrl(firstPage.dataUrl || null);
      this._updateHistoryButtons();
    });

    // Wire toolbar & sidebar events (use separate listener to avoid bubbling to StudyLibraryView)
    this._bound = (e) => this._handleEvent(e);
    panelEl.addEventListener('click',  this._bound);
    panelEl.addEventListener('input',  this._bound);
    panelEl.addEventListener('change', this._bound);

    // Wire window resize listener; debounced so rapid resize events don't
    // repeatedly resample the full undo/redo history on every pixel of drag.
    this._resizeTimer    = null;
    this._resizeListener = () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        if (this._canvas) this._canvas.resize();
      }, 250);
    };
    window.addEventListener('resize', this._resizeListener);
  },

  unmount() {
    if (!this._panel) return;

    // Clean up window resize listener and any pending debounce timer
    if (this._resizeListener) {
      window.removeEventListener('resize', this._resizeListener);
      this._resizeListener = null;
    }
    clearTimeout(this._resizeTimer);
    this._resizeTimer = null;

    // Restore body layout state
    if (!this._skipBodyClass) document.body.classList.remove('pages-workspace-active');
    this._skipBodyClass = false;

    // Flush any unsaved drawing immediately
    this._flushSave();
    clearTimeout(this._saveTimer);
    this._saveTimer = null;

    if (this._canvas) {
      this._canvas.unmount();
      this._canvas = null;
    }

    if (this._bound) {
      this._panel.removeEventListener('click',  this._bound);
      this._panel.removeEventListener('input',  this._bound);
      this._panel.removeEventListener('change', this._bound);
      this._bound = null;
    }

    // Restore panel defaults (other tabs use padding:32px set by StudyLibraryView)
    if (this._panel) {
      this._panel.style.padding  = '';
      this._panel.style.overflow = '';
    }

    this._panel        = null;
    this._coords       = null;
    this._pages        = null;
    this._activePageId = null;
    this._activeColor  = '#F0E6C8';
    this._activeSize   = 4;
  },

  // ── Rendering ─────────────────────────────────────────────────────────────

  _render() {
    this._panel.style.padding  = '0';
    this._panel.style.overflow = 'hidden';
    this._panel.innerHTML = `
      <div class="sketches-workspace">
        ${this._renderSidebar()}
        <div class="sketches-main">
          ${this._renderToolbar()}
          <div class="sketches-canvas-wrap"></div>
        </div>
      </div>`;
  },

  _renderSidebar() {
    const itemsHtml = this._pages.map(page => this._renderPageItem(page)).join('');
    return `
      <div class="sketches-sidebar">
        <div class="sketch-sidebar-header">Pages</div>
        <div class="sketch-page-list">${itemsHtml}</div>
        <button class="sketch-add-page-btn" data-sketch-action="add-page">+ Add Page</button>
      </div>`;
  },

  _renderPageItem(page) {
    const active = page.id === this._activePageId;
    const e = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `
      <div class="sketch-page-item${active ? ' active' : ''}"
           data-sketch-action="select-page"
           data-page-id="${e(page.id)}">
        <span class="sketch-page-title">${e(page.title)}</span>
        <div class="sketch-page-actions">
          <button class="sketch-page-action-btn"
                  data-sketch-action="rename-page"
                  data-page-id="${e(page.id)}"
                  title="Rename">✎</button>
          <button class="sketch-page-action-btn"
                  data-sketch-action="delete-page"
                  data-page-id="${e(page.id)}"
                  title="Delete">✕</button>
        </div>
      </div>`;
  },

  _renderToolbar() {
    const tool = this._activeTool;
    const color = this._activeColor;
    const size = this._activeSize;

    const tb   = (name, label) =>
      `<button class="sketch-tool-btn${tool === name ? ' active' : ''}"
               data-sketch-action="set-tool" data-tool="${name}">${label}</button>`;

    // Render color preset chips
    const presets = [
      { hex: '#0B0C10', name: 'Black' },
      { hex: '#FFFFFF', name: 'White' },
      { hex: '#E8B84B', name: 'Gold' },
      { hex: '#C96253', name: 'Red' },
      { hex: '#3B5F88', name: 'Blue' },
      { hex: '#4A7C59', name: 'Green' }
    ];

    const colorChipsHtml = presets.map(p => {
      const active = color.toLowerCase() === p.hex.toLowerCase();
      return `<button class="sketch-color-chip${active ? ' active' : ''}"
                      style="background-color: ${p.hex};"
                      data-sketch-action="set-preset-color"
                      data-hex="${p.hex}"
                      title="${p.name}"></button>`;
    }).join('');

    // Custom color button with color picker input inside
    const isCustomActive = !presets.some(p => p.hex.toLowerCase() === color.toLowerCase());
    const customColorBtnHtml = `
      <div class="sketch-custom-color-btn${isCustomActive ? ' active' : ''}" title="Custom Color">
        <input type="color" id="sketch-color-input" value="${color}">
      </div>`;

    // Size preset buttons
    const sizes = [
      { px: 2,  name: 'Small' },
      { px: 6,  name: 'Medium' },
      { px: 12, name: 'Large' }
    ];

    const sizeChipsHtml = sizes.map(s => {
      const active = size === s.px;
      return `<button class="sketch-size-chip${active ? ' active' : ''}"
                      data-sketch-action="set-preset-size"
                      data-px="${s.px}">${s.name}</button>`;
    }).join('');

    return `
      <div class="sketches-toolbar">
        ${tb('pencil', 'Pencil')}
        ${tb('pen',    'Pen')}
        ${tb('eraser', 'Eraser')}
        ${tb('line',   'Ruler')}
        <span class="sketch-toolbar-sep"></span>
        
        <div class="sketch-color-presets">
          ${colorChipsHtml}
          ${customColorBtnHtml}
        </div>
        
        <span class="sketch-toolbar-sep"></span>
        
        <div class="sketch-size-presets">
          ${sizeChipsHtml}
        </div>
        
        <label class="sketch-size-wrap" title="Stroke size">
          <input type="range" id="sketch-size-input" min="1" max="40" value="${size}">
        </label>
        
        <span class="sketch-toolbar-sep"></span>
        
        <button id="sketch-undo-btn" class="sketch-action-btn"
                data-sketch-action="undo" disabled>Undo</button>
        <button id="sketch-redo-btn" class="sketch-action-btn"
                data-sketch-action="redo" disabled>Redo</button>
        <button class="sketch-action-btn"
                data-sketch-action="clear-page">Clear</button>
      </div>`;
  },

  _refreshPageList() {
    const list = this._panel && this._panel.querySelector('.sketch-page-list');
    if (!list) return;
    list.innerHTML = this._pages.map(p => this._renderPageItem(p)).join('');
  },

  // ── Event handling ────────────────────────────────────────────────────────

  _handleEvent(e) {
    // Check for input events (color, size)
    if (e.type === 'input' || e.type === 'change') {
      const tgt = e.target;
      if (tgt.id === 'sketch-color-input' && this._canvas) {
        this._activeColor = tgt.value;
        this._canvas.setColor(tgt.value);
        this._updatePresetsActiveStates();
        e.stopPropagation();
      }
      if (tgt.id === 'sketch-size-input' && this._canvas) {
        this._activeSize = Number(tgt.value);
        this._canvas.setSize(Number(tgt.value));
        this._updatePresetsActiveStates();
        e.stopPropagation();
      }
      return;
    }

    // Click events — look for data-sketch-action
    const el = e.target.closest('[data-sketch-action]');
    if (!el) return;

    e.stopPropagation(); // prevent bubbling to StudyLibraryView's data-action listener

    const action = el.dataset.sketchAction;
    const pageId = el.dataset.pageId;

    switch (action) {
      case 'set-tool':
        this._setTool(el.dataset.tool);
        break;
      case 'select-page':
        if (pageId && pageId !== this._activePageId) this._switchPage(pageId);
        break;
      case 'add-page':
        this._addPage();
        break;
      case 'rename-page':
        if (pageId) this._renamePage(pageId);
        break;
      case 'delete-page':
        if (pageId) this._deletePage(pageId);
        break;
      case 'undo':
        if (this._canvas) { this._canvas.undo(); }
        break;
      case 'redo':
        if (this._canvas) { this._canvas.redo(); }
        break;
      case 'clear-page':
        this._clearPage();
        break;
      case 'set-preset-color':
        if (el.dataset.hex && this._canvas) {
          const hex = el.dataset.hex;
          this._activeColor = hex;
          this._canvas.setColor(hex);
          this._updatePresetsActiveStates();
        }
        break;
      case 'set-preset-size':
        if (el.dataset.px && this._canvas) {
          const px = Number(el.dataset.px);
          this._activeSize = px;
          this._canvas.setSize(px);
          this._updatePresetsActiveStates();
        }
        break;
    }
  },

  // ── Tool ──────────────────────────────────────────────────────────────────

  _setTool(name) {
    if (!this._canvas) return;
    this._activeTool = name;
    this._canvas.setTool(name);

    // Update toolbar active states
    if (this._panel) {
      this._panel.querySelectorAll('.sketch-tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === name);
      });
    }
  },

  // ── Page management ───────────────────────────────────────────────────────

  _switchPage(pageId) {
    if (pageId === this._activePageId) return;
    this._flushSave();
    clearTimeout(this._saveTimer);

    this._activePageId = pageId;
    const page = this._pages.find(p => p.id === pageId);
    if (!page) return;

    this._canvas.loadFromDataUrl(page.dataUrl || null);
    this._canvas.setColor(this._activeColor);
    this._canvas.setSize(this._activeSize);
    this._refreshPageList();
    this._updateHistoryButtons();
  },

  _addPage() {
    const title = 'Page ' + (this._pages.length + 1);
    const page  = LibraryStorage.addPage(this._coords, title);
    if (!page) return;

    // Reload pages from storage (ensures we have the canonical object)
    const topic = this._loadTopic();
    this._pages = topic ? (topic.pages || []) : this._pages;

    this._switchPage(page.id);
    this._refreshPageList();
  },

  _renamePage(pageId) {
    const page = this._pages.find(p => p.id === pageId);
    if (!page) return;

    LibraryModal.open({
      type: 'rename-sketch-page',
      page,
      onSave: (data) => {
        LibraryStorage.renamePage(this._coords, pageId, data.title);
        const entry = this._pages.find(p => p.id === pageId);
        if (entry) entry.title = data.title;
        this._refreshPageList();
      },
    });
  },

  _deletePage(pageId) {
    const page = this._pages.find(p => p.id === pageId);
    if (!page) return;

    LibraryModal.open({
      type: 'delete-sketch-page',
      page,
      onSave: () => {
        LibraryStorage.deletePage(this._coords, pageId);
        const idx = this._pages.findIndex(p => p.id === pageId);
        if (idx !== -1) this._pages.splice(idx, 1);

        // If last page was deleted, create a new one
        if (this._pages.length === 0) {
          const newPage = LibraryStorage.addPage(this._coords, 'Page 1');
          if (newPage) this._pages.push(newPage);
        }

        const newActiveId = pageId === this._activePageId
          ? (this._pages[Math.max(0, idx - 1)] || this._pages[0])?.id
          : this._activePageId;

        this._activePageId = null; // force reload
        this._switchPage(newActiveId);
        this._refreshPageList();
      },
    });
  },

  _clearPage() {
    const page = this._pages.find(p => p.id === this._activePageId);
    if (!page) return;

    LibraryModal.open({
      type: 'clear-sketch-page',
      page,
      onSave: () => {
        if (this._canvas) this._canvas.clearCanvas();
        this._flushSave();
      },
    });
  },

  // ── Persistence ───────────────────────────────────────────────────────────

  _scheduleAutosave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._flushSave(), 500);
  },

  _flushSave() {
    if (!this._canvas || !this._activePageId || !this._coords) return;
    const dataUrl = this._canvas.getDataUrl();
    LibraryStorage.updatePageData(this._coords, this._activePageId, dataUrl);
    const entry = this._pages && this._pages.find(p => p.id === this._activePageId);
    if (entry) { entry.dataUrl = dataUrl; entry.updatedAt = Date.now(); }
  },

  _loadTopic() {
    const { yearId, semesterId, subjectId, topicId } = this._coords;
    const subject = LibraryStorage.getSubject(yearId, semesterId, subjectId);
    if (!subject) return null;
    return subject.topics.find(t => t.id === topicId) || null;
  },

  // ── UI helpers ────────────────────────────────────────────────────────────

  _updateHistoryButtons() {
    if (!this._panel) return;
    const undoBtn = this._panel.querySelector('#sketch-undo-btn');
    const redoBtn = this._panel.querySelector('#sketch-redo-btn');
    if (undoBtn) undoBtn.disabled = !this._canvas || !this._canvas.canUndo();
    if (redoBtn) redoBtn.disabled = !this._canvas || !this._canvas.canRedo();
  },

  _updatePresetsActiveStates() {
    if (!this._panel) return;

    // Update color chips active state
    const presets = ['#0B0C10', '#FFFFFF', '#E8B84B', '#C96253', '#3B5F88', '#4A7C59'];
    const color = this._activeColor.toLowerCase();

    this._panel.querySelectorAll('.sketch-color-chip').forEach(chip => {
      const hex = chip.dataset.hex.toLowerCase();
      chip.classList.toggle('active', hex === color);
    });

    // Update custom color btn active state
    const customColorBtn = this._panel.querySelector('.sketch-custom-color-btn');
    if (customColorBtn) {
      const isCustomActive = !presets.some(p => p.toLowerCase() === color);
      customColorBtn.classList.toggle('active', isCustomActive);

      const customInput = customColorBtn.querySelector('#sketch-color-input');
      if (customInput && customInput.value.toLowerCase() !== color) {
        customInput.value = this._activeColor;
      }
    }

    // Update size chips active state
    const size = this._activeSize;
    this._panel.querySelectorAll('.sketch-size-chip').forEach(chip => {
      const px = Number(chip.dataset.px);
      chip.classList.toggle('active', px === size);
    });

    // Update slider value
    const slider = this._panel.querySelector('#sketch-size-input');
    if (slider && Number(slider.value) !== size) {
      slider.value = size;
    }
  },
};
