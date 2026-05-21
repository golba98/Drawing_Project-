// tools/SprayTool.js
// Spray-can effect. Scatters random dots within a radius around the cursor.

class SprayTool {
  constructor() {
    this.name    = 'spray';
    this.radius  = 30;
    this.density = 20;
  }

  mousePressed(p, layer) {
    this._sprayDots(p, layer);
  }

  mouseDragged(p, layer) {
    this._sprayDots(p, layer);
  }

  mouseReleased(p, layer) {}

  _sprayDots(p, layer) {
    layer.stroke(penColor[0], penColor[1], penColor[2], 255);
    layer.strokeWeight(1.5);
    for (let i = 0; i < this.density; i++) {
      const angle    = p.random(TWO_PI);
      const distance = p.random(this.radius);
      const dx       = Math.cos(angle) * distance;
      const dy       = Math.sin(angle) * distance;
      layer.point(p.mouseX + dx, p.mouseY + dy);
    }
  }
}
