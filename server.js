/**
 * server.js - Express server with PostgreSQL database for paintings
 * This handles pagination and filtering for the painting gallery
 */
require('dotenv').config(); // CommonJS style

const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;


// Add these imports at the top of your server.js file (after existing imports)
const { verifyToken, requireAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth');




// Database connection
const sequelize = new Sequelize(
  process.env.DATABASE_URL,
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test database connection
sequelize.authenticate()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('PostgreSQL connection error:', err));

// Painting Model
const Painting = sequelize.define('Painting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  medium: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  year: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isNumeric: true,
      len: [4, 4]
    }
  },
imageurl: {
  type: DataTypes.STRING,
  allowNull: true,
}
,
  categories: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    validate: {
      min: 0
    }
  },
  isavailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },

    order: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    field: 'order' // Explicitly specify the column name
  },// Add this to your Painting model definition
    featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
    }

}, {
  tableName: 'paintings',
  timestamps: true,
  indexes: [
    {
      fields: ['categories'],
      using: 'gin' // GIN index for array operations
    },
    {
      fields: ['year']
    },
    {
      fields: ['title']
    },
    {
      fields: ['isavailable']
    }
  ]
});

// Exhibition Model
const Exhibition = sequelize.define('Exhibition', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  }
}, {
  tableName: 'exhibitions',
  timestamps: true
});

// Exhibition Photo Model
const ExhibitionPhoto = sequelize.define('ExhibitionPhoto', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  exhibitionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Exhibition,
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imageurl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'exhibition_photos',
  timestamps: true
});

// Define associations
Exhibition.hasMany(ExhibitionPhoto, { 
  foreignKey: 'exhibitionId', 
  as: 'photos',
  onDelete: 'CASCADE'
});
ExhibitionPhoto.belongsTo(Exhibition, { 
  foreignKey: 'exhibitionId', 
  as: 'exhibition' 
});

// Category Model (alternative approach - normalized)
const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  }
}, {
  tableName: 'categories',
  timestamps: false
});

// Junction table for many-to-many relationship (alternative approach)
const PaintingCategory = sequelize.define('PaintingCategory', {
  paintingId: {
    type: DataTypes.INTEGER,
    references: {
      model: Painting,
      key: 'id'
    }
  },
  categoryId: {
    type: DataTypes.INTEGER,
    references: {
      model: Category,
      key: 'id'
    }
  }
}, {
  tableName: 'painting_categories',
  timestamps: false
});

// Define associations (if using normalized approach)
Painting.belongsToMany(Category, { through: PaintingCategory, foreignKey: 'paintingId' });
Category.belongsToMany(Painting, { through: PaintingCategory, foreignKey: 'categoryId' });

// Serve static files
app.use(express.static(path.join(__dirname)));

// Apply JSON parsing selectively - NOT globally
app.use('/api/auth', express.json({ limit: '50mb' }));
app.use('/api/admin', (req, res, next) => {
  // Skip JSON parsing for image upload routes
  if (req.path.includes('/image') && req.method === 'POST') {
    return next();
  }
  express.json({ limit: '50mb' })(req, res, next);
});

app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
// ... rest of your routes


/**
 * API endpoint for fetching paintings with pagination and filtering
 */
app.get('/api/paintings', async (req, res) => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const perPage = Math.min(parseInt(req.query.perPage) || 6, 50);
    const category = req.query.category;
    const year = req.query.year;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const { literal } = require('sequelize');

    
    // Build where clause
    const where = {};
    
    // Apply category filter (using array contains)
 // Apply category filter (using array contains)
if (category && category !== 'All Works') {
  console.log('filter value for category:', category);
  where[Op.and] = literal(`'${category}' = ANY(categories)`);
}
    
    // Apply year filter
    if (year) {
      where.year = year;
    }
    
    // Apply search filter
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { medium: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Apply price filters
    if (minPrice !== null || maxPrice !== null) {
      where.price = {};
      if (minPrice !== null) where.price[Op.gte] = minPrice;
      if (maxPrice !== null) where.price[Op.lte] = maxPrice;
    }
    
    // Calculate offset
    const offset = (page - 1) * perPage;
    
    // Build order clause
    let order = [['order', 'DESC'], [sortBy, sortOrder]];

    // Execute query with count
    const { count, rows: paintings } = await Painting.findAndCountAll({
      where,
      order,
      limit: perPage,
      offset,
      attributes: { exclude: ['updatedAt'] } // Exclude unnecessary fields
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / perPage);
    
    res.json({
      paintings,
      totalCount: count,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });
    
  } catch (error) {
    console.error('Error in /api/paintings:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/api/admin/paintings/all',verifyToken, requireAdmin, async (req, res) => {
  try {
    const category = req.query.category;
    const sortBy = req.query.sortBy || 'order';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const { literal } = require('sequelize');
    
    // Build where clause
    const where = {};
    
    // Apply category filter
    if (category && category !== 'All Works') {
      where[Op.and] = literal(`'${category}' = ANY(categories)`);
    }
    
    // Build order clause
    let order = [['order', 'DESC'], [sortBy, sortOrder]];

    // Get ALL paintings for admin (no limit)
    const paintings = await Painting.findAll({
      where,
      order,
      attributes: { exclude: ['updatedAt'] }
    });
    
    const totalCount = paintings.length;
    
    res.json({
      paintings,
      totalCount,
      message: `Loaded ${totalCount} paintings for admin`
    });
    
  } catch (error) {
    console.error('Error in /api/admin/paintings/all:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Add this new endpoint
app.get('/api/paintings/featured', async (req, res) => {
  try {
    const featuredPaintings = await Painting.findAll({
      where: { featured: true },
      order: [['updatedAt', 'DESC']],
      limit: 3,
      attributes: { exclude: ['updatedAt'] }
    });
    
    res.json({ paintings: featuredPaintings });
  } catch (error) {
    console.error('Error fetching featured paintings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
/**
 * API endpoint for getting a single painting by ID
 */
app.get('/api/paintings/:id', async (req, res) => {
  try {
    const painting = await Painting.findByPk(req.params.id, {
      
    });
    
    if (!painting) {
      return res.status(404).json({ error: 'Painting not found' });
    }
    
    res.json(painting);
  } catch (error) {
    console.error('Error fetching painting:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



/**
 * API endpoint for getting unique categories
 */
app.get('/api/categories', async (req, res) => {
  try {
    // Using raw SQL for better performance with array operations
    const [results] = await sequelize.query(`
      SELECT DISTINCT unnest(categories) as category 
      FROM paintings 
      
      AND categories IS NOT NULL 
      AND array_length(categories, 1) > 0
      ORDER BY category
    `);
    
    const categories = results.map(row => row.category).filter(cat => cat && cat.trim() !== '');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * API endpoint for getting unique years
 */
app.get('/api/years', async (req, res) => {
  try {
    const years = await Painting.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('year')), 'year']],
      
      order: [['year', 'DESC']],
      raw: true
    });
    
    res.json(years.map(row => row.year));
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * API endpoint for getting price range
 */
app.get('/api/price-range', async (req, res) => {
  try {
    const result = await Painting.findAll({
      attributes: [
        [Sequelize.fn('MIN', Sequelize.col('price')), 'minPrice'],
        [Sequelize.fn('MAX', Sequelize.col('price')), 'maxPrice']
      ],
      where: { 
        
        price: { [Op.ne]: null }
      },
      raw: true
    });
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching price range:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Initialize database and seed with sample data
 */
app.post('/api/init', async (req, res) => {
  try {
    // Sync all models to create tables
    await sequelize.sync({ alter: true });
    console.log('Database tables synchronized successfully');
    
    // Check if exhibitions table exists, if not create it explicitly
    await sequelize.getQueryInterface().createTable('exhibitions', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true
      },
      order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    }).catch(err => {
      if (err.original && err.original.code === '42P07') {
        console.log('Exhibitions table already exists');
      } else {
        console.error('Error creating exhibitions table:', err);
      }
    });

    // Check if exhibition_photos table exists
    await sequelize.getQueryInterface().createTable('exhibition_photos', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      exhibitionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'exhibitions',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true
      },
      imageurl: {
        type: DataTypes.STRING,
        allowNull: false
      },
      order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    }).catch(err => {
      if (err.original && err.original.code === '42P07') {
        console.log('Exhibition photos table already exists');
      } else {
        console.error('Error creating exhibition_photos table:', err);
      }
    });

  } catch (error) {
    console.error('Database initialization error:', error);
  }
});

// Specific routes for HTML pages
app.get('/pages/paintings.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'paintings.html'));
});

app.get('/pages/biography.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'biography.html'));
});

// Add this with your other page routes
app.get('/pages/gallery.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'gallery.html'));
});

// Index route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

/**
 * Start the server
 */
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Auto-sync database in development
  if (process.env.NODE_ENV === 'development') {
    try {
      await sequelize.sync({ alter: true });
      console.log('Database synchronized');
    } catch (error) {
      console.error('Database sync error:', error);
    }
  }
});


// Add these endpoints to your existing server.js file

const multer = require('multer');

const fs = require('fs').promises;

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'assets', 'images'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Add this after the existing order column migration
sequelize.query(`
  ALTER TABLE paintings ADD COLUMN IF NOT EXISTS "featured" BOOLEAN DEFAULT false;
`).catch(err => console.log('Featured column already exists or error:', err.message));
/**
 * Admin API Routes
 */

// Create new painting
app.post('/api/admin/paintings' ,verifyToken, requireAdmin, async (req, res) => {
  try {

    const paintingData = req.body;

     // Check featured limit
    if (paintingData.featured) {
      const featuredCount = await Painting.count({ where: { featured: true } });
      if (featuredCount >= 3) {
        return res.status(400).json({ 
          error: 'Featured limit reached',
          message: 'Only 3 paintings can be featured at once. Please unfeature another painting first.'
        });
      }
    }
    
    // Get the highest order value and increment
    const maxOrder = await Painting.max('order') || 0;
    paintingData.order = maxOrder + 1;
    const painting = await Painting.create(paintingData);
    res.status(201).json({ painting });
  } catch (error) {
    console.error('Error creating painting:', error);
    res.status(500).json({ error: 'Failed to create painting' });
  }
});

// Update existing painting
app.put('/api/admin/paintings/:id' ,verifyToken, requireAdmin, async (req, res) => {
  try {
    const paintingId = req.params.id;
    const updateData = req.body;

        // Check featured limit if trying to feature a painting
    if (updateData.featured) {
      const featuredCount = await Painting.count({ 
        where: { 
          featured: true,
          id: { [Op.ne]: paintingId } // Exclude current painting
        } 
      });
      if (featuredCount >= 3) {
        return res.status(400).json({ 
          error: 'Featured limit reached',
          message: 'Only 3 paintings can be featured at once. Please unfeature another painting first.'
        });
      }
    }
    
    const [updatedRows] = await Painting.update(updateData, {
      where: { id: paintingId },
      returning: true
    });
    
    if (updatedRows === 0) {
      return res.status(404).json({ error: 'Painting not found' });
    }
    
    const updatedPainting = await Painting.findByPk(paintingId);
    res.json({ painting: updatedPainting });
  } catch (error) {
    console.error('Error updating painting:', error);
    res.status(500).json({ error: 'Failed to update painting' });
  }
});

// Delete painting
app.delete('/api/admin/paintings/:id' ,verifyToken, requireAdmin, async (req, res) => {
  try {
    const paintingId = req.params.id;
    
    // Get painting details before deletion (for image cleanup)
    const painting = await Painting.findByPk(paintingId);
    if (!painting) {
      return res.status(404).json({ error: 'Painting not found' });
    }
    
    // Delete the painting record
    await Painting.destroy({ where: { id: paintingId } });
    
    // Optionally delete the image file
    if (painting.imageurl && painting.imageurl.startsWith('/assets/images/')) {
      try {
        const imagePath = path.join(__dirname, painting.imageurl);
        await fs.unlink(imagePath);
      } catch (err) {
        console.log('Could not delete image file:', err.message);
      }
    }
    
    res.json({ message: 'Painting deleted successfully' });
  } catch (error) {
    console.error('Error deleting painting:', error);
    res.status(500).json({ error: 'Failed to delete painting' });
  }
});

// Upload image for painting
app.post('/api/admin/paintings/:id/image', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {

    const paintingId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const imageUrl = `/assets/images/${req.file.filename}`;

    
    await Painting.update(
      { imageurl: imageUrl }, 
      { where: { id: paintingId } }
    );
    
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Reorder paintings
// Replace your existing reorder endpoint with this improved version

// Fixed reorder paintings endpoint - Replace the existing one in your server.js

app.post('/api/admin/paintings/reorder' ,verifyToken, requireAdmin, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Reorder request received:', req.body);
    const { order } = req.body;
    
    // Validate input
    if (!Array.isArray(order)) {
      return res.status(400).json({ 
        error: 'Invalid request format',
        message: 'Order must be an array' 
      });
    }
    
    if (order.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Order array cannot be empty' 
      });
    }
    
    // Validate each order item
    for (let i = 0; i < order.length; i++) {
      const item = order[i];
      if (!item || typeof item.id !== 'number' || typeof item.order !== 'number') {
        return res.status(400).json({ 
          error: 'Invalid order item',
          message: `Item at index ${i} must have numeric id and order properties`,
          received: item
        });
      }
    }
    
    console.log(`Processing reorder for ${order.length} paintings`);
    
    // Verify all paintings exist before updating
    const paintingIds = order.map(item => item.id);
    const existingPaintings = await Painting.findAll({
      where: { id: paintingIds },
      attributes: ['id'],
      transaction
    });
    
    if (existingPaintings.length !== paintingIds.length) {
      const foundIds = existingPaintings.map(p => p.id);
      const missingIds = paintingIds.filter(id => !foundIds.includes(id));
      
      return res.status(400).json({
        error: 'Paintings not found',
        message: `Cannot find paintings with IDs: ${missingIds.join(', ')}`,
        missingIds
      });
    }
    
    // Perform updates one by one with detailed logging
    const updateResults = [];
    for (const item of order) {
      console.log(`Updating painting ${item.id} to order ${item.order}`);
      
      const [affectedRows] = await Painting.update(
        { order: item.order }, 
        { 
          where: { id: item.id },
          transaction
        }
      );
      
      updateResults.push({
        id: item.id,
        order: item.order,
        updated: affectedRows > 0
      });
      
      if (affectedRows === 0) {
        console.warn(`No rows updated for painting ID ${item.id}`);
      }
    }
    
    // Check for failures
    const failedUpdates = updateResults.filter(result => !result.updated);
    if (failedUpdates.length > 0) {
      console.error('Failed updates:', failedUpdates);
      throw new Error(`Failed to update ${failedUpdates.length} paintings: ${failedUpdates.map(f => f.id).join(', ')}`);
    }
    
    // Commit the transaction
    await transaction.commit();
    
    console.log('Reorder completed successfully');
    res.json({ 
      success: true,
      message: 'Order updated successfully',
      updatedCount: order.length,
      results: updateResults
    });
    
  } catch (error) {
    // Rollback the transaction on error
    await transaction.rollback();
    
    console.error('Reorder error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to update order',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        originalRequest: req.body
      } : undefined
    });
  }
});


// Add these exhibition endpoints after your existing painting endpoints

/**
 * Exhibition API Routes
 */

// Get all exhibitions (public endpoint for gallery.html)
app.get('/api/exhibitions', async (req, res) => {
  try {
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    const exhibitions = await Exhibition.findAll({
      include: [{
        model: ExhibitionPhoto,
        as: 'photos',
        order: [['order', 'ASC']]
      }],
      order: [[sortBy, sortOrder]]
    });
    
    res.json({ exhibitions });
  } catch (error) {
    console.error('Error fetching exhibitions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single exhibition by ID (public endpoint)
app.get('/api/exhibitions/:id', async (req, res) => {
  try {
    const exhibition = await Exhibition.findByPk(req.params.id, {
      include: [{
        model: ExhibitionPhoto,
        as: 'photos',
        order: [['order', 'ASC']]
      }]
    });
    
    if (!exhibition) {
      return res.status(404).json({ error: 'Exhibition not found' });
    }
    
    res.json(exhibition);
  } catch (error) {
    console.error('Error fetching exhibition:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all exhibitions
app.get('/api/admin/exhibitions', verifyToken, requireAdmin, async (req, res) => {
  try {
    const exhibitions = await Exhibition.findAll({
      include: [{
        model: ExhibitionPhoto,
        as: 'photos',
        order: [['order', 'ASC']]
      }],
      order: [['date', 'DESC']]
    });
    
    res.json({ exhibitions });
  } catch (error) {
    console.error('Error fetching exhibitions:', error);
    res.status(500).json({ error: 'Failed to fetch exhibitions' });
  }
});

// Admin: Create new exhibition
app.post('/api/admin/exhibitions', verifyToken, requireAdmin, async (req, res) => {
  try {
    const exhibitionData = req.body;
    
    // Get the highest order value and increment
    const maxOrder = await Exhibition.max('order') || 0;
    exhibitionData.order = maxOrder + 1;
    
    const exhibition = await Exhibition.create(exhibitionData);
    res.status(201).json({ exhibition });
  } catch (error) {
    console.error('Error creating exhibition:', error);
    res.status(500).json({ error: 'Failed to create exhibition' });
  }
});

// Admin: Update exhibition
app.put('/api/admin/exhibitions/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const exhibitionId = req.params.id;
    const updateData = req.body;
    
    const [updatedRows] = await Exhibition.update(updateData, {
      where: { id: exhibitionId },
      returning: true
    });
    
    if (updatedRows === 0) {
      return res.status(404).json({ error: 'Exhibition not found' });
    }
    
    const updatedExhibition = await Exhibition.findByPk(exhibitionId, {
      include: [{
        model: ExhibitionPhoto,
        as: 'photos',
        order: [['order', 'ASC']]
      }]
    });
    
    res.json({ exhibition: updatedExhibition });
  } catch (error) {
    console.error('Error updating exhibition:', error);
    res.status(500).json({ error: 'Failed to update exhibition' });
  }
});

// Admin: Delete exhibition
app.delete('/api/admin/exhibitions/:id', verifyToken, requireAdmin, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const exhibitionId = req.params.id;
    
    // Get exhibition with photos before deletion
    const exhibition = await Exhibition.findByPk(exhibitionId, {
      include: [{
        model: ExhibitionPhoto,
        as: 'photos'
      }]
    });
    
    if (!exhibition) {
      return res.status(404).json({ error: 'Exhibition not found' });
    }
    
    // Delete photo files
    if (exhibition.photos && exhibition.photos.length > 0) {
      for (const photo of exhibition.photos) {
        if (photo.imageurl && photo.imageurl.startsWith('/assets/images/')) {
          try {
            const imagePath = path.join(__dirname, photo.imageurl);
            await fs.unlink(imagePath);
          } catch (err) {
            console.log('Could not delete photo file:', err.message);
          }
        }
      }
    }
    
    // Delete photos from database (cascade should handle this, but explicit is better)
    await ExhibitionPhoto.destroy({
      where: { exhibitionId: exhibitionId },
      transaction
    });
    
    // Delete exhibition
    await Exhibition.destroy({
      where: { id: exhibitionId },
      transaction
    });
    
    await transaction.commit();
    
    res.json({ message: 'Exhibition deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting exhibition:', error);
    res.status(500).json({ error: 'Failed to delete exhibition' });
  }
});

// Admin: Upload photos for exhibition
app.post('/api/admin/exhibitions/:id/photos', verifyToken, requireAdmin, upload.array('photos', 10), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const exhibitionId = req.params.id;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photo files provided' });
    }
    
    // Verify exhibition exists
    const exhibition = await Exhibition.findByPk(exhibitionId);
    if (!exhibition) {
      return res.status(404).json({ error: 'Exhibition not found' });
    }
    
    // Get current max order for photos
    const maxOrder = await ExhibitionPhoto.max('order', {
      where: { exhibitionId }
    }) || 0;
    
    // Create photo records
    const photoPromises = req.files.map((file, index) => {
      return ExhibitionPhoto.create({
        exhibitionId: exhibitionId,
        imageurl: `/assets/images/${file.filename}`,
        title: req.body.titles ? req.body.titles[index] : null,
        order: maxOrder + index + 1
      }, { transaction });
    });
    
    const photos = await Promise.all(photoPromises);
    await transaction.commit();
    
    res.json({ 
      message: 'Photos uploaded successfully',
      photos,
      count: photos.length 
    });
  } catch (error) {
    await transaction.rollback();
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path).catch(err => 
          console.log('Could not delete uploaded file:', err.message)
        );
      });
    }
    
    console.error('Error uploading photos:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

// Admin: Delete single photo
app.delete('/api/admin/exhibitions/:exhibitionId/photos/:photoId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { exhibitionId, photoId } = req.params;
    
    const photo = await ExhibitionPhoto.findOne({
      where: { 
        id: photoId, 
        exhibitionId: exhibitionId 
      }
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Delete file
    if (photo.imageurl && photo.imageurl.startsWith('/assets/images/')) {
      try {
        const imagePath = path.join(__dirname, photo.imageurl);
        await fs.unlink(imagePath);
      } catch (err) {
        console.log('Could not delete photo file:', err.message);
      }
    }
    
    // Delete from database
    await ExhibitionPhoto.destroy({
      where: { id: photoId }
    });
    
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// Admin: Reorder exhibition photos
app.post('/api/admin/exhibitions/:id/photos/reorder', verifyToken, requireAdmin, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const exhibitionId = req.params.id;
    const { order } = req.body;
    
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Order must be an array' });
    }
    
    // Update photo orders
    const updatePromises = order.map(item => {
      return ExhibitionPhoto.update(
        { order: item.order },
        { 
          where: { 
            id: item.id, 
            exhibitionId: exhibitionId 
          },
          transaction 
        }
      );
    });
    
    await Promise.all(updatePromises);
    await transaction.commit();
    
    res.json({ 
      message: 'Photo order updated successfully',
      updatedCount: order.length 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error reordering photos:', error);
    res.status(500).json({ error: 'Failed to update photo order' });
  }
});




app.get('/pages/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'login.html'));
});


// Serve admin page
app.get('/pages/admin.html' , (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'admin.html'));
});