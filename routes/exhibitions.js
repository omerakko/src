const express    = require('express');
const { Exhibition, ExhibitionPhoto } = require('../models');
const asyncHandler = require('../lib/asyncHandler');

const router = express.Router();

// Reusable include for photos, sorted by their display order.
// Defined once here so it's consistent across GET endpoints.
const PHOTOS_INCLUDE = [{
  model: ExhibitionPhoto,
  as: 'photos',
  // Nested association ordering — the outer order clause controls exhibitions,
  // this controls the photos within each exhibition.
  order: [['order', 'ASC']]
}];

// GET /api/exhibitions  — all exhibitions with photos (public)
router.get('/', asyncHandler(async (req, res) => {
  const sortBy    = ['date', 'title', 'order'].includes(req.query.sortBy) ? req.query.sortBy : 'date';
  const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Whitelist the sortBy field to prevent ORDER BY injection.
  // Even though this isn't a user-facing SQL literal, it's good practice.
  const exhibitions = await Exhibition.findAll({
    include: PHOTOS_INCLUDE,
    order: [[sortBy, sortOrder]]
  });

  res.json({ exhibitions });
}));

// GET /api/exhibitions/:id  — single exhibition with photos (public)
router.get('/:id', asyncHandler(async (req, res) => {
  const exhibition = await Exhibition.findByPk(req.params.id, {
    include: PHOTOS_INCLUDE
  });

  if (!exhibition) return res.status(404).json({ error: 'Exhibition not found' });
  res.json(exhibition);
}));

module.exports = router;
