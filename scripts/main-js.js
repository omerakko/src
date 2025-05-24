/**
 * main.js - Main JavaScript file for Artist Portfolio
 * Handles common functionality across all pages
 */

// DOM Elements
const featuredItems = document.querySelectorAll('.featured-item');
const navElement = document.querySelector('nav');
const modal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalCaption = document.getElementById('modalCaption');
const closeModal = document.querySelector('.close-modal');

function setupModalFunctionality() {
  // Open modal when clicking on gallery items
  featuredItems.forEach(item => {
    item.addEventListener('click', function() {
      const imgSrc = this.querySelector('.featured-image').src;
      const imgAlt = this.querySelector('.featured-image').alt;
      const title = this.querySelector('.featured-title').textContent;
      
      // Set modal content
      modalImage.src = imgSrc;
      modalImage.alt = imgAlt;
      modalCaption.innerHTML = `<h3>${title}</h3>`;
      
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

// Navigation scroll effect
function handleNavScroll() {
  if (window.scrollY > 50) {
    navElement.classList.add('scrolled');
  } else {
    navElement.classList.remove('scrolled');
  }
}

// Smooth scrolling for anchor links
function setupSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Page transition effect
function setupPageTransitions() {
  const contentElement = document.querySelector('body');
  
  // Add initial fade-in class
  contentElement.classList.add('fade-in');
  
  // Remove the class after animation completes
  setTimeout(() => {
    contentElement.classList.remove('fade-in');
  }, 500);
}

// Initialize all common functions
function initializeCommon() {
  // Set up scroll event listener
  window.addEventListener('scroll', handleNavScroll);
  
  // Initial call for nav styling
  handleNavScroll();
  
  // Set up smooth scrolling
  setupSmoothScrolling();
  
  // Set up page transitions
  setupPageTransitions();

  setupModalFunctionality()
}

// Run initialization when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeCommon);
