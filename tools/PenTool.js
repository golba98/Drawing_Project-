// tools/PenTool.js
// Standard ink pen. Draws smooth freehand strokes on the drawing layer.

class PenTool {
  constructor() {
    this.name = 'pen';
  }

  mousePressed(p, layer) {
    layer.strokeWeight(penSize);
    layer.strokeCap(ROUND);
    layer.stroke(penColor[0], penColor[1], penColor[2], 255);
    layer.noFill();
    layer.point(p.mouseX, p.mouseY);
  }

  mouseDragged(p, layer) {
    layer.strokeWeight(penSize);
    layer.strokeCap(ROUND);
    layer.stroke(penColor[0], penColor[1], penColor[2], 255);
    layer.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
  }

  mouseReleased(p, layer) {}
}
