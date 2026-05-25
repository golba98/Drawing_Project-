// app/ThemeManager.js
// Persistent application theme controller (Light, Dark, System)
// Governs document.documentElement.dataset.theme

const ThemeManager = {
  KEY: 'notebookTheme',
  PAGE_KEY: 'notebookPageTheme',
  _mediaQuery: null,
  _listener: null,

  init() {
    this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Bind changes in system preferences
    this._listener = (e) => {
      if (this.getThemeSetting() === 'system') {
        this.applyTheme('system');
      }
    };
    
    try {
      this._mediaQuery.addEventListener('change', this._listener);
    } catch {
      // Legacy browsers support
      this._mediaQuery.addListener(this._listener);
    }

    // Apply starting theme setting
    const saved = this.getThemeSetting();
    this.applyTheme(saved);
  },

  getThemeSetting() {
    return localStorage.getItem(this.KEY) || 'system';
  },

  setThemeSetting(theme) {
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      localStorage.setItem(this.KEY, theme);
      this.applyTheme(theme);
    }
  },

  getPageThemeSetting() {
    return localStorage.getItem(this.PAGE_KEY) || 'system';
  },

  setPageThemeSetting(theme) {
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      localStorage.setItem(this.PAGE_KEY, theme);
      window.dispatchEvent(new CustomEvent('pageThemeChanged', { detail: { setting: theme } }));
    }
  },

  resolvePageTheme(notebook) {
    // 1. Get notebook's custom pageTheme setting (light | dark | system)
    let pageTheme = notebook ? notebook.pageTheme : 'system';
    if (!pageTheme || pageTheme === 'system') {
      // 2. Fall back to the global page appearance setting
      pageTheme = this.getPageThemeSetting();
    }
    
    if (pageTheme === 'system') {
      // 3. Resolve using the currently applied app theme
      const appliedAppTheme = document.documentElement.dataset.theme || 'light';
      return appliedAppTheme === 'dark' ? 'dark' : 'light';
    }
    
    return pageTheme; // 'light' or 'dark'
  },

  applyTheme(setting) {
    let actualTheme = 'light';

    if (setting === 'dark') {
      actualTheme = 'dark';
    } else if (setting === 'light') {
      actualTheme = 'light';
    } else {
      // 'system'
      actualTheme = this._mediaQuery.matches ? 'dark' : 'light';
    }

    document.documentElement.dataset.theme = actualTheme;
    
    // Dispatch custom event to notify Settings view if active
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { setting, actualTheme } }));
  },

  initUI() {
    const modal = document.getElementById('settings-modal');
    const fmBtn = document.getElementById('fm-settings-btn');
    const editorBtn = document.getElementById('editor-settings-btn');
    const closeBtn = document.getElementById('settings-close');
    const cards = document.querySelectorAll('.theme-option-card');
    const pageCards = document.querySelectorAll('.page-theme-option-card');

    if (!modal) return;

    const openModal = () => {
      // Highlight the correct active option card
      const current = this.getThemeSetting();
      cards.forEach(card => {
        if (card.dataset.value === current) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });

      // Highlight the correct active page appearance option card
      const currentPageTheme = this.getPageThemeSetting();
      pageCards.forEach(card => {
        if (card.dataset.value === currentPageTheme) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });

      modal.classList.remove('hidden');
    };

    const closeModal = () => {
      modal.classList.add('hidden');
    };

    if (fmBtn) fmBtn.addEventListener('click', openModal);
    if (editorBtn) editorBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });

    cards.forEach(card => {
      card.addEventListener('click', () => {
        const value = card.dataset.value;
        this.setThemeSetting(value);
        
        // Update active class immediately on click
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    pageCards.forEach(card => {
      card.addEventListener('click', () => {
        const value = card.dataset.value;
        this.setPageThemeSetting(value);
        
        // Update active class immediately on click
        pageCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    // Also sync selection if theme changed externally (e.g. system update)
    window.addEventListener('themeChanged', (e) => {
      const setting = e.detail.setting;
      cards.forEach(card => {
        if (card.dataset.value === setting) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });
    });

    window.addEventListener('pageThemeChanged', (e) => {
      const setting = e.detail.setting;
      pageCards.forEach(card => {
        if (card.dataset.value === setting) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });
    });
  }
};

// Initialize theme immediately so the correct theme applies before page rendering begins
ThemeManager.init();

// Initialize UI listeners when the DOM content has loaded
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.initUI();
});
