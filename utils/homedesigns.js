/**
 * HomeDesigns.AI API Integration
 * Documentation: https://api.homedesigns.ai/homedesignsai-api-documentation
 *
 * Supported endpoints:
 *  - Perfect Redesign
 *  - Beautiful Redesign
 *  - Creative Redesign
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

const API_URL = process.env.HOMEDESIGNS_API_URL || 'https://homedesigns.ai/api/v2';
const API_TOKEN = process.env.HOMEDESIGNS_API_TOKEN;

// Map our style IDs to the exact names the API expects
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
 */
const submitToApi = (endpoint, formData) => {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const options = {
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
    const req = client.request(options, (res) => {
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
const pollForResult = async (apiEndpoint, queueId, maxAttempts = 30) => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const statusResult = await apiGet(`${API_URL}/${apiEndpoint}/status_check/${queueId}`);
      if (statusResult.statusCode === 200) {
        const statusData = JSON.parse(statusResult.body);
        console.log(`[HomeDesigns] Poll [${i + 1}/${maxAttempts}] status:`, statusData.status || 'unknown');

        if (statusData.status === 'SUCCESS' || statusData.status === 'COMPLETED' || statusData.generated_images || statusData.output_images) {
          const images = statusData.generated_images || statusData.output_images || [];
          const outputUrl = images[0] || statusData.output_url || statusData.result;
          if (outputUrl) {
            console.log('[HomeDesigns] Design generated (async):', outputUrl.substring(0, 80));
            return {
              success: true,
              imageUrl: outputUrl,
              allImages: images,
              thumbnailUrl: outputUrl,
              originalImageUrl: statusData.input_image,
              creditsUsed: 1
            };
          }
        }

        if (statusData.status === 'FAILED' || statusData.status === 'ERROR') {
          return { success: false, error: statusData.message || 'Generation failed on server' };
        }
      }
    } catch (pollErr) {
      console.error('[HomeDesigns] Poll error:', pollErr.message);
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

  // Handle synchronous response: { success: { generated_image: [...] } }
  if (data.success && data.success.generated_image) {
    const images = data.success.generated_image;
    const outputUrl = images[0];
    console.log(`${logPrefix} Generated (sync):`, outputUrl.substring(0, 80));
    return {
      success: true,
      imageUrl: outputUrl,
      allImages: images,
      thumbnailUrl: outputUrl,
      originalImageUrl: data.success.original_image,
      creditsUsed: 1
    };
  }

  // Handle documented response: { output_images: [...] }
  if (data.output_images && data.output_images.length > 0) {
    const outputUrl = data.output_images[0];
    console.log(`${logPrefix} Generated (direct):`, outputUrl.substring(0, 80));
    return {
      success: true,
      imageUrl: outputUrl,
      allImages: data.output_images,
      thumbnailUrl: outputUrl,
      originalImageUrl: data.input_image,
      creditsUsed: 1
    };
  }

  // Handle furniture finder response: { resultArray: { ... } }
  if (data.resultArray) {
    return {
      success: true,
      resultArray: data.resultArray,
      creditsUsed: 1
    };
  }

  // Handle async queue response: { queue_id: "..." } or { id: "...", status: "IN_QUEUE" }
  const queueId = data.queue_id || (data.id && (data.status === 'IN_QUEUE' || data.status === 'PROCESSING') ? data.id : null);
  if (queueId) {
    console.log(`${logPrefix} Got queue_id:`, queueId, '- polling for result...');
    const pollResult = await pollForResult(apiEndpoint, queueId);
    if (pollResult) return pollResult;
    throw new Error('Design generation timed out. Please try again.');
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
 * Get mapped style and room type for API
 */
const getApiParams = (style, roomType) => ({
  apiStyle: STYLE_MAP[style] || (style ? style.charAt(0).toUpperCase() + style.slice(1) : 'Modern'),
  apiRoomType: ROOM_TYPE_MAP[roomType] || roomType || 'Living Room'
});

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

    const imageBuffer = await downloadImage(resolveImageUrl(imageUrl));
    const { apiStyle, apiRoomType } = getApiParams(style, roomType);

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

    const imageBuffer = await downloadImage(resolveImageUrl(imageUrl));
    const { apiStyle, apiRoomType } = getApiParams(style, roomType);

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

    const imageBuffer = await downloadImage(resolveImageUrl(imageUrl));
    const { apiStyle, apiRoomType } = getApiParams(style, roomType);

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

    const imageBuffer = await downloadImage(resolveImageUrl(imageUrl));
    const { apiStyle, apiRoomType } = getApiParams(style, roomType);

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'sketch.jpg', contentType: 'image/jpeg' });
    formData.append('ai_intervention', aiIntervention);
    formData.append('no_design', String(noDesign));
    formData.append('design_style', apiStyle);
    addDesignTypeFields(formData, designType, apiRoomType, houseAngle, gardenType);
    if (prompt) formData.append('prompt', prompt.trim());

    const result = await submitToApi(`${API_URL}/sketch_to_render`, formData);
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

    const imageBuffer = await downloadImage(resolveImageUrl(imageUrl));
    const maskBuffer = Buffer.from(maskBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const { apiStyle, apiRoomType } = getApiParams(style, roomType);

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

    const imageBuffer = await downloadImage(resolveImageUrl(imageUrl));
    const maskBuffer = Buffer.from(maskBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const { apiStyle, apiRoomType } = getApiParams(style, roomType);

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

    const imageBuffer = await downloadImage(resolveImageUrl(imageUrl));
    const { apiStyle, apiRoomType } = getApiParams(style, roomType);

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

    const imageBuffer = await downloadImage(resolveImageUrl(imageUrl));
    const maskBuffer = Buffer.from(maskBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

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

    const imageBuffer = await downloadImage(resolveImageUrl(imageUrl));
    const maskBuffer = Buffer.from(maskBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

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
 * Furniture Finder - Find purchasable furniture from an image
 */
const furnitureFinder = async (options) => {
  const { imageUrl, countryCode } = options;

  try {
    if (!API_TOKEN) throw new Error('HomeDesigns API token is not configured.');
    console.log('[FurnitureFinder] Starting');

    const imageBuffer = await downloadImage(resolveImageUrl(imageUrl));

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

    const imageBuffer = await downloadImage(resolveImageUrl(imageUrl));

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

    const imageBuffer = await downloadImage(resolveImageUrl(imageUrl));

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
  return [
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
};

const getRoomTypes = () => {
  return [
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
};

/**
 * All AI tools metadata - used by the frontend to render the tools grid
 */
const getAiTools = () => {
  return [
    {
      id: 'beautiful-redesign',
      name: 'Beautiful Redesign',
      description: 'Redesign your room with a new style',
      icon: 'sparkles',
      category: 'redesign',
      requiresMask: false,
      requiresStyle: true,
      maxDesigns: 4
    },
    {
      id: 'perfect-redesign',
      name: 'Perfect Redesign',
      description: 'High-quality precision redesign',
      icon: 'gem',
      category: 'redesign',
      requiresMask: false,
      requiresStyle: true,
      maxDesigns: 2
    },
    {
      id: 'creative-redesign',
      name: 'Creative Design',
      description: 'Bold, artistic transformations',
      icon: 'wand-2',
      category: 'redesign',
      requiresMask: false,
      requiresStyle: true,
      maxDesigns: 4
    },
    {
      id: 'sketch-to-render',
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
      name: 'Color & Textures',
      description: 'Change colors and materials of surfaces',
      icon: 'palette',
      category: 'mask',
      requiresMask: true,
      requiresStyle: false,
      maxDesigns: 4
    },
    {
      id: 'furniture-finder',
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
      name: 'Sky Colors',
      description: 'Replace sky in exterior photos',
      icon: 'cloud-sun',
      category: 'utility',
      requiresMask: false,
      requiresStyle: false,
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
  furnitureFinder,
  fullHD,
  skyColors,
  // Backward compatible
  generateDesign,
  // Reference data
  getStyles,
  getRoomTypes,
  getAiTools,
  checkCredits,
  // Constants
  WEATHER_OPTIONS,
  HOUSE_ANGLES,
  GARDEN_TYPES
};
