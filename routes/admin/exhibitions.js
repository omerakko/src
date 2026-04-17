const express    = require('express');
const sequelize  = require('../../db');
const { Exhibition, ExhibitionPhoto } = require('../../models');
const { upload, deleteImageFile } = require('../../lib/fileStorage');
const asyncHandler = require('../../lib/asyncHandler');

const router = express.Router();

const PHOTOS_INCLUDE = [{
  model: ExhibitionPhoto,
  as: 'photos',
  order: [['order', 'ASC']]
}];

// ---------------------------------------------------------------------------
// GET /api/admin/exhibitions
// ---------------------------------------------------------------------------
router.get('/', asyncHandler(async (_req, res) => {
  const exhibitions = await Exhibition.findAll({
    include: PHOTOS_INCLUDE,
    order: [['date', 'DESC']]
  });
  res.json({ exhibitions });
}));

// ---------------------------------------------------------------------------
// POST /api/admin/exhibitions  — create
// ---------------------------------------------------------------------------
router.post('/', asyncHandler(async (req, res) => {
  const maxOrder = (await Exhibition.max('order')) || 0;
  const exhibition = await Exhibition.create({ ...req.body, order: maxOrder + 1 });
  res.status(201).json({ exhibition });
}));

// ---------------------------------------------------------------------------
// PUT /api/admin/exhibitions/:id  — update
// ---------------------------------------------------------------------------
router.put('/:id', asyncHandler(async (req, res) => {
  const [updatedRows] = await Exhibition.update(req.body, {
    where: { id: req.params.id },
    returning: true
  });

  if (!updatedRows) return res.status(404).json({ error: 'Exhibition not found' });

  const exhibition = await Exhibition.findByPk(req.params.id, { include: PHOTOS_INCLUDE });
  res.json({ exhibition });
}));

// ---------------------------------------------------------------------------
// DELETE /api/admin/exhibitions/:id
// ---------------------------------------------------------------------------
router.delete('/:id', asyncHandler(async (req, res) => {
  const exhibition = await Exhibition.findByPk(req.params.id, { include: PHOTOS_INCLUDE });
  if (!exhibition) return res.status(404).json({ error: 'Exhibition not found' });

  // Collect image URLs before the cascade delete removes the records.
  const photoUrls = (exhibition.photos || []).map(p => p.imageurl);

  // The DB cascade (onDelete: CASCADE) deletes photos automatically.
  // We delete the DB record first so the transaction commits cleanly,
  // then clean up files — orphaned files are acceptable, missing DB records are not.
  await exhibition.destroy();
  await Promise.all(photoUrls.map(deleteImageFile));

  res.json({ message: 'Exhibition deleted' });
}));

// ---------------------------------------------------------------------------
// POST /api/admin/exhibitions/:id/photos  — upload up to 10 photos
// ---------------------------------------------------------------------------
router.post('/:id/photos', upload.array('photos', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No photo files provided' });
  }

  const exhibition = await Exhibition.findByPk(req.params.id);
  if (!exhibition) return res.status(404).json({ error: 'Exhibition not found' });

  const maxOrder = (await ExhibitionPhoto.max('order', {
    where: { exhibitionId: req.params.id }
  })) || 0;

  const transaction = await sequelize.transaction();
  try {
    const photos = await Promise.all(
      req.files.map((file, i) =>
        ExhibitionPhoto.create({
          exhibitionId: req.params.id,
          imageurl: `/assets/images/${file.filename}`,
          title: req.body.titles?.[i] ?? null,
          order: maxOrder + i + 1
        }, { transaction })
      )
    );

    await transaction.commit();
    res.json({ photos, count: photos.length });
  } catch (err) {
    await transaction.rollback();
    // Remove the uploaded files so we don't accumulate orphans on DB failures.
    await Promise.all(req.files.map(f => deleteImageFile(`/assets/images/${f.filename}`)));
    throw err;
  }
}));

// ---------------------------------------------------------------------------
// DELETE /api/admin/exhibitions/:exhibitionId/photos/:photoId
// ---------------------------------------------------------------------------
router.delete('/:exhibitionId/photos/:photoId', asyncHandler(async (req, res) => {
  const { exhibitionId, photoId } = req.params;

  // Scope the lookup to the parent exhibition — prevents one exhibition's
  // admin from deleting photos belonging to a different exhibition.
  const photo = await ExhibitionPhoto.findOne({
    where: { id: photoId, exhibitionId }
  });

  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  await photo.destroy();
  await deleteImageFile(photo.imageurl);

  res.json({ message: 'Photo deleted' });
}));

// ---------------------------------------------------------------------------
// POST /api/admin/exhibitions/:id/photos/reorder
// ---------------------------------------------------------------------------
router.post('/:id/photos/reorder', asyncHandler(async (req, res) => {
  const { order } = req.body;

  if (!Array.isArray(order)) {
    return res.status(400).json({ error: '`order` must be an array' });
  }

  const transaction = await sequelize.transaction();
  try {
    await Promise.all(
      order.map(item =>
        ExhibitionPhoto.update(
          { order: item.order },
          { where: { id: item.id, exhibitionId: req.params.id }, transaction }
        )
      )
    );

    await transaction.commit();
    res.json({ success: true, updatedCount: order.length });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}));

module.exports = router;
