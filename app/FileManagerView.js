// app/FileManagerView.js
// Renders the notebook library and handles all file-manager interactions.

const FileManagerView = {
  _container:          null,
  _grid:               null,
  _modal:              null,
  _currentFilter:      'all',   // 'all' | 'recent' | 'lined' | 'blank'
  _searchQuery:        '',
  _selectedSubject:    'Computer Science',
  _selectedCoverColor: 'navy',
  _selectedPaperTheme: 'system',
  _subjectFilter:      null,

  init() {
    this._container = document.getElementById('file-manager-view');
    this._grid      = document.getElementById('notebook-grid');
    this._modal     = document.getElementById('new-notebook-modal');

    // Initialize 3D Bookshelf
    if (typeof BookshelfController !== 'undefined') {
      BookshelfController.init();
    }

    // New Notebook button
    const newNotebookBtn = document.getElementById('new-notebook-btn');
    if (newNotebookBtn) {
      newNotebookBtn.addEventListener('click', () => this.openModal());
    }

    // Modal controls
    const cancelBtn = document.getElementById('modal-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
    const createBtn = document.getElementById('modal-create');
    if (createBtn) createBtn.addEventListener('click', () => this._handleCreate());

    // Close modal when clicking the dark overlay
    if (this._modal) {
      this._modal.addEventListener('click', e => {
        if (e.target === this._modal) this.closeModal();
      });

      // Modal Subjectpreset chips selection
      const chips = this._modal.querySelectorAll('.sub-chip');
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          chips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this._selectedSubject = chip.dataset.subject;
        });
      });

      // Modal Cover color dots selection
      const colorDots = this._modal.querySelectorAll('.color-dot');
      colorDots.forEach(dot => {
        const radio = dot.querySelector('input[type="radio"]');
        dot.addEventListener('click', () => {
          colorDots.forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
          if (radio) radio.checked = true;
          this._selectedCoverColor = radio.value;
        });
      });

      // Modal Paper appearance selection chips
      const paperChips = this._modal.querySelectorAll('.paper-theme-chip');
      paperChips.forEach(chip => {
        chip.addEventListener('click', () => {
          paperChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this._selectedPaperTheme = chip.dataset.value;
        });
      });
    }

    // Enter key submits create form
    const titleInput = document.getElementById('notebook-title-input');
    if (titleInput) {
      titleInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') this._handleCreate();
      });
    }

    // Filter tabs & sidebar navigation items
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const filter = tab.dataset.filter;
        this._currentFilter = filter;
        this._subjectFilter = null;

        // Deactivate all subject buttons
        document.querySelectorAll('.subject-filter-btn').forEach(btn => btn.classList.remove('active'));

        // Sync active state on all matching tabs / nav items
        document.querySelectorAll('.filter-tab').forEach(t => {
          if (t.dataset.filter === filter) {
            t.classList.add('active');
          } else {
            t.classList.remove('active');
          }
        });

        this.render();
      });
    });

    // Subject filters in sidebar
    document.querySelectorAll('.subject-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const subject = btn.dataset.subject;
        if (this._subjectFilter === subject) {
          // Toggle off
          this._subjectFilter = null;
          btn.classList.remove('active');
        } else {
          // Toggle on
          this._subjectFilter = subject;
          document.querySelectorAll('.subject-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          // Reset normal filter tabs to 'all'
          this._currentFilter = 'all';
          document.querySelectorAll('.filter-tab').forEach(t => {
            if (t.dataset.filter === 'all') {
              t.classList.add('active');
            } else {
              t.classList.remove('active');
            }
          });
        }
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

    // Dynamic stats update
    const totalNotebooks = notebooks.length;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCount = notebooks.filter(nb => nb.updatedAt > cutoff).length;
    const linedCount = notebooks.filter(nb => nb.pageMode === 'lined').length;
    const blankCount = notebooks.filter(nb => nb.pageMode === 'blank').length;

    const totalVal = document.getElementById('stat-total-val');
    const recentVal = document.getElementById('stat-recent-val');
    const linedVal = document.getElementById('stat-lined-val');

    if (totalVal) totalVal.textContent = totalNotebooks;
    if (recentVal) recentVal.textContent = recentCount;
    if (linedVal) linedVal.textContent = linedCount;

    // Stat card 1: show most recent notebook's subject
    const timetableVal = document.getElementById('stat-timetable-val');
    if (timetableVal) {
      const allNbs = StorageManager.getNotebooks();
      if (allNbs.length > 0) {
        const latest = allNbs[0]; // already sorted by updatedAt desc
        timetableVal.textContent = latest.subject || latest.title || 'Notebook';
      } else {
        timetableVal.textContent = "Today's Class";
      }
    }

    // Apply search filter
    if (this._searchQuery) {
      notebooks = notebooks.filter(nb =>
        nb.title.toLowerCase().includes(this._searchQuery) ||
        (nb.subject && nb.subject.toLowerCase().includes(this._searchQuery))
      );
    }

    // Apply tab filter
    if (this._currentFilter === 'recent') {
      notebooks = notebooks.filter(nb => nb.updatedAt > cutoff);
    } else if (this._currentFilter === 'lined' || this._currentFilter === 'blank') {
      notebooks = notebooks.filter(nb => nb.pageMode === this._currentFilter);
    }

    // Apply subject filter
    if (this._subjectFilter) {
      notebooks = notebooks.filter(nb =>
        nb.subject && nb.subject.toLowerCase() === this._subjectFilter.toLowerCase()
      );
    }

    // Manage bookshelf visibility and synchronization
    const shelfWrapper = document.getElementById('shelf-section-wrapper');
    if (shelfWrapper) {
      if (notebooks.length === 0) {
        shelfWrapper.classList.add('hidden');
      } else {
        shelfWrapper.classList.remove('hidden');
        if (typeof BookshelfController !== 'undefined') {
          BookshelfController.update(notebooks);
        }
      }
    }

    if (notebooks.length === 0) {
      this._grid.innerHTML = this._emptyStateHTML();
      const btn = this._grid.querySelector('.empty-create-btn');
      if (btn) btn.addEventListener('click', () => this.openModal());
    } else {
      this._grid.className = 'notebook-shelf';
      this._grid.innerHTML = `<div class="da-notebook-grid">${notebooks.map(nb => this._cardHTML(nb)).join('')}</div>`;
      this._wireCardActions();
    }
  },

  openModal() {
    document.getElementById('notebook-title-input').value = 'Untitled Notebook';
    document.getElementById('page-mode-lined').checked = true;

    // Reset subject chips
    this._selectedSubject = 'Computer Science';
    const chips = this._modal.querySelectorAll('.sub-chip');
    chips.forEach(c => {
      c.classList.remove('active');
      if (c.dataset.subject === 'Computer Science') c.classList.add('active');
    });

    // Reset cover colors
    this._selectedCoverColor = 'navy';
    const colorDots = this._modal.querySelectorAll('.color-dot');
    colorDots.forEach(d => {
      d.classList.remove('active');
      const radio = d.querySelector('input[type="radio"]');
      if (radio) {
        if (radio.value === 'navy') {
          d.classList.add('active');
          radio.checked = true;
        } else {
          radio.checked = false;
        }
      }
    });

    // Reset paper appearance chips to default global setting
    const defaultPageTheme = typeof ThemeManager !== 'undefined' ? ThemeManager.getPageThemeSetting() : 'system';
    this._selectedPaperTheme = defaultPageTheme;
    const modalPaperChips = this._modal.querySelectorAll('.paper-theme-chip');
    modalPaperChips.forEach(chip => {
      chip.classList.remove('active');
      if (chip.dataset.value === defaultPageTheme) {
        chip.classList.add('active');
      }
    });

    this._modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('notebook-title-input').select(), 50);
  },

  closeModal() {
    this._modal.classList.add('hidden');
  },

  // ─── Private ───────────────────────────────────────────────────────────────

  _cardHTML(nb) {
    const date       = new Date(nb.updatedAt);
    const dateStr    = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const modeLabel  = nb.pageMode === 'lined' ? 'Lined' : 'Blank';
    const themeLabel = nb.pageTheme === 'light' ? 'Light'
                     : nb.pageTheme === 'dark'  ? 'Dark'
                     : 'Auto';
    const subject = this._escapeHtml(nb.subject || 'General');
    const title   = this._escapeHtml(nb.title   || 'Untitled');

    return `
      <article class="da-notebook-card" data-id="${nb.id}" data-page-mode="${nb.pageMode || 'lined'}"
               tabindex="0" role="button" aria-label="Open ${title}">
        <div class="da-card-rule"></div>
        <div class="da-card-label">
          <span class="da-card-subject">${subject}</span>
          <h3 class="da-card-title">${title}</h3>
        </div>
        <div class="da-card-thumb-area">
          ${nb.drawingDataUrl
            ? `<img src="${nb.drawingDataUrl}" alt="Drawing preview">`
            : `<div class="da-card-thumb-empty-lines">
                 <div class="da-note-line"></div>
                 <div class="da-note-line"></div>
                 <div class="da-note-line"></div>
                 <div class="da-note-line"></div>
               </div>`}
        </div>
        <footer class="da-card-footer">
          <span class="da-card-badge">${modeLabel}</span>
          <span class="da-card-badge">${themeLabel}</span>
          <time class="da-card-date">${dateStr}</time>
          <div class="da-card-actions">
            <button class="da-card-action-btn rename-btn" data-id="${nb.id}" title="Rename">Rename</button>
            <button class="da-card-action-btn delete-btn delete" data-id="${nb.id}" title="Delete">Delete</button>
          </div>
        </footer>
      </article>
    `;
  },

  _emptyStateHTML() {
    const isFiltered = this._currentFilter !== 'all' || this._searchQuery;
    if (isFiltered) {
      return `
        <div class="empty-state">
          <h2>Nothing here</h2>
          <p>Try a different filter or search term.</p>
        </div>
      `;
    }
    return `
      <div class="empty-state">
        <div class="book-shelf" aria-hidden="true">
          <span class="book book-one">Notes</span>
          <span class="book book-two">Physics</span>
          <span class="book book-three">Algo</span>
          <span class="book book-four">DM</span>
          <span class="book book-five">CM1025</span>
          <span class="book book-six">Lab</span>
          <span class="book book-seven">Essay</span>
        </div>
        <h2>No class notebooks yet</h2>
        <p>Create your first notebook for a subject, lecture, or sketch page.</p>
        <button class="ghost-create-btn empty-create-btn">Create first notebook</button>
      </div>
    `;
  },

  _wireCardActions() {
    this._grid.querySelectorAll('.da-notebook-card').forEach(card => {
      card.addEventListener('click', e => {
        if (!e.target.closest('.da-card-action-btn')) {
          AppState.openNotebook(card.dataset.id);
        }
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') AppState.openNotebook(card.dataset.id);
      });
    });

    this._grid.querySelectorAll('.rename-btn').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); this._handleRename(btn.dataset.id); });
    });

    this._grid.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); this._handleDelete(btn.dataset.id); });
    });
  },

  _handleCreate() {
    const title    = document.getElementById('notebook-title-input').value.trim() || 'Untitled Notebook';
    const pageMode = document.querySelector('input[name="pageMode"]:checked').value;
    const subject = this._selectedSubject || 'Computer Science';
    const coverColor = this._selectedCoverColor || 'navy';
    const pageTheme = this._selectedPaperTheme || 'system';
    const notebook = StorageManager.createNotebook({ title, pageMode, subject, coverColor, pageTheme });
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
