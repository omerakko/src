/**
 * gallery.js - Gallery page functionality for Artist Portfolio
 * Handles image modal and category filtering
 */

// DOM Elements
const galleryItems = document.querySelectorAll('.gallery-item');
const categoryButtons = document.querySelectorAll('.category-button');
const modal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalCaption = document.getElementById('modalCaption');
const closeModal = document.querySelector('.close-modal');

/**
 * Modal functionality
 */
function setupModalFunctionality() {
  // Open modal when clicking on gallery items
  galleryItems.forEach(item => {
    item.addEventListener('click', function() {
      const imgSrc = this.querySelector('.gallery-image').src;
      const imgAlt = this.querySelector('.gallery-image').alt;
      const title = this.querySelector('.gallery-title').textContent;
      const details = this.querySelector('.gallery-details').innerHTML;
      
      // Set modal content
      modalImage.src = imgSrc;
      modalImage.alt = imgAlt;
      modalCaption.innerHTML = `<h3>${title}</h3>${details}`;
      
      // Display modal
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    });
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
}

// Function to close the modal
function closeImageModal() {
  modal.style.display = 'none';
  document.body.style.overflow = ''; // Restore scrolling
}

/**
 * Category filtering functionality
 */
function setupCategoryFiltering() {
  // Assign categories to gallery items (in a real scenario, these would be data attributes in the HTML)
  const categories = {
    'All Works': galleryItems,
    'Nature': Array.from(galleryItems).filter((_, i) => [0, 3, 5, 7].includes(i)),
    'Abstract': Array.from(galleryItems).filter((_, i) => [2, 4].includes(i)),
    'Portraits': Array.from(galleryItems).filter((_, i) => [6].includes(i)),
    'Landscapes': Array.from(galleryItems).filter((_, i) => [1, 3, 5, 7].includes(i))
  };
  
  // Add click event to category buttons
  categoryButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Update active button
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      const category = this.textContent;
      
      // Filter gallery items
      galleryItems.forEach(item => {
        item.style.display = 'none'; // Hide all items first
      });
      
      // Show items of selected category
      if (categories[category]) {
        categories[category].forEach(item => {
          item.style.display = 'block';
        });
      }
      
      // Apply animation to visible items
      setTimeout(() => {
        const visibleItems = document.querySelectorAll('.gallery-item[style="display: block;"]');
        visibleItems.forEach((item, index) => {
          item.style.transition = 'opacity 0.3s ease';
          item.style.opacity = '0';
          
          setTimeout(() => {
            item.style.opacity = '1';
          }, index * 100);
        });
      }, 10);
    });
  });
}

/**
 * Initialize gallery functionality
 */
function initializeGallery() {
  setupModalFunctionality();
  setupCategoryFiltering();
}

// Run initialization when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeGallery);
