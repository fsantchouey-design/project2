const toolsConfig = {
  redesign: {
    endpoint: '/api/v2/perfect_redesign',
    uiType: 'redesign',
    fields: ['design_type', 'room_type', 'design_style', 'mode_type', 'ai_intervention', 'no_design', 'custom_instruction', 'keep_structural_element'],
    noDesignMax: 4,
    aiIntervention: true,
    keepStructural: true,
    credits: 15,
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
    keepStructural: true,
    credits: 15
  },
  beautiful_redesign: {
    endpoint: '/api/v2/beautiful_redesign',
    uiType: 'redesign',
    fields: ['design_type', 'room_type', 'design_style', 'ai_intervention', 'no_design', 'prompt', 'keep_structural_element'],
    noDesignMax: 4,
    aiIntervention: true,
    keepStructural: true,
    credits: 15
  },
  creative_redesign: {
    endpoint: '/api/v2/creative_redesign',
    uiType: 'redesign',
    fields: ['design_type', 'room_type', 'design_style', 'ai_intervention', 'no_design', 'prompt', 'keep_structural_element'],
    noDesignMax: 4,
    aiIntervention: true,
    keepStructural: true,
    credits: 15
  },
  magic_redesign: {
    endpoint: '/api/v2/magic_redesign',
    uiType: 'magic-redesign',
    fields: ['custom_instruction'],
    promptOnly: true,
    promptLabel: 'Magic Prompt',
    promptPlaceholder: 'Tell the AI exactly what to change: layout, furniture, colors, materials, mood, or specific objects.',
    credits: 18
  },
  virtual_staging: {
    endpoint: '/api/v2/virtual_staging',
    uiType: 'redesign',
    fields: ['room_type', 'design_style', 'no_design', 'prompt'],
    noDesignMax: 4,
    credits: 15
  },
  precision: {
    endpoint: '/api/v2/precision',
    uiType: 'mask',
    fields: ['mask', 'design_type', 'room_type', 'design_style', 'no_design', 'prompt', 'strength'],
    noDesignMax: 4,
    mask: true,
    strength: true,
    maskHelp: 'Select the exact area you want redesigned.',
    credits: 25
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
    maskHelp: 'Select empty areas where furniture or decor should be added.',
    credits: 12
  },
  decor_staging: {
    endpoint: '/api/v2/decor_staging',
    uiType: 'object-position',
    fields: ['object_position'],
    credits: 12
  },
  furniture_removal: {
    endpoint: '/api/v2/furniture_removal',
    uiType: 'mask',
    fields: ['mask'],
    mask: true,
    removeAllToggle: true,
    maskHelp: 'Select the furniture you want to remove.',
    credits: 12
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
    maskHelp: 'Select the surface whose color or texture should change.',
    credits: 12
  },
  furniture_finder: {
    endpoint: '/api/v2/furniture_finder',
    uiType: 'country',
    fields: ['country'],
    country: true,
    countryOnly: true,
    submitLabel: 'Get Products',
    credits: 12
  },
  full_hd: {
    endpoint: '/api/v2/full_hd',
    uiType: 'single-action',
    fields: [],
    credits: 5
  },
  text_to_design: {
    endpoint: '/api/v2/text_to_design',
    uiType: 'text',
    fields: ['custom_instruction', 'mode'],
    textOnly: true,
    imageOptional: true,
    promptOnly: true,
    promptLabel: 'Describe the design you want',
    promptPlaceholder: 'Write the full design concept you want the AI to create.',
    credits: 18
  },
  design_advisor: {
    endpoint: '/api/v2/design_advisor',
    uiType: 'advisor',
    fields: ['custom_message'],
    promptOnly: true,
    imageOptional: true,
    promptLabel: 'Ask the design advisor',
    promptPlaceholder: 'Ask a design question or describe the advice you need.',
    credits: 10
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
    maskHelp: 'Click the object automatically or use the manual brush to draw the exact material area.',
    credits: 12
  },
};

module.exports = toolsConfig;
