/**
 * server.js - Express server with API endpoint for paintings
 * This handles pagination and filtering for the painting gallery
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the project directory
app.use(express.static(path.join(__dirname)));

// Sample painting data (in a real app, this would come from a database)
const paintings = [
  {
    id: 1,
    title: 'Summer Dreams',
    medium: 'Oil on Canvas',
    year: '2023',
    imageUrl: '../assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
    categories: ['Nature']
  },
  {
    id: 2,
    title: 'Mountain Solitude',
    medium: 'Acrylic on Canvas',
    year: '2022',
    imageUrl: '../assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
    categories: ['Landscapes']
  },
  {
    id: 3,
    title: 'Urban Poetry',
    medium: 'Mixed Media',
    year: '2024',
    imageUrl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
    categories: []
  },
  {
    id: 4,
    title: 'Autumn Reflections',
    medium: 'Watercolor',
    year: '2021',
    imageUrl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
    categories: ['Nature', 'Landscapes']
  },
  {
    id: 5,
    title: 'Abstract Flow',
    medium: 'Oil on Canvas',
    year: '2023',
    imageUrl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
    categories: ['Abstract']
  },
  {
    id: 6,
    title: 'Winter Silence',
    medium: 'Acrylic on Canvas',
    year: '2022',
    imageUrl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
    categories: ['Nature', 'Landscapes']
  },
  {
    id: 7,
    title: 'Self Portrait',
    medium: 'Oil on Canvas',
    year: '2024',
    imageUrl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
    categories: ['Portraits']
  },
  {
    id: 8,
    title: 'Coastal Dreams',
    medium: 'Oil on Canvas',
    year: '2021',
    imageUrl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
    categories: ['Nature', 'Landscapes']
  },
  // Add more paintings here
  // To test pagination, you should have at least 12-18 paintings
  {
    id: 9,
    title: 'Evening Light',
    medium: 'Oil on Canvas',
    year: '2020',
    imageUrl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
    categories: ['Landscapes']
  },
  {
    id: 10,
    title: 'Abstract Emotion',
    medium: 'Mixed Media',
    year: '2023',
    imageUrl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
    categories: ['Abstract']
  },
  {
    id: 11,
    title: 'Spring Blossoms',
    medium: 'Watercolor',
    year: '2022',
    imageUrl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
    categories: ['Nature']
  },
  {
    id: 12,
    title: 'Family Portrait',
    medium: 'Oil on Canvas',
    year: '2021',
    imageUrl: '/assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
    categories: ['Portraits']
  }
  // Continue adding more paintings as needed
];

/**
 * API endpoint for fetching paintings with pagination and filtering
 */
app.get('/api/paintings', (req, res) => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 6;
    const category = req.query.category;
    
    // Apply category filter if provided
    let filteredPaintings = paintings;
    if (category && category !== 'All Works') {
      filteredPaintings = paintings.filter(painting => 
        painting.categories.includes(category)
      );
    }
    
    // Calculate pagination
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedPaintings = filteredPaintings.slice(startIndex, endIndex);
    
    // Simulate server delay (remove in production)
    setTimeout(() => {
      res.json({
        paintings: paginatedPaintings,
        totalCount: filteredPaintings.length,
        currentPage: page,
        totalPages: Math.ceil(filteredPaintings.length / perPage)
      });
    }, 300);
    
  } catch (error) {
    console.error('Error in /api/paintings:', error);
    res.status(500).json({ error: 'Server error' });
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

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});