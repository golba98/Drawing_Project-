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
  }

  setTool(name) {
    if (this.tools[name]) {
      this.currentTool = this.tools[name];
    } else {
      console.warn(`Toolbox: unknown tool "${name}"`);
    }
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

  // Duck-typed: only LineTool implements drawPreview()
  drawPreview() {
    if (typeof this.currentTool.drawPreview === 'function') {
      this.currentTool.drawPreview();
    }
  }
}
