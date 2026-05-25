// ui/Bookshelf.js
// Dynamic 3D bookshelf rendering using P5.js in instance mode.

const BookshelfController = {
  _instance: null,
  _books: [],

  init() {
    const container = document.getElementById('bookshelf-canvas');
    if (!container) return;

    const self = this;
    const BOOK_GAP = 12;
    const BOOK_BASE_H = 190;
    const SHELF_H = 14;
    const CANVAS_H = 280;
    const SIDE_W = 10;
    const TOP_H = 7;

    this._instance = new p5(function(p) {
      let bookYs = [];   // current Y offset (lift)
      let targetYs = []; // target Y offset
      let hoveredBook = -1;
      let canvasW = 800;

      p.setup = function() {
        const c = document.getElementById('bookshelf-canvas');
        canvasW = c.offsetWidth || 800;
        const cnv = p.createCanvas(canvasW, CANVAS_H);
        cnv.parent('bookshelf-canvas');
        cnv.style('display','block');
        p.textFont('IBM Plex Mono');
        bookYs    = self._books.map(() => 0);
        targetYs  = self._books.map(() => 0);
      };

      function totalBooksW() {
        if (self._books.length === 0) return 0;
        let total = 0;
        for (let i = 0; i < self._books.length; i++) {
          total += self._books[i].width;
        }
        total += (self._books.length - 1) * BOOK_GAP;
        return total;
      }

      function bookX(i) {
        const startX = (canvasW - totalBooksW()) / 2;
        let x = startX;
        for (let j = 0; j < i; j++) {
          x += self._books[j].width + BOOK_GAP;
        }
        return x;
      }

      function bookBottom() {
        return CANVAS_H - 30; // floor Y
      }

      p.draw = function() {
        p.clear();
        p.background(19, 23, 36);

        if (self._books.length === 0) return;

        // Sync arrays lengths if they changed
        if (bookYs.length !== self._books.length) {
          bookYs = self._books.map((_, i) => bookYs[i] || 0);
          targetYs = self._books.map((_, i) => targetYs[i] || 0);
        }

        // Smooth lift
        for (let i = 0; i < self._books.length; i++) {
          bookYs[i] = p.lerp(bookYs[i], targetYs[i], 0.12);
        }

        // Shelf plank
        const shelfY = bookBottom();
        const shelfX = bookX(0) - 20;
        const shelfW = totalBooksW() + 40;
        drawShelf(shelfX, shelfY, shelfW, SHELF_H);

        // Shadow under shelf
        p.noStroke();
        p.fill(0, 0, 0, 40);
        p.ellipse(shelfX + shelfW/2, shelfY + SHELF_H + 6, shelfW * 0.9, 14);

        // Books
        for (let i = 0; i < self._books.length; i++) {
          const x = bookX(i);
          const bookW = self._books[i].width;
          const bookH = BOOK_BASE_H + (i % 3 === 0 ? 18 : i % 3 === 1 ? -8 : 6);
          const y = shelfY - bookH + bookYs[i];
          drawBook(i, x, y, bookW, bookH, i === hoveredBook);
        }

        // Tooltip on hover
        if (hoveredBook >= 0 && hoveredBook < self._books.length) {
          const b = self._books[hoveredBook];
          const bookW = b.width;
          const bx = bookX(hoveredBook) + bookW / 2;
          const i = hoveredBook;
          const bookH = BOOK_BASE_H + (i % 3 === 0 ? 18 : i % 3 === 1 ? -8 : 6);
          const by = bookBottom() - bookH + targetYs[hoveredBook] - 16;
          drawTooltip(bx, by, b.fullTitle);
        }
      };

      function drawShelf(x, y, w, h) {
        // Top face (lighter)
        p.fill(95, 72, 42);
        p.noStroke();
        p.beginShape();
        p.vertex(x, y);
        p.vertex(x + w, y);
        p.vertex(x + w + 8, y - 5);
        p.vertex(x - 8, y - 5);
        p.endShape(p.CLOSE);

        // Front face
        p.fill(72, 52, 28);
        p.rect(x, y, w, h, 0, 0, 2, 2);

        // Front highlight
        p.fill(110, 82, 46);
        p.rect(x, y, w, 2);

        // Right side
        p.fill(55, 38, 18);
        p.beginShape();
        p.vertex(x + w, y);
        p.vertex(x + w + 8, y - 5);
        p.vertex(x + w + 8, y - 5 + h);
        p.vertex(x + w, y + h);
        p.endShape(p.CLOSE);
      }

      function drawBook(idx, x, y, w, h, hovered) {
        const b = self._books[idx];
        if (!b) return;
        const [r, g, bv] = b.color;
        const [ar, ag, ab] = b.accent;

        // Shadow
        if (hovered) {
          p.noFill();
          p.noStroke();
          p.fill(0, 0, 0, 40);
          p.ellipse(x + w/2 + SIDE_W/2, bookBottom() + 4, w * 1.2, 10);
        }

        // --- Right side face (3D depth) ---
        p.fill(r*0.55, g*0.55, bv*0.55);
        p.noStroke();
        p.beginShape();
        p.vertex(x + w,          y + TOP_H);
        p.vertex(x + w + SIDE_W, y);
        p.vertex(x + w + SIDE_W, y + h - TOP_H);
        p.vertex(x + w,          y + h);
        p.endShape(p.CLOSE);

        // --- Top face ---
        p.fill(ar, ag, ab);
        p.beginShape();
        p.vertex(x,          y + TOP_H);
        p.vertex(x + SIDE_W, y);
        p.vertex(x + w + SIDE_W, y);
        p.vertex(x + w,      y + TOP_H);
        p.endShape(p.CLOSE);

        // --- Front face (spine) ---
        p.fill(r, g, bv);
        p.rect(x, y + TOP_H, w, h - TOP_H);

        // Spine texture
        p.stroke(ar, ag, ab, 18);
        p.strokeWeight(1);
        for (let gx = x + 4; gx < x + w - 2; gx += 5) {
          p.line(gx, y + TOP_H, gx, y + h);
        }
        p.noStroke();

        // Spine top band
        p.fill(ar, ag, ab, 180);
        p.rect(x, y + TOP_H, w, 22);

        // Spine bottom band
        p.fill(ar * 0.7, ag * 0.7, ab * 0.7, 120);
        p.rect(x, y + h - 18, w, 18);

        // Thin gold line top
        p.fill(200, 168, 80, 160);
        p.rect(x, y + TOP_H + 22, w, 1.5);
        p.rect(x, y + h - 19, w, 1.5);

        // Label text
        p.push();
        p.translate(x + w / 2, y + h / 2 + 8);
        p.rotate(-p.HALF_PI);
        p.fill(240, 225, 195);
        p.noStroke();
        p.textSize(hovered ? 10 : 9);
        p.textAlign(p.CENTER, p.CENTER);
        p.textStyle(p.BOLD);
        p.text(b.label, 0, 0);
        p.pop();

        // Hover shimmer overlay
        if (hovered) {
          p.fill(255, 255, 255, 20);
          p.rect(x, y + TOP_H, w, h - TOP_H);
        }
      }

      function drawTooltip(cx, y, label) {
        const tw = p.textWidth(label) + 22;
        const th = 26;
        const tx = p.constrain(cx - tw/2, 6, canvasW - tw - 6);
        p.fill(200, 149, 42);
        p.noStroke();
        p.rect(tx, y - th/2, tw, th, 5);
        p.fill(12, 15, 24);
        p.textSize(9.5);
        p.textAlign(p.CENTER, p.CENTER);
        p.textStyle(p.BOLD);
        p.text(label, tx + tw/2, y);
      }

      p.mouseMoved = function() {
        if (self._books.length === 0) return;
        hoveredBook = -1;
        const shelfY = bookBottom();
        for (let i = 0; i < self._books.length; i++) {
          const x = bookX(i);
          const bookW = self._books[i].width;
          const bookH = BOOK_BASE_H + (i % 3 === 0 ? 18 : i % 3 === 1 ? -8 : 6);
          const y = shelfY - bookH;
          if (p.mouseX >= x && p.mouseX <= x + bookW + SIDE_W &&
              p.mouseY >= y + targetYs[i] && p.mouseY <= shelfY) {
            hoveredBook = i;
            break;
          }
        }
        for (let i = 0; i < self._books.length; i++) {
          targetYs[i] = (i === hoveredBook) ? -28 : 0;
        }
      };

      p.mouseClicked = function() {
        if (hoveredBook >= 0 && hoveredBook < self._books.length) {
          const book = self._books[hoveredBook];
          if (typeof AppState !== 'undefined' && book.id) {
            AppState.openNotebook(book.id);
          }
        }
      };

      p.windowResized = function() {
        const c = document.getElementById('bookshelf-canvas');
        if (!c) return;
        canvasW = c.offsetWidth || 800;
        p.resizeCanvas(canvasW, CANVAS_H);
      };
    });
  },

  update(notebooks) {
    const coverColorMapping = {
      navy:  { color: [38, 63, 103],    accent: [68, 103, 153] },
      sage:  { color: [100, 120, 85],   accent: [140, 160, 120] },
      tan:   { color: [150, 120, 80],   accent: [190, 160, 110] },
      coral: { color: [170, 85, 75],    accent: [210, 115, 105] },
      blue:  { color: [43, 74, 126],    accent: [73, 104, 156] }
    };

    this._books = notebooks.map((nb, i) => {
      const theme = coverColorMapping[nb.coverColor] || coverColorMapping.navy;
      // Width variation between 44 and 56
      const bookWidth = 48 + (i % 3 === 0 ? 8 : i % 3 === 1 ? -4 : 0);
      return {
        id: nb.id,
        label: (nb.title || 'Untitled').substring(0, 10).toUpperCase(),
        fullTitle: nb.title || 'Untitled',
        color: theme.color,
        accent: theme.accent,
        width: bookWidth
      };
    });

    if (this._instance) {
      this._instance.redraw();
    }
  }
};
