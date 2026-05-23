// app/library/LibraryStorage.js
// localStorage CRUD for the full { years: [...] } academic hierarchy.
// Bootstraps from LibrarySeedData.toStorageFormat() on first run.

const LibraryStorage = {
  KEY: 'study-library-v1',

  // ── Read ──────────────────────────────────────────────────────────────────

  getData() {
    let data = this._load();
    if (!data) {
      data = LibrarySeedData.toStorageFormat();
      this._save(data);
    }
    return data;
  },

  getYear(yearId) {
    return this.getData().years.find(y => y.id === yearId) || null;
  },

  getSemester(yearId, semesterId) {
    const year = this.getYear(yearId);
    if (!year) return null;
    return year.semesters.find(s => s.id === semesterId) || null;
  },

  getSubject(yearId, semesterId, subjectId) {
    const sem = this.getSemester(yearId, semesterId);
    if (!sem) return null;
    return sem.subjects.find(s => s.id === subjectId) || null;
  },

  // ── Years ─────────────────────────────────────────────────────────────────

  addYear({ label, calendarYear, accentColor }) {
    const data = this.getData();
    const id   = this._genId('year', data.years.map(y => y.id));
    const year = { id, label, calendarYear: calendarYear || '', archived: false, accentColor: accentColor || '#C8952A', semesters: [] };
    data.years.push(year);
    this._save(data);
    return year;
  },

  renameYear(yearId, newLabel) {
    const data = this.getData();
    const year = data.years.find(y => y.id === yearId);
    if (!year) return null;
    year.label = newLabel;
    this._save(data);
    return year;
  },

  // Returns null (and does NOT save) if archiving would remove the last active year.
  archiveYear(yearId, archived) {
    const data        = this.getData();
    const activeCount = data.years.filter(y => !y.archived).length;
    if (archived && activeCount <= 1) return null;
    const year = data.years.find(y => y.id === yearId);
    if (!year) return null;
    year.archived = archived;
    this._save(data);
    return year;
  },

  // Returns false (and does NOT save) if deleting would remove the last active year.
  deleteYear(yearId) {
    const data        = this.getData();
    const activeYears = data.years.filter(y => !y.archived);
    if (activeYears.length <= 1 && activeYears.some(y => y.id === yearId)) return false;
    const idx = data.years.findIndex(y => y.id === yearId);
    if (idx === -1) return false;
    data.years.splice(idx, 1);
    this._save(data);
    return true;
  },

  // ── Semesters ─────────────────────────────────────────────────────────────

  addSemester(yearId, { label }) {
    const data = this.getData();
    const year = data.years.find(y => y.id === yearId);
    if (!year) return null;
    const id  = this._genId('semester', year.semesters.map(s => s.id));
    const sem = { id, label, archived: false, subjects: [] };
    year.semesters.push(sem);
    this._save(data);
    return sem;
  },

  renameSemester(yearId, semesterId, newLabel) {
    const data = this.getData();
    const sem  = this._findSem(data, yearId, semesterId);
    if (!sem) return null;
    sem.label = newLabel;
    this._save(data);
    return sem;
  },

  archiveSemester(yearId, semesterId, archived) {
    const data = this.getData();
    const sem  = this._findSem(data, yearId, semesterId);
    if (!sem) return null;
    sem.archived = archived;
    this._save(data);
    return sem;
  },

  deleteSemester(yearId, semesterId) {
    const data = this.getData();
    const year = data.years.find(y => y.id === yearId);
    if (!year) return false;
    const idx = year.semesters.findIndex(s => s.id === semesterId);
    if (idx === -1) return false;
    year.semesters.splice(idx, 1);
    this._save(data);
    return true;
  },

  // ── Subjects ──────────────────────────────────────────────────────────────

  addSubject(yearId, semesterId, { title, accentColor }) {
    const data    = this.getData();
    const sem     = this._findSem(data, yearId, semesterId);
    if (!sem) return null;
    const baseId  = this._slugify(title) || 'subject';
    const existing = sem.subjects.map(s => s.id);
    let id = baseId;
    if (existing.includes(id)) {
      let n = 2;
      while (existing.includes(`${baseId}-${n}`)) n++;
      id = `${baseId}-${n}`;
    }
    const subject = { id, title, accentColor: accentColor || '#C8952A', topics: [] };
    sem.subjects.push(subject);
    this._save(data);
    return subject;
  },

  renameSubject(yearId, semesterId, subjectId, newTitle) {
    const data    = this.getData();
    const subject = this._findSubject(data, yearId, semesterId, subjectId);
    if (!subject) return null;
    subject.title = newTitle;
    this._save(data);
    return subject;
  },

  deleteSubject(yearId, semesterId, subjectId) {
    const data = this.getData();
    const sem  = this._findSem(data, yearId, semesterId);
    if (!sem) return false;
    const idx = sem.subjects.findIndex(s => s.id === subjectId);
    if (idx === -1) return false;
    sem.subjects.splice(idx, 1);
    this._save(data);
    return true;
  },

  // ── Topics ────────────────────────────────────────────────────────────────

  addTopic(yearId, semesterId, subjectId, { title, type }) {
    const data    = this.getData();
    const subject = this._findSubject(data, yearId, semesterId, subjectId);
    if (!subject) return null;
    const existingIds = new Set(subject.topics.map(t => t.id));
    let n  = subject.topics.length + 1;
    let id = `${subjectId}-t${String(n).padStart(3, '0')}`;
    while (existingIds.has(id)) { n++; id = `${subjectId}-t${String(n).padStart(3, '0')}`; }
    const topic = { id, title, type: type || 'lecture', status: 'none' };
    subject.topics.push(topic);
    this._save(data);
    return topic;
  },

  deleteTopic(yearId, semesterId, subjectId, topicId) {
    const data    = this.getData();
    const subject = this._findSubject(data, yearId, semesterId, subjectId);
    if (!subject) return false;
    const idx = subject.topics.findIndex(t => t.id === topicId);
    if (idx === -1) return false;
    subject.topics.splice(idx, 1);
    this._save(data);
    return true;
  },

  updateTopicStatus(yearId, semesterId, subjectId, topicId, status) {
    const data    = this.getData();
    const subject = this._findSubject(data, yearId, semesterId, subjectId);
    if (!subject) return null;
    const topic = subject.topics.find(t => t.id === topicId);
    if (!topic) return null;
    topic.status = status;
    this._save(data);
    return topic;
  },

  // ── Private ───────────────────────────────────────────────────────────────

  _load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  _save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  _genId(prefix, existingIds) {
    let n = 1;
    while (existingIds.includes(`${prefix}-${n}`)) n++;
    return `${prefix}-${n}`;
  },

  _slugify(str) {
    return String(str || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  },

  _findSem(data, yearId, semesterId) {
    const year = data.years.find(y => y.id === yearId);
    if (!year) return null;
    return year.semesters.find(s => s.id === semesterId) || null;
  },

  _findSubject(data, yearId, semesterId, subjectId) {
    const sem = this._findSem(data, yearId, semesterId);
    if (!sem) return null;
    return sem.subjects.find(s => s.id === subjectId) || null;
  }
};
