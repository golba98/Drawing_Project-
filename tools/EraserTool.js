// tools/EraserTool.js
// Erases drawing layer content by punching transparency holes.
// The page background (on the main canvas) is never affected.

class EraserTool {
  constructor() {
    this.name        = 'eraser';
    this.strokeWidth = 24;
  }

  mousePressed(p, layer) {
    layer.erase();
    layer.strokeWeight(this.strokeWidth);
    layer.strokeCap(ROUND);
    layer.stroke(255);
    layer.point(p.mouseX, p.mouseY);
  }

  mouseDragged(p, layer) {
    layer.erase();
    layer.strokeWeight(this.strokeWidth);
    layer.strokeCap(ROUND);
    layer.stroke(255);
    layer.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
  }

  mouseReleased(p, layer) {
    layer.noErase(); // must always exit erase mode or all subsequent draws will erase
  }
}
