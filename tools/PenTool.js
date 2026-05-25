// tools/PenTool.js
// Standard ink pen. Draws smooth freehand strokes on the drawing layer.
// Uses toolSizes.pen (sketch.js global) for per-tool size isolation,
// falling back to the global penSize for backward compatibility.

class PenTool {
  constructor() {
    this.name = 'pen';
  }

  _getSize() {
    if (typeof toolSizes !== 'undefined' && toolSizes.pen !== undefined) {
      return toolSizes.pen;
    }
    return typeof penSize !== 'undefined' ? penSize : 4;
  }

  mousePressed(p, layer) {
    layer.strokeWeight(this._getSize());
    layer.strokeCap(ROUND);
    layer.stroke(penColor[0], penColor[1], penColor[2], 255);
    layer.noFill();
    layer.point(p.mouseX, p.mouseY);
  }

  mouseDragged(p, layer) {
    layer.strokeWeight(this._getSize());
    layer.strokeCap(ROUND);
    layer.stroke(penColor[0], penColor[1], penColor[2], 255);
    layer.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
  }

  mouseReleased(p, layer) {}
}
