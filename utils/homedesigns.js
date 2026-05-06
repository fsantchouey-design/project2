/**
 * HomeDesigns.AI API Integration
 * Documentation: https://api.homedesigns.ai/homedesignsai-api-documentation
 *
 * Supported endpoints:
 *  - Redesign (Perfect, Beautiful, Creative modes)
 *  - Sketch to Render
 *  - Precision (mask-based inpainting)
 *  - Fill Spaces (mask-based filling)
 *  - Decor Staging
 *  - Furniture Removal (mask-based)
 *  - Color & Textures (mask-based)
 *  - Furniture Finder
 *  - Full HD (upscale)
 *  - Sky Colors
 */

const FormData = require('form-data');
const https = require('https');
const http = require('http');
const zlib = require('zlib');

const rawApiBaseUrl = process.env.HOMEDESIGNS_API_BASE_URL || process.env.HOMEDESIGNS_API_URL || 'https://homedesigns.ai';
const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '').replace(/\/api\/v2$/, '');
const API_URL = `${API_BASE_URL}/api/v2`;
const API_TOKEN = process.env.HOMEDESIGNS_API_KEY || process.env.HOMEDESIGNS_API_TOKEN;

// Map our style IDs to the exact names the API expects per design type
// Interior, Exterior, and Garden each have different valid style lists
const STYLE_MAP = {
  'modern': 'Modern',
  'contemporary': 'Contemporary',
  'minimalist': 'Minimalist',
  'industrial': 'Industrial',
  'scandinavian': 'Scandinavian',
  'traditional': 'Traditional',
  'rustic': 'Rustic',
  'bohemian': 'Bohemian',
  'coastal': 'Coastal',
  'mid-century': 'Midcentury Modern',
  'farmhouse': 'Modern Farm House',
  'art-deco': 'Art Deco',
  'japanese': 'Japanese Design',
  'mediterranean': 'Mediterranean'
};

// Exterior-specific style mapping (fallback when interior style isn't valid for exterior)
const EXTERIOR_STYLE_MAP = {
  'modern': 'Modern',
  'contemporary': 'Contemporary',
  'minimalist': 'Modern',
  'industrial': 'Urban Industrial',
  'scandinavian': 'Modern Scandinavian',
  'traditional': 'Traditional',
  'rustic': 'Rustic Modern',
  'bohemian': 'Bohemian',
  'coastal': 'Beach House',
  'mid-century': 'Modern',
  'farmhouse': 'Modern Farm House',
  'art-deco': 'Art Deco',
  'japanese': 'Modern',
  'mediterranean': 'Mediterranean'
};

// Garden-specific style mapping
const GARDEN_STYLE_MAP = {
  'modern': 'Modern',
  'contemporary': 'Contemporary',
  'minimalist': 'Minimalist',
  'industrial': 'Industrial',
  'scandinavian': 'Scandinavian',
  'traditional': 'Traditional',
  'rustic': 'Rustic',
  'bohemian': 'Bohemian',
  'coastal': 'Coastal',
  'mid-century': 'Modern',
  'farmhouse': 'Farmhouse',
  'art-deco': 'Art Deco',
  'japanese': 'Japanese',
  'mediterranean': 'Mediterranean'
};

// Map our room type IDs to the exact names the API expects
const ROOM_TYPE_MAP = {
  'living-room': 'Living Room',
  'bedroom': 'Bedroom',
  'kitchen': 'Kitchen',
  'bathroom': 'Bathroom',
  'dining-room': 'Dining Room',
  'office': 'Home Office',
  'outdoor': 'Rooftop Terrace',
  'kids-room': 'Kids Room',
  'basement': 'Basement Lounge',
  'garage': 'Garage Gym',
  'other': 'Living Room'
};

// House angle options for exterior designs
const HOUSE_ANGLES = ['Front of House', 'Side of House', 'Back of House'];

// Garden type options
const GARDEN_TYPES = ['Backyard', 'Front Yard', 'Courtyard', 'Patio', 'Terrace'];

// Weather options for Sky Colors
const WEATHER_OPTIONS = ['Sunshine', 'Clear Sky', 'Rainy', 'Cloudy', 'Windy', 'Dawn', 'Dusk', 'Twilight', 'Sunny', 'Night'];
const VIDEO_GENERATION_MOTIONS = [
  'pan_up',
  'pan_down',
  'pan_left_right',
  'zoom_in',
  'zoom_out',
  'camera_pullback',
  'rotate_cw',
  'rotate_ccw',
  'combining_motions',
  'look_up',
  'look_down'
];
const TEXTURE_GRID_OPTIONS = ['1 X 1', '2 X 2', '3 X 3', '4 X 4', '5 X 5'];
const FLOOR_TEXTURE_GRID_OPTIONS = ['1 X 1', '2 X 2', '3 X 3', '4 X 4'];
const MATERIAL_TEXTURE_COLORS = {
  wood: [139, 92, 45],
  marble: [222, 226, 232],
  concrete: [132, 140, 148],
  fabric: [100, 116, 139],
  metal: [164, 170, 178],
  leather: [106, 62, 38],
  tiles: [205, 213, 224],
  custom: [139, 92, 45],
  stone: [150, 139, 122],
  glass: [159, 220, 230]
};

const DESIGN_STYLES = [
  { id: 'modern', name: 'Modern', description: 'Clean lines, neutral colors, minimal ornamentation' },
  { id: 'contemporary', name: 'Contemporary', description: 'Current trends, bold colors, mixed materials' },
  { id: 'minimalist', name: 'Minimalist', description: 'Simple, functional, clutter-free spaces' },
  { id: 'industrial', name: 'Industrial', description: 'Raw materials, exposed elements, urban feel' },
  { id: 'scandinavian', name: 'Scandinavian', description: 'Light colors, natural materials, cozy vibes' },
  { id: 'traditional', name: 'Traditional', description: 'Classic details, warm colors, elegant furnishings' },
  { id: 'rustic', name: 'Rustic', description: 'Natural wood, earthy tones, country charm' },
  { id: 'bohemian', name: 'Bohemian', description: 'Eclectic mix, bold patterns, artistic flair' },
  { id: 'coastal', name: 'Coastal', description: 'Beach-inspired, light blues, natural textures' },
  { id: 'mid-century', name: 'Mid-Century Modern', description: 'Retro 50s-60s, organic shapes, bold colors' },
  { id: 'farmhouse', name: 'Farmhouse', description: 'Country living, vintage touches, comfortable spaces' },
  { id: 'art-deco', name: 'Art Deco', description: 'Glamorous, geometric patterns, rich colors' },
  { id: 'japanese', name: 'Japanese', description: 'Zen-inspired, natural elements, serene spaces' },
  { id: 'mediterranean', name: 'Mediterranean', description: 'Warm terracotta, arched doorways, rustic elegance' }
];

const ROOM_TYPES = [
  { id: 'living-room', name: 'Living Room', icon: 'sofa' },
  { id: 'bedroom', name: 'Bedroom', icon: 'bed' },
  { id: 'kitchen', name: 'Kitchen', icon: 'utensils' },
  { id: 'bathroom', name: 'Bathroom', icon: 'bath' },
  { id: 'dining-room', name: 'Dining Room', icon: 'utensils-crossed' },
  { id: 'office', name: 'Home Office', icon: 'briefcase' },
  { id: 'outdoor', name: 'Outdoor/Patio', icon: 'tree' },
  { id: 'kids-room', name: "Kids Room", icon: 'baby' },
  { id: 'basement', name: 'Basement', icon: 'home' },
  { id: 'garage', name: 'Garage', icon: 'car' }
];

/**
 * Download an image from a URL and return it as a Buffer
 */
const downloadImage = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const client = imageUrl.startsWith('https') ? https : http;
    client.get(imageUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch image: HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
};

/**
 * Make an HTTP GET request to the API
 */
const apiGet = (endpoint) => {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const client = url.protocol === 'https:' ? https : http;
    client.get({
      hostname: url.hostname,
      port: url.port || undefined,
      path: url.pathname + url.search,
      headers: { 'Authorization': `Bearer ${API_TOKEN}` }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      res.on('error', reject);
    }).on('error', reject);
  });
};

/**
 * Submit form data to the HomeDesigns API
 * Automatically injects tool_name (required by the API) from the endpoint path
 */
const submitToApi = (endpoint, formData, submitOptions = {}) => {
  return new Promise((resolve, reject) => {
    // The HomeDesigns API requires tool_name in every request
    // Extract it from the last path segment of the endpoint URL
    const toolName = endpoint.split('/').pop();
    if (toolName && !submitOptions.skipToolName) formData.append('tool_name', toolName);

    const url = new URL(endpoint);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || undefined,
      path: url.pathname,
      method: 'POST',
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${API_TOKEN}`
      }
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      res.on('error', reject);
    });

    req.on('error', reject);
    formData.pipe(req);
  });
};

/**
 * Poll the status endpoint until the design is ready (for async queue responses)
 * @param {string} apiEndpoint - The API endpoint name (e.g. 'beautiful_redesign')
 * @param {string} queueId - The queue ID to poll
 */
const pollForResult = async (apiEndpoint, queueId, maxAttempts = 60) => {
  for (let i = 0; i < maxAttempts; i++) {
    // Wait 3s between polls (total timeout: ~3 minutes)
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const statusResult = await apiGet(`${API_URL}/${apiEndpoint}/status_check/${queueId}`);
      if (statusResult.statusCode === 200) {
        const statusData = JSON.parse(statusResult.body);
        const status = (statusData.status || '').toLowerCase();
        console.log(`[HomeDesigns] Poll [${i + 1}/${maxAttempts}] status: ${status || 'unknown'}, keys: ${Object.keys(statusData).join(',')}`);

        // Still processing — keep polling
        if (['in_queue', 'starting', 'processing', 'in_progress', 'pending'].includes(status)) {
          continue;
        }

        // Also check nested data.data.status (virtual_staging format)
        if (!status) {
          const nestedStatus = (statusData.data?.status || '').toLowerCase();
          if (['in_queue', 'starting', 'processing', 'in_progress', 'pending'].includes(nestedStatus)) {
            continue;
          }
        }

        // Failed
        if (status === 'failed' || status === 'error') {
          return { success: false, error: statusData.message || 'Generation failed on server' };
        }

        // Check for output images (final result may or may not have a status field)
        const images = statusData.output_images || statusData.generated_images || [];
        if (images.length > 0) {
          console.log(`[HomeDesigns] Design generated (async): ${images.length} image(s)`);
          return {
            success: true,
            imageUrl: images[0],
            allImages: images,
            thumbnailUrl: images[0],
            originalImageUrl: statusData.input_image,
            creditsUsed: 1
          };
        }

        // Also check for any Google Storage URLs in case of unexpected format
        const bodyStr = JSON.stringify(statusData);
        const urlMatches = bodyStr.match(/https:\/\/storage\.googleapis\.com\/[^"]+/g);
        if (urlMatches && urlMatches.length > 0) {
          console.log(`[HomeDesigns] Found ${urlMatches.length} image URL(s) via fallback in poll`);
          return {
            success: true,
            imageUrl: urlMatches[0],
            allImages: urlMatches,
            thumbnailUrl: urlMatches[0],
            creditsUsed: 1
          };
        }

        // If status is success/completed but no images found
        if (status === 'success' || status === 'completed') {
          console.log('[HomeDesigns] Status succeeded but no images found:', JSON.stringify(statusData).substring(0, 300));
          return { success: false, error: 'Generation completed but no images returned' };
        }
      }
    } catch (pollErr) {
      console.error('[HomeDesigns] Poll error:', pollErr.message);
    }
  }
  return null;
};

const pollForVideoResult = async (queueId, maxAttempts = 120) => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const statusResult = await apiGet(`${API_URL}/video_generation/status_check/${queueId}`);

      if (statusResult.statusCode !== 200) {
        console.error('[VideoGeneration] Status check failed:', statusResult.statusCode, statusResult.body.substring(0, 240));
        continue;
      }

      const statusData = JSON.parse(statusResult.body);
      const status = String(statusData.status || statusData.data?.status || '').toLowerCase();
      console.log(`[VideoGeneration] Poll [${i + 1}/${maxAttempts}] status: ${status || 'unknown'}`);

      if (['in_queue', 'starting', 'processing', 'in_progress', 'pending'].includes(status)) {
        continue;
      }

      if (['failed', 'error'].includes(status)) {
        return { success: false, error: statusData.message || statusData.error || 'Video generation failed on server.' };
      }

      const outputVideo = statusData.output_video || statusData.outputVideo || statusData.video_url ||
        statusData.videoUrl || statusData.data?.output_video || statusData.data?.video_url;

      if (status === 'success' && outputVideo) {
        return {
          success: true,
          videoUrl: outputVideo,
          originalImageUrl: statusData.input_image || statusData.data?.input_image,
          queueId,
          creditsUsed: 1
        };
      }

      if (status === 'success') {
        const bodyStr = JSON.stringify(statusData);
        const videoMatch = bodyStr.match(/https:\/\/[^"]+\.(?:mp4|mov|webm)(?:\?[^"]*)?/i);
        if (videoMatch) {
          return {
            success: true,
            videoUrl: videoMatch[0],
            originalImageUrl: statusData.input_image || statusData.data?.input_image,
            queueId,
            creditsUsed: 1
          };
        }
        return { success: false, error: 'Video generation completed but no video URL was returned.' };
      }
    } catch (pollErr) {
      console.error('[VideoGeneration] Poll error:', pollErr.message);
    }
  }

  return null;
};

/**
 * Parse API response and handle all response formats (sync, direct, async queue)
 * @param {object} result - Raw HTTP response { statusCode, body }
 * @param {string} apiEndpoint - The API endpoint name for polling
 * @param {string} logPrefix - Logging prefix
 */
const parseApiResponse = async (result, apiEndpoint, logPrefix = '[HomeDesigns]') => {
  console.log(`${logPrefix} API response status:`, result.statusCode);
  console.log(`${logPrefix} API response body:`, result.body.substring(0, 300));

  if (result.statusCode !== 200) {
    try {
      const parsed = JSON.parse(result.body);
      // Handle { error: "message" } format
      if (typeof parsed.error === 'string') {
        throw new Error(parsed.error);
      }
      // Handle { error: { field: ["message"] } } format (422 validation)
      if (typeof parsed.error === 'object') {
        const messages = Object.values(parsed.error).flat();
        if (messages.some(m => m.includes('minimum dimentions'))) {
          throw new Error('Image is too small. Please upload an image at least 512x512 pixels.');
        }
        throw new Error(messages[0]);
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        // Body isn't JSON
        throw new Error(`API request failed: ${result.statusCode}`);
      }
      throw e;
    }
    throw new Error(`API request failed: ${result.statusCode} - ${result.body.substring(0, 200)}`);
  }

  const data = JSON.parse(result.body);
  const keys = Object.keys(data);
  console.log(`${logPrefix} Response keys:`, keys.join(', '));

  // --- ERROR RESPONSES ---
  // { success: false, message: "..." }
  if (data.success === false && data.message) {
    throw new Error(data.message);
  }

  // --- IMAGE GENERATION RESPONSES ---
  // Find output images from ANY possible field name
  let outputImages = null;
  let inputImage = null;

  // Format: { output_images: [...] }
  if (Array.isArray(data.output_images) && data.output_images.length > 0) {
    outputImages = data.output_images;
    inputImage = data.input_image;
  }
  // Format: { success: { generated_image: [...] } }
  if (!outputImages && data.success && typeof data.success === 'object' && data.success.generated_image) {
    outputImages = data.success.generated_image;
    inputImage = data.success.original_image;
  }
  // Format: { generated_images: [...] }
  if (!outputImages && Array.isArray(data.generated_images) && data.generated_images.length > 0) {
    outputImages = data.generated_images;
    inputImage = data.input_image;
  }

  if (outputImages) {
    console.log(`${logPrefix} Got ${outputImages.length} output image(s)`);
    return {
      success: true,
      imageUrl: outputImages[0],
      allImages: outputImages,
      thumbnailUrl: outputImages[0],
      originalImageUrl: inputImage,
      creditsUsed: 1
    };
  }

  // --- FURNITURE FINDER RESPONSES ---
  // Format: { resultArray: { category: [...] } } (documented)
  // Format: { success: true, result: { category: [...] } } (actual)
  // Format: { result: { category: [...] } }
  const furnitureData = data.resultArray || data.result;
  if (furnitureData && typeof furnitureData === 'object' && !Array.isArray(furnitureData)) {
    // Check if it looks like furniture data (object with arrays as values)
    const values = Object.values(furnitureData);
    if (values.length > 0 && Array.isArray(values[0])) {
      console.log(`${logPrefix} Got furniture results: ${Object.keys(furnitureData).join(', ')}`);
      return {
        success: true,
        resultArray: furnitureData,
        creditsUsed: 1
      };
    }
  }

  // --- ASYNC QUEUE RESPONSES ---
  // Format: { queue_id: "..." } or { id: "...", status: "IN_QUEUE" }
  const queueId = data.queue_id || data.queueId ||
    (data.id && typeof data.id === 'string' && (!data.status || data.status === 'IN_QUEUE' || data.status === 'PROCESSING' || data.status === 'PENDING') ? data.id : null);
  if (queueId) {
    console.log(`${logPrefix} Got queue_id:`, queueId, '- polling for result...');
    const pollResult = await pollForResult(apiEndpoint, queueId);
    if (pollResult) return pollResult;
    throw new Error('Design generation timed out. Please try again.');
  }

  // --- FALLBACK: try to find ANY URL that looks like an output ---
  const bodyStr = JSON.stringify(data);
  const urlMatches = bodyStr.match(/https:\/\/storage\.googleapis\.com\/[^"]+/g);
  if (urlMatches && urlMatches.length > 0) {
    console.log(`${logPrefix} Found ${urlMatches.length} image URL(s) via fallback`);
    return {
      success: true,
      imageUrl: urlMatches[0],
      allImages: urlMatches,
      thumbnailUrl: urlMatches[0],
      creditsUsed: 1
    };
  }

  throw new Error('Unexpected API response format: ' + JSON.stringify(data).substring(0, 200));
};

/**
 * Resolve image URL - makes relative URLs absolute
 */
const resolveImageUrl = (imageUrl) => {
  if (imageUrl.startsWith('/')) {
    return `${process.env.APP_URL || 'https://craftycrib.com'}${imageUrl}`;
  }
  return imageUrl;
};

/**
 * Download image, auto-padding to at least 512×512 for Cloudinary-hosted images.
 * Uses a conditional Cloudinary transform so large images are never downscaled.
 * Non-Cloudinary URLs are downloaded as-is (real photos are always big enough).
 */
const ensureMinImageSize = async (imageUrl, minSize = 512) => {
  const resolved = resolveImageUrl(imageUrl);
  if (resolved.includes('res.cloudinary.com') && resolved.includes('/image/upload/')) {
    const cond = `if_w_lt_${minSize}_or_h_lt_${minSize},c_pad,b_white,w_${minSize},h_${minSize},if_end`;
    const transformed = resolved.replace('/image/upload/', `/image/upload/${cond}/`);
    try {
      return await downloadImage(transformed);
    } catch (e) {
      console.warn('[ensureMinImageSize] Cloudinary transform failed, using original:', e.message);
    }
  }
  return await downloadImage(resolved);
};

const getBufferDimensions = (buf) => {
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), format: 'png' };
  }
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i + 4 < buf.length) {
      if (buf[i] !== 0xFF) break;
      const marker = buf[i + 1];
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), format: 'jpeg' };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
};

/**
 * Get mapped style and room type for API
 * @param {string} style - Our internal style id
 * @param {string} roomType - Our internal room type id
 * @param {string} designType - 'Interior', 'Exterior', or 'Garden'
 */
const getApiParams = (style, roomType, designType = 'Interior') => {
  let styleMap = STYLE_MAP;
  if (designType === 'Exterior') styleMap = EXTERIOR_STYLE_MAP;
  else if (designType === 'Garden') styleMap = GARDEN_STYLE_MAP;

  return {
    apiStyle: styleMap[style] || STYLE_MAP[style] || 'Modern',
    apiRoomType: ROOM_TYPE_MAP[roomType] || 'Living Room'
  };
};

const textureCrcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

const textureCrc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = textureCrcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const texturePngChunk = (type, data) => {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(textureCrc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
};

const parseHexColor = (value) => {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return null;
  return [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16)
  ];
};

const clampColor = (value) => Math.max(0, Math.min(255, Math.round(value)));

const normalizeMaterialTexture = (value = '') => {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('marble')) return 'marble';
  if (normalized.includes('concrete')) return 'concrete';
  if (normalized.includes('fabric') || normalized.includes('linen') || normalized.includes('velvet')) return 'fabric';
  if (normalized.includes('metal') || normalized.includes('steel') || normalized.includes('chrome')) return 'metal';
  if (normalized.includes('leather')) return 'leather';
  if (normalized.includes('tile')) return 'tiles';
  if (normalized.includes('stone')) return 'stone';
  if (normalized.includes('glass')) return 'glass';
  return normalized || 'wood';
};

const createTexturePng = ({ material = 'wood', color, noOfTexture = '3 X 3' } = {}) => {
  const size = 768;
  const materialKey = normalizeMaterialTexture(material);
  const baseColor = parseHexColor(color) || MATERIAL_TEXTURE_COLORS[materialKey] || MATERIAL_TEXTURE_COLORS.wood;
  const gridSize = Math.max(1, Math.min(5, parseInt(String(noOfTexture).split(' ')[0], 10) || 3));
  const tileSize = size / gridSize;
  const raw = Buffer.alloc((1 + size * 4) * size);

  for (let y = 0; y < size; y++) {
    const rowOffset = y * (1 + size * 4);
    raw[rowOffset] = 0;
    for (let x = 0; x < size; x++) {
      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);
      const wave = Math.sin((x + tileX * 37) / 18) + Math.cos((y + tileY * 29) / 23);
      const grain = ((x * 13 + y * 7 + tileX * 31 + tileY * 17) % 19) - 9;
      const variation = wave * 9 + grain + (tileX + tileY) * 3;
      const offset = rowOffset + 1 + x * 4;
      raw[offset] = clampColor(baseColor[0] + variation);
      raw[offset + 1] = clampColor(baseColor[1] + variation);
      raw[offset + 2] = clampColor(baseColor[2] + variation);
      raw[offset + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    texturePngChunk('IHDR', header),
    texturePngChunk('IDAT', zlib.deflateSync(raw)),
    texturePngChunk('IEND', Buffer.alloc(0))
  ]);
};

/**
 * Add design type fields to form data (room_type, house_angle, garden_type)
 */
const addDesignTypeFields = (formData, designType, roomType, houseAngle, gardenType) => {
  formData.append('design_type', designType);
  if (designType === 'Interior') {
    formData.append('room_type', roomType);
  } else if (designType === 'Exterior') {
    formData.append('house_angle', houseAngle || 'Front of House');
  } else if (designType === 'Garden') {
    formData.append('garden_type', gardenType || 'Backyard');
  }
};

// ============================================================
// API ENDPOINT FUNCTIONS
// ============================================================

/**
 * Beautiful Redesign - The default redesign tool
 * Good for general room redesign with style changes
 */
const beautifulRedesign = async (options) => {
  const {
    imageUrl, roomType, style, prompt, designType = 'Interior',
    houseAngle, gardenType, aiIntervention = 'Mid',
    noDesign = 1, keepStructural = true
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[BeautifulRedesign] Starting:', { imageUrl: imageUrl.substring(0, 80), roomType, style });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const { apiStyle, apiRoomType } = getApiParams(style, roomType, designType);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('ai_intervention', prompt ? 'Extreme' : aiIntervention);
    formData.append('keep_structural_element', keepStructural ? 'true' : 'false');
    formData.append('no_design', String(noDesign));
    formData.append('design_style', apiStyle);
    addDesignTypeFields(formData, designType, apiRoomType, houseAngle, gardenType);
    if (prompt) formData.append('prompt', prompt.trim());

    const result = await submitToApi(`${API_URL}/beautiful_redesign`, formData);
    return await parseApiResponse(result, 'beautiful_redesign', '[BeautifulRedesign]');
  } catch (error) {
    console.error('[BeautifulRedesign] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Perfect Redesign - Higher quality redesign, max 2 designs
 */
const perfectRedesign = async (options) => {
  const {
    imageUrl, roomType, style, prompt, designType = 'Interior',
    houseAngle, gardenType, aiIntervention = 'Mid',
    noDesign = 1, keepStructural = true
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[PerfectRedesign] Starting:', { roomType, style, designType });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const { apiStyle, apiRoomType } = getApiParams(style, roomType, designType);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('ai_intervention', prompt ? 'Extreme' : aiIntervention);
    formData.append('keep_structural_element', keepStructural ? 'true' : 'false');
    formData.append('no_design', String(Math.min(noDesign, 2)));
    formData.append('design_style', apiStyle);
    addDesignTypeFields(formData, designType, apiRoomType, houseAngle, gardenType);
    if (prompt) formData.append('custom_instruction', prompt.trim());

    const result = await submitToApi(`${API_URL}/perfect_redesign`, formData);
    return await parseApiResponse(result, 'perfect_redesign', '[PerfectRedesign]');
  } catch (error) {
    console.error('[PerfectRedesign] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Creative Redesign - More creative/artistic transformations
 */
const creativeRedesign = async (options) => {
  const {
    imageUrl, roomType, style, prompt, designType = 'Interior',
    houseAngle, gardenType, aiIntervention = 'Mid',
    noDesign = 1, keepStructural = true
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[CreativeRedesign] Starting:', { roomType, style, designType });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const { apiStyle, apiRoomType } = getApiParams(style, roomType, designType);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('ai_intervention', prompt ? 'Extreme' : aiIntervention);
    formData.append('keep_structural_element', keepStructural ? 'true' : 'false');
    formData.append('no_design', String(noDesign));
    formData.append('design_style', apiStyle);
    addDesignTypeFields(formData, designType, apiRoomType, houseAngle, gardenType);
    if (prompt) formData.append('prompt', prompt.trim());

    const result = await submitToApi(`${API_URL}/creative_redesign`, formData);
    return await parseApiResponse(result, 'creative_redesign', '[CreativeRedesign]');
  } catch (error) {
    console.error('[CreativeRedesign] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sketch to Render - Convert architectural sketches to realistic renders
 */
const sketchToRender = async (options) => {
  const {
    imageUrl, roomType, style, prompt, designType = 'Interior',
    houseAngle, gardenType, aiIntervention = 'Mid', noDesign = 1
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[SketchToRender] Starting:', { roomType, style, designType });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const { apiStyle, apiRoomType } = getApiParams(style, roomType, designType);

    // FormData must be rebuilt per attempt since it is consumed by piping
    const buildForm = () => {
      const fd = new FormData();
      fd.append('image', imageBuffer, { filename: 'sketch.jpg', contentType: 'image/jpeg' });
      fd.append('ai_intervention', aiIntervention);
      fd.append('no_design', String(noDesign));
      fd.append('design_style', apiStyle);
      addDesignTypeFields(fd, designType, apiRoomType, houseAngle, gardenType);
      if (prompt) fd.append('prompt', prompt.trim());
      return fd;
    };

    // Retry up to 3 times on Cloudflare 524 gateway timeout
    let result;
    for (let attempt = 1; attempt <= 3; attempt++) {
      result = await submitToApi(`${API_URL}/sketch_to_render`, buildForm());
      if (result.statusCode !== 524) break;
      console.warn(`[SketchToRender] 524 gateway timeout on attempt ${attempt}/3${attempt < 3 ? ', retrying in 5s...' : ''}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 5000));
    }

    if (result.statusCode === 524) {
      return { success: false, error: 'Sketch to Render is taking longer than expected. Please try again in a moment.' };
    }

    return await parseApiResponse(result, 'sketch_to_render', '[SketchToRender]');
  } catch (error) {
    console.error('[SketchToRender] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Precision - Mask-based inpainting for targeted area redesign
 */
const precision = async (options) => {
  const {
    imageUrl, maskBase64, roomType, style, prompt, designType = 'Interior',
    houseAngle, gardenType, noDesign = 1, strength = 5
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[Precision] Starting:', { roomType, style, strength });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const maskBuffer = Buffer.from(maskBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const { apiStyle, apiRoomType } = getApiParams(style, roomType, designType);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('masked_image', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
    formData.append('no_design', String(noDesign));
    formData.append('design_style', apiStyle);
    addDesignTypeFields(formData, designType, apiRoomType, houseAngle, gardenType);
    if (prompt) formData.append('prompt', prompt.trim());
    if (strength) formData.append('strength', String(strength));

    const result = await submitToApi(`${API_URL}/precision`, formData);
    return await parseApiResponse(result, 'precision', '[Precision]');
  } catch (error) {
    console.error('[Precision] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Fill Spaces - Fill empty/masked areas with furniture and decor
 */
const fillSpaces = async (options) => {
  const {
    imageUrl, maskBase64, roomType, style, prompt, designType = 'Interior',
    houseAngle, gardenType, noDesign = 1, strength = 5
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[FillSpaces] Starting:', { roomType, style });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const maskBuffer = Buffer.from(maskBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const { apiStyle, apiRoomType } = getApiParams(style, roomType, designType);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('masked_image', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
    formData.append('no_design', String(noDesign));
    formData.append('design_style', apiStyle);
    addDesignTypeFields(formData, designType, apiRoomType, houseAngle, gardenType);
    if (prompt) formData.append('prompt', prompt.trim());
    if (strength) formData.append('strength', String(strength));

    const result = await submitToApi(`${API_URL}/fill_spaces`, formData);
    return await parseApiResponse(result, 'fill_spaces', '[FillSpaces]');
  } catch (error) {
    console.error('[FillSpaces] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Decor Staging - Add furniture/decor to empty rooms
 */
const decorStaging = async (options) => {
  const {
    imageUrl, roomType, style, prompt, designType = 'Interior',
    houseAngle, gardenType, noDesign = 1
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[DecorStaging] Starting:', { roomType, style });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const { apiStyle, apiRoomType } = getApiParams(style, roomType, designType);

    const formData = new FormData();
    // Decor Staging requires transparent PNG images
    formData.append('image', imageBuffer, { filename: 'room.png', contentType: 'image/png' });
    formData.append('no_design', String(noDesign));
    formData.append('design_style', apiStyle);
    addDesignTypeFields(formData, designType, apiRoomType, houseAngle, gardenType);
    if (prompt) formData.append('prompt', prompt.trim());

    const result = await submitToApi(`${API_URL}/decor_staging`, formData);
    return await parseApiResponse(result, 'decor_staging', '[DecorStaging]');
  } catch (error) {
    console.error('[DecorStaging] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Furniture Removal - Remove furniture from masked areas
 */
const furnitureRemoval = async (options) => {
  const { imageUrl, maskBase64 } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[FurnitureRemoval] Starting');

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const maskBuffer = Buffer.from(maskBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    const imgDims = getBufferDimensions(imageBuffer);
    const maskDims = getBufferDimensions(maskBuffer);
    console.log('[FurnitureRemoval]', {
      imageWidth: imgDims?.width, imageHeight: imgDims?.height,
      maskWidth: maskDims?.width, maskHeight: maskDims?.height
    });
    if (!imgDims || !maskDims || imgDims.width !== maskDims.width || imgDims.height !== maskDims.height) {
      throw new Error(`Dimension mismatch: image ${imgDims?.width}×${imgDims?.height} vs mask ${maskDims?.width}×${maskDims?.height}`);
    }

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('masked_image', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });

    const result = await submitToApi(`${API_URL}/furniture_removal`, formData);
    return await parseApiResponse(result, 'furniture_removal', '[FurnitureRemoval]');
  } catch (error) {
    console.error('[FurnitureRemoval] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Color & Textures - Change colors/materials of specific masked areas
 */
const changeColorTextures = async (options) => {
  const {
    imageUrl, maskBase64, prompt, color, materials, materialsType,
    object, mode = 'Interior', noDesign = 1
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[ColorTextures] Starting:', { prompt, color, materials, object, mode });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const maskBuffer = Buffer.from(maskBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const sentFields = ['image', 'masked_image', 'design_type', 'no_design', ...(prompt ? ['prompt'] : []), ...(color ? ['color'] : []), ...(materials ? ['materials'] : []), ...(materialsType ? ['materials_type'] : []), ...(object ? ['object'] : [])];
    console.log('[ColorTextures] endpoint: change_color_textures | fields:', sentFields.join(', '), '| image bytes:', imageBuffer.length, '| mask bytes:', maskBuffer.length);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('masked_image', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
    formData.append('design_type', mode);
    formData.append('no_design', String(noDesign));

    if (prompt && prompt.trim().length > 0) formData.append('prompt', prompt.trim());
    if (color) formData.append('color', color);
    if (materials) formData.append('materials', materials);
    if (materialsType) formData.append('materials_type', materialsType);
    if (object) formData.append('object', object);

    const result = await submitToApi(`${API_URL}/change_color_textures`, formData);
    return await parseApiResponse(result, 'change_color_textures', '[ColorTextures]');
  } catch (error) {
    console.error('[ColorTextures] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Paint Visualizer - Change wall paint color using mask + color
 * Requires either rgb_color OR color_image
 */
const paintVisualizer = async (options) => {
  const {
    imageUrl, maskBase64, rgbColor, colorImageBase64, noDesign = 1
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[PaintVisualizer] Starting:', { rgbColor, hasColorImage: !!colorImageBase64 });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const maskBuffer = Buffer.from(maskBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('masked_image', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
    formData.append('no_design', String(noDesign));

    if (rgbColor) {
      formData.append('rgb_color', rgbColor);
    } else if (colorImageBase64) {
      const colorBuffer = Buffer.from(colorImageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      formData.append('color_image', colorBuffer, { filename: 'color.png', contentType: 'image/png' });
    }

    const result = await submitToApi(`${API_URL}/paint_visualizer`, formData);
    return await parseApiResponse(result, 'paint_visualizer', '[PaintVisualizer]');
  } catch (error) {
    console.error('[PaintVisualizer] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Furniture Finder - Find purchasable furniture from an image
 */
const furnitureFinder = async (options) => {
  const { imageUrl, countryCode } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[FurnitureFinder] Starting');

    const imageBuffer = await ensureMinImageSize(imageUrl);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    if (countryCode) formData.append('countryCode', countryCode);

    const result = await submitToApi(`${API_URL}/furniture_finder`, formData);
    return await parseApiResponse(result, 'furniture_finder', '[FurnitureFinder]');
  } catch (error) {
    console.error('[FurnitureFinder] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Full HD - Upscale image to high definition
 */
const fullHD = async (options) => {
  const { imageUrl } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[FullHD] Starting');

    const imageBuffer = await ensureMinImageSize(imageUrl);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });

    const result = await submitToApi(`${API_URL}/full_hd`, formData);
    return await parseApiResponse(result, 'full_hd', '[FullHD]');
  } catch (error) {
    console.error('[FullHD] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sky Colors - Replace sky in exterior images
 */
const skyColors = async (options) => {
  const { imageUrl, weather = 'Clear Sky', noDesign = 1 } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[SkyColors] Starting:', { weather });

    const imageBuffer = await ensureMinImageSize(imageUrl);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'exterior.jpg', contentType: 'image/jpeg' });
    formData.append('no_design', String(noDesign));
    formData.append('weather', weather);

    const result = await submitToApi(`${API_URL}/sky_colors`, formData);
    return await parseApiResponse(result, 'sky_colors', '[SkyColors]');
  } catch (error) {
    console.error('[SkyColors] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Magic Redesign - Conversational AI redesign based on text instruction
 * API: image + design_action + custom_instruction → async queue
 */
const magicRedesign = async (options) => {
  const { imageUrl, prompt, designAction = 'Redesign' } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    if (!prompt || !prompt.trim()) throw new Error('Magic Redesign requires a description of what to change.');
    console.log('[MagicRedesign] Starting:', { designAction });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('design_action', designAction);
    formData.append('custom_instruction', prompt.trim());

    const result = await submitToApi(`${API_URL}/magic_redesign`, formData);
    return await parseApiResponse(result, 'magic_redesign', '[MagicRedesign]');
  } catch (error) {
    console.error('[MagicRedesign] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Video Generation - Generate an animated video from a room image
 */
const videoGeneration = async (options) => {
  const {
    imageUrl, videoMotion = 'zoom_in'
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    if (!VIDEO_GENERATION_MOTIONS.includes(videoMotion)) {
      throw new Error('Invalid camera motion for Video Generation.');
    }
    console.log('[VideoGeneration] Starting:', { videoMotion });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('tool_name', videoMotion);

    const result = await submitToApi(`${API_URL}/video_generation`, formData, { skipToolName: true });

    if (result.statusCode !== 200) {
      return await parseApiResponse(result, 'video_generation', '[VideoGeneration]');
    }

    const data = JSON.parse(result.body);
    console.log('[VideoGeneration] Response keys:', Object.keys(data).join(', '));

    const videoUrl = data.video_url || data.videoUrl || data.output_video ||
      (data.result && data.result.video_url) || (data.success && data.success.video_url);
    if (videoUrl) {
      console.log('[VideoGeneration] Got video URL');
      return { success: true, videoUrl, queueId: data.id || data.queue_id, creditsUsed: 1 };
    }

    const queueId = data.queue_id || data.queueId ||
      (data.id && (!data.status || ['IN_QUEUE', 'starting', 'processing', 'PROCESSING', 'PENDING'].includes(data.status)) ? data.id : null);
    if (queueId) {
      const pollResult = await pollForVideoResult(queueId);
      if (pollResult) return pollResult;
      throw new Error('Video generation timed out. Please try again.');
    }

    return await parseApiResponse(result, 'video_generation', '[VideoGeneration]');
  } catch (error) {
    console.error('[VideoGeneration] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Virtual Staging - Virtually stage empty rooms with furniture
 * API: interior-only, requires ai_intervention, uses custom_instruction (not prompt)
 * Returns async queue → poll status_check
 */
const virtualStaging = async (options) => {
  const {
    imageUrl, roomType, style, prompt, aiIntervention = 'Mid', noDesign = 1
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[VirtualStaging] Starting:', { roomType, style });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const { apiStyle, apiRoomType } = getApiParams(style, roomType, 'Interior');

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('no_design', String(noDesign));
    formData.append('design_style', apiStyle);
    formData.append('ai_intervention', aiIntervention);
    addDesignTypeFields(formData, 'Interior', apiRoomType);
    if (prompt) formData.append('custom_instruction', prompt.trim());

    const result = await submitToApi(`${API_URL}/virtual_staging`, formData);
    return await parseApiResponse(result, 'virtual_staging', '[VirtualStaging]');
  } catch (error) {
    console.error('[VirtualStaging] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Text to Design - Generate a room design from a text description
 */
const textToDesign = async (options) => {
  const { prompt, mode = 'faster' } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    if (!prompt || !prompt.trim()) throw new Error('Text to Design requires instructions.');
    console.log('[TextToDesign] Starting');
    const formData = new FormData();
    formData.append('custom_instruction', prompt.trim());
    formData.append('mode', mode);

    const result = await submitToApi(`${API_URL}/text_to_design`, formData);
    return await parseApiResponse(result, 'text_to_design', '[TextToDesign]');
  } catch (error) {
    console.error('[TextToDesign] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Furniture Creator - Create custom furniture from a description
 */
const furnitureCreator = async (options) => {
  const { prompt, mode = 'faster' } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    if (!prompt || !prompt.trim()) throw new Error('Furniture Creator requires instructions.');
    console.log('[FurnitureCreator] Starting');

    const formData = new FormData();
    formData.append('custom_instruction', prompt.trim());
    formData.append('mode', mode);

    const result = await submitToApi(`${API_URL}/furniture_creator`, formData);
    return await parseApiResponse(result, 'furniture_creator', '[FurnitureCreator]');
  } catch (error) {
    console.error('[FurnitureCreator] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Design Advisor - Get AI-powered design advice for a room
 * API returns { success: true, data: "..." }
 */
const designAdvisor = async (options) => {
  const { prompt } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    if (!prompt || !prompt.trim()) throw new Error('Design Advisor requires a message.');
    console.log('[DesignAdvisor] Starting');

    const formData = new FormData();
    formData.append('custom_message', prompt.trim());

    const result = await submitToApi(`${API_URL}/design_advisor`, formData);

    if (result.statusCode !== 200) {
      return await parseApiResponse(result, 'design_advisor', '[DesignAdvisor]');
    }

    const data = JSON.parse(result.body);
    console.log('[DesignAdvisor] Response keys:', Object.keys(data).join(', '));

    // API documented format: { success: true, data: "..." }
    if (data.success === true && typeof data.data === 'string' && data.data.length > 0) {
      return { success: true, textResult: data.data, creditsUsed: 1 };
    }

    const textResult = data.data || data.advice || data.result || data.text || data.response || data.analysis || data.message;
    if (typeof textResult === 'string' && textResult.length > 0) {
      return { success: true, textResult, creditsUsed: 1 };
    }
    if (data.success && typeof data.success === 'object') {
      const inner = data.success.advice || data.success.result || data.success.text || data.success.data;
      if (inner) return { success: true, textResult: inner, creditsUsed: 1 };
    }

    return await parseApiResponse(result, 'design_advisor', '[DesignAdvisor]');
  } catch (error) {
    console.error('[DesignAdvisor] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Design Transfer - Transfer a design style from one image to your room
 */
const designTransfer = async (options) => {
  const {
    imageUrl, styleImageUrl, aiIntervention = 'Mid'
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    if (!styleImageUrl) throw new Error('Design Transfer requires a reference style image.');
    console.log('[DesignTransfer] Starting');

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const styleImageBuffer = await ensureMinImageSize(styleImageUrl);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('style_image', styleImageBuffer, { filename: 'style.jpg', contentType: 'image/jpeg' });
    formData.append('ai_intervention', aiIntervention);

    const result = await submitToApi(`${API_URL}/design_transfer`, formData);
    return await parseApiResponse(result, 'design_transfer', '[DesignTransfer]');
  } catch (error) {
    console.error('[DesignTransfer] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Floor Editor - replace the visible floor texture with a supplied texture image
 */
const floorEditor = async (options) => {
  const {
    imageUrl, textureImageUrl, noOfTexture = '3 X 3'
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    if (!textureImageUrl) throw new Error('Floor Editor requires a texture image.');
    if (!FLOOR_TEXTURE_GRID_OPTIONS.includes(noOfTexture)) throw new Error('Invalid texture grid for Floor Editor.');
    console.log('[FloorEditor] Starting:', { noOfTexture });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const textureBuffer = await ensureMinImageSize(textureImageUrl);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('texture_image', textureBuffer, { filename: 'texture.png', contentType: 'image/png' });
    formData.append('no_of_texture', noOfTexture);

    const result = await submitToApi(`${API_URL}/floor_editor`, formData);
    return await parseApiResponse(result, 'floor_editor', '[FloorEditor]');
  } catch (error) {
    console.error('[FloorEditor] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Material Swap - Swap materials in masked areas
 */
const materialSwap = async (options) => {
  const {
    imageUrl, maskBase64, prompt, materials, materialsType, color,
    materialInstruction, textureImageUrl, noDesign = 2, noOfTexture = '3 X 3'
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    if (!maskBase64) throw new Error('Material Swap requires a selected object or mask.');
    if (!TEXTURE_GRID_OPTIONS.includes(noOfTexture)) throw new Error('Invalid texture grid for Material Swap.');
    const designCount = Math.max(2, Math.min(5, parseInt(noDesign, 10) || 2));
    const materialChoice = materialInstruction || materialsType || materials || 'wood';
    console.log('[MaterialSwap] Starting:', { materialChoice, noOfTexture, designCount });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const maskBuffer = Buffer.from(maskBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const textureBuffer = textureImageUrl
      ? await ensureMinImageSize(textureImageUrl)
      : createTexturePng({
          material: materialChoice,
          color,
          noOfTexture
        });

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('masked_image', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
    formData.append('no_design', String(designCount));
    formData.append('texture_image', textureBuffer, { filename: 'texture.png', contentType: 'image/png' });
    formData.append('no_of_texture', noOfTexture);

    const result = await submitToApi(`${API_URL}/material_swap`, formData);
    return await parseApiResponse(result, 'material_swap', '[MaterialSwap]');
  } catch (error) {
    console.error('[MaterialSwap] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Room Composer - Intelligently compose and arrange room elements
 */
const roomComposer = async (options) => {
  const {
    imageUrl, maskBase64, roomType, style, aiIntervention = 'Mid'
  } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    if (!maskBase64) throw new Error('Room Composer requires a selected area or mask.');
    console.log('[RoomComposer] Starting:', { roomType, style });

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const maskBuffer = Buffer.from(maskBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const { apiStyle, apiRoomType } = getApiParams(style, roomType, 'Interior');

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('masked_image', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
    formData.append('room_type', apiRoomType);
    formData.append('design_style', apiStyle);
    formData.append('ai_intervention', aiIntervention);

    const result = await submitToApi(`${API_URL}/room_composer`, formData);
    return await parseApiResponse(result, 'room_composer', '[RoomComposer]');
  } catch (error) {
    console.error('[RoomComposer] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Smart Room Composer - Arrange user-supplied furniture into an empty room
 * API: room_image + furniture_images[] (1-4) + additional_instructions → async queue
 * Response: { success: { original_image, generated_image: [] } }
 */
const smartRoomComposer = async (options) => {
  const { imageUrl, customElements, prompt } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[SmartRoomComposer] Starting');

    const roomImageBuffer = await ensureMinImageSize(imageUrl);
    const formData = new FormData();
    formData.append('room_image', roomImageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });

    const furnitureUrls = Array.isArray(customElements) ? customElements.filter(Boolean) : [];
    if (furnitureUrls.length === 0) {
      return { success: false, error: 'Room Composer requires at least 1 furniture image. Please upload furniture images in the panel.' };
    }
    for (const url of furnitureUrls.slice(0, 4)) {
      const buf = await ensureMinImageSize(url);
      formData.append('furniture_images[]', buf, { filename: 'furniture.jpg', contentType: 'image/jpeg' });
    }

    if (prompt) formData.append('additional_instructions', prompt.trim());

    const result = await submitToApi(`${API_URL}/smart_room_composer`, formData);
    return await parseApiResponse(result, 'smart_room_composer', '[SmartRoomComposer]');
  } catch (error) {
    console.error('[SmartRoomComposer] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Design Critique - Get a detailed AI critique of your room design
 * API field: imageType (not image_type); returns { success: true, data: "..." }
 */
const designCritique = async (options) => {
  const { imageUrl, designType = 'Interior' } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[DesignCritique] Starting');

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('imageType', designType);

    const result = await submitToApi(`${API_URL}/design_critique`, formData);

    if (result.statusCode !== 200) {
      return await parseApiResponse(result, 'design_critique', '[DesignCritique]');
    }

    const data = JSON.parse(result.body);
    console.log('[DesignCritique] Response keys:', Object.keys(data).join(', '));

    // API documented format: { success: true, data: "..." }
    if (data.success === true && typeof data.data === 'string' && data.data.length > 0) {
      return { success: true, textResult: data.data, creditsUsed: 1 };
    }

    const textResult = data.data || data.critique || data.result || data.text || data.response || data.analysis || data.advice;
    if (typeof textResult === 'string' && textResult.length > 0) {
      return { success: true, textResult, creditsUsed: 1 };
    }
    if (data.success && typeof data.success === 'object') {
      const inner = data.success.critique || data.success.result || data.success.text || data.success.data;
      if (inner) return { success: true, textResult: inner, creditsUsed: 1 };
    }

    return await parseApiResponse(result, 'design_critique', '[DesignCritique]');
  } catch (error) {
    console.error('[DesignCritique] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Create Mask Image - Automatically generate a segmentation mask from an image
 */
const DEFAULT_MASK_LABELS = 'wall|floor|ceiling|sofa|chair|table|lamp|window|door|bed|cabinet|countertop|rug|plant|curtain|pillow';

const createMaskImage = async (options) => {
  const { imageUrl, labels = DEFAULT_MASK_LABELS } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[CreateMaskImage] Starting');

    const imageBuffer = await ensureMinImageSize(imageUrl);
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });
    formData.append('labels', labels);

    const result = await submitToApi(`${API_URL}/create_maskimage`, formData);
    return await parseApiResponse(result, 'create_maskimage', '[CreateMaskImage]');
  } catch (error) {
    console.error('[CreateMaskImage] Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Smart Home - Get smart home upgrade suggestions for a space
 * API returns { success: true, data: "..." } (text result, not images)
 */
const smartHome = async (options) => {
  const { imageUrl } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[SmartHome] Starting');

    const imageBuffer = await ensureMinImageSize(imageUrl);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'room.jpg', contentType: 'image/jpeg' });

    const result = await submitToApi(`${API_URL}/smart_home`, formData);

    if (result.statusCode !== 200) {
      return await parseApiResponse(result, 'smart_home', '[SmartHome]');
    }

    const data = JSON.parse(result.body);
    console.log('[SmartHome] Response keys:', Object.keys(data).join(', '));

    // API documented format: { success: true, data: "..." }
    if (data.success === true && typeof data.data === 'string' && data.data.length > 0) {
      return { success: true, textResult: data.data, creditsUsed: 1 };
    }

    const textResult = data.data || data.result || data.text || data.advice;
    if (typeof textResult === 'string' && textResult.length > 0) {
      return { success: true, textResult, creditsUsed: 1 };
    }

    return await parseApiResponse(result, 'smart_home', '[SmartHome]');
  } catch (error) {
    console.error('[SmartHome] Error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================================
// BACKWARD COMPATIBLE WRAPPER (used by existing route)
// ============================================================

const generateDesign = async (options) => {
  return beautifulRedesign(options);
};

// ============================================================
// REFERENCE DATA
// ============================================================

const getStyles = () => {
  return DESIGN_STYLES;
};

const getRoomTypes = () => {
  return ROOM_TYPES;
};

/**
 * All AI tools metadata - used by the frontend to render the tools grid
 */
const getAiTools = () => {
  return [
    {
      id: 'redesign',
      slug: 'redesign',
      name: 'Redesign',
      description: 'Choose Perfect, Beautiful, or Creative redesign modes in one workflow',
      icon: 'pencil-ruler',
      category: 'redesign',
      requiresMask: false,
      requiresStyle: true,
      maxDesigns: 4
    },
    {
      id: 'sketch-to-render',
      slug: 'sketch_to_render',
      name: 'Sketch to Render',
      description: 'Convert sketches to realistic renders',
      icon: 'pencil-ruler',
      category: 'redesign',
      requiresMask: false,
      requiresStyle: true,
      maxDesigns: 4
    },
    {
      id: 'precision',
      slug: 'precision',
      name: 'Precision',
      description: 'Redesign specific masked areas',
      icon: 'target',
      category: 'mask',
      requiresMask: true,
      requiresStyle: true,
      maxDesigns: 4
    },
    {
      id: 'fill-spaces',
      slug: 'fill_spaces',
      name: 'Fill Spaces',
      description: 'Fill empty areas with furniture & decor',
      icon: 'layout-grid',
      category: 'mask',
      requiresMask: true,
      requiresStyle: true,
      maxDesigns: 4
    },
    {
      id: 'decor-staging',
      slug: 'decor_staging',
      name: 'Decor Staging',
      description: 'Stage empty rooms (requires transparent PNG)',
      icon: 'lamp',
      category: 'redesign',
      requiresMask: false,
      requiresStyle: true,
      maxDesigns: 4
    },
    {
      id: 'furniture-removal',
      slug: 'furniture_removal',
      name: 'Furniture Removal',
      description: 'Remove furniture from selected areas',
      icon: 'eraser',
      category: 'mask',
      requiresMask: true,
      requiresStyle: false,
      maxDesigns: 1
    },
    {
      id: 'color-textures',
      slug: 'change_color_textures',
      name: 'Color & Textures',
      description: 'Change colors and materials of surfaces',
      icon: 'palette',
      category: 'mask',
      requiresMask: true,
      requiresStyle: false,
      maxDesigns: 4
    },
    {
      id: 'paint-visualizer',
      slug: 'paint_visualizer',
      name: 'Paint Visualizer',
      description: 'Change wall paint color with precision',
      icon: 'paintbrush',
      category: 'mask',
      requiresMask: true,
      requiresStyle: false,
      maxDesigns: 4
    },
    {
      id: 'furniture-finder',
      slug: 'furniture_finder',
      name: 'Furniture Finder',
      description: 'Find matching furniture to buy online',
      icon: 'shopping-bag',
      category: 'utility',
      requiresMask: false,
      requiresStyle: false,
      maxDesigns: 0
    },
    {
      id: 'full-hd',
      slug: 'full_hd',
      name: 'Full HD',
      description: 'Upscale image to high definition',
      icon: 'monitor',
      category: 'utility',
      requiresMask: false,
      requiresStyle: false,
      maxDesigns: 1
    },
    {
      id: 'sky-colors',
      slug: 'sky_colors',
      name: 'Sky Colors',
      description: 'Replace sky in exterior photos',
      icon: 'cloud-sun',
      category: 'utility',
      requiresMask: false,
      requiresStyle: false,
      maxDesigns: 4
    },
    {
      id: 'magic-redesign',
      slug: 'magic_redesign',
      name: 'Magic Redesign',
      description: 'Quick AI-powered room transformation',
      icon: 'zap',
      category: 'redesign',
      requiresMask: false,
      requiresStyle: true,
      maxDesigns: 4
    },
    {
      id: 'video-generation',
      slug: 'video_generation',
      name: 'Video Generation',
      description: 'Generate an animated video from your room',
      icon: 'video',
      category: 'utility',
      requiresMask: false,
      requiresStyle: true,
      maxDesigns: 1
    },
    {
      id: 'virtual-staging',
      slug: 'virtual_staging',
      name: 'Virtual Staging',
      description: 'Stage empty rooms with virtual furniture',
      icon: 'sofa',
      category: 'redesign',
      requiresMask: false,
      requiresStyle: true,
      maxDesigns: 4
    },
    {
      id: 'text-to-design',
      slug: 'text_to_design',
      name: 'Text to Design',
      description: 'Generate a design from a text description',
      icon: 'type',
      category: 'redesign',
      requiresMask: false,
      requiresStyle: true,
      maxDesigns: 4
    },
    {
      id: 'furniture-creator',
      slug: 'furniture_creator',
      name: 'Furniture Creator',
      description: 'Create custom furniture from a description',
      icon: 'armchair',
      category: 'utility',
      requiresMask: false,
      requiresStyle: false,
      maxDesigns: 4
    },
    {
      id: 'design-advisor',
      slug: 'design_advisor',
      name: 'Design Advisor',
      description: 'Get AI-powered design advice for your room',
      icon: 'lightbulb',
      category: 'utility',
      requiresMask: false,
      requiresStyle: false,
      maxDesigns: 0
    },
    {
      id: 'design-transfer',
      slug: 'design_transfer',
      name: 'Design Transfer',
      description: 'Transfer a design style to your room',
      icon: 'arrow-right-left',
      category: 'redesign',
      requiresMask: false,
      requiresStyle: true,
      maxDesigns: 4
    },
    {
      id: 'floor-editor',
      slug: 'floor_editor',
      name: 'Floor Editor',
      description: 'Edit floor material and color',
      icon: 'grid-3x3',
      category: 'utility',
      requiresMask: false,
      requiresStyle: false,
      maxDesigns: 4
    },
    {
      id: 'material-swap',
      slug: 'material_swap',
      name: 'Material Swap',
      description: 'Swap materials in selected areas',
      icon: 'refresh-cw',
      category: 'mask',
      requiresMask: true,
      requiresStyle: false,
      maxDesigns: 4
    },
    {
      id: 'room-composer',
      slug: 'room_composer',
      name: 'Room Composer',
      description: 'Compose and arrange room elements',
      icon: 'layout-dashboard',
      category: 'mask',
      requiresMask: true,
      requiresStyle: true,
      maxDesigns: 4
    },
    {
      id: 'design-critique',
      slug: 'design_critique',
      name: 'Design Critique',
      description: 'Get a detailed AI critique of your design',
      icon: 'message-square',
      category: 'utility',
      requiresMask: false,
      requiresStyle: false,
      maxDesigns: 0
    },
    {
      id: 'create-mask-image',
      slug: 'create_maskimage',
      name: 'Create Mask Image',
      description: 'Auto-generate a segmentation mask',
      icon: 'scissors',
      category: 'utility',
      requiresMask: false,
      requiresStyle: false,
      maxDesigns: 1
    },
    {
      id: 'smart-home',
      slug: 'smart_home',
      name: 'Smart Home',
      description: 'Visualize smart home features in your space',
      icon: 'home',
      category: 'redesign',
      requiresMask: false,
      requiresStyle: true,
      maxDesigns: 4
    }
  ];
};

/**
 * Check API credits balance
 */
const checkCredits = async () => {
  try {
    const result = await apiGet(`${API_URL}/user_info`);

    if (result.statusCode !== 200) {
      return { success: false, error: 'Credits check not available' };
    }

    const data = JSON.parse(result.body);
    return {
      success: true,
      credits: data.Data?.[0]?.Subscription?.Left_Credit,
      plan: data.Data?.[0]?.Subscription?.Plan_Name
    };
  } catch (error) {
    console.error('Credits check error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  // Individual API functions
  beautifulRedesign,
  perfectRedesign,
  creativeRedesign,
  sketchToRender,
  precision,
  fillSpaces,
  decorStaging,
  furnitureRemoval,
  changeColorTextures,
  paintVisualizer,
  furnitureFinder,
  fullHD,
  skyColors,
  // New endpoints
  magicRedesign,
  videoGeneration,
  virtualStaging,
  textToDesign,
  furnitureCreator,
  designAdvisor,
  designTransfer,
  floorEditor,
  materialSwap,
  roomComposer,
  smartRoomComposer,
  designCritique,
  createMaskImage,
  smartHome,
  // Backward compatible
  generateDesign,
  // Reference data
  getStyles,
  getRoomTypes,
  getAiTools,
  checkCredits,
  // Constants
  DESIGN_STYLES,
  ROOM_TYPES,
  WEATHER_OPTIONS,
  HOUSE_ANGLES,
  GARDEN_TYPES
};
