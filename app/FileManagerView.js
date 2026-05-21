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
    if (linedVal) linedVal.textContent = totalNotebooks; // Study Pages corresponds to all notebook pages

    // Today's dynamic timetable course schedule
    const timetableVal = document.getElementById('stat-timetable-val');
    if (timetableVal) {
      const days = [
        'Sunday Rest',        // 0
        'Comp Science',       // 1
        'Maths Lecture',      // 2
        'Physics Lab',        // 3
        'Software Eng',       // 4
        'Creative Sketch',    // 5
        'Weekly Review'       // 6
      ];
      const todayIndex = new Date().getDay();
      timetableVal.textContent = days[todayIndex];
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

    if (notebooks.length === 0) {
      this._grid.innerHTML = this._emptyStateHTML();
      const btn = this._grid.querySelector('.empty-create-btn');
      if (btn) btn.addEventListener('click', () => this.openModal());
    } else if (this._currentFilter !== 'all' || this._searchQuery) {
      this._grid.className = 'notebook-shelf standard-grid-layout';
      this._grid.innerHTML = notebooks.map(nb => this._cardHTML(nb)).join('');
      this._wireCardActions();
    } else {
      this._grid.className = 'notebook-shelf immersive-workspace-layout';
      
      const recentNotebooks = notebooks.slice(0, 1);
      const remainingNotebooks = notebooks.slice(1);
      const sketches = remainingNotebooks.filter(nb => nb.subject === 'Sketches' || nb.pageMode === 'blank');
      const binders = remainingNotebooks.filter(nb => nb.subject !== 'Sketches' && nb.pageMode !== 'blank');

      this._grid.innerHTML = `
        <div class="workspace-layout">
          <!-- SECTION 1: ACTIVE STUDY DESK -->
          <div class="active-study-desk">
            <!-- Pinned Header Label inside the Desk Surface -->
            <div class="desk-header-label">
              <div class="desk-tape-pin"></div>
              <span class="label-pin">📌</span>
              <div class="desk-header-text">
                <h3>Active Study Desk</h3>
                <span class="label-subtitle">Most recently edited notebook files</span>
              </div>
            </div>
            
            <div class="desk-zones">
              <!-- Left Zone: Recent Notebook -->
              <div class="desk-zone recent-notebook-zone">
                <div class="desk-zone-title">Recent Notebook</div>
                <div class="recent-notebook-wrapper">
                  <div class="desk-notebook-mat"></div>
                  <div class="active-notebooks-container">
                    ${recentNotebooks.length > 0 
                      ? recentNotebooks.map(nb => this._cardHTML(nb)).join('') 
                      : `<div class="no-recent-book">No recent notes. Create one below to begin!</div>`}
                  </div>
                </div>
              </div>

              <!-- Middle Zone: Loose Notes -->
              <div class="desk-zone loose-notes-zone">
                <div class="desk-zone-title">Loose Notes</div>
                <div class="loose-paper-stack">
                  <!-- Decorative CSS-only paper sheets -->
                  <div class="loose-sheet sheet-blank">
                    <div class="sheet-title">Sketch Page</div>
                    <div class="sheet-doodle-path"></div>
                  </div>
                  <div class="loose-sheet sheet-lined">
                    <!-- Metal paperclip clipped to sheet -->
                    <div class="desk-paperclip"></div>
                    <div class="sheet-title">Quick Draft</div>
                    <div class="sheet-lines">
                      <div class="sheet-line">• Review Maths Chapter 4</div>
                      <div class="sheet-line">• Complete CS assignment</div>
                      <div class="sheet-line">• Study for Physics quiz</div>
                    </div>
                  </div>
                  <div class="study-checklist-card">
                    <div class="desk-tape"></div>
                    <div class="checklist-title">To Revise</div>
                    <div class="checklist-items">
                      <label class="chk-item"><input type="checkbox" checked disabled> <span>HTML structures</span></label>
                      <label class="chk-item"><input type="checkbox" checked disabled> <span>CSS styling</span></label>
                      <label class="chk-item"><input type="checkbox" disabled> <span>JS animations</span></label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right Zone: Pinned Reminders -->
              <div class="desk-zone pinned-reminders-zone">
                <div class="desk-zone-title">Pinned Reminders</div>
                <div class="reminders-container">
                  <!-- Sticky note 1: Study Yellow -->
                  <div class="sticky-reminder color-yellow">
                    <div class="desk-tape"></div>
                    <span class="sticky-text">Study<br>Hard! ☕️</span>
                  </div>

                  <!-- Sticky note 2: Next Lecture Orange -->
                  <div class="sticky-reminder color-orange">
                    <div class="desk-tape"></div>
                    <span class="sticky-text">Physics @ 10am<br>Room 302 🚀</span>
                  </div>
                  
                  <!-- Subject Folder Stack -->
                  <div class="subject-folder-stack">
                    <div class="folder-tab-peeking">Folder Index</div>
                    <div class="folder-body-peek">
                      <div class="folder-line">Maths Syllabus</div>
                      <div class="folder-line">CS Projects</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Absolute desk decorations inside the desk mat -->
            <div class="desk-ornament coffee-stain"></div>
            <div class="desk-ornament desk-pencil"></div>
          </div>

          <div class="workspace-divider-line"></div>

          <!-- SECTION 2: BINDER SHELF & SKETCH CORNER SIDE-BY-SIDE -->
          <div class="workspace-library-container">
            <div class="workspace-section binders-section">
              <div class="section-label-maker">
                <span class="label-pin">📚</span>
                <h3>Course Lecture Binders</h3>
                <span class="label-subtitle">Class notes and lecture files</span>
              </div>
              
              <div class="binders-grid">
                ${binders.map(nb => this._cardHTML(nb)).join('')}
                ${this._renderBinderPlaceholders(binders.length)}
              </div>
            </div>

            <div class="workspace-section sketches-section">
              <div class="section-label-maker">
                <span class="label-pin">🎨</span>
                <h3>Creative Sketch Pad</h3>
                <span class="label-subtitle">Blank page sketches and ideas</span>
              </div>
              
              <div class="sketches-grid">
                ${sketches.map(nb => this._cardHTML(nb)).join('')}
                ${this._renderSketchPlaceholders(sketches.length)}
              </div>
            </div>
          </div>
        </div>
      `;
      
      this._wireCardActions();
    }
  },

  _renderBinderPlaceholders(existingCount) {
    const minPlaceholders = 2;
    const needed = Math.max(0, minPlaceholders - existingCount);
    let html = '';
    const presets = [
      { subject: 'Computer Science', cover: 'navy', label: 'Comp Sci' },
      { subject: 'Maths', cover: 'sage', label: 'Maths' },
      { subject: 'Physics', cover: 'coral', label: 'Physics' }
    ];
    for (let i = 0; i < needed; i++) {
      const preset = presets[i % presets.length];
      html += `
        <div class="notebook-placeholder-card cover-${preset.cover} binder-slot" data-subject="${preset.subject}" data-pagemode="lined" title="Add new ${preset.subject} notebook">
          <!-- Physical spine outline -->
          <div class="placeholder-spine"></div>
          <div class="placeholder-rings">
            <div class="ring-loop"></div>
            <div class="ring-loop"></div>
            <div class="ring-loop"></div>
          </div>
          <div class="placeholder-dashed-inner">
            <span class="placeholder-plus">+</span>
            <span class="placeholder-label">New ${preset.label} Binder</span>
          </div>
        </div>
      `;
    }
    return html;
  },

  _renderSketchPlaceholders(existingCount) {
    const minPlaceholders = 1;
    const needed = Math.max(0, minPlaceholders - existingCount);
    let html = '';
    for (let i = 0; i < needed; i++) {
      html += `
        <div class="notebook-placeholder-card cover-tan sketch-slot" data-subject="Sketches" data-pagemode="blank" title="Add new Sketchbook">
          <div class="placeholder-spine"></div>
          <div class="placeholder-dashed-inner">
            <span class="placeholder-plus">🎨</span>
            <span class="placeholder-label">Start Fresh Sketch</span>
          </div>
        </div>
      `;
    }
    return html;
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
    const date    = new Date(nb.updatedAt);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const modeLabel = nb.pageMode === 'lined' ? 'Lined Paper' : 'Blank Paper';
    const subject = nb.subject || 'Other';
    const coverColor = nb.coverColor || 'navy';
    const resolvedTheme = typeof ThemeManager !== 'undefined' ? ThemeManager.resolvePageTheme(nb) : 'light';

    let tagLabel = 'Class Notes';
    if (subject === 'Sketches') tagLabel = 'Sketchbook';
    else if (subject === 'Other') tagLabel = 'Study Binder';

    const subjectSlug = subject.replace(/\s+/g, '-').toLowerCase();

    return `
      <div class="notebook-card cover-${coverColor} subject-${subjectSlug}" data-id="${nb.id}" title="Open ${this._escapeHtml(nb.title)}">
        <!-- Physical Subject Tab sticking out -->
        <div class="notebook-subject-tab">${subject}</div>
        
        <!-- Left Spine Area -->
        <div class="notebook-spine"></div>
        
        <!-- Metallic Binder Rings / Spiral loops -->
        <div class="notebook-rings">
          <div class="ring-loop"></div>
          <div class="ring-loop"></div>
          <div class="ring-loop"></div>
          <div class="ring-loop"></div>
          <div class="ring-loop"></div>
          <div class="ring-loop"></div>
        </div>

        <!-- Cover Pattern Overlay -->
        <div class="notebook-cover-pattern"></div>

        <!-- Thumbnail representing the first page inside the cover -->
        <div class="card-preview ${nb.pageMode} ${resolvedTheme}">
          ${nb.drawingDataUrl ? `<img class="card-thumbnail" src="${nb.drawingDataUrl}" alt="">` : ''}
        </div>

        <!-- Handwritten Paper Label Sticker -->
        <div class="notebook-label-sticker">
          <span class="card-tag">${tagLabel}</span>
          <div class="card-title">${this._escapeHtml(nb.title)}</div>
          <div class="card-subject-chip sub-${subjectSlug}">${subject}</div>
        </div>

        <!-- Card Footer Metadata Info -->
        <div class="card-info">
          <div class="card-meta">
            <span class="page-mode-badge">${modeLabel}</span>
            <span class="card-date">${dateStr} · ${timeStr}</span>
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
          <span class="book book-one">Logic</span>
          <span class="book book-two">Drafts</span>
          <span class="book book-three">Seminar</span>
          <span class="book book-four">Proofs</span>
          <span class="book book-five">Sketch</span>
          <span class="book book-six">Labs</span>
          <span class="book book-seven">Notes</span>
        </div>
        <h2>No notebooks on the shelf yet</h2>
        <p>Create your first notebook for a subject, lecture, or sketch page.</p>
        <button class="ghost-create-btn empty-create-btn">Create first notebook</button>
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

    // Wire up placeholder click handlers
    this._grid.querySelectorAll('.notebook-placeholder-card').forEach(card => {
      card.addEventListener('click', () => {
        const subject = card.dataset.subject;
        const pageMode = card.dataset.pagemode;
        
        // Open modal
        this.openModal();
        
        // Pre-select correct subject chip
        this._selectedSubject = subject;
        const chips = this._modal.querySelectorAll('.sub-chip');
        chips.forEach(c => {
          c.classList.remove('active');
          if (c.dataset.subject === subject) {
            c.classList.add('active');
          }
        });
        
        // Pre-select correct page mode radio
        const linedRadio = document.getElementById('page-mode-lined');
        const blankRadio = document.getElementById('page-mode-blank');
        if (pageMode === 'lined') {
          if (linedRadio) linedRadio.checked = true;
        } else {
          if (blankRadio) blankRadio.checked = true;
        }

        // Set matching cover color for the subject
        let matchingColor = 'navy';
        if (subject === 'Maths') matchingColor = 'sage';
        else if (subject === 'Physics') matchingColor = 'coral';
        else if (subject === 'Sketches') matchingColor = 'tan';
        else if (subject === 'Other') matchingColor = 'blue';

        this._selectedCoverColor = matchingColor;
        const colorDots = this._modal.querySelectorAll('.color-dot');
        colorDots.forEach(d => {
          d.classList.remove('active');
          const radio = d.querySelector('input[type="radio"]');
          if (radio) {
            if (radio.value === matchingColor) {
              d.classList.add('active');
              radio.checked = true;
            } else {
              radio.checked = false;
            }
          }
        });
      });
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
