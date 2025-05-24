/**
 * enhanced-gallery.js - Adds infinite scrolling to the existing gallery functionality
 * Enhances the existing gallery-js.js with pagination and smooth loading backed by server-side data
 */

// Configuration for infinite scrolling
const PAINTINGS_PER_PAGE = 6;
let currentPage = 1;
let isLoading = false;
let activeCategory = 'All Works';
let hasMorePaintings = true; // Track if there are more paintings to load
const modal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalCaption = document.getElementById('modalCaption');
const closeModal = document.querySelector('.close-modal');

// DOM Elements
const galleryGrid = document.querySelector('.gallery-grid');
const loadingIndicator = createLoadingIndicator();

/**
 * Create and insert a loading indicator into the DOM
 */
function createLoadingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'loading-indicator';
  indicator.innerHTML = `
    <div class="spinner"></div>
    <p>Loading more artwork...</p>
  `;
  indicator.style.display = 'none';
  document.querySelector('.gallery-container').appendChild(indicator);
  return indicator;
}

/**
 * Initialize gallery by loading first page of paintings
 */
function initializeGalleryWithBackend() {
  // Clear the gallery grid to prepare for paginated loading
  galleryGrid.innerHTML = '';
  
  // Load the first page
  loadPaintingsFromServer(1, PAINTINGS_PER_PAGE, activeCategory);
}

/**
 * Fetch paintings from the server
 * @param {number} page - Page number to load
 * @param {number} perPage - Number of paintings per page
 * @param {string} category - Category to filter by
 */
async function loadPaintingsFromServer(page, perPage, category) {
  isLoading = true;
  
  if (page > 1) {
    loadingIndicator.style.display = 'flex';
  }
  
  try {
    // Construct the API URL with query parameters
    const url = new URL('/api/paintings', window.location.origin);
    url.searchParams.append('page', page);
    url.searchParams.append('perPage', perPage);
    if (category !== 'All Works') {
      url.searchParams.append('category', category);
    }
    
    console.log('Fetching paintings from:', url.toString());
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch paintings');
    }
    
    const data = await response.json();
    
    // Check if we've received any paintings
    if (data.paintings.length === 0) {
      hasMorePaintings = false;
      isLoading = false;
      loadingIndicator.style.display = 'none';
      return false;
    }
    
    // Check if there are more paintings available
    hasMorePaintings = data.totalCount > (page * perPage);
    
    // Render the paintings with staggered animation
    renderPaintings(data.paintings);
    
    return true;
  } catch (error) {
    console.error('Error loading paintings:', error);
    
    // Show error message in the gallery
    if (page === 1) {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'error-message';
      errorMessage.textContent = 'Failed to load artwork. Please try again later.';
      galleryGrid.appendChild(errorMessage);
    }
    
    return false;
  } finally {
    isLoading = false;
    loadingIndicator.style.display = 'none';
  }
}

/**
 * Render paintings with staggered animation
 * @param {Array} paintings - Array of painting objects
 */
function renderPaintings(paintings) {
  paintings.forEach((painting, index) => {
    const paintingElement = createPaintingElement(painting);
    paintingElement.style.opacity = '0';
    paintingElement.style.transform = 'translateY(20px)';
    galleryGrid.appendChild(paintingElement);
    
    // Staggered animation
    setTimeout(() => {
      paintingElement.style.opacity = '1';
      paintingElement.style.transform = 'translateY(0)';
    }, index * 100);
  });
}

/**
 * Create a painting element based on the existing HTML structure
 * @param {Object} painting - Painting data from API
 */
function createPaintingElement(painting) {
  const galleryItem = document.createElement('div');
  galleryItem.className = 'gallery-item';
  
  galleryItem.innerHTML = `
    <img src="${painting.imageUrl}" alt="${painting.title}" class="gallery-image" loading="lazy">
    <div class="gallery-caption">
      <h3 class="gallery-title">${painting.title}</h3>
      <div class="gallery-details">
        <span>${painting.medium}</span>
        <span>${painting.year}</span>
      </div>
    </div>
  `;
  
  // Add click event for modal
  galleryItem.addEventListener('click', function() {
    const imgSrc = this.querySelector('.gallery-image').src;
    const imgAlt = this.querySelector('.gallery-image').alt;
    const title = this.querySelector('.gallery-title').textContent;
    const details = this.querySelector('.gallery-details').innerHTML;
    
    // Set modal content
    const modalImage = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    const modal = document.getElementById('imageModal');
    
    modalImage.src = imgSrc;
    modalImage.alt = imgAlt;
    modalCaption.innerHTML = `<h3>${title}</h3>${details}`;
    
    // Display modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
  });

    // Close modal when clicking on X button
    closeModal.addEventListener('click', closeImageModal);
  
    // Close modal when clicking outside the image
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeImageModal();
      }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        closeImageModal();
      }
    });
  
  return galleryItem;
}

  // Close modal when clicking on X button
  closeModal.addEventListener('click', closeImageModal);
  
  // Close modal when clicking outside the image
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeImageModal();
    }
  });
  
  // Close modal with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeImageModal();
    }
  });


// Function to close the modal
function closeImageModal() {
  modal.style.display = 'none';
  document.body.style.overflow = ''; // Restore scrolling
}

/**
 * Handle scroll event for infinite scrolling
 */
function handleScroll() {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  
  // Check if user has scrolled to the bottom (with 300px threshold)
  if (scrollTop + clientHeight >= scrollHeight - 300) {
    if (!isLoading && hasMorePaintings) {
      loadMorePaintings();
    }
  }
}

/**
 * Load the next page of paintings
 */
function loadMorePaintings() {
  // Only load more if we're not currently loading and there are more to load
  if (!isLoading && hasMorePaintings) {
    currentPage++;
    loadPaintingsFromServer(currentPage, PAINTINGS_PER_PAGE, activeCategory);
  }
}

/**
 * Update category filtering to work with infinite scrolling
 */
function enhanceCategoryFiltering() {
  const categoryButtons = document.querySelectorAll('.category-button');
  
  categoryButtons.forEach(button => {
    // Add click event listener to each button
    button.addEventListener('click', function() {
      // Remove 'active' class from all buttons
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add 'active' class to the clicked button
      this.classList.add('active');
      
      // Update the active category with the clicked button's text content
      activeCategory = this.textContent;
      
      // Reset pagination and other state
      currentPage = 1;
      hasMorePaintings = true;
      
      // Clear the current gallery grid and load the first page of paintings with the new category
      galleryGrid.innerHTML = '';
      loadPaintingsFromServer(1, PAINTINGS_PER_PAGE, activeCategory);
    });
  });
}

/**
 * Initialize enhanced gallery functionality
 */
function initializeEnhancedGallery() {
  // Add CSS for loading indicator and error message
  const style = document.createElement('style');
  style.textContent = `
    .loading-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px;
      margin-top: 20px;
      width: 100%;
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(0,0,0,0.1);
      border-radius: 50%;
      border-top-color: #333;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 10px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .error-message {
      text-align: center;
      padding: 30px;
      color: #721c24;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      margin: 20px 0;
      width: 100%;
    }
  `;
  document.head.appendChild(style);
  
  // Initialize gallery with backend data
  initializeGalleryWithBackend();
  
  // Set up enhanced category filtering
  enhanceCategoryFiltering();
  
  // Set up infinite scroll listener
  window.addEventListener('scroll', handleScroll);
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {

  
  
  initializeEnhancedGallery();
});