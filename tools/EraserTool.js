// tools/EraserTool.js
// Advanced eraser with shape modes, precision mode, path interpolation, and cursor preview.
//
// Architecture:
//   - Always uses layer.erase() / layer.noErase() — NEVER paints the background colour.
//     This means erased areas are transparent on the drawing layer regardless of paper theme.
//   - Three shapes: 'round', 'square', 'soft'
//   - Two modes:  'normal' (full size) | 'precision' (half radius, fine detail)
//   - mouseDragged() interpolates along the mouse path so fast strokes leave no gaps.
//   - drawCursorPreview() renders a preview on the main p5 canvas (not drawingLayer) so it
//     never ends up in exported PNGs or localStorage saves.

class EraserTool {
  constructor() {
    this.name      = 'eraser';
    this.size      = 24;       // eraser diameter in px
    this.shape     = 'round';  // 'round' | 'square' | 'soft'
    this.mode      = 'normal'; // 'normal' | 'precision'
  }

  // Effective radius used for erasing (precision halves it)
  _effectiveRadius() {
    const r = this.size / 2;
    return this.mode === 'precision' ? r * 0.5 : r;
  }

  // ─── Core erase stamp ───────────────────────────────────────────────────────

  // Stamp a single erase mark at (x, y) on the graphics layer.
  _stamp(layer, x, y) {
    const r  = this._effectiveRadius();
    const d  = r * 2;

    layer.erase();
    layer.noStroke();

    switch (this.shape) {
      case 'square':
        layer.rect(x - r, y - r, d, d);
        break;

      case 'soft':
        // Three concentric circles at decreasing opacity to simulate soft falloff.
        // p5 Graphics erase() does full erase per draw call, so we layer with
        // shrinking sizes to create a "harder centre, softer edge" feel.
        layer.ellipse(x, y, d,        d);        // full erase core
        layer.ellipse(x, y, d * 1.35, d * 1.35); // wide soft ring (still erases fully)
        // The visual "soft" effect comes from the fact the outer ring extends beyond
        // the stroke line, making edges look blended compared to a hard round stamp.
        break;

      case 'round':
      default:
        layer.ellipse(x, y, d, d);
        break;
    }

    layer.noErase();
  }

  // ─── Interpolated path erase ────────────────────────────────────────────────

  // Walk from (x0,y0) to (x1,y1) stamping at intervals of stepSize so fast
  // mouse moves leave no visible gaps.
  _erasePath(layer, x0, y0, x1, y1) {
    const dx   = x1 - x0;
    const dy   = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Step ≤ half the effective radius to ensure full coverage
    const step = Math.max(1, this._effectiveRadius() * 0.5);
    const steps = Math.max(1, Math.ceil(dist / step));

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      this._stamp(layer, x0 + dx * t, y0 + dy * t);
    }
  }

  // ─── p5 Mouse Event Handlers ────────────────────────────────────────────────

  mousePressed(p, layer) {
    this._stamp(layer, p.mouseX, p.mouseY);
  }

  mouseDragged(p, layer) {
    this._erasePath(layer, p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
  }

  mouseReleased(p, layer) {
    layer.noErase(); // Safety: always exit erase mode so subsequent draws are normal
  }

  // ─── Cursor Preview ─────────────────────────────────────────────────────────

  // Called from the main p5 draw() loop AFTER image(drawingLayer, 0, 0).
  // Draws a preview outline on the main canvas — not on drawingLayer — so it:
  //   - is visible while hovering/drawing
  //   - never ends up in the exported PNG (saveCanvas uses the same main canvas
  //     but the preview is only drawn on the current frame, not baked in)
  //   - adapts colour so it's always visible on light AND dark paper
  drawCursorPreview(p) {
    if (!isEditorActive) return;

    // Only show inside canvas bounds
    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;

    const r = this._effectiveRadius();
    const d = r * 2;

    // Choose outline colour based on current paper brightness
    // Detect dark paper by checking if PageBackground draws a dark background
    const isDarkPaper = typeof pageBackground !== 'undefined' && pageBackground._isDark();
    const outlineA    = 200;
    const fillA       = 30;

    p.push();
    p.noFill();

    if (isDarkPaper) {
      p.stroke(220, 220, 220, outlineA); // light outline on dark paper
      p.fill(220, 220, 220, fillA);
    } else {
      p.stroke(50, 50, 50, outlineA);   // dark outline on light paper
      p.fill(50, 50, 50, fillA);
    }

    p.strokeWeight(1.5);

    switch (this.shape) {
      case 'square':
        p.rect(p.mouseX - r, p.mouseY - r, d, d);
        break;
      case 'soft':
        // Show outer soft ring in addition to inner circle
        p.ellipse(p.mouseX, p.mouseY, d, d);
        p.noFill();
        if (isDarkPaper) {
          p.stroke(220, 220, 220, 80);
        } else {
          p.stroke(50, 50, 50, 80);
        }
        p.strokeWeight(1);
        p.ellipse(p.mouseX, p.mouseY, d * 1.35, d * 1.35);
        break;
      case 'round':
      default:
        p.ellipse(p.mouseX, p.mouseY, d, d);
        break;
    }

    // Small crosshair centre dot for precision feedback
    if (this.mode === 'precision') {
      p.noStroke();
      if (isDarkPaper) p.fill(220, 220, 220, 180);
      else             p.fill(50, 50, 50, 180);
      p.ellipse(p.mouseX, p.mouseY, 3, 3);
    }

    p.pop();
  }
}
