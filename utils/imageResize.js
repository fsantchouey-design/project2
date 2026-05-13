const sharp = require('sharp');

const MIN_SIZE = 512;

/**
 * Ensures an image buffer is at least 512×512 px.
 * If either dimension is smaller, the image is scaled up (preserving aspect ratio)
 * and padded with a white background to reach exactly 512×512.
 * Accepts JPEG, PNG, WebP. Throws on corrupt or unreadable input.
 */
async function ensureMinDimensions(buffer, mimetype) {
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new Error('Image corrompue ou format non supporté.');
  }

  const { width, height, format } = meta;

  if (!width || !height) {
    throw new Error('Impossible de lire les dimensions de l\'image.');
  }

  if (width >= MIN_SIZE && height >= MIN_SIZE) {
    return { buffer, mimetype };
  }

  const outputFormat = format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpeg';
  const outputMime   = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';

  try {
    const resized = await sharp(buffer)
      .resize(MIN_SIZE, MIN_SIZE, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        withoutEnlargement: false,
        position: 'center',
      })
      .toFormat(outputFormat, { quality: 90 })
      .toBuffer();

    return { buffer: resized, mimetype: outputMime };
  } catch {
    throw new Error('Impossible de redimensionner l\'image.');
  }
}

module.exports = { ensureMinDimensions };
