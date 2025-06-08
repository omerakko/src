
class PaintingAdmin {
  constructor() {
    this.paintings = [];
    this.currentCategory = 'All Works';
    this.isReorderMode = false;
    this.draggedElement = null;
    this.originalOrder = [];
    
    this.initializeElements();
    this.bindEvents();
    this.loadPaintings();
  }

  initializeElements() {
    // Modal elements
    this.paintingModal = document.getElementById('paintingModal');
    this.confirmModal = document.getElementById('confirmModal');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    
    // Form elements
    this.paintingForm = document.getElementById('paintingForm');
    this.modalTitle = document.getElementById('modalTitle');
    
    // Button elements
    this.addPaintingBtn = document.getElementById('addPaintingBtn');
    this.toggleReorderBtn = document.getElementById('toggleReorderBtn');
    this.saveOrderBtn = document.getElementById('saveOrderBtn');
    this.closePaintingModal = document.getElementById('closePaintingModal');
    
    // Gallery
    this.galleryGrid = document.getElementById('adminGalleryGrid');
    this.categoryButtons = document.querySelectorAll('.category-button');
  }

  bindEvents() {
    // Button events
    this.addPaintingBtn.addEventListener('click', () => this.openAddModal());
    this.toggleReorderBtn.addEventListener('click', () => this.toggleReorderMode());
    this.saveOrderBtn.addEventListener('click', () => this.saveOrder());
    this.closePaintingModal.addEventListener('click', () => this.closeModal());
    
    // Form events
    this.paintingForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
    
    // Modal close events
    this.paintingModal.addEventListener('click', (e) => {
      if (e.target === this.paintingModal) this.closeModal();
    });
    
    // Category filter events
    this.categoryButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleCategoryFilter(e));
    });
    
    // Confirm modal events
    document.getElementById('confirmCancel').addEventListener('click', () => {
      this.confirmModal.style.display = 'none';
    });
    
    // Image preview
    document.getElementById('imageFile').addEventListener('change', (e) => {
      this.previewImage(e.target.files[0]);
    });
  }

  async loadPaintings() {
    this.showLoading(true);
    try {
      const response = await fetch(`/api/paintings?perPage=100&category=${this.currentCategory}`);
      const data = await response.json();
      this.paintings = data.paintings;
      this.renderPaintings();
    } catch (error) {
      console.error('Error loading paintings:', error);
      this.showMessage('Failed to load paintings', 'error');
    } finally {
      this.showLoading(false);
    }
  }

renderPaintings() {
  console.log('Rendering paintings:', this.paintings.length);
  this.galleryGrid.innerHTML = '';
  
  if (!Array.isArray(this.paintings)) {
    console.error('Paintings is not an array:', this.paintings);
    this.showMessage('Error: Invalid paintings data', 'error');
    return;
  }
  
  this.paintings.forEach((painting, index) => {
    try {
      const paintingElement = this.createPaintingElement(painting, index);
      if (paintingElement) {
        this.galleryGrid.appendChild(paintingElement);
      } else {
        console.error('Failed to create element for painting:', painting);
      }
    } catch (error) {
      console.error(`Error creating painting element at index ${index}:`, error, painting);
    }
  });
  
  // Verify all elements have the required data attributes
  const addedElements = this.galleryGrid.children;
  console.log(`Added ${addedElements.length} elements to gallery`);
  
  // Debug: Check for missing data attributes
  for (let i = 0; i < addedElements.length; i++) {
    const element = addedElements[i];
    if (!element.dataset.paintingId) {
      console.error(`Element at index ${i} missing paintingId:`, element);
    }
  }
}

createPaintingElement(painting, index) {
  // Validate painting object
  if (!painting || !painting.id) {
    console.error('Invalid painting object:', painting);
    return null;
  }
  
  const element = document.createElement('div');
  element.className = 'gallery-item admin-gallery-item';
  
  // Ensure data attributes are set correctly
  element.dataset.paintingId = painting.id.toString();
  element.dataset.index = index.toString();
  
  // Validate required fields with fallbacks
  const title = painting.title || 'Untitled';
  const medium = painting.medium || 'Unknown Medium';
  const year = painting.year || 'Unknown Year';
  const imageUrl = painting.imageurl || '/assets/images/placeholder.jpg';
  
  element.innerHTML = `
    <img src="${imageUrl}" alt="${title}" class="gallery-image" loading="lazy" 
         onerror="this.src='/assets/images/placeholder.jpg'">
    <div class="gallery-caption">
      <h3 class="gallery-title">${title}</h3>
      <div class="gallery-details">
        <span>${medium}</span>
        <span>${year}</span>
      </div>
    </div>
    
    <div class="admin-item-controls">
      <button class="control-btn edit-btn" title="Edit">✏</button>
      <button class="control-btn delete-btn" title="Delete">🗑</button>
    </div>
    
    <button class="drag-handle" title="Drag to reorder">⋮⋮</button>
  `;
  
  // Verify the data attributes were set
  console.log('Created element for painting:', {
    id: painting.id,
    title: painting.title,
    datasetPaintingId: element.dataset.paintingId,
    datasetIndex: element.dataset.index
  });
  
  // Bind events
  const editBtn = element.querySelector('.edit-btn');
  const deleteBtn = element.querySelector('.delete-btn');
  
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEditModal(painting);
    });
  }
  
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.confirmDelete(painting);
    });
  }
  
  // Drag and drop events
  element.draggable = true;
  element.addEventListener('dragstart', (e) => this.handleDragStart(e));
  element.addEventListener('dragover', (e) => this.handleDragOver(e));
  element.addEventListener('drop', (e) => this.handleDrop(e));
  element.addEventListener('dragend', (e) => this.handleDragEnd(e));
  
  return element;
}

  openAddModal() {
    this.modalTitle.textContent = 'Add New Painting';
    this.paintingForm.reset();
    document.getElementById('paintingId').value = '';
    document.getElementById('currentImagePreview').style.display = 'none';
    this.paintingModal.style.display = 'flex';
  }

  openEditModal(painting) {
    this.modalTitle.textContent = 'Edit Painting';
    
    // Populate form fields
    document.getElementById('paintingId').value = painting.id;
    document.getElementById('title').value = painting.title;
    document.getElementById('medium').value = painting.medium;
    document.getElementById('year').value = painting.year;
    document.getElementById('description').value = painting.description || '';
    document.getElementById('price').value = painting.price || '';
    document.getElementById('isavailable').value = painting.isavailable.toString();
    
    // Handle categories
    const categoryCheckboxes = document.querySelectorAll('input[name="categories"]');
    categoryCheckboxes.forEach(checkbox => {
      checkbox.checked = painting.categories && painting.categories.includes(checkbox.value);
    });
    
    // Show current image
    const preview = document.getElementById('currentImagePreview');
    const currentImage = document.getElementById('currentImage');
    if (painting.imageurl) {
      currentImage.src = painting.imageurl;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
    
    this.paintingModal.style.display = 'flex';
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(this.paintingForm);
    const paintingId = formData.get('id');
    const isEdit = !!paintingId;
    
    // Collect categories
    const categories = Array.from(document.querySelectorAll('input[name="categories"]:checked'))
      .map(cb => cb.value);
    
    // Prepare data
    const paintingData = {
      title: formData.get('title'),
      medium: formData.get('medium'),
      year: formData.get('year'),
      description: formData.get('description'),
      price: formData.get('price') ? parseFloat(formData.get('price')) : null,
      isavailable: formData.get('isavailable') === 'true',
      categories: categories
    };
    
    this.showLoading(true);
    
    try {
      let response;
      
      if (isEdit) {
        // Update existing painting
        response = await fetch(`/api/admin/paintings/${paintingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paintingData)
        });
      } else {
        // Create new painting
        response = await fetch('/api/admin/paintings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paintingData)
        });
      }
      
      if (!response.ok) throw new Error('Failed to save painting');
      
      // Handle image upload if provided
const fileInput = this.paintingForm.querySelector('input[name="imageFile"]');
const imageFile = fileInput?.files?.[0];

if (imageFile) {
  const savedPainting = await response.json();
  await this.uploadImage(savedPainting.painting.id, imageFile);
}


      
      this.showMessage(isEdit ? 'Painting updated successfully' : 'Painting added successfully', 'success');
      this.closeModal();
      this.loadPaintings();
      
    } catch (error) {
      console.error('Error saving painting:', error);
      this.showMessage('Failed to save painting', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async uploadImage(paintingId, imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await fetch(`/api/admin/paintings/${paintingId}/image`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Failed to upload image');
  }

  confirmDelete(painting) {
    document.getElementById('confirmTitle').textContent = 'Delete Painting';
    document.getElementById('confirmMessage').textContent = 
      `Are you sure you want to delete "${painting.title}"? This action cannot be undone.`;
    
    const confirmBtn = document.getElementById('confirmDelete');
    confirmBtn.onclick = () => this.deletePainting(painting.id);
    
    this.confirmModal.style.display = 'flex';
  }

  async deletePainting(paintingId) {
    this.confirmModal.style.display = 'none';
    this.showLoading(true);
    
    try {
      const response = await fetch(`/api/admin/paintings/${paintingId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete painting');
      
      this.showMessage('Painting deleted successfully', 'success');
      this.loadPaintings();
      
    } catch (error) {
      console.error('Error deleting painting:', error);
      this.showMessage('Failed to delete painting', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  toggleReorderMode() {
    this.isReorderMode = !this.isReorderMode;
    
    if (this.isReorderMode) {
      this.galleryGrid.classList.add('reorder-mode');
      this.toggleReorderBtn.querySelector('.btn-text').textContent = 'Cancel Reorder';
      this.saveOrderBtn.style.display = 'flex';
      this.originalOrder = [...this.paintings];
      
      // Add reorder class to all items
      document.querySelectorAll('.admin-gallery-item').forEach(item => {
        item.classList.add('reorder-mode');
      });
    } else {
      this.galleryGrid.classList.remove('reorder-mode');
      this.toggleReorderBtn.querySelector('.btn-text').textContent = 'Enable Reorder';
      this.saveOrderBtn.style.display = 'none';
      
      // Remove reorder class from all items
      document.querySelectorAll('.admin-gallery-item').forEach(item => {
        item.classList.remove('reorder-mode');
      });
      
      // Restore original order if canceled
      this.paintings = [...this.originalOrder];
      this.renderPaintings();
    }
  }

// Replace your existing saveOrder method in admin.js with this improved version

// Replace your saveOrder method with this debug version to identify the issue

// Fixed saveOrder method - Replace the existing one in your admin.js

async saveOrder() {
  try {
    console.log('Starting saveOrder process...');
    
    // Get the current order from the DOM
    const galleryItems = Array.from(this.galleryGrid.children);
    
    console.log('Total gallery items found:', galleryItems.length);
    
    if (galleryItems.length === 0) {
      this.showMessage('No items to reorder', 'error');
      return;
    }
    
    // Validate that all items are gallery items
    const validItems = galleryItems.filter(item => 
      item.classList.contains('admin-gallery-item')
    );
    
    if (validItems.length !== galleryItems.length) {
      console.warn(`Found ${galleryItems.length} items but only ${validItems.length} are valid gallery items`);
    }
    
    const paintingOrder = [];
    const missingIds = [];
    
    // Build the order array with validation
    validItems.forEach((item, index) => {
      const paintingId = item.dataset.paintingId;
      
      if (!paintingId) {
        console.error(`Missing painting ID for item at index ${index}:`, {
          className: item.className,
          dataset: item.dataset
        });
        missingIds.push(index);
        return;
      }
      
      const numericId = parseInt(paintingId, 10);
      if (isNaN(numericId)) {
        console.error(`Invalid painting ID at index ${index}:`, paintingId);
        missingIds.push(index);
        return;
      }
      
      paintingOrder.push({
        id: numericId,
        order: index + 1 // Start from 1 instead of 0 for cleaner ordering
      });
    });
    
    // Check for missing IDs
    if (missingIds.length > 0) {
      throw new Error(`Missing or invalid painting IDs at positions: ${missingIds.join(', ')}`);
    }
    
    if (paintingOrder.length === 0) {
      throw new Error('No valid paintings found to reorder');
    }
    
    console.log('Sending order data:', paintingOrder);
    
    this.showLoading(true);
    
    // Send the reorder request
    const response = await fetch('/api/admin/paintings/reorder', {
      method: 'POST', // Make sure this matches your server endpoint
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ order: paintingOrder })
    });
    
    const responseText = await response.text();
    console.log('Server response status:', response.status);
    console.log('Server response text:', responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      throw new Error(`Server returned invalid JSON: ${response.status} ${response.statusText}`);
    }
    
    if (!response.ok) {
      const errorMessage = responseData.message || responseData.error || `Server error: ${response.status}`;
      console.error('Server error response:', responseData);
      throw new Error(errorMessage);
    }
    
    console.log('Order saved successfully:', responseData);
    
    // Success
    this.showMessage(`Order saved successfully! Updated ${responseData.updatedCount} paintings.`, 'success');
    this.toggleReorderMode(); // Exit reorder mode
    
    // Reload paintings to reflect new order
    await this.loadPaintings();
    
  } catch (error) {
    console.error('Error in saveOrder:', error);
    this.showMessage(`Failed to save order: ${error.message}`, 'error');
  } finally {
    this.showLoading(false);
  }
}

  handleCategoryFilter(e) {
    document.querySelectorAll('.category-button').forEach(btn => {
      btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    this.currentCategory = e.target.dataset.category;
    this.loadPaintings();
  }

 // Replace your drag and drop handlers with these improved versions

handleDragStart(e) {
  if (!this.isReorderMode) return;
  
  // Ensure we're dragging the gallery item, not a nested element
  let dragTarget = e.target;
  if (!dragTarget.classList.contains('admin-gallery-item')) {
    dragTarget = dragTarget.closest('.admin-gallery-item');
  }
  
  if (!dragTarget) return;
  
  this.draggedElement = dragTarget;
  dragTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', dragTarget.outerHTML);
}

handleDragOver(e) {
  if (!this.isReorderMode || !this.draggedElement) return;
  
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  const afterElement = this.getDragAfterElement(this.galleryGrid, e.clientY);
  if (afterElement == null) {
    this.galleryGrid.appendChild(this.draggedElement);
  } else {
    this.galleryGrid.insertBefore(this.draggedElement, afterElement);
  }
}

handleDrop(e) {
  if (!this.isReorderMode) return;
  e.preventDefault();
  e.stopPropagation();
}

handleDragEnd(e) {
  if (!this.isReorderMode) return;
  
  // Clean up dragging state
  const allItems = this.galleryGrid.querySelectorAll('.admin-gallery-item');
  allItems.forEach(item => item.classList.remove('dragging'));
  
  this.draggedElement = null;
}

getDragAfterElement(container, y) {
  // Only consider actual gallery items, not nested elements
  const draggableElements = [...container.querySelectorAll('.admin-gallery-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

  previewImage(file) {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById('currentImagePreview');
        const currentImage = document.getElementById('currentImage');
        currentImage.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  }

  closeModal() {
    this.paintingModal.style.display = 'none';
  }

  showLoading(show) {
    this.loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  showMessage(message, type = 'success') {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    document.body.appendChild(messageEl);
    
    setTimeout(() => messageEl.classList.add('show'), 100);
    
    setTimeout(() => {
      messageEl.classList.remove('show');
      setTimeout(() => messageEl.remove(), 300);
    }, 3000);
  }
}

// Initialize admin interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PaintingAdmin();
});