// tools/HighlighterTool.js
// Semi-transparent yellow marker. Thicker than the pen with round caps.

class HighlighterTool {
  constructor() {
    this.name        = 'highlighter';
    this.strokeWidth = 20;
    this.alpha       = 100;

    // Cache resolved highlight color; invalidated when theme changes
    this._cachedStroke = null;
    window.addEventListener('themeChanged',     () => { this._cachedStroke = null; });
    window.addEventListener('pageThemeChanged', () => { this._cachedStroke = null; });
  }

  _getHighlightStroke() {
    if (this._cachedStroke) return this._cachedStroke;
    const notebook = typeof AppState !== 'undefined' && AppState.currentNotebookId
      ? StorageManager.getNotebook(AppState.currentNotebookId)
      : null;
    const resolvedTheme = typeof ThemeManager !== 'undefined'
      ? ThemeManager.resolvePageTheme(notebook)
      : 'light';
    this._cachedStroke = resolvedTheme === 'dark'
      ? [100, 200, 255, 80]        // soft translucent blue highlight on dark paper
      : [255, 255, 0, this.alpha]; // translucent yellow highlight on light paper
    return this._cachedStroke;
  }

  mousePressed(p, layer) {
    layer.strokeWeight(this.strokeWidth);
    layer.strokeCap(ROUND);
    const strokeCol = this._getHighlightStroke();
    layer.stroke(strokeCol[0], strokeCol[1], strokeCol[2], strokeCol[3]);
    layer.noFill();
    layer.point(p.mouseX, p.mouseY);
  }

  mouseDragged(p, layer) {
    layer.strokeWeight(this.strokeWidth);
    layer.strokeCap(ROUND);
    const strokeCol = this._getHighlightStroke();
    layer.stroke(strokeCol[0], strokeCol[1], strokeCol[2], strokeCol[3]);
    layer.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
  }

  mouseReleased(p, layer) {}
}
