const toolsConfig = {
  redesign: {
    endpoint: '/api/v2/perfect_redesign',
    uiType: 'redesign',
    fields: ['design_type', 'room_type', 'design_style', 'mode_type', 'ai_intervention', 'no_design', 'custom_instruction', 'keep_structural_element'],
    noDesignMax: 4,
    aiIntervention: true,
    keepStructural: true,
    modeTools: [
      {
        label: 'Perfect Redesign',
        value: 'perfect_redesign',
        endpoint: '/api/v2/perfect_redesign',
        noDesignMax: 2
      },
      {
        label: 'Beautiful Redesign',
        value: 'beautiful_redesign',
        endpoint: '/api/v2/beautiful_redesign',
        noDesignMax: 4
      },
      {
        label: 'Creative Redesign',
        value: 'creative_redesign',
        endpoint: '/api/v2/creative_redesign',
        noDesignMax: 4
      }
    ]
  },
  perfect_redesign: {
    endpoint: '/api/v2/perfect_redesign',
    uiType: 'redesign',
    fields: ['design_type', 'room_type', 'design_style', 'ai_intervention', 'no_design', 'custom_instruction', 'keep_structural_element'],
    noDesignMax: 2,
    aiIntervention: true,
    keepStructural: true
  },
  beautiful_redesign: {
    endpoint: '/api/v2/beautiful_redesign',
    uiType: 'redesign',
    fields: ['design_type', 'room_type', 'design_style', 'ai_intervention', 'no_design', 'prompt', 'keep_structural_element'],
    noDesignMax: 4,
    aiIntervention: true,
    keepStructural: true
  },
  creative_redesign: {
    endpoint: '/api/v2/creative_redesign',
    uiType: 'redesign',
    fields: ['design_type', 'room_type', 'design_style', 'ai_intervention', 'no_design', 'prompt', 'keep_structural_element'],
    noDesignMax: 4,
    aiIntervention: true,
    keepStructural: true
  },
  magic_redesign: {
    endpoint: '/api/v2/magic_redesign',
    uiType: 'magic-redesign',
    fields: ['custom_instruction'],
    promptOnly: true,
    promptLabel: 'Magic Prompt',
    promptPlaceholder: 'Tell the AI exactly what to change: layout, furniture, colors, materials, mood, or specific objects.'
  },
  sketch_to_render: {
    endpoint: '/api/v2/sketch_to_render',
    uiType: 'redesign',
    fields: ['design_type', 'room_type', 'design_style', 'ai_intervention', 'no_design', 'prompt'],
    noDesignMax: 4,
    aiIntervention: true
  },
  virtual_staging: {
    endpoint: '/api/v2/virtual_staging',
    uiType: 'redesign',
    fields: ['room_type', 'design_style', 'no_design', 'prompt'],
    noDesignMax: 4
  },
  precision: {
    endpoint: '/api/v2/precision',
    uiType: 'mask',
    fields: ['mask', 'design_type', 'room_type', 'design_style', 'no_design', 'prompt', 'strength'],
    noDesignMax: 4,
    mask: true,
    strength: true,
    maskHelp: 'Select the exact area you want redesigned.'
  },
  fill_spaces: {
    endpoint: '/api/v2/fill_spaces',
    uiType: 'mask',
    fields: ['mask', 'design_type', 'room_type', 'design_style', 'no_design', 'prompt', 'strength'],
    noDesignMax: 4,
    mask: true,
    strength: true,
    promptLabel: 'What should be added?',
    promptPlaceholder: 'Describe what the AI should add inside the selected empty area.',
    maskHelp: 'Select empty areas where furniture or decor should be added.'
  },
  decor_staging: {
    endpoint: '/api/v2/decor_staging',
    uiType: 'object-position',
    fields: ['object_position']
  },
  furniture_removal: {
    endpoint: '/api/v2/furniture_removal',
    uiType: 'mask',
    fields: ['mask'],
    mask: true,
    removeAllToggle: true,
    maskHelp: 'Select the furniture you want to remove.'
  },
  change_color_textures: {
    endpoint: '/api/v2/change_color_textures',
    uiType: 'mask',
    fields: ['mask', 'design_type', 'no_design', 'prompt', 'color', 'materials', 'materials_type', 'object'],
    noDesignMax: 4,
    mask: true,
    colorTexture: true,
    material: true,
    surfaceColor: true,
    object: true,
    promptLabel: 'Custom color or texture instruction',
    promptPlaceholder: 'Optional: describe a custom color, material, or finish if it is not available below.',
    maskHelp: 'Select the surface whose color or texture should change.'
  },
  furniture_finder: {
    endpoint: '/api/v2/furniture_finder',
    uiType: 'country',
    fields: ['country'],
    country: true,
    countryOnly: true,
    submitLabel: 'Get Products'
  },
  full_hd: {
    endpoint: '/api/v2/full_hd',
    uiType: 'single-action',
    fields: []
  },
  text_to_design: {
    endpoint: '/api/v2/text_to_design',
    uiType: 'text',
    fields: ['custom_instruction', 'mode'],
    textOnly: true,
    imageOptional: true,
    promptOnly: true,
    promptLabel: 'Describe the design you want',
    promptPlaceholder: 'Write the full design concept you want the AI to create.'
  },
  furniture_creator: {
    endpoint: '/api/v2/furniture_creator',
    uiType: 'text',
    fields: ['custom_instruction', 'mode'],
    textOnly: true,
    imageOptional: true,
    promptOnly: true,
    promptLabel: 'Describe the furniture you want',
    promptPlaceholder: 'Describe the furniture or object you want to create.'
  },
  design_advisor: {
    endpoint: '/api/v2/design_advisor',
    uiType: 'advisor',
    fields: ['custom_message'],
    promptOnly: true,
    imageOptional: true,
    promptLabel: 'Ask the design advisor',
    promptPlaceholder: 'Ask a design question or describe the advice you need.'
  },
  sky_colors: {
    endpoint: '/api/v2/sky_colors',
    uiType: 'weather',
    fields: ['weather', 'no_design'],
    noDesignMax: 4,
    weather: true,
    weatherOnly: true
  },
  design_transfer: {
    endpoint: '/api/v2/design_transfer',
    uiType: 'reference',
    fields: ['style_image', 'ai_intervention'],
    aiIntervention: true,
    styleReference: true,
    transferOnly: true,
    submitLabel: 'Transfer Design'
  },
  floor_editor: {
    endpoint: '/api/v2/floor_editor',
    uiType: 'texture',
    fields: ['texture_image', 'no_of_texture'],
    textureUpload: true,
    textureGrid: true,
    textureOptions: ['1 X 1', '2 X 2', '3 X 3', '4 X 4']
  },
  paint_visualizer: {
    endpoint: '/api/v2/paint_visualizer',
    uiType: 'mask',
    fields: ['mask', 'no_design', 'rgb_color', 'color_image'],
    noDesignMax: 4,
    mask: true,
    paintColor: true,
    maskHelp: 'Select the wall or surface you want to repaint.'
  },
  material_swap: {
    endpoint: '/api/v2/material_swap',
    uiType: 'material-swap',
    fields: ['selection_mode', 'mask', 'material', 'texture_image', 'no_design', 'no_of_texture'],
    noDesignMin: 2,
    noDesignMax: 5,
    mask: true,
    materialPreset: true,
    materialInstruction: true,
    textureGrid: true,
    textureOptions: ['1 X 1', '2 X 2', '3 X 3', '4 X 4', '5 X 5'],
    textureUpload: true,
    materialSwap: true,
    maskHelp: 'Click the object automatically or use the manual brush to draw the exact material area.'
  },
  room_composer: {
    endpoint: '/api/v2/room_composer',
    uiType: 'room-composer',
    fields: ['room_image', 'custom_elements'],
    imageLabel: 'Drag and drop room image'
  },
  design_critique: {
    endpoint: '/api/v2/design_critique',
    uiType: 'critique',
    fields: ['image_type'],
    imageTypeOnly: true,
    submitLabel: 'Get Design Critique'
  },
  create_maskimage: {
    endpoint: '/api/v2/create_maskimage',
    uiType: 'single-action',
    fields: []
  },
  smart_home: {
    endpoint: '/api/v2/smart_home',
    uiType: 'single-action',
    fields: [],
    submitLabel: 'Get Feedback'
  },
  video_generation: {
    endpoint: '/api/v2/video_generation',
    uiType: 'video',
    fields: ['tool_name'],
    videoMotion: true,
    submitLabel: 'Generate Video'
  }
};

module.exports = toolsConfig;