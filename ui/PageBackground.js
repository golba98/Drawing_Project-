// ui/PageBackground.js
// Renders the notebook page background on the main canvas each frame.
// Call draw() at the start of the p5 draw() loop before compositing the drawing layer.

class PageBackground {
  constructor() {
    this.mode = 'lined';

    this.paperR = 252;
    this.paperG = 248;
    this.paperB = 235;

    this.lineR = 180;
    this.lineG = 200;
    this.lineB = 220;

    this.marginR = 220;
    this.marginG = 160;
    this.marginB = 160;

    this.lineSpacing = 28;
    this.marginX     = 90;
  }

  setMode(mode) {
    this.mode = mode;
  }

  draw() {
    background(this.paperR, this.paperG, this.paperB);

    if (this.mode === 'lined') {
      this._drawLinedPage();
    }
  }

  _drawLinedPage() {
    push();
    strokeWeight(1);

    // Horizontal ruled lines
    stroke(this.lineR, this.lineG, this.lineB, 180);
    for (let y = this.lineSpacing * 2; y < height; y += this.lineSpacing) {
      line(0, y, width, y);
    }

    // Vertical red margin line
    stroke(this.marginR, this.marginG, this.marginB, 160);
    line(this.marginX, 0, this.marginX, height);

    pop();
  }
}
