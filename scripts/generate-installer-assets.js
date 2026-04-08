const fs = require("fs");
const path = require("path");

const WIDTH = 164;
const HEIGHT = 314;
const OUTPUT_DIR = path.join(__dirname, "..", "assets", "installer", "win");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function blend(base, overlay, strength) {
  const alpha = clamp(strength, 0, 1);
  return [
    Math.round(lerp(base[0], overlay[0], alpha)),
    Math.round(lerp(base[1], overlay[1], alpha)),
    Math.round(lerp(base[2], overlay[2], alpha)),
  ];
}

function createImageData(width, height, topColor, bottomColor) {
  const pixels = new Array(height);

  for (let y = 0; y < height; y += 1) {
    const t = y / Math.max(1, height - 1);
    const rowColor = [
      Math.round(lerp(topColor[0], bottomColor[0], t)),
      Math.round(lerp(topColor[1], bottomColor[1], t)),
      Math.round(lerp(topColor[2], bottomColor[2], t)),
    ];

    pixels[y] = new Array(width);
    for (let x = 0; x < width; x += 1) {
      pixels[y][x] = [...rowColor];
    }
  }

  return pixels;
}

function drawAccentStrip(pixels, accentTop, accentBottom) {
  const width = pixels[0].length;
  const height = pixels.length;

  for (let y = 0; y < height; y += 1) {
    const t = y / Math.max(1, height - 1);
    const accent = [
      Math.round(lerp(accentTop[0], accentBottom[0], t)),
      Math.round(lerp(accentTop[1], accentBottom[1], t)),
      Math.round(lerp(accentTop[2], accentBottom[2], t)),
    ];

    for (let x = 0; x < width; x += 1) {
      const strength = x < 10 ? 0.95 : x < 18 ? 0.4 : 0;
      if (strength > 0) {
        pixels[y][x] = blend(pixels[y][x], accent, strength);
      }
    }
  }
}

function drawGlow(pixels, centerX, centerY, radius, color, intensity) {
  const width = pixels[0].length;
  const height = pixels.length;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > radius) {
        continue;
      }

      const strength = ((1 - distance / radius) ** 2) * intensity;
      pixels[y][x] = blend(pixels[y][x], color, strength);
    }
  }
}

function drawPanel(pixels, x0, y0, x1, y1, color, opacity) {
  const width = pixels[0].length;
  const height = pixels.length;

  for (let y = Math.max(0, y0); y < Math.min(height, y1); y += 1) {
    for (let x = Math.max(0, x0); x < Math.min(width, x1); x += 1) {
      const offset = ((x - x0) + (y - y0)) / Math.max(1, (x1 - x0) + (y1 - y0));
      const strength = opacity * (0.6 + offset * 0.4);
      pixels[y][x] = blend(pixels[y][x], color, strength);
    }
  }
}

function drawGrid(pixels) {
  const width = pixels[0].length;
  const height = pixels.length;

  for (let y = 28; y < height; y += 36) {
    for (let x = 20; x < width; x += 1) {
      pixels[y][x] = blend(pixels[y][x], [255, 255, 255], 0.05);
    }
  }

  for (let x = 28; x < width; x += 28) {
    for (let y = 12; y < height; y += 1) {
      pixels[y][x] = blend(pixels[y][x], [255, 255, 255], 0.03);
    }
  }
}

function writeBmp(filePath, pixels) {
  const width = pixels[0].length;
  const height = pixels.length;
  const rowStride = Math.ceil((width * 3) / 4) * 4;
  const pixelArraySize = rowStride * height;
  const fileSize = 54 + pixelArraySize;
  const buffer = Buffer.alloc(fileSize);

  buffer.write("BM", 0, 2, "ascii");
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);
  buffer.writeInt32LE(2835, 38);
  buffer.writeInt32LE(2835, 42);

  let offset = 54;
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixels[y][x];
      buffer[offset] = b;
      buffer[offset + 1] = g;
      buffer[offset + 2] = r;
      offset += 3;
    }

    while ((offset - 54) % rowStride !== 0) {
      buffer[offset] = 0;
      offset += 1;
    }
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

function buildSidebar(outputName, accentTop, accentBottom) {
  const pixels = createImageData(WIDTH, HEIGHT, [8, 11, 17], [23, 27, 36]);
  drawAccentStrip(pixels, accentTop, accentBottom);
  drawGlow(pixels, 116, 72, 96, [69, 195, 255], 0.18);
  drawGlow(pixels, 136, 248, 82, [88, 100, 255], 0.12);
  drawPanel(pixels, 36, 30, 152, 106, [255, 255, 255], 0.045);
  drawPanel(pixels, 52, 132, 154, 196, [58, 134, 255], 0.08);
  drawPanel(pixels, 28, 222, 128, 290, [255, 255, 255], 0.035);
  drawGrid(pixels);

  writeBmp(path.join(OUTPUT_DIR, outputName), pixels);
}

buildSidebar("installer-sidebar.bmp", [32, 224, 194], [59, 130, 246]);
buildSidebar("uninstaller-sidebar.bmp", [124, 92, 255], [59, 130, 246]);

console.log(`[installer-assets] Generated dark installer sidebars in ${OUTPUT_DIR}`);
