/**
 * server.js - Express server with PostgreSQL database for paintings
 * This handles pagination and filtering for the painting gallery
 */

const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
//const verifyFirebaseToken = require('./middleware/firebaseAuth');



/*
const validator = require('validator'); // if not already imported
const session = require('express-session');
const authRoutes = require('./routes/admin-auth');
const { requireAuth } = require('./middleware/auth');
*/

// Database connection
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://postgres:omer@localhost:5432/painting_gallery',
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

// Serve static files and middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());




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
    const where = { isavailable: true };
    
    // Apply category filter (using array contains)
    if (category && category !== 'All Works') {
      console.log('filter value for category:', category);

      where[Op.and] = literal(`categories @> ARRAY['${category}']::text[]`);
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
    let order = [['order', 'ASC'], [sortBy, sortOrder]];

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

/**
 * API endpoint for getting a single painting by ID
 */
app.get('/api/paintings/:id', async (req, res) => {
  try {
    const painting = await Painting.findByPk(req.params.id, {
      where: { isavailable: true }
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
      WHERE "isavailable" = true 
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
      where: { isavailable: true },
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
        isavailable: true,
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
    // Sync database (creates tables)
    await sequelize.sync({ force: false });
    
    // Check if data already exists
    const existingCount = await Painting.count();
    if (existingCount > 0) {
      return res.json({ message: 'Database already initialized' });
    }
    
    /*const samplePaintings = [
      {
        title: 'Summer Dreams',
        medium: 'Oil on Canvas',
        year: '2023',
        imageurl: '../assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        categories: ['Nature'],
        description: 'A vibrant representation of summer landscapes',
        price: 1200.00
      },
      {
        title: 'Mountain Solitude',
        medium: 'Acrylic on Canvas',
        year: '2022',
        imageurl: '../assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        categories: ['Landscapes'],
        description: 'Peaceful mountain scene capturing tranquility',
        price: 800.00
      },
      {
        title: 'Urban Poetry',
        medium: 'Mixed Media',
        year: '2024',
        imageurl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        categories: ['Abstract'],
        description: 'Contemporary urban expression through mixed media',
        price: 1500.00
      },
      {
        title: 'Autumn Reflections',
        medium: 'Watercolor',
        year: '2021',
        imageurl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        categories: ['Nature', 'Landscapes'],
        description: 'Delicate watercolor capturing autumn\'s beauty',
        price: 600.00
      },
      {
        title: 'Abstract Flow',
        medium: 'Oil on Canvas',
        year: '2023',
        imageurl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        categories: ['Abstract'],
        description: 'Dynamic abstract composition with flowing forms',
        price: 1400.00
      },
      {
        title: 'Winter Silence',
        medium: 'Acrylic on Canvas',
        year: '2022',
        imageurl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        categories: ['Nature', 'Landscapes'],
        description: 'Serene winter landscape in muted tones',
        price: 900.00
      },
      {
        title: 'Self Portrait',
        medium: 'Oil on Canvas',
        year: '2024',
        imageurl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        categories: ['Portraits'],
        description: 'Introspective self-portrait exploring identity',
        price: 2000.00
      },
      {
        title: 'Coastal Dreams',
        medium: 'Oil on Canvas',
        year: '2021',
        imageurl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        categories: ['Nature', 'Landscapes'],
        description: 'Dreamy coastal scene with soft lighting',
        price: 1100.00
      },
      {
        title: 'Evening Light',
        medium: 'Oil on Canvas',
        year: '2020',
        imageurl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        categories: ['Landscapes'],
        description: 'Golden hour lighting captured in oil',
        price: 950.00
      },
      {
        title: 'Abstract Emotion',
        medium: 'Mixed Media',
        year: '2023',
        imageurl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        categories: ['Abstract'],
        description: 'Emotional expression through abstract forms',
        price: 1300.00
      },
      {
        title: 'Spring Blossoms',
        medium: 'Watercolor',
        year: '2022',
        imageurl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        categories: ['Nature'],
        description: 'Delicate spring flowers in watercolor',
        price: 550.00
      },
      {
        title: 'Family Portrait',
        medium: 'Oil on Canvas',
        year: '2021',
        imageurl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        categories: ['Portraits'],
        description: 'Warm family portrait capturing love and connection',
        price: 2500.00
      }
    ];*/
    
    await Painting.bulkCreate(samplePaintings);
    res.json({ message: 'Database initialized and seeded successfully', count: samplePaintings.length });
  } catch (error) {
    console.error('Error initializing database:', error);
    res.status(500).json({ error: 'Failed to initialize database' });
  }
});

// Specific routes for HTML pages
app.get('/pages/paintings.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'paintings.html'));
});

app.get('/pages/biography.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'biography.html'));
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

// Add order field to Painting model (run this migration)
sequelize.query(`
  ALTER TABLE paintings ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;
  UPDATE paintings SET "order" = id WHERE "order" = 0;
`).catch(err => console.log('Order column already exists or error:', err.message));

/**
 * Admin API Routes
 */

// Create new painting
app.post('/api/admin/paintings' , async (req, res) => {
  try {

    const paintingData = req.body;
    
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
app.put('/api/admin/paintings/:id' , async (req, res) => {
  try {
    const paintingId = req.params.id;
    const updateData = req.body;
    
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
app.delete('/api/admin/paintings/:id' , async (req, res) => {
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
app.post('/api/admin/paintings/:id/image', upload.single('image') , async (req, res) => {
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

app.post('/api/admin/paintings/reorder' , async (req, res) => {
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



// Serve admin page
app.get('/pages/admin.html' , (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'admin.html'));
});