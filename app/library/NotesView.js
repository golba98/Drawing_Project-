// app/library/NotesView.js
// UI controller for the Notes tab inside a library topic.
// List of text notes with inline editor and autosave.

const NotesView = {

  // ── State (reset on each mount) ───────────────────────────────────────────

  _panel:        null,
  _coords:       null,
  _notes:        null,
  _activeNoteId: null,
  _saveTimer:    null,
  _bound:        null,

  // ── Public API ────────────────────────────────────────────────────────────

  mount(panelEl, topic, coords) {
    this.unmount();

    this._panel  = panelEl;
    this._coords = coords;
    this._notes  = Array.isArray(topic.notes) ? topic.notes.slice() : [];

    this._activeNoteId = this._notes.length > 0 ? this._notes[0].id : null;

    this._render();

    this._bound = (e) => this._handleEvent(e);
    panelEl.addEventListener('click',  this._bound);
    panelEl.addEventListener('input',  this._bound);
  },

  renameActive() {
    if (this._activeNoteId) this._renameNote(this._activeNoteId);
  },

  unmount() {
    if (!this._panel) return;

    this._flushSave();
    clearTimeout(this._saveTimer);
    this._saveTimer = null;

    if (this._bound) {
      this._panel.removeEventListener('click', this._bound);
      this._panel.removeEventListener('input', this._bound);
      this._bound = null;
    }

    if (this._panel) {
      this._panel.style.padding  = '';
      this._panel.style.overflow = '';
    }

    this._panel        = null;
    this._coords       = null;
    this._notes        = null;
    this._activeNoteId = null;
  },

  // ── Rendering ─────────────────────────────────────────────────────────────

  _render() {
    this._panel.style.padding  = '0';
    this._panel.style.overflow = 'hidden';
    this._panel.innerHTML = `
      <div class="notes-workspace">
        ${this._renderSidebar()}
        <div class="notes-main">
          ${this._renderEditor()}
        </div>
      </div>`;
  },

  _renderSidebar() {
    const listHtml = this._notes.length === 0
      ? `<div class="note-list-empty">No notes yet.</div>`
      : this._notes.map(n => this._renderNoteItem(n)).join('');

    return `
      <div class="notes-sidebar">
        <div class="notes-sidebar-header">Notes</div>
        <div class="note-list">${listHtml}</div>
        <button class="notes-add-btn" data-note-action="add-note">+ Add Note</button>
      </div>`;
  },

  _renderNoteItem(note) {
    const active = note.id === this._activeNoteId;
    const e = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `
      <div class="note-list-item${active ? ' active' : ''}"
           data-note-action="select-note"
           data-note-id="${e(note.id)}">
        <span class="note-list-title">${e(note.title)}</span>
        <div class="note-list-actions">
          <button class="note-list-action-btn"
                  data-note-action="rename-note"
                  data-note-id="${e(note.id)}"
                  title="Rename">✎</button>
          <button class="note-list-action-btn"
                  data-note-action="delete-note"
                  data-note-id="${e(note.id)}"
                  title="Delete">✕</button>
        </div>
      </div>`;
  },

  _renderEditor() {
    if (!this._activeNoteId) {
      return `<div class="note-editor-empty">Select a note or add a new one.</div>`;
    }
    const note = this._notes.find(n => n.id === this._activeNoteId);
    if (!note) {
      return `<div class="note-editor-empty">Select a note or add a new one.</div>`;
    }
    const e = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
      <div class="note-editor animate-fade">
        <div class="note-editor-title">${e(note.title)}</div>
        <textarea id="note-content-area" placeholder="Start writing...">${e(note.content || '')}</textarea>
        <div class="note-save-indicator" id="note-save-indicator">Saved</div>
      </div>`;
  },

  _refreshNoteList() {
    const list = this._panel && this._panel.querySelector('.note-list');
    if (!list) return;
    list.innerHTML = this._notes.length === 0
      ? `<div class="note-list-empty">No notes yet.</div>`
      : this._notes.map(n => this._renderNoteItem(n)).join('');
  },

  _refreshEditor() {
    const main = this._panel && this._panel.querySelector('.notes-main');
    if (!main) return;
    main.innerHTML = this._renderEditor();
    // Wire the textarea if a note is open
    if (this._activeNoteId) {
      const ta = main.querySelector('#note-content-area');
      if (ta) ta.focus();
    }
  },

  // ── Event handling ────────────────────────────────────────────────────────

  _handleEvent(e) {
    if (e.type === 'input') {
      if (e.target.id === 'note-content-area') {
        e.stopPropagation();
        this._onContentInput();
      }
      return;
    }

    const el = e.target.closest('[data-note-action]');
    if (!el) return;
    e.stopPropagation();

    const action = el.dataset.noteAction;
    const noteId = el.dataset.noteId;

    switch (action) {
      case 'select-note':
        if (noteId && noteId !== this._activeNoteId) this._switchNote(noteId);
        break;
      case 'add-note':
        this._addNote();
        break;
      case 'rename-note':
        if (noteId) this._renameNote(noteId);
        break;
      case 'delete-note':
        if (noteId) this._deleteNote(noteId);
        break;
    }
  },

  // ── Note management ───────────────────────────────────────────────────────

  _switchNote(noteId) {
    this._flushSave();
    clearTimeout(this._saveTimer);
    this._activeNoteId = noteId;
    this._refreshNoteList();
    this._refreshEditor();
  },

  _addNote() {
    const title = 'Note ' + (this._notes.length + 1);
    const note  = LibraryStorage.addNote(this._coords, title);
    if (!note) return;

    // Reload from storage to get canonical object
    const topic = this._loadTopic();
    this._notes = topic ? (Array.isArray(topic.notes) ? topic.notes.slice() : []) : this._notes;

    this._activeNoteId = note.id;
    this._refreshNoteList();
    this._refreshEditor();
  },

  _renameNote(noteId) {
    const note = this._notes.find(n => n.id === noteId);
    if (!note) return;

    LibraryModal.open({
      type: 'rename-note',
      note,
      onSave: (data) => {
        LibraryStorage.renameNote(this._coords, noteId, data.title);
        const entry = this._notes.find(n => n.id === noteId);
        if (entry) entry.title = data.title;
        this._refreshNoteList();
        // Update the editor title if this note is active
        if (noteId === this._activeNoteId) {
          const titleEl = this._panel && this._panel.querySelector('.note-editor-title');
          if (titleEl) titleEl.textContent = data.title;
        }
      },
    });
  },

  _deleteNote(noteId) {
    const note = this._notes.find(n => n.id === noteId);
    if (!note) return;

    LibraryModal.open({
      type: 'delete-note',
      note,
      onSave: () => {
        LibraryStorage.deleteNote(this._coords, noteId);
        const idx = this._notes.findIndex(n => n.id === noteId);
        if (idx !== -1) this._notes.splice(idx, 1);

        // Pick a neighboring note to activate, or null if none left
        if (noteId === this._activeNoteId) {
          const neighbor = this._notes[Math.max(0, idx - 1)];
          this._activeNoteId = neighbor ? neighbor.id : null;
        }

        this._refreshNoteList();
        this._refreshEditor();
      },
    });
  },

  // ── Persistence ───────────────────────────────────────────────────────────

  _onContentInput() {
    const indicator = this._panel && this._panel.querySelector('#note-save-indicator');
    if (indicator) indicator.textContent = 'Unsaved';
    this._scheduleAutosave();
  },

  _scheduleAutosave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._flushSave(), 800);
  },

  _flushSave() {
    if (!this._activeNoteId || !this._coords || !this._panel) return;
    const ta = this._panel.querySelector('#note-content-area');
    if (!ta) return;
    const content = ta.value;
    LibraryStorage.updateNoteContent(this._coords, this._activeNoteId, content);
    const entry = this._notes && this._notes.find(n => n.id === this._activeNoteId);
    if (entry) { entry.content = content; entry.updatedAt = Date.now(); }
    const indicator = this._panel.querySelector('#note-save-indicator');
    if (indicator) indicator.textContent = 'Saved';
  },

  _loadTopic() {
    const { yearId, semesterId, subjectId, topicId } = this._coords;
    const subject = LibraryStorage.getSubject(yearId, semesterId, subjectId);
    if (!subject) return null;
    return subject.topics.find(t => t.id === topicId) || null;
  },
};
