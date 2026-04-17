const express    = require('express');
const { Op }     = require('sequelize');
const sequelize  = require('../../db');
const { Painting } = require('../../models');
const { upload, deleteImageFile } = require('../../lib/fileStorage');
const asyncHandler = require('../../lib/asyncHandler');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/admin/paintings/all  — full unfiltered list for the admin UI
// ---------------------------------------------------------------------------
router.get('/all', asyncHandler(async (req, res) => {
  const { category } = req.query;

  const where = {};
  if (category && category !== 'All') {
    where.categories = { [Op.contains]: [category] };
  }

  const paintings = await Painting.findAll({
    where,
    order: [['order', 'DESC'], ['createdAt', 'DESC']],
    attributes: { exclude: ['updatedAt'] }
  });

  res.json({ paintings, totalCount: paintings.length });
}));

// ---------------------------------------------------------------------------
// POST /api/admin/paintings  — create a new painting
// ---------------------------------------------------------------------------
router.post('/', asyncHandler(async (req, res) => {
  const data = req.body;

  if (data.featured) {
    await assertFeaturedSlotAvailable();
  }

  // Place the new painting at the top of the list.
  const maxOrder = (await Painting.max('order')) || 0;
  data.order = maxOrder + 1;

  // Sequelize validates the model fields before hitting the DB.
  const painting = await Painting.create(data);
  res.status(201).json({ painting });
}));

// ---------------------------------------------------------------------------
// PUT /api/admin/paintings/:id  — update an existing painting
// ---------------------------------------------------------------------------
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data   = req.body;

  if (data.featured) {
    // Exclude the current painting from the count so toggling featured on an
    // already-featured painting doesn't incorrectly fail the limit check.
    await assertFeaturedSlotAvailable(id);
  }

  const [updatedRows] = await Painting.update(data, {
    where: { id },
    returning: true
  });

  if (!updatedRows) return res.status(404).json({ error: 'Painting not found' });

  const painting = await Painting.findByPk(id);
  res.json({ painting });
}));

// ---------------------------------------------------------------------------
// DELETE /api/admin/paintings/:id
// ---------------------------------------------------------------------------
router.delete('/:id', asyncHandler(async (req, res) => {
  const painting = await Painting.findByPk(req.params.id);
  if (!painting) return res.status(404).json({ error: 'Painting not found' });

  // Delete the DB record first. If the file deletion fails, the record is
  // still gone and the orphaned file is a minor cleanup issue, not a crash.
  await painting.destroy();
  await deleteImageFile(painting.imageurl);

  res.json({ message: 'Painting deleted' });
}));

// ---------------------------------------------------------------------------
// POST /api/admin/paintings/:id/image  — upload / replace painting image
// ---------------------------------------------------------------------------
router.post('/:id/image', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });

  const painting = await Painting.findByPk(req.params.id);
  if (!painting) return res.status(404).json({ error: 'Painting not found' });

  const oldUrl  = painting.imageurl;
  const imageUrl = `/assets/images/${req.file.filename}`;

  await painting.update({ imageurl: imageUrl });

  // Clean up the previous image file after the DB update succeeds.
  await deleteImageFile(oldUrl);

  res.json({ imageUrl });
}));

// ---------------------------------------------------------------------------
// POST /api/admin/paintings/reorder
//
// Accepts { ids: [1, 2, 3] } — the array position becomes the display order.
// ids[0] = top of the gallery, receives the highest order value.
//
// API change from original: the old endpoint expected
// { order: [{id, order}] } which was verbose and put ordering logic on the
// client. The new format is simpler: send the IDs in the desired order and
// let the server derive the values.
// ---------------------------------------------------------------------------
router.post('/reorder', asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '`ids` must be a non-empty array' });
  }

  const transaction = await sequelize.transaction();
  try {
    // ids[0] gets the highest order value so it sorts first (ORDER BY order DESC).
    await Promise.all(
      ids.map((id, index) =>
        Painting.update(
          { order: ids.length - index },
          { where: { id }, transaction }
        )
      )
    );

    await transaction.commit();
    res.json({ success: true, updatedCount: ids.length });
  } catch (err) {
    await transaction.rollback();
    throw err; // asyncHandler forwards to the centralized error handler
  }
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Throws a 400 HTTP error if 3 paintings are already featured.
 * Pass excludeId to ignore the painting currently being edited.
 */
async function assertFeaturedSlotAvailable(excludeId = null) {
  const where = { featured: true };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  const count = await Painting.count({ where });
  if (count >= 3) {
    const err = new Error('Only 3 paintings can be featured at once');
    err.status = 400;
    throw err;
  }
}

module.exports = router;
