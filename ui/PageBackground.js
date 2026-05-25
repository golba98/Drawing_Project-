class PageBackground {
  constructor() {
    this.mode = 'lined';

    this.paperR = 251;
    this.paperG = 246;
    this.paperB = 234;

    this.lineR = 191;
    this.lineG = 208;
    this.lineB = 220;

    this.marginR = 226;
    this.marginG = 170;
    this.marginB = 162;

    this.lineSpacing = 28;
    this.marginX     = 90;

    // Offscreen buffer — only redrawn when dirty (theme/mode/resize change)
    this._bgBuffer    = null;
    this._dirty       = true;
    this._cachedTheme = null;
    this._cachedMode  = null;
  }

  setMode(mode) {
    if (this.mode !== mode) {
      this.mode  = mode;
      this._dirty = true;
    }
  }

  // Call when theme changes so the buffer is regenerated on next draw.
  invalidate() {
    this._dirty = true;
  }

  // Call when the canvas is resized so the buffer dimensions are refreshed.
  onResize() {
    this._dirty = true;
    if (this._bgBuffer) {
      this._bgBuffer.remove();
      this._bgBuffer = null;
    }
  }

  draw() {
    const notebook = typeof AppState !== 'undefined' && AppState.currentNotebookId
      ? StorageManager.getNotebook(AppState.currentNotebookId)
      : null;
    const resolvedTheme = typeof ThemeManager !== 'undefined'
      ? ThemeManager.resolvePageTheme(notebook)
      : 'light';

    // Cache theme for _isDark() — avoids a second localStorage read per eraser preview
    this._cachedTheme = resolvedTheme;

    const needsRebuild =
      this._dirty ||
      resolvedTheme !== this._cachedMode ||   // theme changed since last paint
      !this._bgBuffer ||
      this._bgBuffer.width  !== width ||
      this._bgBuffer.height !== height;

    if (needsRebuild) {
      if (!this._bgBuffer || this._bgBuffer.width !== width || this._bgBuffer.height !== height) {
        if (this._bgBuffer) this._bgBuffer.remove();
        this._bgBuffer = createGraphics(width, height);
      }
      this.drawPageBackground(this._bgBuffer, this.mode, resolvedTheme);
      this._dirty      = false;
      this._cachedMode = resolvedTheme;
    }

    image(this._bgBuffer, 0, 0);
  }

  drawBlankPage(p, pageTheme) {
    const ctx = p || window;

    if (pageTheme === 'dark') {
      ctx.background('#101624');

      // Subtle paper texture noise (fast vector pattern)
      ctx.push();
      ctx.strokeWeight(1);
      ctx.stroke(255, 255, 255, 6); // rgba(255, 255, 255, 0.024)
      const spacing = 16;
      for (let x = spacing; x < ctx.width; x += spacing) {
        for (let y = spacing; y < ctx.height; y += spacing * 2) {
          ctx.point(x + (y % 3), y);
        }
      }

      // Edge border shading
      ctx.noFill();
      ctx.stroke(255, 255, 255, 10); // rgba(255,255,255,0.04)
      ctx.strokeWeight(4);
      ctx.rect(0, 0, ctx.width, ctx.height);
      ctx.pop();
    } else {
      ctx.background(this.paperR, this.paperG, this.paperB);

      ctx.push();
      ctx.noFill();
      ctx.stroke(0, 0, 0, 10);
      ctx.strokeWeight(4);
      ctx.rect(0, 0, ctx.width, ctx.height);
      ctx.pop();
    }
  }

  drawLinedPage(p, pageTheme) {
    const ctx = p || window;

    if (pageTheme === 'dark') {
      ctx.background('#101624');

      ctx.push();
      ctx.strokeWeight(1);

      // Texture/noise
      ctx.stroke(255, 255, 255, 6);
      const spacing = 16;
      for (let x = spacing; x < ctx.width; x += spacing) {
        for (let y = spacing; y < ctx.height; y += spacing * 2) {
          ctx.point(x + (y % 3), y);
        }
      }

      // Ruled lines (faint blue-gray)
      ctx.stroke(150, 180, 210, 255 * 0.22); // rgba(150, 180, 210, 0.22)
      for (let y = this.lineSpacing * 2; y < ctx.height; y += this.lineSpacing) {
        ctx.line(0, y, ctx.width, y);
      }

      // Margin line (subtle muted red/purple)
      ctx.stroke(232, 155, 143, 255 * 0.32); // rgba(232, 155, 143, 0.32)
      ctx.line(this.marginX, 0, this.marginX, ctx.height);

      // Edge shading
      ctx.noFill();
      ctx.stroke(255, 255, 255, 10);
      ctx.strokeWeight(4);
      ctx.rect(0, 0, ctx.width, ctx.height);
      ctx.pop();
    } else {
      ctx.background(this.paperR, this.paperG, this.paperB);

      ctx.push();
      ctx.strokeWeight(1);

      // Ruled lines (light blue)
      ctx.stroke(this.lineR, this.lineG, this.lineB, 180);
      for (let y = this.lineSpacing * 2; y < ctx.height; y += this.lineSpacing) {
        ctx.line(0, y, ctx.width, y);
      }

      // Margin line (light red)
      ctx.stroke(this.marginR, this.marginG, this.marginB, 160);
      ctx.line(this.marginX, 0, this.marginX, ctx.height);

      // Edge shading
      ctx.noFill();
      ctx.stroke(0, 0, 0, 10);
      ctx.strokeWeight(4);
      ctx.rect(0, 0, ctx.width, ctx.height);
      ctx.pop();
    }
  }

  drawPageBackground(p, mode, pageTheme) {
    if (mode === 'lined') {
      this.drawLinedPage(p, pageTheme);
    } else {
      this.drawBlankPage(p, pageTheme);
    }
  }

  // Returns true when the current resolved page theme is dark.
  // Used by EraserTool.drawCursorPreview() to choose a visible outline colour.
  // Reads from cache set during draw() — no extra localStorage access.
  _isDark() {
    if (this._cachedTheme !== null) return this._cachedTheme === 'dark';
    // Fallback before first draw() call
    const notebook = typeof AppState !== 'undefined' && AppState.currentNotebookId
      ? StorageManager.getNotebook(AppState.currentNotebookId)
      : null;
    const resolved = typeof ThemeManager !== 'undefined'
      ? ThemeManager.resolvePageTheme(notebook)
      : 'light';
    return resolved === 'dark';
  }
}
