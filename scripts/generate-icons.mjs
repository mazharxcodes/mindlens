import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";

const outDir = path.join(process.cwd(), "public", "icons");
const sizes = [16, 32, 48, 128];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function png(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function setPixel(buffer, size, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }
  const index = (y * size + x) * 4;
  buffer[index] = r;
  buffer[index + 1] = g;
  buffer[index + 2] = b;
  buffer[index + 3] = a;
}

function blendPixel(buffer, size, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }

  const index = (y * size + x) * 4;
  const srcAlpha = a / 255;
  const dstAlpha = buffer[index + 3] / 255;
  const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);

  if (outAlpha === 0) {
    return;
  }

  buffer[index] = Math.round((r * srcAlpha + buffer[index] * dstAlpha * (1 - srcAlpha)) / outAlpha);
  buffer[index + 1] = Math.round(
    (g * srcAlpha + buffer[index + 1] * dstAlpha * (1 - srcAlpha)) / outAlpha
  );
  buffer[index + 2] = Math.round(
    (b * srcAlpha + buffer[index + 2] * dstAlpha * (1 - srcAlpha)) / outAlpha
  );
  buffer[index + 3] = Math.round(outAlpha * 255);
}

function drawRoundedBackground(buffer, size) {
  const radius = size * 0.23;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = Math.max(Math.abs(x - size / 2) - (size / 2 - radius), 0);
      const dy = Math.max(Math.abs(y - size / 2) - (size / 2 - radius), 0);
      const inside = dx * dx + dy * dy <= radius * radius;
      if (!inside) {
        continue;
      }

      const t = (x + y) / (size * 2);
      const r = Math.round(24 + (47 - 24) * t);
      const g = Math.round(37 + (66 - 37) * t);
      const b = Math.round(49 + (84 - 49) * t);
      setPixel(buffer, size, x, y, r, g, b, 255);
    }
  }
}

function drawEllipse(buffer, size, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1) {
        blendPixel(buffer, size, x, y, color[0], color[1], color[2], color[3]);
      }
    }
  }
}

function drawCircle(buffer, size, cx, cy, r, color) {
  drawEllipse(buffer, size, cx, cy, r, r, color);
}

function drawLine(buffer, size, x1, y1, x2, y2, width, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    drawCircle(buffer, size, x, y, width / 2, color);
  }
}

function generateIcon(size) {
  const buffer = Buffer.alloc(size * size * 4);
  drawRoundedBackground(buffer, size);

  const cx = size / 2;
  const cy = size / 2;
  drawCircle(buffer, size, cx, cy, size * 0.33, [43, 63, 80, 255]);
  drawEllipse(buffer, size, cx, cy, size * 0.27, size * 0.18, [248, 240, 224, 255]);
  drawCircle(buffer, size, cx, cy, size * 0.12, [28, 40, 52, 255]);
  drawCircle(buffer, size, cx, cy, size * 0.075, [230, 160, 76, 255]);
  drawCircle(buffer, size, cx - size * 0.03, cy - size * 0.03, size * 0.018, [255, 249, 240, 255]);

  const gold = [244, 201, 122, 255];
  const teal = [126, 199, 184, 255];
  drawLine(buffer, size, size * 0.63, size * 0.28, size * 0.73, size * 0.18, size * 0.025, gold);
  drawLine(buffer, size, size * 0.69, size * 0.34, size * 0.81, size * 0.29, size * 0.025, gold);
  drawLine(buffer, size, size * 0.69, size * 0.41, size * 0.82, size * 0.41, size * 0.025, gold);
  drawLine(buffer, size, size * 0.37, size * 0.72, size * 0.27, size * 0.82, size * 0.025, teal);
  drawLine(buffer, size, size * 0.31, size * 0.66, size * 0.18, size * 0.71, size * 0.025, teal);
  drawLine(buffer, size, size * 0.31, size * 0.79, size * 0.19, size * 0.79, size * 0.025, teal);

  return buffer;
}

await mkdir(outDir, { recursive: true });

for (const size of sizes) {
  const rgba = generateIcon(size);
  const data = png(size, size, rgba);
  await writeFile(path.join(outDir, `icon-${size}.png`), data);
}

console.log(`Generated MindLens icons in ${outDir}`);
