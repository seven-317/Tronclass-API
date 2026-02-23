import Tesseract from 'tesseract.js';

export async function solveCaptcha(dataUrl: string): Promise<string> {
  const base64 = dataUrl.split(',')[1];
  if (!base64) {
    throw new Error('Invalid captcha data URL');
  }

  const buffer = Buffer.from(base64, 'base64');

  const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
    logger: () => {},
  });

  const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').trim();
  return cleaned;
}
