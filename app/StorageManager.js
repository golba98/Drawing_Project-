// app/StorageManager.js
// localStorage CRUD for notebooks.
//
// Each notebook object shape:
// {
//   id:             string   (unique, time-based)
//   title:          string
//   pageMode:       'blank' | 'lined'
//   drawingDataUrl: string | null  (base64 PNG of drawing layer — NOT page background)
//   createdAt:      number   (Date.now())
//   updatedAt:      number
// }
//
// Storing only the drawing layer (not the page background) keeps the data URL small
// because the page background is always regenerated from pageMode.

const StorageManager = {
  KEY: 'notebook-app-v1',

  getNotebooks() {
    return this._load().sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getNotebook(id) {
    return this._load().find(nb => nb.id === id) || null;
  },

  createNotebook({ title, pageMode }) {
    const notebooks = this._load();
    const notebook = {
      id:             Date.now().toString(36) + Math.random().toString(36).slice(2),
      title:          title || 'Untitled Notebook',
      pageMode:       pageMode || 'lined',
      drawingDataUrl: null,
      createdAt:      Date.now(),
      updatedAt:      Date.now(),
    };
    notebooks.push(notebook);
    this._save(notebooks);
    return notebook;
  },

  updateNotebook(id, updates) {
    const notebooks = this._load();
    const idx = notebooks.findIndex(nb => nb.id === id);
    if (idx === -1) return null;
    notebooks[idx] = { ...notebooks[idx], ...updates, updatedAt: Date.now() };
    this._save(notebooks);
    return notebooks[idx];
  },

  deleteNotebook(id) {
    this._save(this._load().filter(nb => nb.id !== id));
  },

  _save(notebooks) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(notebooks));
    } catch (e) {
      // localStorage quota exceeded — warn but don't crash
      console.warn('StorageManager: could not save (quota exceeded?)', e);
    }
  },

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch {
      return [];
    }
  }
};
