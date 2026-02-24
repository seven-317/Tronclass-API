import Tesseract from 'tesseract.js';

export async function solveCaptcha(dataUrl: string): Promise<string> {
  const base64 = dataUrl.split(',')[1] ?? dataUrl;
  if (!base64) {
    throw new Error('Invalid captcha data URL');
  }

  const buffer = Buffer.from(base64, 'base64');

  let preprocessed: Buffer = buffer;
  try {
    const { createCanvas, loadImage } = await import('canvas');
    const img = await loadImage(buffer);
    const scale = 3;
    const w = img.width * scale;
    const h = img.height * scale;

    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const { data } = imageData;

    const binary = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lum = (r + g + b) / 3;
        const diff = max - min;
        binary[y * w + x] = (lum < 180 && diff > 30) ? 1 : 0;
      }
    }

    const eroded = new Uint8Array(w * h);
    const er = 2;
    for (let y = er; y < h - er; y++) {
      for (let x = er; x < w - er; x++) {
        let count = 0;
        for (let dy = -er; dy <= er; dy++) {
          for (let dx = -er; dx <= er; dx++) {
            count += binary[(y + dy) * w + (x + dx)];
          }
        }
        eroded[y * w + x] = count >= ((2 * er + 1) ** 2) * 0.5 ? 1 : 0;
      }
    }

    const dilated = new Uint8Array(w * h);
    const dr = 3;
    for (let y = dr; y < h - dr; y++) {
      for (let x = dr; x < w - dr; x++) {
        let found = false;
        for (let dy = -dr; dy <= dr && !found; dy++) {
          for (let dx = -dr; dx <= dr && !found; dx++) {
            if (eroded[(y + dy) * w + (x + dx)]) found = true;
          }
        }
        dilated[y * w + x] = found ? 1 : 0;
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const val = dilated[y * w + x] ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = val;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    preprocessed = canvas.toBuffer('image/png');
  } catch {
  }

  const { data: { text } } = await Tesseract.recognize(preprocessed, 'eng', {
    logger: () => {},
  });

  const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').trim();
  return cleaned;
}
