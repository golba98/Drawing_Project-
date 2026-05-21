// app/FileManagerView.js
// Renders the notebook library and handles all file-manager interactions.

const FileManagerView = {
  _container:     null,
  _grid:          null,
  _modal:         null,
  _currentFilter: 'all',   // 'all' | 'recent' | 'lined' | 'blank'
  _searchQuery:   '',

  init() {
    this._container = document.getElementById('file-manager-view');
    this._grid      = document.getElementById('notebook-grid');
    this._modal     = document.getElementById('new-notebook-modal');

    // New Notebook button
    document.getElementById('new-notebook-btn')
      .addEventListener('click', () => this.openModal());

    // Modal controls
    document.getElementById('modal-cancel')
      .addEventListener('click', () => this.closeModal());
    document.getElementById('modal-create')
      .addEventListener('click', () => this._handleCreate());

    // Close modal when clicking the dark overlay
    this._modal.addEventListener('click', e => {
      if (e.target === this._modal) this.closeModal();
    });

    // Enter key submits create form
    document.getElementById('notebook-title-input')
      .addEventListener('keydown', e => {
        if (e.key === 'Enter') this._handleCreate();
      });

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._currentFilter = tab.dataset.filter;
        this.render();
      });
    });

    // Live search
    const searchInput = document.getElementById('fm-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this._searchQuery = searchInput.value.toLowerCase().trim();
        this.render();
      });
    }
  },

  show() {
    this._container.classList.remove('hidden');
    this.render();
  },

  hide() {
    this._container.classList.add('hidden');
  },

  render() {
    let notebooks = StorageManager.getNotebooks(); // already sorted by updatedAt desc

    // Apply search filter
    if (this._searchQuery) {
      notebooks = notebooks.filter(nb =>
        nb.title.toLowerCase().includes(this._searchQuery)
      );
    }

    // Apply tab filter
    if (this._currentFilter === 'recent') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      notebooks = notebooks.filter(nb => nb.updatedAt > cutoff);
    } else if (this._currentFilter === 'lined' || this._currentFilter === 'blank') {
      notebooks = notebooks.filter(nb => nb.pageMode === this._currentFilter);
    }

    if (notebooks.length === 0) {
      this._grid.innerHTML = this._emptyStateHTML();
      const btn = this._grid.querySelector('.empty-create-btn');
      if (btn) btn.addEventListener('click', () => this.openModal());
    } else {
      this._grid.innerHTML = notebooks.map(nb => this._cardHTML(nb)).join('');
      this._wireCardActions();
    }
  },

  openModal() {
    document.getElementById('notebook-title-input').value = 'Untitled Notebook';
    document.getElementById('page-mode-lined').checked = true;
    this._modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('notebook-title-input').select(), 50);
  },

  closeModal() {
    this._modal.classList.add('hidden');
  },

  // ─── Private ───────────────────────────────────────────────────────────────

  _cardHTML(nb) {
    const date    = new Date(nb.updatedAt);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const modeLabel = nb.pageMode === 'lined' ? 'Lined' : 'Blank';

    return `
      <div class="notebook-card" data-id="${nb.id}" title="Open ${this._escapeHtml(nb.title)}">
        <div class="card-preview ${nb.pageMode}">
          ${nb.drawingDataUrl ? `<img class="card-thumbnail" src="${nb.drawingDataUrl}" alt="">` : ''}
        </div>
        <div class="card-info">
          <div class="card-title">${this._escapeHtml(nb.title)}</div>
          <div class="card-meta">
            <span class="page-mode-badge">${modeLabel}</span>
            ${dateStr} · ${timeStr}
          </div>
          <div class="card-actions">
            <button class="card-action-btn rename-btn" data-id="${nb.id}" title="Rename">
              <img src="assets/icons/rename.svg" alt="Rename">
            </button>
            <button class="card-action-btn delete-btn" data-id="${nb.id}" title="Delete">
              <img src="assets/icons/delete.svg" alt="Delete">
            </button>
          </div>
        </div>
      </div>
    `;
  },

  _emptyStateHTML() {
    // Show a polished empty library state with a decorative notebook preview and a CTA
    const isFiltered = this._currentFilter !== 'all' || this._searchQuery;
    if (isFiltered) {
      return `
        <div class="empty-state">
          <p class="empty-title">No results</p>
          <p class="empty-sub">Try a different search or filter.</p>
        </div>
      `;
    }
    return `
      <div class="empty-state">
        <div class="empty-preview lined"></div>
        <p class="empty-title">No notebooks yet</p>
        <p class="empty-sub">Create your first notebook and start drawing.</p>
        <button class="empty-create-btn">Create notebook</button>
        <p class="empty-hint">Choose blank or lined paper.</p>
      </div>
    `;
  },

  _wireCardActions() {
    // Open on card click (not on action button click)
    this._grid.querySelectorAll('.notebook-card').forEach(card => {
      card.addEventListener('click', e => {
        if (!e.target.closest('.card-action-btn')) {
          AppState.openNotebook(card.dataset.id);
        }
      });
    });

    this._grid.querySelectorAll('.rename-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this._handleRename(btn.dataset.id);
      });
    });

    this._grid.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this._handleDelete(btn.dataset.id);
      });
    });
  },

  _handleCreate() {
    const title    = document.getElementById('notebook-title-input').value.trim() || 'Untitled Notebook';
    const pageMode = document.querySelector('input[name="pageMode"]:checked').value;
    const notebook = StorageManager.createNotebook({ title, pageMode });
    this.closeModal();
    AppState.openNotebook(notebook.id);
  },

  _handleRename(id) {
    const notebook = StorageManager.getNotebook(id);
    if (!notebook) return;
    const newTitle = prompt('Rename notebook:', notebook.title);
    if (newTitle !== null && newTitle.trim()) {
      StorageManager.updateNotebook(id, { title: newTitle.trim() });
      this.render();
    }
  },

  _handleDelete(id) {
    const notebook = StorageManager.getNotebook(id);
    if (!notebook) return;
    if (confirm(`Delete "${notebook.title}"?\nThis cannot be undone.`)) {
      StorageManager.deleteNotebook(id);
      this.render();
    }
  },

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
