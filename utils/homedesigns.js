/**
 * HomeDesigns.AI API Integration
 * Documentation: https://api.homedesigns.ai/homedesignsai-api-documentation
 */

const API_URL = process.env.HOMEDESIGNS_API_URL || 'https://homedesigns.ai/api/v2';
const API_TOKEN = process.env.HOMEDESIGNS_API_TOKEN;

/**
 * Generate a design using HomeDesigns.AI API
 * API uses queue system: 1) POST to start, 2) Poll status endpoint, 3) Get result
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
    // Step 1: Download the image and convert to form data
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    // Step 2: Create form data
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('image', imageBlob, 'room.jpg');
    formData.append('design_type', mode);
    formData.append('ai_intervention', 'Mid');
    formData.append('no_design', '1');
    formData.append('design_style', style);
    if (mode === 'Interior') {
      formData.append('room_type', roomType);
    }

    // Step 3: Submit generation request
    const response = await fetch(`${API_URL}/beautiful_redesign`, {
      method: 'POST',
      headers: {
        'x-api-key': API_TOKEN,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const queueId = data.queue_id;

    if (!queueId) {
      throw new Error('No queue_id returned from API');
    }

    // Step 4: Poll status endpoint
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const statusResponse = await fetch(`${API_URL}/beautiful_redesign/status_check/${queueId}`, {
        headers: {
          'x-api-key': API_TOKEN
        }
      });

      if (!statusResponse.ok) {
        throw new Error('Status check failed');
      }

      const statusData = await statusResponse.json();
      
      if (statusData.status === 'SUCCESS') {
        // Get the first generated image
        const outputUrl = statusData.output_url || (statusData.generated_images && statusData.generated_images[0]);
        return {
          success: true,
          imageUrl: outputUrl,
          thumbnailUrl: outputUrl,
          generationId: queueId,
          creditsUsed: 1
        };
      } else if (statusData.status === 'FAILED' || statusData.status === 'ERROR') {
        throw new Error(statusData.message || 'Generation failed');
      }
      
      attempts++;
    }

    throw new Error('Generation timeout - exceeded 2 minutes');
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
    const response = await fetch(`${API_URL}/v1/credits`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to check credits');
    }

    const data = await response.json();
    return {
      success: true,
      credits: data.credits_remaining,
      plan: data.plan
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

