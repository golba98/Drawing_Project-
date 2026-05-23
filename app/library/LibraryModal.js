// app/library/LibraryModal.js
// Modal controller for all Study Library CRUD dialogs.
// Requires #lib-modal and #lib-modal-box to exist in index.html.

const LibraryModal = {
  _el:  null,  // #lib-modal  (the overlay)
  _box: null,  // #lib-modal-box

  init() {
    this._el  = document.getElementById('lib-modal');
    this._box = document.getElementById('lib-modal-box');
    if (!this._el) return;

    this._el.addEventListener('click', e => {
      if (e.target === this._el) this.close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !this._el.classList.contains('hidden')) this.close();
    });
  },

  // config: { type, year?, semester?, subject?, topic?, onSave?, onRename?, onArchive?, onDelete? }
  open(config) {
    if (!this._el) return;
    this._box.innerHTML = this._buildHTML(config);
    this._el.classList.remove('hidden');
    this._wireForm(config);
    const firstInput = this._box.querySelector('input[type="text"]');
    if (firstInput) setTimeout(() => firstInput.focus(), 60);
  },

  close() {
    if (!this._el) return;
    this._el.classList.add('hidden');
    this._box.innerHTML = '';
  },

  // ── HTML builder ──────────────────────────────────────────────────────────

  _buildHTML(config) {
    const e = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const swatches = (selected = '#C8952A') =>
      ['#C8952A', '#A0522D', '#8B6F47', '#6B7A3A'].map(c =>
        `<button type="button" class="accent-swatch${c === selected ? ' selected' : ''}" data-color="${c}" style="background:${c};"></button>`
      ).join('');

    const footer = (cancelLabel, saveLabel, danger = false) => `
      <div class="modal-actions">
        <button type="button" id="lib-modal-cancel">${cancelLabel}</button>
        ${saveLabel ? `<button type="button" id="lib-modal-save" class="${danger ? 'btn-danger' : 'btn-primary'}">${saveLabel}</button>` : ''}
      </div>`;

    switch (config.type) {

      // ── Years ──
      case 'add-year':
        return `
          <h2>Add Academic Year</h2>
          <label for="lib-modal-label">Year Name</label>
          <input type="text" id="lib-modal-label" placeholder="Year 2" maxlength="60" autocomplete="off">
          <label for="lib-modal-cal" style="margin-top:12px;">Calendar Year</label>
          <input type="text" id="lib-modal-cal" placeholder="2027" maxlength="10" autocomplete="off">
          <label style="margin-top:12px;">Accent Color</label>
          <div class="accent-swatches">${swatches()}</div>
          <input type="hidden" id="lib-modal-accent" value="#C8952A">
          <div class="lib-modal-error hidden" id="lib-modal-err"></div>
          ${footer('Cancel', 'Create Year')}`;

      case 'rename-year':
        return `
          <h2>Rename Year</h2>
          <label for="lib-modal-label">Year Name</label>
          <input type="text" id="lib-modal-label" value="${e(config.year?.label)}" maxlength="60" autocomplete="off">
          <div class="lib-modal-error hidden" id="lib-modal-err"></div>
          ${footer('Cancel', 'Save')}`;

      case 'archive-year': {
        const restoring = config.year?.archived;
        return `
          <h2>${restoring ? 'Restore' : 'Archive'} Year</h2>
          <p class="lib-modal-danger-text">
            ${restoring
              ? `"${e(config.year?.label)}" will become active again.`
              : `"${e(config.year?.label)}" will be hidden but not deleted. You can restore it later.`}
          </p>
          ${footer('Cancel', restoring ? 'Restore Year' : 'Archive Year')}`;
      }

      case 'delete-year':
        return `
          <h2>Delete Year</h2>
          <p class="lib-modal-danger-text">Permanently delete <strong>${e(config.year?.label)}</strong> and all its semesters and subjects? This cannot be undone.</p>
          ${footer('Cancel', 'Delete Year', true)}`;

      case 'year-menu':
        return `
          <h2>${e(config.year?.label || 'Year')} — Options</h2>
          <div style="display:flex;flex-direction:column;gap:8px;margin:16px 0 4px;">
            <button type="button" id="lib-menu-rename" class="btn btn-ghost" style="justify-content:flex-start;">Rename Year</button>
            <button type="button" id="lib-menu-archive" class="btn btn-ghost" style="justify-content:flex-start;">
              ${config.year?.archived ? 'Restore Year' : 'Archive Year'}
            </button>
            <button type="button" id="lib-menu-delete" class="btn btn-ghost" style="justify-content:flex-start;color:#e06060;">Delete Year</button>
          </div>
          ${footer('Close')}`;

      // ── Semesters ──
      case 'add-semester':
        return `
          <h2>Add Semester</h2>
          <label for="lib-modal-label">Semester Name</label>
          <input type="text" id="lib-modal-label" placeholder="Semester 3" maxlength="60" autocomplete="off">
          <div class="lib-modal-error hidden" id="lib-modal-err"></div>
          ${footer('Cancel', 'Create Semester')}`;

      case 'rename-semester':
        return `
          <h2>Rename Semester</h2>
          <label for="lib-modal-label">Semester Name</label>
          <input type="text" id="lib-modal-label" value="${e(config.semester?.label)}" maxlength="60" autocomplete="off">
          <div class="lib-modal-error hidden" id="lib-modal-err"></div>
          ${footer('Cancel', 'Save')}`;

      case 'archive-semester': {
        const restoring = config.semester?.archived;
        return `
          <h2>${restoring ? 'Restore' : 'Archive'} Semester</h2>
          <p class="lib-modal-danger-text">
            ${restoring
              ? `"${e(config.semester?.label)}" will become active again.`
              : `"${e(config.semester?.label)}" will be hidden from navigation.`}
          </p>
          ${footer('Cancel', restoring ? 'Restore' : 'Archive')}`;
      }

      case 'delete-semester':
        return `
          <h2>Delete Semester</h2>
          <p class="lib-modal-danger-text">Permanently delete <strong>${e(config.semester?.label)}</strong> and all its subjects? This cannot be undone.</p>
          ${footer('Cancel', 'Delete Semester', true)}`;

      case 'semester-menu':
        return `
          <h2>${e(config.semester?.label || 'Semester')} — Options</h2>
          <div style="display:flex;flex-direction:column;gap:8px;margin:16px 0 4px;">
            <button type="button" id="lib-menu-rename" class="btn btn-ghost" style="justify-content:flex-start;">Rename Semester</button>
            <button type="button" id="lib-menu-archive" class="btn btn-ghost" style="justify-content:flex-start;">
              ${config.semester?.archived ? 'Restore Semester' : 'Archive Semester'}
            </button>
            <button type="button" id="lib-menu-delete" class="btn btn-ghost" style="justify-content:flex-start;color:#e06060;">Delete Semester</button>
          </div>
          ${footer('Close')}`;

      // ── Subjects ──
      case 'add-subject':
        return `
          <h2>Add Subject</h2>
          <label for="lib-modal-label">Subject Name</label>
          <input type="text" id="lib-modal-label" placeholder="e.g. Algorithms Advanced" maxlength="80" autocomplete="off">
          <label style="margin-top:12px;">Accent Color</label>
          <div class="accent-swatches">${swatches()}</div>
          <input type="hidden" id="lib-modal-accent" value="#C8952A">
          <div class="lib-modal-error hidden" id="lib-modal-err"></div>
          ${footer('Cancel', 'Add Subject')}`;

      case 'rename-subject':
        return `
          <h2>Rename Subject</h2>
          <label for="lib-modal-label">Subject Name</label>
          <input type="text" id="lib-modal-label" value="${e(config.subject?.title)}" maxlength="80" autocomplete="off">
          <div class="lib-modal-error hidden" id="lib-modal-err"></div>
          ${footer('Cancel', 'Save')}`;

      case 'delete-subject':
        return `
          <h2>Delete Subject</h2>
          <p class="lib-modal-danger-text">Permanently delete <strong>${e(config.subject?.title)}</strong> and all its topics? This cannot be undone.</p>
          ${footer('Cancel', 'Delete Subject', true)}`;

      case 'subject-menu':
        return `
          <h2>${e(config.subject?.title || 'Subject')} — Options</h2>
          <div style="display:flex;flex-direction:column;gap:8px;margin:16px 0 4px;">
            <button type="button" id="lib-menu-rename" class="btn btn-ghost" style="justify-content:flex-start;">Rename Subject</button>
            <button type="button" id="lib-menu-delete" class="btn btn-ghost" style="justify-content:flex-start;color:#e06060;">Delete Subject</button>
          </div>
          ${footer('Close')}`;

      // ── Topics ──
      case 'add-topic':
        return `
          <h2>Add Topic</h2>
          <label for="lib-modal-label">Topic Name</label>
          <input type="text" id="lib-modal-label" placeholder="e.g. Binary Search Trees" maxlength="120" autocomplete="off">
          <label style="margin-top:12px;">Topic Type</label>
          <div class="topic-type-group">
            <button type="button" class="topic-type-btn selected" data-type="lecture">Lecture</button>
            <button type="button" class="topic-type-btn" data-type="assessment">Assessment</button>
            <button type="button" class="topic-type-btn" data-type="exam">Exam</button>
            <button type="button" class="topic-type-btn" data-type="project">Project</button>
          </div>
          <input type="hidden" id="lib-modal-type" value="lecture">
          <div class="lib-modal-error hidden" id="lib-modal-err"></div>
          ${footer('Cancel', 'Add Topic')}`;

      case 'delete-topic':
        return `
          <h2>Delete Topic</h2>
          <p class="lib-modal-danger-text">Permanently delete <strong>${e(config.topic?.title)}</strong>? This cannot be undone.</p>
          ${footer('Cancel', 'Delete Topic', true)}`;

      // ── Notes ──
      case 'rename-note':
        return `
          <h2>Rename Note</h2>
          <label for="lib-modal-label">Note title</label>
          <input type="text" id="lib-modal-label" value="${e(config.note?.title)}" maxlength="80" autocomplete="off">
          <div class="lib-modal-error hidden" id="lib-modal-err"></div>
          ${footer('Cancel', 'Save')}`;

      case 'delete-note':
        return `
          <h2>Delete Note</h2>
          <p class="lib-modal-danger-text">Permanently delete <strong>${e(config.note?.title)}</strong>? This cannot be undone.</p>
          ${footer('Cancel', 'Delete Note', true)}`;

      // ── Sketch Pages ──
      case 'rename-sketch-page':
        return `
          <h2>Rename Page</h2>
          <label for="lib-modal-label">Page name</label>
          <input type="text" id="lib-modal-label" value="${e(config.page?.title)}" maxlength="60" autocomplete="off">
          <div class="lib-modal-error hidden" id="lib-modal-err"></div>
          ${footer('Cancel', 'Save')}`;

      case 'delete-sketch-page':
        return `
          <h2>Delete Page</h2>
          <p class="lib-modal-danger-text">Permanently delete <strong>${e(config.page?.title)}</strong> and its drawing? This cannot be undone.</p>
          ${footer('Cancel', 'Delete Page', true)}`;

      case 'clear-sketch-page':
        return `
          <h2>Clear Page</h2>
          <p class="lib-modal-danger-text">Clear all drawing on <strong>${e(config.page?.title)}</strong>? This cannot be undone.</p>
          ${footer('Cancel', 'Clear Page', true)}`;

      default:
        return `<h2>Unknown</h2>${footer('Close')}`;
    }
  },

  // ── Event wiring ──────────────────────────────────────────────────────────

  _wireForm(config) {
    this._box.querySelector('#lib-modal-cancel')?.addEventListener('click', () => this.close());

    // Accent swatch toggles
    this._box.querySelectorAll('.accent-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        this._box.querySelectorAll('.accent-swatch').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const hidden = this._box.querySelector('#lib-modal-accent');
        if (hidden) hidden.value = btn.dataset.color;
      });
    });

    // Topic type toggles
    this._box.querySelectorAll('.topic-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._box.querySelectorAll('.topic-type-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const hidden = this._box.querySelector('#lib-modal-type');
        if (hidden) hidden.value = btn.dataset.type;
      });
    });

    // Save button
    const saveBtn = this._box.querySelector('#lib-modal-save');
    if (saveBtn && config.onSave) {
      saveBtn.addEventListener('click', () => {
        const data = this._collectData(config);
        if (data === null) return;
        config.onSave(data);
        this.close();
      });
    }

    // Action-sheet menus — transition to sub-modal in-place
    const menuRename  = this._box.querySelector('#lib-menu-rename');
    const menuArchive = this._box.querySelector('#lib-menu-archive');
    const menuDelete  = this._box.querySelector('#lib-menu-delete');

    if (config.type === 'year-menu') {
      menuRename?.addEventListener('click', () => this.open({
        type: 'rename-year', year: config.year,
        onSave: d => config.onRename?.(d.label)
      }));
      menuArchive?.addEventListener('click', () => this.open({
        type: 'archive-year', year: config.year,
        onSave: () => config.onArchive?.(!config.year.archived)
      }));
      menuDelete?.addEventListener('click', () => this.open({
        type: 'delete-year', year: config.year,
        onSave: () => config.onDelete?.()
      }));
    }

    if (config.type === 'semester-menu') {
      menuRename?.addEventListener('click', () => this.open({
        type: 'rename-semester', semester: config.semester,
        onSave: d => config.onRename?.(d.label)
      }));
      menuArchive?.addEventListener('click', () => this.open({
        type: 'archive-semester', semester: config.semester,
        onSave: () => config.onArchive?.(!config.semester.archived)
      }));
      menuDelete?.addEventListener('click', () => this.open({
        type: 'delete-semester', semester: config.semester,
        onSave: () => config.onDelete?.()
      }));
    }

    if (config.type === 'subject-menu') {
      menuRename?.addEventListener('click', () => this.open({
        type: 'rename-subject', subject: config.subject,
        onSave: d => config.onRename?.(d.title)
      }));
      menuDelete?.addEventListener('click', () => this.open({
        type: 'delete-subject', subject: config.subject,
        onSave: () => config.onDelete?.()
      }));
    }
  },

  // ── Collect form data ─────────────────────────────────────────────────────

  _collectData(config) {
    const labelInput = this._box.querySelector('#lib-modal-label');
    const errEl      = this._box.querySelector('#lib-modal-err');

    const showErr = msg => {
      if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
    };

    switch (config.type) {
      case 'add-year': {
        const label = labelInput?.value.trim();
        if (!label) { showErr('Year name is required.'); return null; }
        return {
          label,
          calendarYear: this._box.querySelector('#lib-modal-cal')?.value.trim() || '',
          accentColor:  this._box.querySelector('#lib-modal-accent')?.value || '#C8952A'
        };
      }
      case 'rename-year':
      case 'rename-semester': {
        const label = labelInput?.value.trim();
        if (!label) { showErr('Name is required.'); return null; }
        return { label };
      }
      case 'rename-subject': {
        const title = labelInput?.value.trim();
        if (!title) { showErr('Subject name is required.'); return null; }
        return { title };
      }
      case 'add-semester': {
        const label = labelInput?.value.trim();
        if (!label) { showErr('Semester name is required.'); return null; }
        return { label };
      }
      case 'add-subject': {
        const title = labelInput?.value.trim();
        if (!title) { showErr('Subject name is required.'); return null; }
        return { title, accentColor: this._box.querySelector('#lib-modal-accent')?.value || '#C8952A' };
      }
      case 'add-topic': {
        const title = labelInput?.value.trim();
        if (!title) { showErr('Topic name is required.'); return null; }
        return { title, type: this._box.querySelector('#lib-modal-type')?.value || 'lecture' };
      }
      case 'rename-note':
      case 'rename-sketch-page': {
        const title = labelInput?.value.trim();
        if (!title) { showErr('Name is required.'); return null; }
        return { title };
      }
      // Confirmation-only modals — no form data to collect
      default:
        return {};
    }
  }
};
