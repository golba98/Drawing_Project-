// app/library/StudyLibraryView.js
// Reads from LibraryState (shared) and LibraryStorage (localStorage).
// Renders 5 view modes: years → year → semester → subject → topic.

const StudyLibraryView = {
  _container:      null,
  _contentWrapper: null,
  _searchInput:    null,
  _initialized:    false,

  init() {
    if (this._initialized) return;
    this._initialized = true;

    this._container      = document.getElementById('file-manager-view');
    this._contentWrapper = document.getElementById('study-library-content');
    this._searchInput    = document.getElementById('study-search');

    if (!this._container || !this._contentWrapper) {
      console.error('Study Library containers not found in index.html!');
      return;
    }

    LibraryStorage.getData(); // ensure bootstrap on first run
    LibraryModal.init();
    this._wireEvents();
  },

  show() {
    if (this._container) this._container.classList.remove('hidden');

    // Restore the deepest valid view based on what is currently selected
    if (LibraryState.selectedTopicId)   LibraryState.viewMode = 'topic';
    else if (LibraryState.selectedSubjectId)  LibraryState.viewMode = 'subject';
    else if (LibraryState.selectedSemesterId) LibraryState.viewMode = 'semester';
    else if (LibraryState.selectedYearId)     LibraryState.viewMode = 'year';
    else                                       LibraryState.viewMode = 'years';

    this.render();
  },

  hide() {
    if (this._container) this._container.classList.add('hidden');
  },

  // ── Navigation ────────────────────────────────────────────────────────────

  openYear(yearId) {
    LibraryState.selectedYearId      = yearId;
    LibraryState.selectedSemesterId  = null;
    LibraryState.selectedSubjectId   = null;
    LibraryState.selectedTopicId     = null;
    LibraryState.viewMode            = 'year';
    this._clearSearch();
    this.render();
  },

  selectSemester(semId) {
    LibraryState.selectedSemesterId = semId;
    LibraryState.selectedSubjectId  = null;
    LibraryState.selectedTopicId    = null;
    LibraryState.viewMode           = 'semester';
    this._clearSearch();
    this.render();
  },

  setFilter(filter) {
    LibraryState.activeFilter = filter;
    this.render();
  },

  openSubject(subjectId) {
    LibraryState.selectedSubjectId = subjectId;
    LibraryState.selectedTopicId   = null;
    LibraryState.viewMode          = 'subject';
    this._clearSearch();
    this.render();
  },

  openTopic(topicId) {
    LibraryState.selectedTopicId = topicId;
    LibraryState.activeTopicTab  = 'overview';
    LibraryState.viewMode        = 'topic';
    this.render();
  },

  goBackToYears() {
    LibraryState.selectedYearId     = null;
    LibraryState.selectedSemesterId = null;
    LibraryState.selectedSubjectId  = null;
    LibraryState.selectedTopicId    = null;
    LibraryState.viewMode           = 'years';
    this._clearSearch();
    this.render();
  },

  goBackToYear() {
    LibraryState.selectedSemesterId = null;
    LibraryState.selectedSubjectId  = null;
    LibraryState.selectedTopicId    = null;
    LibraryState.viewMode           = 'year';
    this._clearSearch();
    this.render();
  },

  goBackToSemester() {
    LibraryState.selectedSubjectId = null;
    LibraryState.selectedTopicId   = null;
    LibraryState.viewMode          = 'semester';
    this._clearSearch();
    this.render();
  },

  goBackToSubject() {
    LibraryState.selectedTopicId = null;
    LibraryState.viewMode        = 'subject';
    this._clearSearch();
    this.render();
  },

  navigateTopic(direction) {
    const subject = this._getActiveSubject();
    if (!subject) return;
    const currentIndex = subject.topics.findIndex(t => t.id === LibraryState.selectedTopicId);
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex >= 0 && targetIndex < subject.topics.length) {
      LibraryState.selectedTopicId = subject.topics[targetIndex].id;
      LibraryState.activeTopicTab  = 'overview';
      this.render();
    }
  },

  setTab(tab) {
    LibraryState.activeTopicTab = tab;
    this._updateTopicTabPanel();
    this._syncTabButtons();
  },

  // ── Event wiring ──────────────────────────────────────────────────────────

  _wireEvents() {
    this._container.addEventListener('click', e => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      e.preventDefault();

      const action = actionEl.dataset.action;

      switch (action) {
        case 'open-year':        this.openYear(actionEl.dataset.yearId); break;
        case 'back-to-years':    this.goBackToYears(); break;
        case 'back-to-year':     this.goBackToYear(); break;
        case 'select-semester':  this.selectSemester(actionEl.dataset.semesterId); break;
        case 'back-to-semester': this.goBackToSemester(); break;
        case 'set-filter':       this.setFilter(actionEl.dataset.filter); break;
        case 'open-subject':     this.openSubject(actionEl.dataset.subjectId); break;
        case 'back-to-subject':  this.goBackToSubject(); break;
        case 'open-topic':       this.openTopic(actionEl.dataset.topicId); break;
        case 'previous-topic':   this.navigateTopic(-1); break;
        case 'next-topic':       this.navigateTopic(1); break;
        case 'set-tab':          this.setTab(actionEl.dataset.tab); break;

        case 'set-topic-status': {
          const { yearId, semesterId, subjectId, topicId, status } = actionEl.dataset;
          LibraryStorage.updateTopicStatus(yearId, semesterId, subjectId, topicId, status);
          this.render();
          break;
        }

        // ── CRUD ──

        case 'add-year':
          LibraryModal.open({
            type: 'add-year',
            onSave: d => { LibraryStorage.addYear(d); this.render(); }
          });
          break;

        case 'year-menu': {
          const year = LibraryStorage.getYear(actionEl.dataset.yearId);
          if (!year) break;
          LibraryModal.open({
            type: 'year-menu', year,
            onRename: label => { LibraryStorage.renameYear(year.id, label); this.render(); },
            onArchive: archived => {
              if (!LibraryStorage.archiveYear(year.id, archived))
                this._showToast('Cannot archive the last active year.');
              this.render();
            },
            onDelete: () => {
              if (!LibraryStorage.deleteYear(year.id))
                this._showToast('Cannot delete the last active year.');
              this.render();
            }
          });
          break;
        }

        case 'add-semester': {
          const yearId = actionEl.dataset.yearId || LibraryState.selectedYearId;
          LibraryModal.open({
            type: 'add-semester',
            onSave: d => { LibraryStorage.addSemester(yearId, d); this.render(); }
          });
          break;
        }

        case 'semester-menu': {
          const { yearId, semesterId } = actionEl.dataset;
          const semester = LibraryStorage.getSemester(yearId, semesterId);
          if (!semester) break;
          LibraryModal.open({
            type: 'semester-menu', semester,
            onRename: label => { LibraryStorage.renameSemester(yearId, semesterId, label); this.render(); },
            onArchive: archived => { LibraryStorage.archiveSemester(yearId, semesterId, archived); this.render(); },
            onDelete: () => {
              LibraryStorage.deleteSemester(yearId, semesterId);
              // If user deleted the active semester, go back to year view
              if (LibraryState.selectedSemesterId === semesterId) this.goBackToYear();
              else this.render();
            }
          });
          break;
        }

        case 'add-subject': {
          const { yearId, semesterId } = actionEl.dataset;
          LibraryModal.open({
            type: 'add-subject',
            onSave: d => { LibraryStorage.addSubject(yearId, semesterId, d); this.render(); }
          });
          break;
        }

        case 'subject-menu': {
          const { yearId, semesterId, subjectId } = actionEl.dataset;
          const subject = LibraryStorage.getSubject(yearId, semesterId, subjectId);
          if (!subject) break;
          LibraryModal.open({
            type: 'subject-menu', subject,
            onRename: title => { LibraryStorage.renameSubject(yearId, semesterId, subjectId, title); this.render(); },
            onDelete: () => {
              LibraryStorage.deleteSubject(yearId, semesterId, subjectId);
              if (LibraryState.selectedSubjectId === subjectId) this.goBackToSemester();
              else this.render();
            }
          });
          break;
        }

        case 'add-topic': {
          const { yearId, semesterId, subjectId } = actionEl.dataset;
          LibraryModal.open({
            type: 'add-topic',
            onSave: d => { LibraryStorage.addTopic(yearId, semesterId, subjectId, d); this.render(); }
          });
          break;
        }

        case 'delete-topic': {
          const { yearId, semesterId, subjectId, topicId } = actionEl.dataset;
          const subject = LibraryStorage.getSubject(yearId, semesterId, subjectId);
          const topic   = subject?.topics.find(t => t.id === topicId);
          if (!topic) break;
          LibraryModal.open({
            type: 'delete-topic', topic,
            onSave: () => {
              LibraryStorage.deleteTopic(yearId, semesterId, subjectId, topicId);
              if (LibraryState.selectedTopicId === topicId) this.goBackToSubject();
              else this.render();
            }
          });
          break;
        }

        case 'new-subject':
        case 'more-actions':
        case 'settings':
        case 'add-note':
        case 'add-file':
        case 'add-sketch':
        case 'add-task':
          this._showComingSoon(action);
          break;

        default:
          console.warn(`Unhandled action: ${action}`);
      }
    });

    this._container.addEventListener('input', e => {
      if (!e.target.closest('#study-search')) return;
      LibraryState.searchQuery = e.target.value.toLowerCase().trim();
      this.render();
    });
  },

  // ── Render entry point ────────────────────────────────────────────────────

  render() {
    if (this._searchInput) {
      this._searchInput.placeholder = LibraryState.viewMode === 'topic'
        ? 'Search applies to modules and topics...'
        : 'Search modules, topics, notes, resources...';
    }
    this._contentWrapper.scrollTop = 0;
    this._renderSidebar();

    switch (LibraryState.viewMode) {
      case 'years':    this._renderYearsView();    break;
      case 'year':     this._renderYearView();     break;
      case 'semester': this._renderSemesterView(); break;
      case 'subject':  this._renderSubjectView();  break;
      case 'topic':    this._renderTopicView();    break;
    }
  },

  // ── Sidebar ───────────────────────────────────────────────────────────────

  _renderSidebar() {
    const sidebarBody = document.getElementById('lib-sidebar-body');
    if (!sidebarBody) return;

    const vm = LibraryState.viewMode;

    if (vm === 'years') {
      sidebarBody.innerHTML = `
        <div class="sidebar-section">
          <span class="sidebar-label">Navigation</span>
          <div class="sidebar-context-label">All Academic Years</div>
        </div>`;
      return;
    }

    const year = LibraryStorage.getYear(LibraryState.selectedYearId);
    if (!year) { sidebarBody.innerHTML = ''; return; }

    const activeSemId = LibraryState.selectedSemesterId;
    const inSemView   = vm === 'semester' || vm === 'subject' || vm === 'topic';

    const semButtons = year.semesters
      .filter(s => !s.archived)
      .map(sem => {
        const isActive = inSemView && sem.id === activeSemId;
        return `
          <button class="nav-item semester-btn${isActive ? ' active' : ''}"
                  data-action="select-semester" data-semester-id="${sem.id}">
            <svg class="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
              <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
            </svg>
            ${this._escapeHtml(sem.label)}
            ${isActive ? '<span class="nav-dot"></span>' : ''}
          </button>`;
      }).join('');

    let filterHtml = '';
    if (vm === 'subject' || vm === 'topic') {
      const filters = [
        { key: 'all',        label: 'All Resources' },
        { key: 'lecture',    label: 'Lectures'      },
        { key: 'assessment', label: 'Assessments'   },
        { key: 'exam',       label: 'Exams'         }
      ];
      filterHtml = `
        <div class="sidebar-section">
          <span class="sidebar-label">Quick Filters</span>
          ${filters.map(f => `
            <button class="nav-item quick-filter-btn${LibraryState.activeFilter === f.key ? ' active' : ''}"
                    data-action="set-filter" data-filter="${f.key}">
              ${this._escapeHtml(f.label)}
            </button>`).join('')}
        </div>`;
    }

    sidebarBody.innerHTML = `
      <div class="sidebar-section">
        <span class="sidebar-label">${this._escapeHtml(year.label)} · ${this._escapeHtml(year.calendarYear)}</span>
        ${semButtons}
      </div>
      ${filterHtml}`;
  },

  // ── View: Years grid ──────────────────────────────────────────────────────

  _renderYearsView() {
    const { years } = LibraryStorage.getData();

    const cardsHtml = years.map((year, i) => {
      const semCount     = year.semesters.length;
      const subjectCount = year.semesters.reduce((n, s) => n + s.subjects.length, 0);
      const rgb          = this._hexToRgb(year.accentColor || '#C8952A');
      const delay        = (i * 0.06).toFixed(2);

      return `
        <div class="year-card animate-fade" data-action="open-year" data-year-id="${year.id}"
             style="--card-accent:${year.accentColor};animation-delay:${delay}s;">
          ${year.archived ? '<span class="badge-archived">Archived</span>' : ''}
          <div class="year-card-label">${this._escapeHtml(year.label)}</div>
          <div class="year-card-cal">${this._escapeHtml(year.calendarYear)}</div>
          <div class="year-card-stats">${semCount} semester${semCount !== 1 ? 's' : ''} · ${subjectCount} subject${subjectCount !== 1 ? 's' : ''}</div>
          <div class="year-card-footer">
            <button class="btn btn-ghost" data-action="open-year" data-year-id="${year.id}"
                    style="background:rgba(${rgb},0.12);border-color:rgba(${rgb},0.3);color:${year.accentColor};">
              Open →
            </button>
            <button class="card-menu-btn" data-action="year-menu" data-year-id="${year.id}" title="Options">···</button>
          </div>
        </div>`;
    }).join('');

    this._contentWrapper.innerHTML = `
      <div class="view-header">
        <h2 class="view-title">Study Library</h2>
        <p class="view-subtitle">Academic years, semesters, and all subject folders.</p>
        <button class="add-item-btn" data-action="add-year" style="margin-top:12px;">+ New Year</button>
      </div>
      <div class="years-grid">${cardsHtml}</div>`;
  },

  // ── View: Year (semester cards) ───────────────────────────────────────────

  _renderYearView() {
    const year = LibraryStorage.getYear(LibraryState.selectedYearId);
    if (!year) return;

    const visibleSems  = year.semesters.filter(s => !s.archived);
    const archivedSems = year.semesters.filter(s => s.archived);

    const semCard = (sem, i) => {
      const delay = (i * 0.06).toFixed(2);
      return `
        <div class="semester-card animate-fade" data-action="select-semester" data-semester-id="${sem.id}"
             style="animation-delay:${delay}s;">
          ${sem.archived ? '<span class="badge-archived">Archived</span>' : ''}
          <div class="year-card-label" style="font-size:16px;">${this._escapeHtml(sem.label)}</div>
          <div class="year-card-stats" style="margin-top:6px;margin-bottom:16px;">
            ${sem.subjects.length} subject${sem.subjects.length !== 1 ? 's' : ''}
          </div>
          <div class="year-card-footer">
            <button class="btn btn-ghost" data-action="select-semester" data-semester-id="${sem.id}">Open →</button>
            <button class="card-menu-btn"
                    data-action="semester-menu"
                    data-year-id="${year.id}"
                    data-semester-id="${sem.id}" title="Options">···</button>
          </div>
        </div>`;
    };

    const activeCardsHtml   = visibleSems.map((s, i) => semCard(s, i)).join('');
    const archivedCardsHtml = archivedSems.length
      ? `<div style="margin-top:28px;">
           <div class="topic-group-header"><span class="topic-group-label">Archived Semesters</span></div>
           <div class="semesters-grid" style="margin-top:12px;">${archivedSems.map((s, i) => semCard(s, i)).join('')}</div>
         </div>`
      : '';

    this._contentWrapper.innerHTML = `
      <div class="view-header">
        <button class="btn btn-ghost back-to-semester-btn" data-action="back-to-years">← Study Library</button>
        <nav class="breadcrumb-nav"><span class="bc-active">${this._escapeHtml(year.label)}</span></nav>
        <h2 class="view-title">${this._escapeHtml(year.label)} — ${this._escapeHtml(year.calendarYear)}</h2>
        <p class="view-subtitle">Select a semester to view its subjects.</p>
        <button class="add-item-btn" data-action="add-semester" data-year-id="${year.id}" style="margin-top:12px;">+ New Semester</button>
      </div>
      ${visibleSems.length === 0 && archivedSems.length === 0
        ? '<div class="semester-empty-state">No semesters yet. Add one above.</div>'
        : `<div class="semesters-grid">${activeCardsHtml}</div>${archivedCardsHtml}`}`;
  },

  // ── View: Semester (subject folder cards) ────────────────────────────────

  _renderSemesterView() {
    const year = LibraryStorage.getYear(LibraryState.selectedYearId);
    const sem  = LibraryStorage.getSemester(LibraryState.selectedYearId, LibraryState.selectedSemesterId);
    if (!year || !sem) return;

    let subjects = sem.subjects;
    if (LibraryState.searchQuery) {
      subjects = subjects.filter(s =>
        s.title.toLowerCase().includes(LibraryState.searchQuery) ||
        s.topics.some(t => t.title.toLowerCase().includes(LibraryState.searchQuery))
      );
    }

    const folderIcon = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h3.17a1.5 1.5 0 0 1 1.06.44l.83.83A1.5 1.5 0 0 0 9.62 5.75H14.5A1.5 1.5 0 0 1 16 7.25v6.25A1.5 1.5 0 0 1 14.5 15h-11A1.5 1.5 0 0 1 2 13.5z"/></svg>`;
    const shelfIcon  = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="14" height="10" rx="1.5"/><line x1="1" y1="9" x2="15" y2="9"/><line x1="5" y1="9" x2="5" y2="13"/></svg>`;

    const cardsHtml = subjects.length === 0
      ? `<div class="semester-empty-state">No subjects match your search.</div>`
      : subjects.map((subject, i) => {
          const stats  = { lecture: 0, assessment: 0, exam: 0, project: 0 };
          subject.topics.forEach(t => { if (stats[t.type] !== undefined) stats[t.type]++; });
          const accent = subject.accentColor || '#C8952A';
          const rgb    = this._hexToRgb(accent);
          const delay  = (i * 0.06).toFixed(2);

          const pills = [];
          if (stats.lecture > 0)    pills.push(`<span class="type-pill"><strong>${stats.lecture}</strong> Lecture${stats.lecture !== 1 ? 's' : ''}</span>`);
          if (stats.assessment > 0) pills.push(`<span class="type-pill"><strong>${stats.assessment}</strong> Assessment${stats.assessment !== 1 ? 's' : ''}</span>`);
          if (stats.exam > 0)       pills.push(`<span class="type-pill"><strong>${stats.exam}</strong> Exam${stats.exam !== 1 ? 's' : ''}</span>`);
          if (stats.project > 0)    pills.push(`<span class="type-pill"><strong>${stats.project}</strong> Project${stats.project !== 1 ? 's' : ''}</span>`);

          return `
            <div class="module-folder-card animate-fade" data-action="open-subject" data-subject-id="${subject.id}"
                 style="--card-accent:${accent};animation-delay:${delay}s;">
              <div class="folder-card-top">
                <div class="folder-icon-wrap" style="background:rgba(${rgb},0.12);border-color:rgba(${rgb},0.25);color:${accent};">
                  ${folderIcon}
                </div>
                <div class="folder-card-info">
                  <h3 class="card-subject-title">${this._escapeHtml(subject.title)}</h3>
                  <span class="card-semester-label">${this._escapeHtml(sem.label).toUpperCase()} &middot; ${subject.topics.length} TOPICS</span>
                </div>
                <button class="card-menu-btn"
                        data-action="subject-menu"
                        data-year-id="${year.id}"
                        data-semester-id="${sem.id}"
                        data-subject-id="${subject.id}"
                        title="Options" style="align-self:flex-start;margin-left:auto;">···</button>
              </div>
              <div class="module-type-breakdown">${pills.join('')}</div>
              <button class="btn btn-ghost open-folder-btn" data-action="open-subject" data-subject-id="${subject.id}">
                Open Folder <span>→</span>
              </button>
            </div>`;
        }).join('');

    this._contentWrapper.innerHTML = `
      <div class="view-header">
        <button class="btn btn-ghost back-to-semester-btn" data-action="back-to-year">← ${this._escapeHtml(year.label)}</button>
        <nav class="breadcrumb-nav">
          Study Library / ${this._escapeHtml(year.label)} / <span class="bc-active">${this._escapeHtml(sem.label)}</span>
        </nav>
        <h2 class="view-title">${this._escapeHtml(sem.label)} Subjects</h2>
        <p class="view-subtitle">${sem.subjects.length} subject${sem.subjects.length !== 1 ? 's' : ''}</p>
        <button class="add-item-btn"
                data-action="add-subject"
                data-year-id="${year.id}"
                data-semester-id="${sem.id}"
                style="margin-top:12px;">+ New Subject</button>
      </div>
      <div class="shelf-section animate-fade">
        <div class="shelf-header-row">
          <div class="shelf-icon">${shelfIcon}</div>
          <span class="shelf-title-text">${this._escapeHtml(sem.label)} Subjects</span>
          <span class="shelf-module-count">${sem.subjects.length} subject${sem.subjects.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="shelf-modules-grid">${cardsHtml}</div>
      </div>`;
  },

  // ── View: Subject (grouped topic cards) ───────────────────────────────────

  _renderSubjectView() {
    const year    = LibraryStorage.getYear(LibraryState.selectedYearId);
    const sem     = LibraryStorage.getSemester(LibraryState.selectedYearId, LibraryState.selectedSemesterId);
    const subject = this._getActiveSubject();
    if (!year || !sem || !subject) return;

    let filteredTopics = subject.topics;
    if (LibraryState.searchQuery) {
      filteredTopics = filteredTopics.filter(t => t.title.toLowerCase().includes(LibraryState.searchQuery));
    }
    if (LibraryState.activeFilter !== 'all' && ['lecture', 'assessment', 'exam', 'project'].includes(LibraryState.activeFilter)) {
      filteredTopics = filteredTopics.filter(t => t.type === LibraryState.activeFilter);
    }

    // Build index map (original position) and group in one pass
    const topicIndexMap = new Map(subject.topics.map((t, i) => [t.id, i]));
    const groups = { lecture: [], assessment: [], exam: [], project: [] };
    filteredTopics.forEach(t => { groups[t.type]?.push(t); });

    const groupDefs = [
      { key: 'lecture',    label: 'Lecture Topics', badgeClass: 'badge-lecture',    icon: '📖' },
      { key: 'assessment', label: 'Assessments',    badgeClass: 'badge-assessment', icon: '📋' },
      { key: 'exam',       label: 'Exams',           badgeClass: 'badge-exam',       icon: '📝' },
      { key: 'project',    label: 'Projects',        badgeClass: 'badge-project',    icon: '🗂' }
    ];

    let groupsHtml = '';
    if (filteredTopics.length === 0) {
      groupsHtml = `
        <div class="empty-state">
          <h3>No Topics Found</h3>
          <p>${LibraryState.searchQuery ? `No topics match "${this._escapeHtml(LibraryState.searchQuery)}".` : 'No topics in this category yet.'}</p>
        </div>`;
    } else {
      groupsHtml = groupDefs.map(({ key, label, badgeClass, icon }) => {
        const items = groups[key];
        if (items.length === 0) return '';

        const cardsHtml = items.map(topic => {
          const statusClass = topic.status === 'wip' ? 'status-wip' : topic.status === 'done' ? 'status-done' : '';
          const statusLabel = topic.status === 'wip' ? 'In Progress' : topic.status === 'done' ? 'Done' : 'Not Started';
          return `
            <div class="topic-card" data-action="open-topic" data-topic-id="${topic.id}">
              <div class="topic-card-header">
                <span class="topic-index">#${topicIndexMap.get(topic.id) + 1}</span>
                <span class="topic-badge ${badgeClass}">${this._capitalize(key)}</span>
                <button class="card-menu-btn"
                        data-action="delete-topic"
                        data-year-id="${year.id}"
                        data-semester-id="${sem.id}"
                        data-subject-id="${subject.id}"
                        data-topic-id="${topic.id}"
                        title="Delete" style="font-size:11px;padding:2px 6px;margin-left:auto;">✕</button>
              </div>
              <h4 class="topic-title">${this._escapeHtml(topic.title)}</h4>
              <div class="topic-card-footer">
                <span class="${statusClass || 'status-badge status-todo'}">${statusLabel}</span>
                <span class="topic-arrow">→</span>
              </div>
            </div>`;
        }).join('');

        return `
          <div class="topic-group">
            <div class="topic-group-header">
              <span class="topic-group-label">${icon} ${label}</span>
              <span class="topic-group-count">${items.length}</span>
            </div>
            <div class="topics-grid">${cardsHtml}</div>
          </div>`;
      }).join('');
    }

    const allStats = { lecture: groups.lecture.length, assessment: groups.assessment.length, exam: groups.exam.length, project: groups.project.length };
    const stripParts = [];
    if (allStats.lecture > 0)    stripParts.push(`${allStats.lecture} Lecture${allStats.lecture !== 1 ? 's' : ''}`);
    if (allStats.assessment > 0) stripParts.push(`${allStats.assessment} Assessment${allStats.assessment !== 1 ? 's' : ''}`);
    if (allStats.exam > 0)       stripParts.push(`${allStats.exam} Exam${allStats.exam !== 1 ? 's' : ''}`);
    if (allStats.project > 0)    stripParts.push(`${allStats.project} Project${allStats.project !== 1 ? 's' : ''}`);

    this._contentWrapper.innerHTML = `
      <div class="subject-header-area">
        <button class="btn btn-ghost back-to-semester-btn" data-action="back-to-semester">← ${this._escapeHtml(sem.label)}</button>
        <nav class="breadcrumb-nav">
          Study Library / ${this._escapeHtml(year.label)} / ${this._escapeHtml(sem.label)} / <span class="bc-active">${this._escapeHtml(subject.title)}</span>
        </nav>
        <h2 class="subject-title">${this._escapeHtml(subject.title)}</h2>
        <p class="subject-desc">${this._escapeHtml(year.label)} · ${this._escapeHtml(sem.label)}</p>
      </div>
      <div class="subject-info-strip">
        <span>${subject.topics.length} Topics</span>
        ${stripParts.map(p => `<span class="strip-sep">·</span><span>${p}</span>`).join('')}
        <button class="add-item-btn"
                data-action="add-topic"
                data-year-id="${year.id}"
                data-semester-id="${sem.id}"
                data-subject-id="${subject.id}"
                style="margin-left:auto;">+ Add Topic</button>
      </div>
      <div class="subject-workspace">${groupsHtml}</div>`;
  },

  // ── View: Topic workspace ─────────────────────────────────────────────────

  _renderTopicView() {
    const year    = LibraryStorage.getYear(LibraryState.selectedYearId);
    const sem     = LibraryStorage.getSemester(LibraryState.selectedYearId, LibraryState.selectedSemesterId);
    const subject = this._getActiveSubject();
    if (!year || !sem || !subject) return;

    const topic = subject.topics.find(t => t.id === LibraryState.selectedTopicId);
    if (!topic) return;

    const type         = topic.type;
    const typeBadgeClass = this._getTypeBadgeClass(type);
    const idx          = subject.topics.findIndex(t => t.id === LibraryState.selectedTopicId);
    const hasPrev      = idx > 0;
    const hasNext      = idx < subject.topics.length - 1;

    // Status cycle: none → wip → done → none
    const nextStatus = { none: 'wip', wip: 'done', done: 'none' }[topic.status] || 'wip';
    const statusLabel = topic.status === 'wip' ? 'In Progress' : topic.status === 'done' ? 'Done' : 'Not Started';

    this._contentWrapper.innerHTML = `
      <div class="topic-header-area">
        <div class="topic-nav-controls">
          <button class="btn btn-ghost back-to-subject-btn" data-action="back-to-subject">← Back to Module</button>
          <div class="nav-arrows">
            <button class="btn btn-ghost prev-topic-btn${!hasPrev ? ' btn-nav-disabled' : ''}"
                    data-action="previous-topic" ${!hasPrev ? 'disabled' : ''}>◀ Previous</button>
            <button class="btn btn-ghost next-topic-btn${!hasNext ? ' btn-nav-disabled' : ''}"
                    data-action="next-topic" ${!hasNext ? 'disabled' : ''}>Next ▶</button>
          </div>
        </div>

        <nav class="breadcrumb-nav">
          Study Library / ${this._escapeHtml(year.label)} / ${this._escapeHtml(sem.label)} /
          ${this._escapeHtml(subject.title)} / <span class="bc-active">${this._escapeHtml(topic.title)}</span>
        </nav>

        <div class="topic-title-row">
          <h2 class="topic-title">${this._escapeHtml(topic.title)}</h2>
          <div class="topic-badges">
            <span class="topic-badge ${typeBadgeClass}">${this._capitalize(type)}</span>
            <button class="btn btn-ghost"
                    data-action="set-topic-status"
                    data-year-id="${year.id}"
                    data-semester-id="${sem.id}"
                    data-subject-id="${subject.id}"
                    data-topic-id="${topic.id}"
                    data-status="${nextStatus}"
                    style="font-size:11px;padding:4px 10px;">${statusLabel}</button>
          </div>
        </div>
        <p class="topic-subtitle">Module: ${this._escapeHtml(subject.title)} &middot; ${this._escapeHtml(sem.label)}</p>
      </div>

      <div class="topic-workspace-tabs">
        <div class="workspace-tabs-strip">
          <button class="workspace-tab ${LibraryState.activeTopicTab === 'overview'  ? 'active' : ''}" data-action="set-tab" data-tab="overview">Overview</button>
          <button class="workspace-tab ${LibraryState.activeTopicTab === 'notes'     ? 'active' : ''}" data-action="set-tab" data-tab="notes">Notes</button>
          <button class="workspace-tab ${LibraryState.activeTopicTab === 'files'     ? 'active' : ''}" data-action="set-tab" data-tab="files">Files</button>
          <button class="workspace-tab ${LibraryState.activeTopicTab === 'sketches'  ? 'active' : ''}" data-action="set-tab" data-tab="sketches">Sketches</button>
          <button class="workspace-tab ${LibraryState.activeTopicTab === 'tasks'     ? 'active' : ''}" data-action="set-tab" data-tab="tasks">Tasks</button>
          <button class="workspace-tab ${LibraryState.activeTopicTab === 'exam-prep' ? 'active' : ''}" data-action="set-tab" data-tab="exam-prep">Exam Prep</button>
        </div>
        <div class="workspace-panel" id="topic-tab-panel"></div>
      </div>`;

    this._updateTopicTabPanel(subject, topic);
  },

  _updateTopicTabPanel(subject, topic) {
    const panel = document.getElementById('topic-tab-panel');
    if (!panel) return;

    if (!subject) subject = this._getActiveSubject();
    if (!topic && subject) topic = subject.topics.find(t => t.id === LibraryState.selectedTopicId);
    if (!topic) return;

    const type         = topic.type;
    const typeBadgeClass = this._getTypeBadgeClass(type);
    const sem  = LibraryStorage.getSemester(LibraryState.selectedYearId, LibraryState.selectedSemesterId);
    const idx  = subject ? subject.topics.findIndex(t => t.id === topic.id) : -1;
    const posLabel = subject ? `#${idx + 1} of ${subject.topics.length}` : '—';

    let html = '';
    switch (LibraryState.activeTopicTab) {
      case 'overview':
        html = `
          <div class="topic-overview-panel animate-fade">
            <div class="overview-meta-grid">
              <div class="overview-meta-cell">
                <div class="overview-meta-label">Type</div>
                <div class="overview-meta-value"><span class="topic-badge ${typeBadgeClass}">${this._capitalize(type)}</span></div>
              </div>
              <div class="overview-meta-cell">
                <div class="overview-meta-label">Module</div>
                <div class="overview-meta-value">${subject ? this._escapeHtml(subject.title) : '—'}</div>
              </div>
              <div class="overview-meta-cell">
                <div class="overview-meta-label">Semester</div>
                <div class="overview-meta-value">${sem ? this._escapeHtml(sem.label) : '—'}</div>
              </div>
              <div class="overview-meta-cell">
                <div class="overview-meta-label">Position</div>
                <div class="overview-meta-value">${posLabel}</div>
              </div>
            </div>
          </div>`;
        break;

      case 'notes':
        html = `
          <div class="tab-empty-state animate-fade">
            <span class="empty-icon">📝</span>
            <h4>No notes yet</h4>
            <button class="btn btn-primary" data-action="add-note">+ Add Note</button>
          </div>`;
        break;

      case 'files':
        html = `
          <div class="tab-empty-state animate-fade">
            <span class="empty-icon">📁</span>
            <h4>No files yet</h4>
            <button class="btn btn-primary" data-action="add-file">+ Add File</button>
          </div>`;
        break;

      case 'sketches':
        html = `
          <div class="tab-empty-state animate-fade">
            <span class="empty-icon">🎨</span>
            <h4>No sketches yet</h4>
            <button class="btn btn-primary" data-action="add-sketch">+ Add Sketch</button>
          </div>`;
        break;

      case 'tasks':
        html = `
          <div class="tab-empty-state animate-fade">
            <span class="empty-icon">✅</span>
            <h4>No tasks yet</h4>
            <button class="btn btn-primary" data-action="add-task">+ Add Task</button>
          </div>`;
        break;

      case 'exam-prep':
        html = `
          <div class="tab-empty-state animate-fade">
            <span class="empty-icon">📋</span>
            <h4>Exam prep coming soon</h4>
          </div>`;
        break;
    }

    panel.innerHTML = html;
  },

  // ── Utilities ─────────────────────────────────────────────────────────────

  _getActiveSubject() {
    const { selectedYearId, selectedSemesterId, selectedSubjectId } = LibraryState;
    if (!selectedYearId || !selectedSemesterId || !selectedSubjectId) return null;
    return LibraryStorage.getSubject(selectedYearId, selectedSemesterId, selectedSubjectId);
  },

  _syncTabButtons() {
    this._container.querySelectorAll('.workspace-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === LibraryState.activeTopicTab);
    });
  },

  _clearSearch() {
    LibraryState.searchQuery = '';
    if (this._searchInput) this._searchInput.value = '';
  },

  _getTypeBadgeClass(type) {
    return { exam: 'badge-exam', assessment: 'badge-assessment', project: 'badge-project' }[type] || 'badge-lecture';
  },

  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  _hexToRgb(hex) {
    return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
  },

  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  _showComingSoon(action) {
    const formatted = action.split('-').map(w => this._capitalize(w)).join(' ');
    this._showToast(`${formatted} — Coming Soon`);
  },

  _showToast(message) {
    const old = document.querySelector('.toast-notification');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.className  = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => { if (document.body.contains(toast)) toast.remove(); }, 300);
    }, 2500);
  }
};
