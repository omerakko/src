/**
 * main.js - Main JavaScript file for Artist Portfolio
 * Handles common functionality across all pages
 */

// DOM Elements
const navElement = document.querySelector('nav');

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
}

// Run initialization when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeCommon);
