// app/AppState.js
// Thin coordinator. Knows which view is active and which notebook is open.
// All navigation flows through here so views never talk to each other directly.

const AppState = {
  currentView: 'fileManager', // 'fileManager' | 'editor'
  currentNotebookId: null,

  // Open a notebook in the editor. Called by FileManagerView.
  openNotebook(id) {
    const notebook = StorageManager.getNotebook(id);
    if (!notebook) return;
    this.currentNotebookId = id;
    this.currentView = 'editor';
    FileManagerView.hide();
    EditorView.open(notebook);
  },

  // Autosave + close editor + return to file manager. Called by EditorView back button.
  closeEditor() {
    EditorView.autosave();
    EditorView.close();
    this.currentNotebookId = null;
    this.currentView = 'fileManager';
    StudyLibraryView.show(); // re-renders study library on return
  }
};
