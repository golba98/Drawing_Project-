// tools/SprayTool.js
// Spray-can effect. Scatters random dots within a radius around the cursor.
// Uses toolSizes.spray (sketch.js global) for per-tool size isolation.

class SprayTool {
  constructor() {
    this.name    = 'spray';
    this.density = 20;
  }

  _getRadius() {
    if (typeof toolSizes !== 'undefined' && toolSizes.spray !== undefined) {
      return toolSizes.spray;
    }
    return 30;
  }

  mousePressed(p, layer) {
    this._sprayDots(p, layer);
  }

  mouseDragged(p, layer) {
    this._sprayDots(p, layer);
  }

  mouseReleased(p, layer) {}

  _sprayDots(p, layer) {
    const radius = this._getRadius();
    layer.stroke(penColor[0], penColor[1], penColor[2], 255);
    layer.strokeWeight(1.5);
    for (let i = 0; i < this.density; i++) {
      const angle    = p.random(TWO_PI);
      const distance = p.random(radius);
      const dx       = Math.cos(angle) * distance;
      const dy       = Math.sin(angle) * distance;
      layer.point(p.mouseX + dx, p.mouseY + dy);
    }
  }
}
