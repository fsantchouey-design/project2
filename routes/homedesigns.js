const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const { callHomeDesigns, checkStatus } = require('../utils/homedesignsService');

// ─── Multer : stockage en mémoire (pas sur disque) ───────────────────────────
const upload = multer({ storage: multer.memoryStorage() });

// ─── Helper : construit un FormData depuis req.body + req.files ──────────────
const buildFormData = (body, files = {}) => {
  const form = new FormData();

  // Champs texte
  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      form.append(key, String(value));
    }
  });

  // Fichiers simples (ex: image, masked_image, style_image, etc.)
  Object.entries(files).forEach(([fieldName, fileArray]) => {
    if (fileArray && fileArray.length > 0) {
      const file = fileArray[0];
      form.append(fieldName, file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    }
  });

  return form;
};

// ─── Helper : furniture_images[] (tableau de fichiers) ───────────────────────
const buildFormDataWithArray = (body, singleFiles = {}, arrayFiles = {}) => {
  const form = buildFormData(body, singleFiles);

  Object.entries(arrayFiles).forEach(([fieldName, fileArray]) => {
    if (fileArray && fileArray.length > 0) {
      fileArray.forEach((file) => {
        form.append(`${fieldName}[]`, file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      });
    }
  });

  return form;
};

// ─── Helper : réponse d'erreur standardisée ──────────────────────────────────
const handleError = (res, err) => {
  console.error('HomeDesigns API Error:', err?.response?.data || err.message);
  const status = err?.response?.status || 500;
  const message =
    err?.response?.data || err.message || 'Internal server error';
  return res.status(status).json({ error: message });
};

// ══════════════════════════════════════════════════════════════════════════════
//  1. MAGIC REDESIGN
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/magic_redesign',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('magic_redesign', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/magic_redesign/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('magic_redesign', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  2. VIDEO GENERATION
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/video_generation',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('video_generation', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/video_generation/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('video_generation', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  3. SMART ROOM COMPOSER
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/smart_room_composer',
  upload.fields([
    { name: 'room_image', maxCount: 1 },
    { name: 'furniture_images', maxCount: 4 },
  ]),
  async (req, res) => {
    try {
      const singleFiles = { room_image: req.files?.room_image };
      const arrayFiles = { furniture_images: req.files?.furniture_images };
      const form = buildFormDataWithArray(req.body, singleFiles, arrayFiles);
      const data = await callHomeDesigns('smart_room_composer', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/smart_room_composer/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('smart_room_composer', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  4. PERFECT REDESIGN
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/perfect_redesign',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('perfect_redesign', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/perfect_redesign/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('perfect_redesign', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  5. BEAUTIFUL REDESIGN
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/beautiful_redesign',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('beautiful_redesign', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/beautiful_redesign/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('beautiful_redesign', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  6. CREATIVE REDESIGN
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/creative_redesign',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('creative_redesign', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/creative_redesign/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('creative_redesign', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  7. SKETCH TO RENDER
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/sketch_to_render',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('sketch_to_render', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/sketch_to_render/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('sketch_to_render', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  8. VIRTUAL STAGING
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/virtual_staging',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('virtual_staging', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/virtual_staging/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('virtual_staging', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  9. PRECISION
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/precision',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'masked_image', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('precision', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/precision/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('precision', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  10. FILL SPACES
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/fill_spaces',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'masked_image', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('fill_spaces', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/fill_spaces/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('fill_spaces', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  11. DECOR STAGING
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/decor_staging',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('decor_staging', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/decor_staging/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('decor_staging', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  12. COLORS & TEXTURES
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/change_color_textures',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'masked_image', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('change_color_textures', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/change_color_textures/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('change_color_textures', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  13. FURNITURE FINDER
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/furniture_finder',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('furniture_finder', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
//  14. FURNITURE REMOVAL
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/furniture_removal',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'masked_image', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('furniture_removal', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/furniture_removal/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('furniture_removal', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  15. FULL HD
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/full_hd',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('full_hd', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/full_hd/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('full_hd', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  16. TEXT TO DESIGN
// ══════════════════════════════════════════════════════════════════════════════
router.post('/text_to_design', upload.none(), async (req, res) => {
  try {
    const form = buildFormData(req.body);
    const data = await callHomeDesigns('text_to_design', form);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/text_to_design/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('text_to_design', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  17. FURNITURE CREATOR
// ══════════════════════════════════════════════════════════════════════════════
router.post('/furniture_creator', upload.none(), async (req, res) => {
  try {
    const form = buildFormData(req.body);
    const data = await callHomeDesigns('furniture_creator', form);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/furniture_creator/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('furniture_creator', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  18. DESIGN ADVISOR
// ══════════════════════════════════════════════════════════════════════════════
router.post('/design_advisor', upload.none(), async (req, res) => {
  try {
    const form = buildFormData(req.body);
    const data = await callHomeDesigns('design_advisor', form);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  19. SKY COLORS
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/sky_colors',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('sky_colors', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/sky_colors/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('sky_colors', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  20. DESIGN TRANSFER
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/design_transfer',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'style_image', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('design_transfer', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/design_transfer/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('design_transfer', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  21. FLOOR EDITOR
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/floor_editor',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'texture_image', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('floor_editor', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/floor_editor/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('floor_editor', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  22. PAINT VISUALIZER
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/paint_visualizer',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'masked_image', maxCount: 1 },
    { name: 'color_image', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('paint_visualizer', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/paint_visualizer/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('paint_visualizer', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  23. MATERIAL SWAP
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/material_swap',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'masked_image', maxCount: 1 },
    { name: 'texture_image', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('material_swap', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/material_swap/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('material_swap', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  24. ROOM COMPOSER
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/room_composer',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'masked_image', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('room_composer', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/room_composer/status_check/:queueId', async (req, res) => {
  try {
    const data = await checkStatus('room_composer', req.params.queueId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  BONUS: DESIGN CRITIQUE
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/design_critique',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('design_critique', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
//  BONUS: CREATE MASK IMAGE
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/create_maskimage',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('create_maskimage', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
//  BONUS: SMART HOME AI
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  '/smart_home',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      const form = buildFormData(req.body, req.files);
      const data = await callHomeDesigns('smart_home', form);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  }
);

module.exports = router;
