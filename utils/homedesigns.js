/**
 * HomeDesigns.AI API Integration
 * Documentation: https://api.homedesigns.ai/homedesignsai-api-documentation
 */

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
 * Generate a design using HomeDesigns.AI API
 * Posts image + parameters, returns generated design URL immediately
 */
const generateDesign = async (options) => {
  const {
    imageUrl,
    roomType,
    style,
    mode = 'Interior', // Interior, Exterior, Garden
    quality = 'standard' // standard, hd, ultra
  } = options;

  try {
    // Step 1: Download the source image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }
    const imageBlob = await imageResponse.blob();

    // Step 2: Create form data with built-in FormData
    const apiRoomType = ROOM_TYPE_MAP[roomType] || roomType;
    const apiStyle = STYLE_MAP[style] || style.charAt(0).toUpperCase() + style.slice(1);
    const formData = new FormData();
    formData.append('image', imageBlob, 'room.jpg');
    formData.append('design_type', mode);
    formData.append('ai_intervention', 'Mid');
    formData.append('no_design', '1');
    formData.append('design_style', apiStyle);
    if (mode === 'Interior') {
      formData.append('room_type', apiRoomType);
    }

    // Step 3: Submit generation request
    const response = await fetch(`${API_URL}/beautiful_redesign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Parse validation errors for user-friendly messages
      if (response.status === 422) {
        try {
          const errors = JSON.parse(errorText).error;
          const messages = Object.values(errors).flat();
          if (messages.some(m => m.includes('minimum dimentions'))) {
            throw new Error('Image is too small. Please upload an image at least 512x512 pixels.');
          }
          throw new Error(messages[0]);
        } catch (e) {
          if (e.message.includes('Image is too small') || e.message.includes('should be in')) throw e;
        }
      }
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // API returns { success: { original_image: "...", generated_image: ["..."] } }
    if (data.success && data.success.generated_image) {
      const outputUrl = data.success.generated_image[0];
      return {
        success: true,
        imageUrl: outputUrl,
        thumbnailUrl: outputUrl,
        originalImageUrl: data.success.original_image,
        creditsUsed: 1
      };
    }

    throw new Error('Unexpected API response format');
  } catch (error) {
    console.error('HomeDesigns API Error:', error);
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
    const response = await fetch(`${API_URL}/user_info`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });

    if (!response.ok) {
      return { success: false, error: 'Credits check not available' };
    }

    const data = await response.json();
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
