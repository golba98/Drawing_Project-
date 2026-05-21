// tools/HighlighterTool.js
// Semi-transparent yellow marker. Thicker than the pen with round caps.

class HighlighterTool {
  constructor() {
    this.name        = 'highlighter';
    this.strokeWidth = 20;
    this.alpha       = 100;
  }

  _getHighlightStroke() {
    const notebook = typeof AppState !== 'undefined' && AppState.currentNotebookId 
      ? StorageManager.getNotebook(AppState.currentNotebookId) 
      : null;
    const resolvedTheme = typeof ThemeManager !== 'undefined' 
      ? ThemeManager.resolvePageTheme(notebook) 
      : 'light';
    if (resolvedTheme === 'dark') {
      return [100, 200, 255, 80]; // soft translucent blue highlight on dark paper
    }
    return [255, 255, 0, this.alpha]; // translucent yellow highlight on light paper
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
