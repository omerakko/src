/**
 * Admin Authentication Helper
 * Add this to your admin.js file or include it separately
 */

class AdminAuth {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.isAuthenticated = false;
        this.init();
    }

    async init() {
        if (this.token) {
            await this.verifyToken();
        } else {
            this.redirectToLogin();
        }
    }

    async verifyToken() {
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.isAuthenticated = true;
                this.user = data.user;
                this.setupLogoutHandler();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Token verification error:', error);
            this.logout();
        }
    }

    setupLogoutHandler() {
        // Add logout button to admin interface
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }


    }

    logout() {
        // Clear token
        localStorage.removeItem('adminToken');
        this.token = null;
        this.isAuthenticated = false;
        this.user = null;

        // Optional: Call logout endpoint
        if (this.token) {
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            }).catch(error => console.error('Logout error:', error));
        }

        // Redirect to login
        this.redirectToLogin();
    }

    redirectToLogin() {
        window.location.href = '/pages/login.html';
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

async authenticatedFetch(url, options = {}) {
    if (!this.isAuthenticated) {
        throw new Error('Not authenticated');
    }

    // Get base auth headers
    const authHeaders = this.getAuthHeaders();
    
    // If body is FormData, don't add Content-Type (let browser handle it)
    const headers = options.body instanceof FormData 
        ? { 
            'Authorization': authHeaders.Authorization,
            ...options.headers 
          }
        : {
            ...authHeaders,
            ...options.headers
          };

    const response = await fetch(url, {
        ...options,
        headers
    });

    // Handle token expiration
    if (response.status === 401 || response.status === 403) {
        this.logout();
        throw new Error('Authentication expired');
    }

    return response;
}
}

class PaintingAdmin {
  constructor(adminAuth) {
    this.adminAuth = adminAuth; // ADD this line
    this.paintings = [];
    this.currentCategory = 'All Works';
    this.isReorderMode = false;
    this.draggedElement = null;
    this.originalOrder = [];
    
    this.initializeElements();
    this.bindEvents();
    this.loadPaintings();
  }

    async authenticatedFetch(url, options = {}) {
    return this.adminAuth.authenticatedFetch(url, options);
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
      const response = await fetch(`/api/paintings?perPage=100&category=${this.currentCategory}&sortBy=order&sortOrder=desc`);
      const data = await response.json();
      this.paintings = data.paintings;
      console.log('Loaded paintings:', this.paintings.map(p => ({ id: p.id, title: p.title, order: p.order })));
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
    
    // Sort paintings by order (descending - highest order first)
    const sortedPaintings = [...this.paintings].sort((a, b) => (b.order || 0) - (a.order || 0));
    
    sortedPaintings.forEach((painting, visualIndex) => {
      try {
        const paintingElement = this.createPaintingElement(painting, visualIndex);
        if (paintingElement) {
          this.galleryGrid.appendChild(paintingElement);
        } else {
          console.error('Failed to create element for painting:', painting);
        }
      } catch (error) {
        console.error(`Error creating painting element:`, error, painting);
      }
    });
    
    console.log(`Rendered ${this.galleryGrid.children.length} painting elements`);
  }

  createPaintingElement(painting, visualIndex) {
    // Validate painting object
    if (!painting || !painting.id) {
      console.error('Invalid painting object:', painting);
      return null;
    }
    
    const element = document.createElement('div');
    element.className = 'gallery-item admin-gallery-item';
    
    // Set data attributes
    element.dataset.paintingId = painting.id.toString();
    element.dataset.order = (painting.order || 0).toString();
    element.dataset.visualIndex = visualIndex.toString();
    
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
        <div class="order-info" style="font-size: 0.8em; color: #666;">
          Order: ${painting.order || 0}
        </div>
      </div>
      
      <div class="admin-item-controls">
        <button class="control-btn edit-btn" title="Edit">✏</button>
        <button class="control-btn delete-btn" title="Delete">🗑</button>
      </div>
      
      <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
    `;
    
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
        response = await this.authenticatedFetch(`/api/admin/paintings/${paintingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paintingData)
        });
      } else {
        // Create new painting - it will automatically get the highest order value
        response = await this.authenticatedFetch('/api/admin/paintings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paintingData)
        });
      }
      
      if (!response.ok) throw new Error('Failed to save painting');
      
      const result = await response.json();
      const savedPainting = result.painting;
      
      // Handle image upload if provided
      const fileInput = this.paintingForm.querySelector('input[name="imageFile"]');
      const imageFile = fileInput?.files?.[0];

      if (imageFile) {
        await this.uploadImage(savedPainting.id, imageFile);
      }
      
      this.showMessage(isEdit ? 'Painting updated successfully' : 'Painting added successfully', 'success');
      this.closeModal();
      
      // Reload paintings to show the new/updated painting in correct position
      await this.loadPaintings();
      
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
    
    const response = await this.authenticatedFetch(`/api/admin/paintings/${paintingId}/image`, {
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
      const response = await this.authenticatedFetch(`/api/admin/paintings/${paintingId}`, {
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
      
      this.showMessage('Drag and drop to reorder paintings. Click "Save Order" when done.', 'info');
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

  async saveOrder() {
    try {
      console.log('Starting saveOrder process...');
      
      // Get the current visual order from the DOM
      const galleryItems = Array.from(this.galleryGrid.children);
      
      if (galleryItems.length === 0) {
        this.showMessage('No items to reorder', 'error');
        return;
      }
      
      // Calculate the maximum order value to assign proper descending order
      const maxOrderValue = Math.max(...this.paintings.map(p => p.order || 0)) + galleryItems.length;
      
      const paintingOrder = [];
      
      // Build the order array - first item in DOM gets highest order (appears first)
      galleryItems.forEach((item, visualIndex) => {
        const paintingId = item.dataset.paintingId;
        
        if (!paintingId) {
          console.error(`Missing painting ID for item at visual index ${visualIndex}`);
          return;
        }
        
        const numericId = parseInt(paintingId, 10);
        if (isNaN(numericId)) {
          console.error(`Invalid painting ID: ${paintingId}`);
          return;
        }
        
        // First item (index 0) gets the highest order value
        const newOrder = maxOrderValue - visualIndex;
        
        paintingOrder.push({
          id: numericId,
          order: newOrder
        });
        
        // Update the visual order info
        const orderInfo = item.querySelector('.order-info');
        if (orderInfo) {
          orderInfo.textContent = `Order: ${newOrder}`;
        }
      });
      
      if (paintingOrder.length === 0) {
        throw new Error('No valid paintings found to reorder');
      }
      
      console.log('Sending order data:', paintingOrder);
      
      this.showLoading(true);
      
      // Send the reorder request
      const response = await this.authenticatedFetch('/api/admin/paintings/reorder', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ order: paintingOrder })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || errorData?.error || `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log('Order saved successfully:', responseData);
      
      // Success
      this.showMessage(`Order saved successfully! Updated ${responseData.updatedCount} paintings.`, 'success');
      this.toggleReorderMode(); // Exit reorder mode
      
      // Reload paintings to reflect new order from database
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

  // Improved drag and drop handlers
  handleDragStart(e) {
    if (!this.isReorderMode) {
      e.preventDefault();
      return;
    }
    
    // Find the gallery item element
    let dragTarget = e.target;
    if (!dragTarget.classList.contains('admin-gallery-item')) {
      dragTarget = dragTarget.closest('.admin-gallery-item');
    }
    
    if (!dragTarget) {
      e.preventDefault();
      return;
    }
    
    this.draggedElement = dragTarget;
    dragTarget.classList.add('dragging');
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
    
    console.log('Drag started for painting:', dragTarget.dataset.paintingId);
  }

  handleDragOver(e) {
    if (!this.isReorderMode || !this.draggedElement) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = this.getDragAfterElement(e.clientY);
    const dragging = this.draggedElement;
    
    if (afterElement == null) {
      this.galleryGrid.appendChild(dragging);
    } else {
      this.galleryGrid.insertBefore(dragging, afterElement);
    }
  }

  handleDrop(e) {
    if (!this.isReorderMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Drop completed');
  }

  handleDragEnd(e) {
    if (!this.isReorderMode) return;
    
    // Clean up dragging state
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
      this.draggedElement = null;
    }
    
    // Remove dragging class from all items
    document.querySelectorAll('.admin-gallery-item').forEach(item => {
      item.classList.remove('dragging');
    });
    
    console.log('Drag ended - new order:', 
      Array.from(this.galleryGrid.children).map(item => ({
        id: item.dataset.paintingId,
        title: item.querySelector('.gallery-title').textContent
      }))
    );
  }

  getDragAfterElement(y) {
    const draggableElements = [...this.galleryGrid.querySelectorAll('.admin-gallery-item:not(.dragging)')];
    
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
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      ${type === 'success' ? 'background-color: #28a745;' : ''}
      ${type === 'error' ? 'background-color: #dc3545;' : ''}
      ${type === 'info' ? 'background-color: #17a2b8;' : ''}
    `;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      messageEl.style.transform = 'translateX(100%)';
      setTimeout(() => messageEl.remove(), 300);
    }, 3000);
  }
}






document.addEventListener('DOMContentLoaded', async () => {
  // Initialize authentication first
  adminAuth = new AdminAuth();
  
  // Wait for auth to complete
  let authCheckCount = 0;
  const maxAuthChecks = 50; // 5 seconds max wait
  
  while (!adminAuth.isAuthenticated && authCheckCount < maxAuthChecks) {
    await new Promise(resolve => setTimeout(resolve, 100));
    authCheckCount++;
  }
  
  // If authenticated, initialize the admin panel
  if (adminAuth.isAuthenticated) {
    new PaintingAdmin(adminAuth);
  }
  // If not authenticated, AdminAuth will handle the redirect
});