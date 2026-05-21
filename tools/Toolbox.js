// tools/Toolbox.js
// Central tool registry. Instantiates all tools, tracks the active tool,
// and forwards p5 mouse events to the correct handler.

class Toolbox {
  constructor() {
    this.tools = {
      pen:         new PenTool(),
      highlighter: new HighlighterTool(),
      eraser:      new EraserTool(),
      line:        new LineTool(),
      spray:       new SprayTool(),
    };
    this.currentTool = this.tools['pen'];
    this.activeName  = 'pen';
  }

  setTool(name) {
    if (this.tools[name]) {
      this.currentTool = this.tools[name];
      this.activeName  = name;
      if (name !== 'eraser' && typeof drawingLayer !== 'undefined') {
        drawingLayer.noErase();
      }
    } else {
      console.warn(`Toolbox: unknown tool "${name}"`);
    }
  }

  getActiveName() {
    return this.activeName;
  }

  /** Returns the EraserTool instance for direct property access from EditorView. */
  getEraser() {
    return this.tools['eraser'];
  }

  mousePressed(p, layer) {
    this.currentTool.mousePressed(p, layer);
  }

  mouseDragged(p, layer) {
    this.currentTool.mouseDragged(p, layer);
  }

  mouseReleased(p, layer) {
    this.currentTool.mouseReleased(p, layer);
  }

  // Duck-typed: LineTool implements drawPreview(); EraserTool implements drawCursorPreview()
  drawPreview() {
    if (typeof this.currentTool.drawPreview === 'function') {
      this.currentTool.drawPreview();
    }
  }

  // Draws the eraser cursor preview on the main canvas (only when eraser is active)
  drawCursorPreview(p) {
    if (this.activeName === 'eraser' && typeof this.currentTool.drawCursorPreview === 'function') {
      this.currentTool.drawCursorPreview(p);
    }
  }
}
