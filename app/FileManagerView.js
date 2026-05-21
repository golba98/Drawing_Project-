// app/FileManagerView.js
// Renders the GoodNotes-style notebook library and handles all file-manager interactions.
// Uses innerHTML rendering — no framework needed.

const FileManagerView = {
  _container: null,
  _grid:      null,
  _modal:     null,

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

    // Close modal when clicking the dark overlay (outside the box)
    this._modal.addEventListener('click', e => {
      if (e.target === this._modal) this.closeModal();
    });

    // Enter key submits create form
    document.getElementById('notebook-title-input')
      .addEventListener('keydown', e => {
        if (e.key === 'Enter') this._handleCreate();
      });
  },

  show() {
    this._container.classList.remove('hidden');
    this.render();
  },

  hide() {
    this._container.classList.add('hidden');
  },

  render() {
    const notebooks = StorageManager.getNotebooks();
    if (notebooks.length === 0) {
      this._grid.innerHTML = this._emptyStateHTML();
    } else {
      this._grid.innerHTML = notebooks.map(nb => this._cardHTML(nb)).join('');
      this._wireCardActions();
    }
  },

  openModal() {
    document.getElementById('notebook-title-input').value = 'Untitled Notebook';
    // Default to lined
    document.getElementById('page-mode-lined').checked = true;
    this._modal.classList.remove('hidden');
    // Select the title text so the user can type immediately
    setTimeout(() => document.getElementById('notebook-title-input').select(), 50);
  },

  closeModal() {
    this._modal.classList.add('hidden');
  },

  // ─── Private ───────────────────────────────────────────────────────────────

  _cardHTML(nb) {
    const date = new Date(nb.updatedAt);
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
    return `
      <div class="empty-state">
        <img src="assets/icons/notebook.svg" alt="" class="empty-icon">
        <p class="empty-title">No notebooks yet</p>
        <p class="empty-sub">Click <strong>New Notebook</strong> to create your first one.</p>
      </div>
    `;
  },

  _wireCardActions() {
    // Open notebook on card click (but not when clicking action buttons)
    this._grid.querySelectorAll('.notebook-card').forEach(card => {
      card.addEventListener('click', e => {
        if (!e.target.closest('.card-action-btn')) {
          AppState.openNotebook(card.dataset.id);
        }
      });
    });

    // Rename
    this._grid.querySelectorAll('.rename-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this._handleRename(btn.dataset.id);
      });
    });

    // Delete
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
