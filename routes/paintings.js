const express    = require('express');
const { Op }     = require('sequelize');
const sequelize  = require('../db');
const { Painting } = require('../models');
const asyncHandler = require('../lib/asyncHandler');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/paintings  — paginated, filtered list (public)
// ---------------------------------------------------------------------------
router.get('/', asyncHandler(async (req, res) => {
  const page      = Math.max(1, parseInt(req.query.page) || 1);
  const perPage   = Math.min(parseInt(req.query.perPage) || 6, 50); // hard cap at 50
  const { category, year, search, sortBy = 'order', minPrice, maxPrice } = req.query;
  const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const where = {};

  // SECURITY FIX: The original code used Sequelize literal() with raw string
  // interpolation: literal(`'${category}' = ANY(categories)`).
  // That's a SQL injection vector — a crafted category param could break out
  // of the string literal and run arbitrary SQL.
  //
  // Op.contains generates a parameterized `@>` array-containment query:
  //   "categories" @> ARRAY['<value>']::varchar[]
  // Sequelize binds the value safely, so injection is impossible.
  if (category && category !== 'All') {
    where.categories = { [Op.contains]: [category] };
  }

  if (year) {
    where.year = year;
  }

  if (search) {
    where[Op.or] = [
      { title:       { [Op.iLike]: `%${search}%` } },
      { medium:      { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } }
    ];
  }

  if (minPrice != null || maxPrice != null) {
    where.price = {};
    if (minPrice != null) where.price[Op.gte] = parseFloat(minPrice);
    if (maxPrice != null) where.price[Op.lte] = parseFloat(maxPrice);
  }

  const offset = (page - 1) * perPage;

  // Primary sort by manual order (what the admin set via drag-drop),
  // secondary sort by whatever the client requested.
  const order = [['order', 'DESC'], [sortBy, sortOrder]];

  const { count, rows: paintings } = await Painting.findAndCountAll({
    where, order, limit: perPage, offset,
    attributes: { exclude: ['updatedAt'] }
  });

  const totalPages = Math.ceil(count / perPage);

  res.json({
    paintings,
    totalCount:  count,
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  });
}));

// ---------------------------------------------------------------------------
// GET /api/paintings/featured  — up to 3 featured paintings (public)
// IMPORTANT: this route must be declared BEFORE /:id, otherwise Express
// would match "featured" as an ID param.
// ---------------------------------------------------------------------------
router.get('/featured', asyncHandler(async (_req, res) => {
  const paintings = await Painting.findAll({
    where: { featured: true },
    order: [['updatedAt', 'DESC']],
    limit: 3,
    attributes: { exclude: ['updatedAt'] }
  });

  res.json({ paintings });
}));

// ---------------------------------------------------------------------------
// GET /api/categories  — unique category values across all paintings (public)
// ---------------------------------------------------------------------------
router.get('/categories', asyncHandler(async (_req, res) => {
  // unnest() flattens the array column into individual rows so we can
  // SELECT DISTINCT on the values. There's no clean Sequelize ORM equivalent
  // for this PostgreSQL-specific operation, so raw SQL is the right call here.
  //
  // BUG FIX: The original query was missing the WHERE keyword, causing a
  // PostgreSQL syntax error. The blank line between FROM and AND made it look
  // valid in the editor but the SQL was broken.
  const [rows] = await sequelize.query(`
    SELECT DISTINCT unnest(categories) AS category
    FROM paintings
    WHERE categories IS NOT NULL
      AND array_length(categories, 1) > 0
    ORDER BY category
  `);

  const categories = rows
    .map(r => r.category)
    .filter(c => c && c.trim() !== '');

  res.json(categories);
}));

// ---------------------------------------------------------------------------
// GET /api/paintings/:id  — single painting (public)
// ---------------------------------------------------------------------------
router.get('/:id', asyncHandler(async (req, res) => {
  const painting = await Painting.findByPk(req.params.id);
  if (!painting) return res.status(404).json({ error: 'Painting not found' });
  res.json(painting);
}));

module.exports = router;
