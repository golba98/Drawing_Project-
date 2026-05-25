// tools/LineTool.js
// Straight line tool. Records start on press, shows a rubber-band preview
// during drag (drawn on the main canvas each frame), commits to drawing layer on release.
// Uses toolSizes.line (sketch.js global) for per-tool size isolation.

class LineTool {
  constructor() {
    this.name   = 'line';
    this.startX = 0;
    this.startY = 0;
    this.active = false;
  }

  _getSize() {
    if (typeof toolSizes !== 'undefined' && toolSizes.line !== undefined) {
      return toolSizes.line;
    }
    return typeof penSize !== 'undefined' ? penSize : 4;
  }

  mousePressed(p, layer) {
    this.startX = p.mouseX;
    this.startY = p.mouseY;
    this.active = true;
  }

  mouseDragged(p, layer) {
    // Preview is handled by drawPreview() in the draw() loop
  }

  mouseReleased(p, layer) {
    if (!this.active) return;
    layer.stroke(penColor[0], penColor[1], penColor[2], 255);
    layer.strokeWeight(this._getSize());
    layer.strokeCap(ROUND);
    layer.line(this.startX, this.startY, p.mouseX, p.mouseY);
    this.active = false;
  }

  // Called from sketch draw() loop — preview rendered over the composited canvas
  drawPreview() {
    if (!this.active) return;
    push();
    stroke(penColor[0], penColor[1], penColor[2], 180);
    strokeWeight(this._getSize());
    strokeCap(ROUND);
    line(this.startX, this.startY, mouseX, mouseY);
    pop();
  }
}
