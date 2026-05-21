// tools/HighlighterTool.js
// Semi-transparent yellow marker. Thicker than the pen with round caps.

class HighlighterTool {
  constructor() {
    this.name        = 'highlighter';
    this.strokeWidth = 20;
    this.alpha       = 100;
  }

  mousePressed(p, layer) {
    layer.strokeWeight(this.strokeWidth);
    layer.strokeCap(ROUND);
    layer.stroke(255, 255, 0, this.alpha);
    layer.noFill();
    layer.point(p.mouseX, p.mouseY);
  }

  mouseDragged(p, layer) {
    layer.strokeWeight(this.strokeWidth);
    layer.strokeCap(ROUND);
    layer.stroke(255, 255, 0, this.alpha);
    layer.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
  }

  mouseReleased(p, layer) {}
}
