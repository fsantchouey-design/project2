const express = require('express');
const router = express.Router();
const fs = require('fs');
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const { ensureAuthenticated } = require('../middleware/auth');
const Project = require('../models/Project');
const Contractor = require('../models/Contractor');
const {
  generateDesign, beautifulRedesign, perfectRedesign, creativeRedesign,
  sketchToRender, precision, fillSpaces, decorStaging, furnitureRemoval,
  changeColorTextures, paintVisualizer, furnitureFinder, fullHD, skyColors,
  magicRedesign, videoGeneration, virtualStaging, textToDesign, furnitureCreator,
  designAdvisor, designTransfer, floorEditor, materialSwap, roomComposer,
  designCritique, createMaskImage, smartHome,
  getStyles, getRoomTypes, checkCredits
} = require('../utils/homedesigns');
const { uploadProjectImages, getImageUrl } = require('../config/cloudinary');
const aiToolsConfig = require('../config/toolsConfig');

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

// API Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get Design Styles
router.get('/styles', (req, res) => {
  res.json(getStyles());
});

// Get Room Types
router.get('/room-types', (req, res) => {
  res.json(getRoomTypes());
});

// Check AI Credits
router.get('/credits', ensureAuthenticated, async (req, res) => {
  const credits = await checkCredits();
  res.json(credits);
});

const aiToolHandlers = {
  perfect_redesign: {
    name: 'Perfect Redesign',
    run: (options) => perfectRedesign(options)
  },
  beautiful_redesign: {
    name: 'Beautiful Redesign',
    run: (options) => beautifulRedesign(options)
  },
  magic_redesign: {
    name: 'Magic Redesign',
    run: (options) => magicRedesign(options)
  },
  video_generation: {
    name: 'Video Generation',
    run: (options) => videoGeneration(options)
  },
  creative_redesign: {
    name: 'Creative Redesign',
    run: (options) => creativeRedesign(options)
  },
  sketch_to_render: {
    name: 'Sketch To Render',
    run: (options) => sketchToRender(options)
  },
  virtual_staging: {
    name: 'Virtual Staging',
    run: (options) => virtualStaging(options)
  },
  precision: {
    name: 'Precision',
    requiresMask: true,
    run: (options) => precision(options)
  },
  fill_spaces: {
    name: 'Fill Spaces',
    requiresMask: true,
    run: (options) => fillSpaces(options)
  },
  decor_staging: {
    name: 'Decor Staging',
    run: (options) => decorStaging(options)
  },
  furniture_removal: {
    name: 'Furniture Removal',
    requiresMask: true,
    run: ({ imageUrl, maskBase64 }) => furnitureRemoval({ imageUrl, maskBase64 })
  },
  change_color_textures: {
    name: 'Change Color Textures',
    requiresMask: true,
    run: (options) => changeColorTextures({
      imageUrl: options.imageUrl,
      maskBase64: options.maskBase64,
      prompt: options.prompt,
      color: options.color,
      materials: options.materials,
      materialsType: options.materialsType,
      object: options.object,
      mode: options.designType,
      noDesign: options.noDesign
    })
  },
  furniture_finder: {
    name: 'Furniture Finder',
    run: ({ imageUrl, countryCode }) => furnitureFinder({ imageUrl, countryCode })
  },
  full_hd: {
    name: 'Full HD',
    run: ({ imageUrl }) => fullHD({ imageUrl })
  },
  text_to_design: {
    name: 'Text To Design',
    run: (options) => textToDesign(options)
  },
  furniture_creator: {
    name: 'Furniture Creator',
    run: (options) => furnitureCreator(options)
  },
  design_advisor: {
    name: 'Design Advisor',
    run: (options) => designAdvisor(options)
  },
  sky_colors: {
    name: 'Sky Colors',
    run: ({ imageUrl, weather, noDesign }) => skyColors({ imageUrl, weather: weather || 'Clear Sky', noDesign })
  },
  design_transfer: {
    name: 'Design Transfer',
    run: (options) => designTransfer(options)
  },
  floor_editor: {
    name: 'Floor Editor',
    run: (options) => floorEditor(options)
  },
  paint_visualizer: {
    name: 'Paint Visualizer',
    requiresMask: true,
    run: (options) => paintVisualizer(options)
  },
  material_swap: {
    name: 'Material Swap',
    requiresMask: true,
    run: (options) => materialSwap(options)
  },
  room_composer: {
    name: 'Room Composer',
    requiresMask: true,
    run: (options) => roomComposer(options)
  },
  design_critique: {
    name: 'Design Critique',
    run: (options) => designCritique(options)
  },
  create_maskimage: {
    name: 'Create Mask Image',
    run: ({ imageUrl }) => createMaskImage({ imageUrl })
  },
  smart_home: {
    name: 'Smart Home',
    run: (options) => smartHome(options)
  }
};

const toAbsoluteImageUrl = (imageUrl) => {
  if (!imageUrl || !imageUrl.startsWith('/')) return imageUrl;
  return `${process.env.APP_URL || 'https://craftycrib.com'}${imageUrl}`;
};

const normalizeToolEndpoint = (endpoint = '') => endpoint.split('?')[0].split('/').filter(Boolean).pop();

const clampNumber = (value, min, max, fallback) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const getHomeDesignsBaseUrl = () => {
  const rawBaseUrl = process.env.HOMEDESIGNS_API_BASE_URL || process.env.HOMEDESIGNS_API_URL || 'https://homedesigns.ai';
  return rawBaseUrl.replace(/\/+$/, '').replace(/\/api\/v2$/, '');
};

const downloadBuffer = (url) => new Promise((resolve, reject) => {
  const client = url.startsWith('https') ? https : http;
  const req = client.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return downloadBuffer(res.headers.location).then(resolve).catch(reject);
    }
    if (res.statusCode !== 200) {
      return reject(new Error(`Failed to read uploaded image: HTTP ${res.statusCode}`));
    }
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => resolve(Buffer.concat(chunks)));
    res.on('error', reject);
  });
  req.setTimeout(30000, () => req.destroy(new Error('Timed out reading uploaded image')));
  req.on('error', reject);
});

const getUploadBuffer = async (file) => {
  if (file.buffer) return file.buffer;
  if (file.path && /^https?:\/\//.test(file.path)) return downloadBuffer(file.path);
  if (file.path && fs.existsSync(file.path)) return fs.promises.readFile(file.path);
  throw new Error('Unable to read uploaded image for mask generation.');
};

const getImageSize = (buffer) => {
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer.length >= 10 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }

  return { width: 1024, height: 1024 };
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const pngChunk = (type, data) => {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
};

const createWhiteMaskPng = (width, height) => {
  const safeWidth = Math.min(Math.max(width || 1024, 1), 4096);
  const safeHeight = Math.min(Math.max(height || 1024, 1), 4096);
  const row = Buffer.alloc(1 + safeWidth * 4, 255);
  row[0] = 0;
  const raw = Buffer.alloc(row.length * safeHeight);
  for (let y = 0; y < safeHeight; y++) row.copy(raw, y * row.length);

  const header = Buffer.alloc(13);
  header.writeUInt32BE(safeWidth, 0);
  header.writeUInt32BE(safeHeight, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
};

const createDefaultMaskBase64 = async (file) => {
  const buffer = await getUploadBuffer(file);
  const { width, height } = getImageSize(buffer);
  const mask = createWhiteMaskPng(width, height);
  return `data:image/png;base64,${mask.toString('base64')}`;
};

const buildGenerateDesignResponse = (result, toolName, endpoint) => {
  const images = result.allImages || (result.imageUrl ? [result.imageUrl] : []);
  return {
    success: true,
    tool: toolName,
    endpoint,
    imageUrl: result.imageUrl,
    videoUrl: result.videoUrl,
    textResult: result.textResult,
    resultArray: result.resultArray,
    designs: images.map((url, index) => ({
      name: `${toolName}${images.length > 1 ? ` #${index + 1}` : ''}`,
      imageUrl: url
    }))
  };
};

router.post('/generate-design', ensureAuthenticated, uploadProjectImages.fields([
  { name: 'image', maxCount: 1 },
  { name: 'textureImage', maxCount: 1 },
  { name: 'styleImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const uploadedImage = req.file || (req.files?.image && req.files.image[0]);
    const textureImage = req.files?.textureImage && req.files.textureImage[0];
    const styleImage = req.files?.styleImage && req.files.styleImage[0];
    const endpoint = req.body.selectedToolEndpoint || req.body.endpoint;
    const projectId = req.body.projectId;
    const requestedSourceImageUrl = req.body.sourceImageUrl;
    const toolKey = normalizeToolEndpoint(endpoint);
    const tool = aiToolHandlers[toolKey];

    if (!tool) {
      return res.status(400).json({ success: false, error: 'Please select a valid AI tool.' });
    }

    if (!process.env.HOMEDESIGNS_API_KEY && !process.env.HOMEDESIGNS_API_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'HomeDesigns API key is missing. Configure HOMEDESIGNS_API_KEY on the server.'
      });
    }

    let project = null;
    let projectSourceImageUrl = '';

    if (projectId) {
      project = await Project.findOne({ _id: projectId, user: req.user.id });
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found.' });
      }

      const originalImages = project.originalImages || [];
      const generatedImages = project.designVariants || [];
      const knownUrls = [
        ...originalImages.map((image) => image.url),
        ...generatedImages.map((design) => design.imageUrl || design.thumbnailUrl)
      ].filter(Boolean);
      const knownUrlSet = new Set([
        ...knownUrls,
        ...knownUrls.map((url) => toAbsoluteImageUrl(url))
      ]);

      if (requestedSourceImageUrl && knownUrlSet.has(requestedSourceImageUrl)) {
        projectSourceImageUrl = requestedSourceImageUrl;
      } else {
        projectSourceImageUrl = originalImages[0]?.url
          || generatedImages[generatedImages.length - 1]?.imageUrl
          || generatedImages[generatedImages.length - 1]?.thumbnailUrl
          || '';
      }
    }

    if (!uploadedImage && !projectSourceImageUrl && !aiToolsConfig[toolKey]?.imageOptional) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image before generating a design.'
      });
    }

    const upstreamEndpoint = `${getHomeDesignsBaseUrl()}${endpoint}`;
    const uploadedImageUrl = uploadedImage ? getImageUrl(uploadedImage) : '';
    const imageUrl = uploadedImageUrl ? toAbsoluteImageUrl(uploadedImageUrl) : toAbsoluteImageUrl(projectSourceImageUrl);
    const videoMotion = req.body.tool_name || req.body.videoMotion || 'zoom_in';
    if (toolKey === 'video_generation' && !VIDEO_GENERATION_MOTIONS.includes(videoMotion)) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez choisir un mouvement caméra.'
      });
    }

    const maskBase64 = req.body.maskBase64 || (uploadedImage && tool.requiresMask ? await createDefaultMaskBase64(uploadedImage) : undefined);
    const maxDesigns = toolKey === 'material_swap' ? 5 : toolKey === 'perfect_redesign' ? 2 : toolKey === 'video_generation' ? 1 : 4;
    const minDesigns = toolKey === 'material_swap' ? 2 : 1;
    const toolConfig = aiToolsConfig[toolKey] || {};
    const toolFields = toolConfig.fields || [];
    const options = {
      imageUrl,
      videoMotion,
      maskBase64,
      upstreamEndpoint
    };
    if (toolFields.includes('room_type')) options.roomType = req.body.roomType || 'living-room';
    if (toolFields.includes('design_style')) options.style = req.body.designStyle || req.body.style || 'modern';
    if (toolFields.includes('prompt') || toolFields.includes('custom_instruction') || toolFields.includes('custom_message')) {
      options.prompt = req.body.additionalInstructions || req.body.prompt || undefined;
    }
    if (toolFields.includes('design_type') || toolFields.includes('image_type')) options.designType = req.body.spaceType || req.body.designType || 'Interior';
    if (toolFields.includes('ai_intervention')) options.aiIntervention = req.body.aiIntervention || 'Mid';
    if (toolFields.includes('no_design')) options.noDesign = clampNumber(req.body.noDesign, minDesigns, maxDesigns, minDesigns);
    if (toolFields.includes('strength')) options.strength = clampNumber(req.body.strength, 1, 10, 5);
    if (toolFields.includes('keep_structural_element')) options.keepStructural = req.body.keepStructural !== 'false';
    if (toolFields.includes('rgb_color')) options.rgbColor = req.body.rgbColor || '255,255,255';
    if (toolFields.includes('weather')) options.weather = req.body.weather || undefined;
    if (toolFields.includes('country')) options.countryCode = req.body.countryCode || undefined;
    if (toolFields.includes('color')) options.color = req.body.color || undefined;
    if (toolFields.includes('materials') || toolFields.includes('material')) options.materials = req.body.materials || undefined;
    if (toolFields.includes('materials_type')) options.materialsType = req.body.materialsType || undefined;
    if (toolFields.includes('material')) options.materialInstruction = req.body.materialInstruction || undefined;
    if (toolFields.includes('texture_image')) options.textureImageUrl = textureImage ? toAbsoluteImageUrl(getImageUrl(textureImage)) : undefined;
    if (toolFields.includes('style_image')) options.styleImageUrl = styleImage ? toAbsoluteImageUrl(getImageUrl(styleImage)) : undefined;
    if (toolFields.includes('no_of_texture')) options.noOfTexture = req.body.noOfTexture || '3 X 3';
    if (toolFields.includes('object')) options.object = req.body.object || undefined;

    console.log(`[GenerateDesign] ${tool.name} -> ${upstreamEndpoint}`);
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('HomeDesigns request timed out. Please try again.')), 180000);
    });
    const result = await Promise.race([tool.run(options), timeout]);

    if (!result || !result.success) {
      console.error('[GenerateDesign] API failed:', result?.error || 'Invalid response');
      return res.status(502).json({ success: false, error: result?.error || 'HomeDesigns returned an invalid response.' });
    }

    const responsePayload = buildGenerateDesignResponse(result, tool.name, endpoint);

    if (project) {
      if (uploadedImageUrl) {
        project.originalImages.push({ url: uploadedImageUrl, uploadedAt: new Date() });
      }

      const savedDesigns = [];
      (responsePayload.designs || []).slice(0, 6).forEach((design) => {
        if (!design.imageUrl) return;
        project.designVariants.push({
          name: design.name || tool.name,
          tool: tool.name,
          imageUrl: design.imageUrl,
          thumbnailUrl: design.thumbnailUrl || design.imageUrl,
          aiParameters: {
            endpoint,
            toolKey,
            sourceImageUrl: projectSourceImageUrl || uploadedImageUrl,
            roomType: req.body.roomType,
            style: req.body.designStyle,
            instructions: req.body.additionalInstructions || req.body.prompt
          },
          generatedAt: new Date()
        });
        const saved = project.designVariants[project.designVariants.length - 1];
        savedDesigns.push({
          id: String(saved._id),
          name: saved.name,
          imageUrl: saved.imageUrl,
          thumbnailUrl: saved.thumbnailUrl || saved.imageUrl,
          tool: saved.tool,
          generatedAt: saved.generatedAt
        });
      });

      if (project.aiGenerationHistory) {
        project.aiGenerationHistory.push({
          tool: tool.name,
          endpoint,
          prompt: req.body.additionalInstructions || req.body.prompt || '',
          status: 'completed',
          result: responsePayload.imageUrl || responsePayload.videoUrl || responsePayload.textResult || '',
          createdAt: new Date()
        });
      }

      await project.save();
      responsePayload.projectId = String(project._id);
      responsePayload.savedDesigns = savedDesigns;
    }

    res.json(responsePayload);
  } catch (err) {
    console.error('[GenerateDesign] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Unable to generate design.' });
  }
});

// Dynamic HomeDesignsAI proxy for the new project studio.
// TODO: Configure HOMEDESIGNS_API_KEY in the server environment before production use.
router.post('/v2/:tool', ensureAuthenticated, uploadProjectImages.single('image'), async (req, res) => {
  try {
    const tool = aiToolHandlers[req.params.tool];
    if (!tool) {
      return res.status(404).json({ success: false, error: 'Unknown AI tool endpoint.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an image before generating.' });
    }

    if (tool.requiresMask && !req.body.maskBase64) {
      return res.status(400).json({
        success: false,
        error: `${tool.name} requires a mask. Mask drawing will be added to this studio in a later step.`
      });
    }

    const imageUrl = toAbsoluteImageUrl(getImageUrl(req.file));
    const options = {
      imageUrl,
      maskBase64: req.body.maskBase64,
      roomType: req.body.roomType || 'living-room',
      style: req.body.style || 'modern',
      prompt: req.body.prompt || undefined,
      designType: req.body.designType || 'Interior',
      aiIntervention: req.body.aiIntervention || 'Mid',
      noDesign: parseInt(req.body.noDesign, 10) || 1,
      keepStructural: req.body.keepStructural !== 'false'
    };

    const result = await tool.run(options);

    if (!result || !result.success) {
      return res.status(500).json({
        success: false,
        error: result?.error || 'AI generation failed.'
      });
    }

    const images = result.allImages || (result.imageUrl ? [result.imageUrl] : []);

    return res.json({
      success: true,
      tool: tool.name,
      endpoint: `/api/v2/${req.params.tool}`,
      imageUrl: result.imageUrl,
      videoUrl: result.videoUrl,
      textResult: result.textResult,
      resultArray: result.resultArray,
      designs: images.map((url, index) => ({
        name: `${tool.name}${images.length > 1 ? ` #${index + 1}` : ''}`,
        imageUrl: url
      }))
    });
  } catch (err) {
    console.error('[API v2 studio] error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// Generate Design (AJAX)
router.post('/generate', ensureAuthenticated, async (req, res) => {
  try {
    const { projectId, style } = req.body;

    const project = await Project.findOne({
      _id: projectId,
      user: req.user.id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.originalImages || project.originalImages.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    project.status = 'generating';
    await project.save();

    let imageUrl = project.originalImages[0].url;
    // If it's a local URL, construct full URL (for AI API to access)
    if (imageUrl.startsWith('/')) {
      imageUrl = `${process.env.APP_URL || 'https://craftycrib.com'}${imageUrl}`;
    }

    // Build a prompt from description and preferences
    const promptParts = [];
    if (project.description) promptParts.push(project.description);
    if (project.preferences) {
      if (project.preferences.colors && project.preferences.colors.length > 0) {
        promptParts.push('Colors: ' + project.preferences.colors.join(', '));
      }
      if (project.preferences.materials && project.preferences.materials.length > 0) {
        promptParts.push('Materials: ' + project.preferences.materials.join(', '));
      }
      if (project.preferences.mustHave && project.preferences.mustHave.length > 0) {
        promptParts.push('Must include: ' + project.preferences.mustHave.join(', '));
      }
      if (project.preferences.mustAvoid && project.preferences.mustAvoid.length > 0) {
        promptParts.push('Avoid: ' + project.preferences.mustAvoid.join(', '));
      }
    }

    const result = await generateDesign({
      imageUrl,
      roomType: project.roomType,
      style: style || project.style || 'modern',
      prompt: promptParts.length > 0 ? promptParts.join('. ') : undefined,
      quality: req.user.isPremium ? 'hd' : 'standard'
    });

    if (result.success) {
      project.designVariants.push({
        name: `${style || project.style || 'Modern'} Design`,
        style: style || project.style,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        aiParameters: result
      });

      project.status = 'completed';
      await project.save();

      res.json({
        success: true,
        variant: project.designVariants[project.designVariants.length - 1]
      });
    } else {
      project.status = 'pending';
      await project.save();

      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (err) {
    console.error('API Generate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Project Data
router.get('/projects/:id', ensureAuthenticated, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (err) {
    console.error('API Get project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Project Status/Visibility
router.patch('/projects/:id/status', ensureAuthenticated, async (req, res) => {
  try {
    const { status, visibility } = req.body;
    const update = {};
    if (status) update.status = status;
    if (visibility) update.visibility = visibility;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      update,
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ success: true, project });
  } catch (err) {
    console.error('API Update status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search Contractors
router.get('/contractors/search', async (req, res) => {
  try {
    const { q, specialty, city, limit = 10 } = req.query;

    let query = { isActive: true };

    if (q) {
      query.$or = [
        { companyName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    if (specialty) {
      query.specialties = specialty;
    }

    if (city) {
      query['serviceArea.cities'] = { $regex: city, $options: 'i' };
    }

    const contractors = await Contractor.find(query)
      .populate('user', 'firstName lastName')
      .select('companyName slug specialties rating serviceArea')
      .limit(parseInt(limit));

    res.json(contractors);
  } catch (err) {
    console.error('API Search contractors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard Stats (for client)
router.get('/stats', ensureAuthenticated, async (req, res) => {
  try {
    const stats = {
      totalProjects: await Project.countDocuments({ user: req.user.id }),
      completedDesigns: await Project.countDocuments({ user: req.user.id, status: 'completed' }),
      inProgress: await Project.countDocuments({ user: req.user.id, status: { $in: ['generating', 'in-progress'] } }),
      totalVariants: 0
    };

    const projects = await Project.find({ user: req.user.id });
    stats.totalVariants = projects.reduce((acc, p) => acc + (p.designVariants?.length || 0), 0);

    res.json(stats);
  } catch (err) {
    console.error('API Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

