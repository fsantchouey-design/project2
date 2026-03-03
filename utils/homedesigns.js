/**
 * HomeDesigns.AI API Integration
 * Documentation: https://api.homedesigns.ai/homedesignsai-api-documentation
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
 */
const pollForResult = async (queueId, maxAttempts = 30) => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const statusResult = await apiGet(`${API_URL}/beautiful_redesign/status_check/${queueId}`);
      if (statusResult.statusCode === 200) {
        const statusData = JSON.parse(statusResult.body);
        console.log(`[HomeDesigns] Poll [${i + 1}/${maxAttempts}] status:`, statusData.status || 'unknown');

        if (statusData.status === 'SUCCESS' || statusData.generated_images || statusData.output_images) {
          const outputUrl = statusData.generated_images?.[0] || statusData.output_images?.[0] || statusData.output_url;
          if (outputUrl) {
            console.log('[HomeDesigns] Design generated (async):', outputUrl.substring(0, 80));
            return {
              success: true,
              imageUrl: outputUrl,
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
 * Generate a design using HomeDesigns.AI API
 * Posts image + parameters, returns generated design URL
 */
const generateDesign = async (options) => {
  const {
    imageUrl,
    roomType,
    style,
    prompt,
    mode = 'Interior',
    quality = 'standard'
  } = options;

  try {
    if (!API_TOKEN) {
      throw new Error('HomeDesigns API token is not configured. Set HOMEDESIGNS_API_TOKEN in .env');
    }

    console.log('[HomeDesigns] Starting generation:', { imageUrl: imageUrl.substring(0, 80), roomType, style, mode });

    const imageBuffer = await downloadImage(imageUrl);
    console.log('[HomeDesigns] Image downloaded:', imageBuffer.length, 'bytes');

    const apiRoomType = ROOM_TYPE_MAP[roomType] || roomType;
    const apiStyle = STYLE_MAP[style] || style.charAt(0).toUpperCase() + style.slice(1);

    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'room.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('design_type', mode);
    formData.append('ai_intervention', prompt ? 'High' : 'Mid');
    formData.append('no_design', '1');
    formData.append('design_style', apiStyle);
    if (mode === 'Interior') {
      formData.append('room_type', apiRoomType);
    }
    if (prompt) {
      formData.append('prompt', prompt);
    }

    console.log('[HomeDesigns] Sending request to API...', { apiStyle, apiRoomType, prompt: prompt ? prompt.substring(0, 100) : 'none' });

    const result = await submitToApi(`${API_URL}/beautiful_redesign`, formData);

    console.log('[HomeDesigns] API response status:', result.statusCode);
    console.log('[HomeDesigns] API response body:', result.body.substring(0, 300));

    if (result.statusCode !== 200) {
      if (result.statusCode === 422) {
        try {
          const errors = JSON.parse(result.body).error;
          const messages = Object.values(errors).flat();
          if (messages.some(m => m.includes('minimum dimentions'))) {
            throw new Error('Image is too small. Please upload an image at least 512x512 pixels.');
          }
          throw new Error(messages[0]);
        } catch (e) {
          if (e.message.includes('Image is too small') || e.message.includes('should be in')) throw e;
        }
      }
      throw new Error(`API request failed: ${result.statusCode} - ${result.body.substring(0, 200)}`);
    }

    const data = JSON.parse(result.body);

    // Handle synchronous response: { success: { generated_image: [...] } }
    if (data.success && data.success.generated_image) {
      const outputUrl = data.success.generated_image[0];
      console.log('[HomeDesigns] Design generated (sync):', outputUrl.substring(0, 80));
      return {
        success: true,
        imageUrl: outputUrl,
        thumbnailUrl: outputUrl,
        originalImageUrl: data.success.original_image,
        creditsUsed: 1
      };
    }

    // Handle documented response: { output_images: [...] }
    if (data.output_images && data.output_images.length > 0) {
      const outputUrl = data.output_images[0];
      console.log('[HomeDesigns] Design generated (direct):', outputUrl.substring(0, 80));
      return {
        success: true,
        imageUrl: outputUrl,
        thumbnailUrl: outputUrl,
        originalImageUrl: data.input_image,
        creditsUsed: 1
      };
    }

    // Handle async queue response: { queue_id: "..." }
    if (data.queue_id) {
      console.log('[HomeDesigns] Got queue_id:', data.queue_id, '- polling for result...');
      const pollResult = await pollForResult(data.queue_id);
      if (pollResult) return pollResult;
      throw new Error('Design generation timed out. Please try again.');
    }

    throw new Error('Unexpected API response format: ' + JSON.stringify(data).substring(0, 200));
  } catch (error) {
    console.error('[HomeDesigns] API Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get available design styles
 */
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

/**
 * Get room types
 */
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
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  generateDesign,
  getStyles,
  getRoomTypes,
  checkCredits
};
