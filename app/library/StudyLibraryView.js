// app/library/StudyLibraryView.js

const state = {
  selectedSemesterId: "semester-1",
  selectedSubjectId: null,
  selectedTopicId: null,
  activeTopicTab: "overview",
  viewMode: "semester",
  searchQuery: "",
  activeFilter: "all"
};

const StudyLibraryView = {
  _container: null,
  _contentWrapper: null,
  _searchInput: null,
  _initialized: false,

  init() {
    if (this._initialized) return;
    this._initialized = true;

    this._container = document.getElementById('file-manager-view');
    this._contentWrapper = document.getElementById('study-library-content');
    this._searchInput = document.getElementById('study-search');

    if (!this._container || !this._contentWrapper) {
      console.error("Study Library view containers not found in index.html!");
      return;
    }

    this._wireEvents();
    this._syncSidebarSemester();
    this._syncSidebarFilter();
  },

  show() {
    if (this._container) this._container.classList.remove('hidden');
    state.viewMode = state.selectedSubjectId
      ? (state.selectedTopicId ? "topic" : "subject")
      : "semester";
    this.render();
  },

  hide() {
    if (this._container) this._container.classList.add('hidden');
  },

  selectSemester(semId) {
    state.selectedSemesterId = semId;
    state.selectedSubjectId = null;
    state.selectedTopicId = null;
    state.viewMode = "semester";
    this._clearSearch();
    this._syncSidebarSemester();
    this.render();
  },

  setFilter(filter) {
    state.activeFilter = filter;
    this._syncSidebarFilter();
    this.render();
  },

  openSubject(subjectId) {
    state.selectedSubjectId = subjectId;
    state.selectedTopicId = null;
    state.viewMode = "subject";
    this._clearSearch();
    this.render();
  },

  openTopic(topicId) {
    state.selectedTopicId = topicId;
    state.activeTopicTab = "overview";
    state.viewMode = "topic";
    this.render();
  },

  goBackToSemester() {
    state.selectedSubjectId = null;
    state.selectedTopicId = null;
    state.viewMode = "semester";
    this._clearSearch();
    this.render();
  },

  goBackToSubject() {
    state.selectedTopicId = null;
    state.viewMode = "subject";
    this._clearSearch();
    this.render();
  },

  navigateTopic(direction) {
    const mod = this._getActiveModule();
    if (!mod) return;
    const currentIndex = mod.topics.indexOf(state.selectedTopicId);
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex >= 0 && targetIndex < mod.topics.length) {
      state.selectedTopicId = mod.topics[targetIndex];
      state.activeTopicTab = "overview";
      this.render();
    }
  },

  setTab(tab) {
    state.activeTopicTab = tab;
    this._updateTopicTabPanel();
    this._syncTabButtons();
  },

  _wireEvents() {
    this._container.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;

      const action = actionEl.dataset.action;
      e.preventDefault();

      switch (action) {
        case "select-semester":  this.selectSemester(actionEl.dataset.semesterId); break;
        case "set-filter":       this.setFilter(actionEl.dataset.filter); break;
        case "open-subject":     this.openSubject(actionEl.dataset.subjectId); break;
        case "open-topic":       this.openTopic(actionEl.dataset.topicId); break;
        case "back-to-semester": this.goBackToSemester(); break;
        case "back-to-subject":  this.goBackToSubject(); break;
        case "previous-topic":   this.navigateTopic(-1); break;
        case "next-topic":       this.navigateTopic(1); break;
        case "set-tab":          this.setTab(actionEl.dataset.tab); break;
        case "new-subject":
        case "more-actions":
        case "settings":
        case "archive-semester":
        case "add-note":
        case "add-file":
        case "add-sketch":
        case "add-task":
          this._showComingSoon(action);
          break;
        default:
          console.warn(`Unhandled action: ${action}`);
      }
    });

    this._container.addEventListener('input', (e) => {
      if (!e.target.closest('#study-search')) return;
      state.searchQuery = e.target.value.toLowerCase().trim();
      this.render();
    });
  },

  _syncSidebarSemester() {
    this._container.querySelectorAll('.semester-btn').forEach(btn => {
      const dot = btn.querySelector('.nav-dot');
      if (dot) dot.remove();
      if (btn.dataset.semesterId === state.selectedSemesterId) {
        btn.classList.add('active');
        btn.insertAdjacentHTML('beforeend', '<span class="nav-dot"></span>');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  _syncSidebarFilter() {
    this._container.querySelectorAll('.quick-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === state.activeFilter);
    });
  },

  _syncTabButtons() {
    this._container.querySelectorAll('.workspace-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === state.activeTopicTab);
    });
  },

  render() {
    if (this._searchInput) {
      this._searchInput.placeholder = state.viewMode === "topic"
        ? "Search applies to modules and topics..."
        : "Search modules, topics, notes, resources...";
    }
    this._contentWrapper.scrollTop = 0;

    if (state.viewMode === "semester")     this._renderSemesterView();
    else if (state.viewMode === "subject") this._renderSubjectView();
    else if (state.viewMode === "topic")   this._renderTopicView();
  },

  // ─── RENDERING ─────────────────────────────────────────────────────────────

  _renderSemesterView() {
    const semIndex = this._getSemesterIndex();
    const semData = LibrarySeedData.semesters.find(s => s.id === semIndex);
    if (!semData) return;

    let filteredModules = semData.modules;
    if (state.searchQuery) {
      filteredModules = filteredModules.filter(m =>
        m.name.toLowerCase().includes(state.searchQuery) ||
        m.topics.some(t => t.toLowerCase().includes(state.searchQuery))
      );
    }

    if (filteredModules.length === 0) {
      this._contentWrapper.innerHTML = `
        <div class="view-header">
          <nav class="breadcrumb-nav">Study Library / Year 1 / <span class="bc-active">Semester ${semIndex}</span></nav>
          <h2 class="view-title">Semester ${semIndex} Modules</h2>
        </div>
        <div class="empty-state">
          <h3>No Modules Found</h3>
          <p>No study modules match "${this._escapeHtml(state.searchQuery)}".</p>
        </div>
      `;
      return;
    }

    const accentColors = {
      'intro-to-programming':             '#C8952A',
      'computational-mathematics':        '#A0522D',
      'discrete-mathematics':             '#8B6F47',
      'algorithms-and-data-structures':   '#6B7A3A',
      'web-development':                  '#C8952A',
      'how-computers-work':               '#A0522D',
      'introduction-to-programming-ii':   '#8B6F47',
      'fundamentals-of-computer-science': '#6B7A3A'
    };

    const folderIcon = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h3.17a1.5 1.5 0 0 1 1.06.44l.83.83A1.5 1.5 0 0 0 9.62 5.75H14.5A1.5 1.5 0 0 1 16 7.25v6.25A1.5 1.5 0 0 1 14.5 15h-11A1.5 1.5 0 0 1 2 13.5z"/></svg>`;
    const shelfIcon  = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="14" height="10" rx="1.5"/><line x1="1" y1="9" x2="15" y2="9"/><line x1="5" y1="9" x2="5" y2="13"/></svg>`;

    const cardsHtml = filteredModules.map((mod, i) => {
      const stats  = LibrarySeedData.getModuleStats(mod);
      const accent = accentColors[mod.id] || '#C8952A';
      const rgb    = this._hexToRgb(accent);
      const delay  = (i * 0.06).toFixed(2);

      const pills = [];
      if (stats.lectures > 0)    pills.push(`<span class="type-pill"><strong>${stats.lectures}</strong> Lecture${stats.lectures !== 1 ? 's' : ''}</span>`);
      if (stats.assessments > 0) pills.push(`<span class="type-pill"><strong>${stats.assessments}</strong> Assessment${stats.assessments !== 1 ? 's' : ''}</span>`);
      if (stats.exams > 0)       pills.push(`<span class="type-pill"><strong>${stats.exams}</strong> Exam${stats.exams !== 1 ? 's' : ''}</span>`);
      if (stats.projects > 0)    pills.push(`<span class="type-pill"><strong>${stats.projects}</strong> Project${stats.projects !== 1 ? 's' : ''}</span>`);

      return `
        <div class="module-folder-card animate-fade" data-action="open-subject" data-subject-id="${mod.id}" style="--card-accent:${accent}; animation-delay:${delay}s;">
          <div class="folder-card-top">
            <div class="folder-icon-wrap" style="background:rgba(${rgb},0.12); border-color:rgba(${rgb},0.25); color:${accent};">
              ${folderIcon}
            </div>
            <div class="folder-card-info">
              <h3 class="card-subject-title">${this._escapeHtml(mod.name)}</h3>
              <span class="card-semester-label">SEMESTER ${semIndex} &middot; ${mod.topics.length} TOPICS</span>
            </div>
          </div>
          <div class="module-type-breakdown">${pills.join('')}</div>
          <button class="btn btn-ghost open-folder-btn" data-action="open-subject" data-subject-id="${mod.id}">
            Open Folder <span>→</span>
          </button>
        </div>
      `;
    }).join('');

    this._contentWrapper.innerHTML = `
      <div class="view-header">
        <nav class="breadcrumb-nav">Study Library / Year 1 / <span class="bc-active">Semester ${semIndex}</span></nav>
        <h2 class="view-title">Year 1 Study Library</h2>
        <p class="view-subtitle">Semester ${semIndex} modules, lecture folders, notes, and resources.</p>
      </div>
      <div class="shelf-section animate-fade">
        <div class="shelf-header-row">
          <div class="shelf-icon">${shelfIcon}</div>
          <span class="shelf-title-text">Semester ${semIndex} Modules</span>
          <span class="shelf-module-count">${filteredModules.length} subject${filteredModules.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="shelf-modules-grid">${cardsHtml}</div>
      </div>
    `;
  },

  _renderSubjectView() {
    const mod = this._getActiveModule();
    if (!mod) return;

    const semIndex = this._getSemesterIndex();

    let filteredTopics = mod.topics;
    if (state.searchQuery) {
      filteredTopics = filteredTopics.filter(t => t.toLowerCase().includes(state.searchQuery));
    }

    // Build index map and group topics in one pass — avoids double-classification
    const topicIndexMap = new Map(mod.topics.map((t, i) => [t, i]));
    const groups = { lecture: [], assessment: [], exam: [], project: [] };
    filteredTopics.forEach(topic => {
      groups[LibrarySeedData.classifyTopic(topic)].push(topic);
    });

    const allStats = {
      lectures:    groups.lecture.length,
      assessments: groups.assessment.length,
      exams:       groups.exam.length,
      projects:    groups.project.length
    };

    const groupDefs = [
      { key: "lecture",    label: "Lecture Topics", badgeClass: "badge-lecture",    icon: "📖" },
      { key: "assessment", label: "Assessments",     badgeClass: "badge-assessment", icon: "📋" },
      { key: "exam",       label: "Exams",            badgeClass: "badge-exam",       icon: "📝" },
      { key: "project",    label: "Projects",         badgeClass: "badge-project",    icon: "🗂" }
    ];

    let groupsHtml = "";
    if (filteredTopics.length === 0) {
      groupsHtml = `
        <div class="empty-state">
          <h3>No Topics Found</h3>
          <p>No syllabus topics match "${this._escapeHtml(state.searchQuery)}".</p>
        </div>
      `;
    } else {
      groupsHtml = groupDefs.map(({ key, label, badgeClass, icon }) => {
        const items = groups[key];
        if (items.length === 0) return "";
        const typeLabel = this._capitalize(key);

        const cardsHtml = items.map(topic => `
          <div class="topic-card" data-action="open-topic" data-topic-id="${this._escapeHtml(topic)}">
            <div class="topic-card-header">
              <span class="topic-index">#${topicIndexMap.get(topic) + 1}</span>
              <span class="topic-badge ${badgeClass}">${typeLabel}</span>
            </div>
            <h4 class="topic-title">${this._escapeHtml(topic)}</h4>
            <div class="topic-card-footer">
              <span class="status-badge status-todo">Not Started</span>
              <span class="topic-arrow">→</span>
            </div>
          </div>
        `).join('');

        return `
          <div class="topic-group">
            <div class="topic-group-header">
              <span class="topic-group-label">${icon} ${label}</span>
              <span class="topic-group-count">${items.length}</span>
            </div>
            <div class="topics-grid">${cardsHtml}</div>
          </div>
        `;
      }).join('');
    }

    const stripParts = [];
    if (allStats.lectures > 0)    stripParts.push(`${allStats.lectures} Lecture${allStats.lectures !== 1 ? 's' : ''}`);
    if (allStats.assessments > 0) stripParts.push(`${allStats.assessments} Assessment${allStats.assessments !== 1 ? 's' : ''}`);
    if (allStats.exams > 0)       stripParts.push(`${allStats.exams} Exam${allStats.exams !== 1 ? 's' : ''}`);
    if (allStats.projects > 0)    stripParts.push(`${allStats.projects} Project${allStats.projects !== 1 ? 's' : ''}`);

    this._contentWrapper.innerHTML = `
      <div class="subject-header-area">
        <button class="btn btn-ghost back-to-semester-btn" data-action="back-to-semester">← Back to Semester</button>
        <nav class="breadcrumb-nav">
          Study Library / Year 1 / Semester ${semIndex} / <span class="bc-active">${this._escapeHtml(mod.name)}</span>
        </nav>
        <h2 class="subject-title">${this._escapeHtml(mod.name)}</h2>
        <p class="subject-desc">Year 1 Computer Science · Semester ${semIndex}</p>
      </div>
      <div class="subject-info-strip">
        <span>${mod.topics.length} Topics</span>
        ${stripParts.map(p => `<span class="strip-sep">·</span><span>${p}</span>`).join('')}
      </div>
      <div class="subject-workspace">${groupsHtml}</div>
    `;
  },

  _renderTopicView() {
    const mod = this._getActiveModule();
    if (!mod) return;

    const topic        = state.selectedTopicId;
    const type         = LibrarySeedData.classifyTopic(topic);
    const typeBadgeClass = this._getTypeBadgeClass(type);
    const idx          = mod.topics.indexOf(topic);
    const hasPrev      = idx > 0;
    const hasNext      = idx < mod.topics.length - 1;
    const semIndex     = this._getSemesterIndex();

    this._contentWrapper.innerHTML = `
      <div class="topic-header-area">
        <div class="topic-nav-controls">
          <button class="btn btn-ghost back-to-subject-btn" data-action="back-to-subject">← Back to Module</button>
          <div class="nav-arrows">
            <button class="btn btn-ghost prev-topic-btn${!hasPrev ? ' btn-nav-disabled' : ''}" data-action="previous-topic" ${!hasPrev ? 'disabled' : ''}>◀ Previous</button>
            <button class="btn btn-ghost next-topic-btn${!hasNext ? ' btn-nav-disabled' : ''}" data-action="next-topic" ${!hasNext ? 'disabled' : ''}>Next ▶</button>
          </div>
        </div>

        <nav class="breadcrumb-nav">
          Study Library / Year 1 / Semester ${semIndex} / ${this._escapeHtml(mod.name)} / <span class="bc-active">${this._escapeHtml(topic)}</span>
        </nav>

        <div class="topic-title-row">
          <h2 class="topic-title">${this._escapeHtml(topic)}</h2>
          <div class="topic-badges">
            <span class="topic-badge ${typeBadgeClass}">${this._capitalize(type)}</span>
            <span class="status-badge status-todo">Not Started</span>
          </div>
        </div>
        <p class="topic-subtitle">Module: ${this._escapeHtml(mod.name)} &middot; Term: Semester ${semIndex}</p>
      </div>

      <div class="topic-workspace-tabs">
        <div class="workspace-tabs-strip">
          <button class="workspace-tab ${state.activeTopicTab === 'overview'  ? 'active' : ''}" data-action="set-tab" data-tab="overview">Overview</button>
          <button class="workspace-tab ${state.activeTopicTab === 'notes'     ? 'active' : ''}" data-action="set-tab" data-tab="notes">Notes</button>
          <button class="workspace-tab ${state.activeTopicTab === 'files'     ? 'active' : ''}" data-action="set-tab" data-tab="files">Files</button>
          <button class="workspace-tab ${state.activeTopicTab === 'sketches'  ? 'active' : ''}" data-action="set-tab" data-tab="sketches">Sketches</button>
          <button class="workspace-tab ${state.activeTopicTab === 'tasks'     ? 'active' : ''}" data-action="set-tab" data-tab="tasks">Tasks</button>
          <button class="workspace-tab ${state.activeTopicTab === 'exam-prep' ? 'active' : ''}" data-action="set-tab" data-tab="exam-prep">Exam Prep</button>
        </div>
        <div class="workspace-panel" id="topic-tab-panel"></div>
      </div>
    `;

    this._updateTopicTabPanel(mod);
  },

  _updateTopicTabPanel(mod) {
    const panel = document.getElementById('topic-tab-panel');
    if (!panel) return;

    if (!mod) mod = this._getActiveModule();
    const topic          = state.selectedTopicId;
    const type           = LibrarySeedData.classifyTopic(topic);
    const typeBadgeClass = this._getTypeBadgeClass(type);
    const semIndex       = this._getSemesterIndex();

    let html = "";

    switch (state.activeTopicTab) {
      case "overview": {
        const topicIndex = mod ? mod.topics.indexOf(topic) : -1;
        const posLabel   = mod ? `#${topicIndex + 1} of ${mod.topics.length}` : "—";
        html = `
          <div class="topic-overview-panel animate-fade">
            <div class="overview-meta-grid">
              <div class="overview-meta-cell">
                <div class="overview-meta-label">Type</div>
                <div class="overview-meta-value"><span class="topic-badge ${typeBadgeClass}">${this._capitalize(type)}</span></div>
              </div>
              <div class="overview-meta-cell">
                <div class="overview-meta-label">Module</div>
                <div class="overview-meta-value">${mod ? this._escapeHtml(mod.name) : "—"}</div>
              </div>
              <div class="overview-meta-cell">
                <div class="overview-meta-label">Semester</div>
                <div class="overview-meta-value">Semester ${semIndex}</div>
              </div>
              <div class="overview-meta-cell">
                <div class="overview-meta-label">Position</div>
                <div class="overview-meta-value">${posLabel}</div>
              </div>
            </div>
            <div class="overview-stats-row">
              <div class="overview-stat-box"><div class="overview-stat-num">0</div><div class="overview-stat-lbl">Notes</div></div>
              <div class="overview-stat-box"><div class="overview-stat-num">0</div><div class="overview-stat-lbl">Files</div></div>
              <div class="overview-stat-box"><div class="overview-stat-num">0</div><div class="overview-stat-lbl">Sketches</div></div>
              <div class="overview-stat-box"><div class="overview-stat-num">0</div><div class="overview-stat-lbl">Tasks</div></div>
            </div>
            <div class="overview-quick-actions">
              <button class="btn btn-ghost" data-action="add-note">+ Add Note</button>
              <button class="btn btn-ghost" data-action="add-sketch">+ Add Sketch</button>
              <button class="btn btn-ghost" data-action="add-task">+ Add Task</button>
            </div>
          </div>
        `;
        break;
      }

      case "notes":
        html = `
          <div class="tab-empty-state animate-fade">
            <span class="empty-icon">📝</span>
            <h4>No notes added yet</h4>
            <p>Write your detailed summaries, lecture formulas, or core subject definitions.</p>
            <button class="btn btn-primary" data-action="add-note">+ Add Note</button>
          </div>
        `;
        break;

      case "files":
        html = `
          <div class="tab-empty-state animate-fade">
            <span class="empty-icon">📁</span>
            <h4>No files added yet</h4>
            <p>Upload lecture PDFs, slides, assignments briefs, or course handouts.</p>
            <button class="btn btn-primary" data-action="add-file">+ Add File</button>
          </div>
        `;
        break;

      case "sketches":
        html = `
          <div class="tab-empty-state animate-fade">
            <span class="empty-icon">🎨</span>
            <h4>No sketches added yet</h4>
            <p>Draft diagrams, flowcharts, logic gates, or formula sheets on the digital desk.</p>
            <button class="btn btn-primary" data-action="add-sketch">+ Add Sketch</button>
          </div>
        `;
        break;

      case "tasks":
        html = `
          <div class="tab-empty-state animate-fade">
            <span class="empty-icon">✅</span>
            <h4>No tasks added yet</h4>
            <p>Keep track of homework items, exercises, reading lists, or revision milestones.</p>
            <button class="btn btn-primary" data-action="add-task">+ Add Task</button>
          </div>
        `;
        break;

      case "exam-prep":
        html = `
          <div class="overview-content animate-fade">
            <h3>Exam Revision Checklist</h3>
            <p>Prepare for midterm assessments and final year exams relating to <strong>${this._escapeHtml(topic)}</strong>.</p>
            <div class="revision-checklist">
              <label class="checklist-item"><input type="checkbox" disabled><span>Read lecture notes and core slides thoroughly</span></label>
              <label class="checklist-item"><input type="checkbox" disabled><span>Complete workbook practices and self-tests</span></label>
              <label class="checklist-item"><input type="checkbox" disabled><span>Mock practice past exam questions</span></label>
            </div>
            <div class="info-alert">
              <strong>Review Advice:</strong> This unit is categorized as an <em>${type}</em>. Focus efforts on matching typical past-paper question formats.
            </div>
          </div>
        `;
        break;
    }

    panel.innerHTML = html;
  },

  // ─── UTILITIES ──────────────────────────────────────────────────────────────

  _getActiveModule() {
    if (!state.selectedSubjectId) return null;
    for (const sem of LibrarySeedData.semesters) {
      const found = sem.modules.find(m => m.id === state.selectedSubjectId);
      if (found) return found;
    }
    return null;
  },

  _clearSearch() {
    state.searchQuery = "";
    if (this._searchInput) this._searchInput.value = "";
  },

  _getSemesterIndex() {
    return parseInt(state.selectedSemesterId.replace("semester-", ""), 10);
  },

  _getTypeBadgeClass(type) {
    return { exam: "badge-exam", assessment: "badge-assessment", project: "badge-project" }[type] || "badge-lecture";
  },

  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  _hexToRgb(hex) {
    return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
  },

  _escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  _showComingSoon(action) {
    const formatted = action.split("-").map(w => this._capitalize(w)).join(" ");
    this._showToast(`${formatted} — Coming Soon`);
  },

  _showToast(message) {
    const old = document.querySelector('.toast-notification');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(toast)) toast.remove();
      }, 300);
    }, 2500);
  }
};
