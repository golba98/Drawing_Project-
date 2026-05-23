// app/library/DrawingCanvas.js
// Canvas 2D drawing engine — no p5.js dependency.
// Tools: pencil, pen, eraser, line. Undo/redo via ImageData snapshots.

function DrawingCanvas(containerEl) {
  const MAX_HISTORY = 40;
  const PAPER_BG    = '#0C0F18'; // --bg: matches dark academic canvas background

  let _canvas    = null;
  let _ctx       = null;
  let _container = containerEl;

  let _tool    = 'pencil';
  let _color   = '#F0E6C8';
  let _size    = 4;
  let _drawing = false;
  let _lastX   = 0;
  let _lastY   = 0;
  let _lastW   = 0;
  let _lastH   = 0;

  // Undo/redo
  let _undoStack = [];
  let _redoStack = [];

  // Line tool preview
  let _lineStartX          = 0;
  let _lineStartY          = 0;
  let _linePreviewSnapshot = null;

  // Eraser width for quadratic mid-point smoothing
  let _pendingLoad = null;

  // Event listeners
  const _handlers = { 'stroke-end': [], 'history-change': [] };

  // ── Public API ──────────────────────────────────────────────────────────────

  this.mount = function () {
    _canvas        = document.createElement('canvas');
    _ctx           = _canvas.getContext('2d');
    _container.appendChild(_canvas);

    _canvas.width  = 900;
    _canvas.height = 1200;
    _lastW         = 900;
    _lastH         = 1200;

    _canvas.addEventListener('pointerdown', _onPointerDown);
    _canvas.addEventListener('pointermove', _onPointerMove);
    _canvas.addEventListener('pointerup',   _onPointerUp);
    _canvas.addEventListener('pointerleave', _onPointerLeave);

    _fill();

    if (_pendingLoad) {
      const url = _pendingLoad;
      _pendingLoad = null;
      this.loadFromDataUrl(url);
    }
  };

  this.unmount = function () {
    if (_canvas) {
      _canvas.removeEventListener('pointerdown', _onPointerDown);
      _canvas.removeEventListener('pointermove', _onPointerMove);
      _canvas.removeEventListener('pointerup',   _onPointerUp);
      _canvas.removeEventListener('pointerleave', _onPointerLeave);
      _canvas.remove();
      _canvas = null;
      _ctx    = null;
    }
    _undoStack = [];
    _redoStack = [];
    _pendingLoad = null;
  };

  this.setTool  = function (name) { _tool = name; };
  this.setColor = function (hex)  { _color = hex; };
  this.setSize  = function (px)   { _size = px; };

  this.canUndo = function () { return _undoStack.length > 0; };
  this.canRedo = function () { return _redoStack.length > 0; };

  this.undo = function () {
    if (!_undoStack.length || !_ctx) return;
    const current = _ctx.getImageData(0, 0, _canvas.width, _canvas.height);
    _redoStack.push(current);
    const prev = _undoStack.pop();
    _ctx.putImageData(prev, 0, 0);
    _emit('history-change');
  };

  this.redo = function () {
    if (!_redoStack.length || !_ctx) return;
    const current = _ctx.getImageData(0, 0, _canvas.width, _canvas.height);
    _undoStack.push(current);
    const next = _redoStack.pop();
    _ctx.putImageData(next, 0, 0);
    _emit('history-change');
  };

  this.clearCanvas = function () {
    if (!_ctx) return;
    _snapshot();
    _fill();
    _emit('history-change');
    _emit('stroke-end');
  };

  this.loadFromDataUrl = function (dataUrl) {
    _undoStack = [];
    _redoStack = [];
    if (!_ctx) {
      _pendingLoad = dataUrl;
      return;
    }
    _fill();
    if (!dataUrl) return;
    const img = new Image();
    img.onload = function () {
      if (_ctx) _ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  };

  this.getDataUrl = function () {
    if (!_canvas) return null;
    return _canvas.toDataURL('image/png');
  };

  this.on = function (event, handler) {
    if (_handlers[event]) _handlers[event].push(handler);
  };

  this.off = function (event, handler) {
    if (_handlers[event]) _handlers[event] = _handlers[event].filter(h => h !== handler);
  };

  // ── Internal ────────────────────────────────────────────────────────────────

  function _emit(event) {
    (_handlers[event] || []).forEach(fn => fn());
  }

  function _fill() {
    if (!_ctx) return;
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    _ctx.fillStyle = PAPER_BG;
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
  }

  function _snapshot() {
    if (!_ctx) return;
    const data = _ctx.getImageData(0, 0, _canvas.width, _canvas.height);
    _undoStack.push(data);
    if (_undoStack.length > MAX_HISTORY) _undoStack.shift();
    _redoStack = [];
  }

  function _pos(e) {
    const rect = _canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (_canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (_canvas.height / rect.height),
    };
  }

  // ── Pointer events ──────────────────────────────────────────────────────────

  function _onPointerDown(e) {
    if (e.button !== 0 && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    _canvas.setPointerCapture(e.pointerId);
    _drawing = true;
    const { x, y } = _pos(e);
    _lastX = x;
    _lastY = y;

    if (_tool === 'line') {
      _snapshot();
      _lineStartX = x;
      _lineStartY = y;
      _linePreviewSnapshot = _ctx.getImageData(0, 0, _canvas.width, _canvas.height);
      return;
    }

    _snapshot();

    if (_tool === 'eraser') {
      _ctx.save();
      _ctx.fillStyle = PAPER_BG;
      _ctx.beginPath();
      _ctx.arc(x, y, _size / 2, 0, Math.PI * 2);
      _ctx.fill();
      _ctx.restore();
    } else {
      _ctx.save();
      _applyStrokeStyle();
      _ctx.beginPath();
      _ctx.arc(x, y, _ctx.lineWidth / 2, 0, Math.PI * 2);
      _ctx.fill();
      _ctx.restore();
    }
  }

  function _onPointerMove(e) {
    if (!_drawing) return;
    const { x, y } = _pos(e);

    if (_tool === 'line') {
      _ctx.putImageData(_linePreviewSnapshot, 0, 0);
      _ctx.save();
      _ctx.strokeStyle = _color;
      _ctx.lineWidth   = _size;
      _ctx.lineCap     = 'round';
      _ctx.globalAlpha = 0.6;
      _ctx.setLineDash([4, 4]);
      _ctx.beginPath();
      _ctx.moveTo(_lineStartX, _lineStartY);
      _ctx.lineTo(x, y);
      _ctx.stroke();
      _ctx.restore();
      return;
    }

    if (_tool === 'eraser') {
      _ctx.save();
      _ctx.strokeStyle = PAPER_BG;
      _ctx.fillStyle   = PAPER_BG;
      _ctx.lineWidth   = _size;
      _ctx.lineCap     = 'round';
      _ctx.lineJoin    = 'round';
      _ctx.beginPath();
      _ctx.moveTo(_lastX, _lastY);
      _ctx.lineTo(x, y);
      _ctx.stroke();
      _ctx.restore();
    } else if (_tool === 'pencil') {
      _ctx.save();
      _applyStrokeStyle();
      const variation = 1 + (Math.random() - 0.5) * 0.4;
      _ctx.lineWidth = Math.max(1, _size * 0.85 * variation);
      _ctx.beginPath();
      _ctx.moveTo(_lastX, _lastY);
      _ctx.lineTo(x, y);
      _ctx.stroke();
      _ctx.restore();
    } else {
      // pen — quadratic smooth
      _ctx.save();
      _applyStrokeStyle();
      const mx = (_lastX + x) / 2;
      const my = (_lastY + y) / 2;
      _ctx.beginPath();
      _ctx.moveTo(_lastX, _lastY);
      _ctx.quadraticCurveTo(_lastX, _lastY, mx, my);
      _ctx.stroke();
      _ctx.restore();
    }

    _lastX = x;
    _lastY = y;
  }

  function _onPointerUp(e) {
    if (!_drawing) return;
    _drawing = false;
    const { x, y } = _pos(e);

    if (_tool === 'line') {
      _ctx.putImageData(_linePreviewSnapshot, 0, 0);
      _linePreviewSnapshot = null;
      _ctx.save();
      _ctx.strokeStyle = _color;
      _ctx.lineWidth   = _size;
      _ctx.lineCap     = 'round';
      _ctx.beginPath();
      _ctx.moveTo(_lineStartX, _lineStartY);
      _ctx.lineTo(x, y);
      _ctx.stroke();
      _ctx.restore();
    }

    _emit('stroke-end');
    _emit('history-change');
  }

  function _onPointerLeave() {
    if (_drawing && _tool !== 'line') {
      _drawing = false;
      _emit('stroke-end');
      _emit('history-change');
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function _applyStrokeStyle() {
    _ctx.strokeStyle = _color;
    _ctx.fillStyle   = _color;
    _ctx.lineWidth   = _size;
    _ctx.lineCap     = 'round';
    _ctx.lineJoin    = 'round';
    _ctx.globalAlpha = _tool === 'pencil' ? 0.85 : 1.0;
  }

  function _interpolatePath(x0, y0, x1, y1, step, fn) {
    const dx   = x1 - x0;
    const dy   = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(dist / Math.max(1, step * 0.5)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      fn(x0 + dx * t, y0 + dy * t);
    }
  }
}
