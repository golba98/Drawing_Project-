// sketch.js
// p5.js global-mode sketch.
//
// Architecture:
//   - The p5 canvas lives inside #canvas-container (the editor view's drawing area).
//   - The draw loop is paused via noLoop() when the file manager is showing.
//   - initEditor() is called by EditorView.open() — resizes canvas, restores drawing.
//   - closeEditor() is called by EditorView.close() — stops loop, clears layer.
//   - getDrawingDataUrl() captures just the drawing layer as a base64 PNG for localStorage.
//   - On save (PNG export) the main canvas is used — it already has bg + layer composited.

let drawingLayer;     // p5.Graphics — all tool strokes go here
let toolbox;          // Toolbox instance (tools/Toolbox.js)
let pageBackground;   // PageBackground instance (ui/PageBackground.js)

let penColor = [0, 0, 0]; // current stroke colour [r, g, b], updated by colour picker
let penSize  = 4;          // current stroke weight, updated by slider

// Per-tool size settings (independent so changing eraser size won't affect pen size)
const toolSizes = {
  pen:         4,
  highlighter: 20,
  eraser:      24,
  line:        4,
  spray:       30,
};

let isEditorActive = false; // true only while the editor view is open

// ─── p5.js Lifecycle ─────────────────────────────────────────────────────────

function setup() {
  // Create a small initial canvas — it gets resized when the editor opens
  const cnv = createCanvas(100, 100);
  cnv.parent('canvas-container'); // embed inside the editor layout div
  cnv.style('display', 'block');
  cnv.style('width', '100%');
  cnv.style('height', '100%');

  drawingLayer = createGraphics(100, 100);
  drawingLayer.clear();

  toolbox        = new Toolbox();
  pageBackground = new PageBackground();

  noLoop(); // keep the draw loop stopped until a notebook is opened

  // Redraw canvas on theme updates; invalidate background buffer so it regenerates
  window.addEventListener('themeChanged', () => {
    if (isEditorActive) { pageBackground.invalidate(); redraw(); }
  });
  window.addEventListener('pageThemeChanged', () => {
    if (isEditorActive) { pageBackground.invalidate(); redraw(); }
  });

  // Hand off to the view layer — sketch.js is loaded last so all classes are ready
  FileManagerView.init();
  EditorView.init();
  StudyLibraryView.init();
  StudyLibraryView.show();
}

function draw() {
  if (!isEditorActive) return;
  pageBackground.draw();          // fills canvas with page background
  image(drawingLayer, 0, 0);      // composite drawing layer on top
  toolbox.drawPreview();          // rubber-band preview (LineTool only, no-op for others)
  toolbox.drawCursorPreview(window); // eraser cursor preview (no-op for other tools)
}

// ─── Editor Lifecycle (called by EditorView) ─────────────────────────────────

// Sizes the canvas to its container and restores the notebook's saved drawing.
// Must be called after the editor container is visible (EditorView uses setTimeout 0).
function initEditor(notebook) {
  const container = document.getElementById('canvas-container');
  const w = container.offsetWidth  || (windowWidth - 60);
  const h = container.offsetHeight || (windowHeight - 110);

  resizeCanvas(w, h);

  if (drawingLayer) drawingLayer.remove();
  drawingLayer = createGraphics(w, h);
  drawingLayer.clear();

  pageBackground.setMode(notebook.pageMode);
  isEditorActive = true;
  loop(); // restart draw loop

  // Restore saved drawing from base64 data URL (stored as drawing layer only)
  if (notebook.drawingDataUrl) {
    loadImage(notebook.drawingDataUrl, img => {
      drawingLayer.image(img, 0, 0, w, h);
    });
  }
}

// Stops the draw loop and clears the drawing layer.
function closeEditor() {
  isEditorActive = false;
  noLoop();
  if (drawingLayer) drawingLayer.clear();
}

// Returns the drawing layer as a base64 PNG string for localStorage persistence.
// Saves only the drawing layer — NOT the page background — so the data stays small.
// The eraser cursor preview is drawn on the main canvas each frame, not on drawingLayer,
// so it never appears in the exported PNG.
function getDrawingDataUrl() {
  return drawingLayer.canvas.toDataURL('image/png');
}

// ─── Mouse Events ─────────────────────────────────────────────────────────────

function mousePressed() {
  if (!isEditorActive) return;
  // Bounds check prevents stray dots when clicking HTML toolbar/header buttons
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
  toolbox.mousePressed(window, drawingLayer);
}

function mouseDragged() {
  if (!isEditorActive) return;
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
  toolbox.mouseDragged(window, drawingLayer);
}

function mouseReleased() {
  if (!isEditorActive) return;
  // No bounds check on release — LineTool must commit even if mouse drifted outside canvas
  toolbox.mouseReleased(window, drawingLayer);
}

// mouseMoved fires when the mouse moves without buttons held — keeps eraser preview fresh
function mouseMoved() {
  if (!isEditorActive) return;
  if (toolbox.getActiveName() === 'eraser') redraw();
}

// ─── Window Resize ────────────────────────────────────────────────────────────

let _resizeTimer = null;

function windowResized() {
  // Debounce: skip intermediate resize events during window drag
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    if (!isEditorActive) return;
    const container = document.getElementById('canvas-container');
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    resizeCanvas(w, h);

    // Preserve drawing content at the new size
    const temp = createGraphics(w, h);
    temp.clear();
    temp.image(drawingLayer, 0, 0);
    drawingLayer.remove();
    drawingLayer = temp;

    pageBackground.onResize();
    redraw();
  }, 150);
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}
