/**
 * Admin Authentication Helper
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
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  }

  logout() {
    localStorage.removeItem('adminToken');
    this.token = null;
    this.isAuthenticated = false;
    this.user = null;

    if (this.token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }).catch(error => console.error('Logout error:', error));
    }

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

    const authHeaders = this.getAuthHeaders();

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

    if (response.status === 401 || response.status === 403) {
      this.logout();
      throw new Error('Authentication expired');
    }

    return response;
  }
}

class PaintingAdmin {
  constructor(adminAuth) {
    this.adminAuth = adminAuth;
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
    this.paintingModal = document.getElementById('paintingModal');
    this.confirmModal = document.getElementById('confirmModal');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.paintingForm = document.getElementById('paintingForm');
    this.modalTitle = document.getElementById('modalTitle');
    this.addPaintingBtn = document.getElementById('addPaintingBtn');
    this.toggleReorderBtn = document.getElementById('toggleReorderBtn');
    this.saveOrderBtn = document.getElementById('saveOrderBtn');
    this.closePaintingModal = document.getElementById('closePaintingModal');
    this.galleryGrid = document.getElementById('adminGalleryGrid');
    this.categoryButtons = document.querySelectorAll('.category-button');
  }

  bindEvents() {
    this.addPaintingBtn.addEventListener('click', () => this.openAddModal());
    this.toggleReorderBtn.addEventListener('click', () => this.toggleReorderMode());
    this.saveOrderBtn.addEventListener('click', () => this.saveOrder());
    this.closePaintingModal.addEventListener('click', () => this.closeModal());

    this.paintingForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());

    this.paintingModal.addEventListener('click', (e) => {
      if (e.target === this.paintingModal) this.closeModal();
    });

    this.categoryButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleCategoryFilter(e));
    });

    document.getElementById('confirmCancel').addEventListener('click', () => {
      this.confirmModal.style.display = 'none';
    });

    document.getElementById('imageFile').addEventListener('change', (e) => {
      this.previewImage(e.target.files[0]);
    });
  }

  async loadPaintings() {
    this.showLoading(true);
    try {
      const response = await this.authenticatedFetch(`/api/admin/paintings/all?category=${this.currentCategory}&sortBy=order&sortOrder=desc`);
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
    if (!painting || !painting.id) {
      console.error('Invalid painting object:', painting);
      return null;
    }

    const element = document.createElement('div');
    element.className = 'gallery-item admin-gallery-item';

    element.dataset.paintingId = painting.id.toString();
    element.dataset.order = (painting.order || 0).toString();
    element.dataset.visualIndex = visualIndex.toString();

    const title = painting.title || 'Untitled';
    const medium = painting.medium || 'Unknown Medium';
    const year = painting.year || 'Unknown Year';
    const imageUrl = painting.imageurl || '/assets/images/placeholder.jpg';
    const isavailable = painting.isavailable;

    const soldBadge = !isavailable
      ? `<div class="sold-badge" title="Sold"></div>`
      : '';
    const featuredBadge = painting.featured
      ? `<div class="featured-badge" title="Featured">⭐</div>`
      : '';

    element.innerHTML = `
      <img src="${imageUrl}" alt="${title}" class="gallery-image" loading="lazy" 
           onerror="this.src='/assets/images/placeholder.jpg'">
           ${soldBadge}
           ${featuredBadge}
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

    document.getElementById('paintingId').value = painting.id;
    document.getElementById('title').value = painting.title;
    document.getElementById('medium').value = painting.medium;
    document.getElementById('year').value = painting.year;
    document.getElementById('description').value = painting.description || '';
    document.getElementById('price').value = painting.price || '';
    document.getElementById('isavailable').value = painting.isavailable.toString();
    document.getElementById('isfeatured').value = painting.featured ? 'true' : 'false';

    const categoryCheckboxes = document.querySelectorAll('input[name="categories"]');
    categoryCheckboxes.forEach(checkbox => {
      checkbox.checked = painting.categories && painting.categories.includes(checkbox.value);
    });

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

    const categories = Array.from(document.querySelectorAll('input[name="categories"]:checked'))
      .map(cb => cb.value);

    const paintingData = {
      title: formData.get('title'),
      medium: formData.get('medium'),
      year: formData.get('year'),
      description: formData.get('description'),
      price: formData.get('price') ? parseFloat(formData.get('price')) : null,
      isavailable: formData.get('isavailable') === 'true',
      featured: formData.get('isfeatured') === 'true',
      categories: categories
    };

    this.showLoading(true);

    try {
      let response;

      if (isEdit) {
        response = await this.authenticatedFetch(`/api/admin/paintings/${paintingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paintingData)
        });
      } else {
        response = await this.authenticatedFetch('/api/admin/paintings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paintingData)
        });
      }

      if (!response.ok) throw new Error('Failed to save painting');

      const result = await response.json();
      const savedPainting = result.painting;

      const fileInput = this.paintingForm.querySelector('input[name="imageFile"]');
      const imageFile = fileInput?.files?.[0];

      if (imageFile) {
        let compressedFile = imageFile;

        try {
          compressedFile = await imageCompression(imageFile, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1200,
            useWebWorker: true
          });
        } catch (compressionError) {
          console.warn('Image compression failed; uploading original file.', compressionError);
        }

        await this.uploadImage(savedPainting.id, compressedFile);
      }

      this.showMessage(isEdit ? 'Painting updated successfully' : 'Painting added successfully', 'success');
      this.closeModal();
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

      document.querySelectorAll('.admin-gallery-item').forEach(item => {
        item.classList.add('reorder-mode');
      });

      this.showMessage('Drag and drop to reorder paintings. Click "Save Order" when done.', 'info');
    } else {
      this.galleryGrid.classList.remove('reorder-mode');
      this.toggleReorderBtn.querySelector('.btn-text').textContent = 'Enable Reorder';
      this.saveOrderBtn.style.display = 'none';

      document.querySelectorAll('.admin-gallery-item').forEach(item => {
        item.classList.remove('reorder-mode');
      });

      this.paintings = [...this.originalOrder];
      this.renderPaintings();
    }
  }

  async saveOrder() {
    try {
      console.log('Starting saveOrder process...');

      const galleryItems = Array.from(this.galleryGrid.children);

      if (galleryItems.length === 0) {
        this.showMessage('No items to reorder', 'error');
        return;
      }

      const maxOrderValue = Math.max(...this.paintings.map(p => p.order || 0)) + galleryItems.length;
      const paintingOrder = [];

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

        const newOrder = maxOrderValue - visualIndex;

        paintingOrder.push({
          id: numericId,
          order: newOrder
        });

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

      this.showMessage(`Order saved successfully! Updated ${responseData.updatedCount} paintings.`, 'success');
      this.toggleReorderMode();
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

  handleDragStart(e) {
    if (!this.isReorderMode) {
      e.preventDefault();
      return;
    }

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

    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
      this.draggedElement = null;
    }

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

class ExhibitionAdmin {
  constructor(adminAuth) {
    this.adminAuth = adminAuth;
    this.exhibitions = [];
    
    this.initializeElements();
    this.bindEvents();
  }
  
  initializeElements() {
    this.exhibitionModal = document.getElementById('exhibitionModal');
    this.exhibitionForm = document.getElementById('exhibitionForm');
    this.exhibitionsGrid = document.getElementById('adminExhibitionsGrid');
    this.addExhibitionBtn = document.getElementById('addExhibitionBtn');
    this.closeExhibitionModal = document.getElementById('closeExhibitionModal');
  }
  
  bindEvents() {
    if (this.addExhibitionBtn) {
      this.addExhibitionBtn.addEventListener('click', () => this.openAddModal());
    }
    if (this.closeExhibitionModal) {
      this.closeExhibitionModal.addEventListener('click', () => this.closeModal());
    }
    if (this.exhibitionForm) {
      this.exhibitionForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }
    
    const cancelBtn = document.getElementById('cancelExhibitionBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }
    
    if (this.exhibitionModal) {
      this.exhibitionModal.addEventListener('click', (e) => {
        if (e.target === this.exhibitionModal) this.closeModal();
      });
    }
  }
  
  async loadExhibitions() {
    try {
      const response = await this.adminAuth.authenticatedFetch('/api/admin/exhibitions');
      const data = await response.json();
      this.exhibitions = data.exhibitions;
      this.renderExhibitions();
    } catch (error) {
      console.error('Error loading exhibitions:', error);
      this.showMessage('Failed to load exhibitions', 'error');
    }
  }
  
  renderExhibitions() {
    if (!this.exhibitionsGrid) return;
    
    this.exhibitionsGrid.innerHTML = '';
    
    this.exhibitions.forEach(exhibition => {
      const element = this.createExhibitionElement(exhibition);
      this.exhibitionsGrid.appendChild(element);
    });
  }
  
createExhibitionElement(exhibition) {
    const element = document.createElement('div');
    element.className = 'admin-exhibition-item';
    
    const coverImage = exhibition.photos && exhibition.photos.length > 0 
      ? exhibition.photos[0].imageurl 
      : '/assets/images/placeholder.jpg';
        
    const photoCount = exhibition.photos ? exhibition.photos.length : 0;
    const displayYear = new Date(exhibition.date).getFullYear();
    
    element.innerHTML = `
      <img src="${coverImage}" alt="${exhibition.title}" class="exhibition-cover" 
           onerror="this.src='/assets/images/placeholder.jpg'">
      <div class="exhibition-info">
        <h3>${exhibition.title}</h3>
        <p class="exhibition-date">${displayYear}</p>
        <p class="exhibition-location">${exhibition.location || 'No location specified'}</p>
        <p class="photo-count">${photoCount} photos</p>
      </div>
      <div class="admin-item-controls">
        <button class="control-btn edit-btn" title="Edit Exhibition">✏</button>
        <button class="control-btn delete-btn" title="Delete Exhibition">🗑</button>
      </div>
    `;
    
    // FIXED: Use confirmDeleteExhibition instead of deleteExhibition directly
    const editBtn = element.querySelector('.edit-btn');
    const deleteBtn = element.querySelector('.delete-btn');
    
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEditModal(exhibition);
      });
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.confirmDeleteExhibition(exhibition); // FIXED: Use confirmation
      });
    }
    
    return element;
  }

   // ADD: Loading and message methods (they were missing)
  showLoading(show) {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
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

  
 openAddModal() {
  const titleEl = document.getElementById('exhibitionModalTitle');
  if (titleEl) titleEl.textContent = 'Add New Exhibition';
  
  if (this.exhibitionForm) this.exhibitionForm.reset();
  
  const idEl = document.getElementById('exhibitionId');
  if (idEl) idEl.value = '';
  
  // Hide existing photos section for new exhibitions
  const existingPhotosSection = document.getElementById('existingPhotosSection');
  if (existingPhotosSection) existingPhotosSection.style.display = 'none';
  
  if (this.exhibitionModal) this.exhibitionModal.style.display = 'flex';
}
  
openEditModal(exhibition) {
  const titleEl = document.getElementById('exhibitionModalTitle');
  if (titleEl) titleEl.textContent = 'Edit Exhibition';
  
  const idEl = document.getElementById('exhibitionId');
  const titleInput = document.getElementById('exhibitionTitle');
  const dateInput = document.getElementById('exhibitionDate');
  const locationInput = document.getElementById('exhibitionLocation');
  const descInput = document.getElementById('exhibitionDescription');
  
  if (idEl) idEl.value = exhibition.id;
  if (titleInput) titleInput.value = exhibition.title;
  if (dateInput) dateInput.value = exhibition.date.split('T')[0];
  if (locationInput) locationInput.value = exhibition.location || '';
  if (descInput) descInput.value = exhibition.description || '';
  
  // Display existing photos
  this.displayExistingPhotos(exhibition.photos || []);
  
  if (this.exhibitionModal) this.exhibitionModal.style.display = 'flex';
}

// ADD THIS NEW METHOD
displayExistingPhotos(photos) {
  const existingPhotosSection = document.getElementById('existingPhotosSection');
  const existingPhotosGrid = document.getElementById('existingPhotosGrid');
  
  if (!existingPhotosSection || !existingPhotosGrid) return;
  
  // Clear existing content
  existingPhotosGrid.innerHTML = '';
  
  if (photos && photos.length > 0) {
    existingPhotosSection.style.display = 'block';
    
    photos.forEach(photo => {
      const photoItem = document.createElement('div');
      photoItem.className = 'existing-photo-item';
      photoItem.dataset.photoId = photo.id;
      
      photoItem.innerHTML = `
        <img src="${photo.imageurl}" alt="${photo.title || 'Exhibition photo'}" 
             onerror="this.src='/assets/images/placeholder.jpg'">
        <button type="button" class="photo-remove-btn" title="Remove photo">×</button>
      `;
      
      // Add remove functionality
      const removeBtn = photoItem.querySelector('.photo-remove-btn');
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.confirmRemovePhoto(photo, photoItem);
      });
      
      existingPhotosGrid.appendChild(photoItem);
    });
  } else {
    existingPhotosSection.style.display = 'none';
  }
}

// ADD THIS NEW METHOD
confirmRemovePhoto(photo, photoElement) {
  if (confirm(`Are you sure you want to remove this photo? This action cannot be undone.`)) {
    this.removePhoto(photo.id, photoElement);
  }
}

// ADD THIS NEW METHOD
async removePhoto(photoId, photoElement) {
  try {
    const exhibitionId = document.getElementById('exhibitionId').value;
    
    const response = await this.adminAuth.authenticatedFetch(
      `/api/admin/exhibitions/${exhibitionId}/photos/${photoId}`, 
      { method: 'DELETE' }
    );
    
    if (!response.ok) throw new Error('Failed to remove photo');
    
    // Remove the photo element from the UI
    photoElement.remove();
    
    // Check if no photos left and hide the section
    const remainingPhotos = document.querySelectorAll('.existing-photo-item');
    if (remainingPhotos.length === 0) {
      const existingPhotosSection = document.getElementById('existingPhotosSection');
      if (existingPhotosSection) {
        existingPhotosSection.style.display = 'none';
      }
    }
    
    this.showMessage('Photo removed successfully', 'success');
  } catch (error) {
    console.error('Error removing photo:', error);
    this.showMessage('Failed to remove photo', 'error');
  }
}

  
  async handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(this.exhibitionForm);
    const exhibitionId = formData.get('id');
    const isEdit = !!exhibitionId;
    
    const exhibitionData = {
      title: formData.get('title'),
      date: formData.get('date'),
      location: formData.get('location'),
      description: formData.get('description')
    };
    
    try {
      let response;
      
      if (isEdit) {
        response = await this.adminAuth.authenticatedFetch(`/api/admin/exhibitions/${exhibitionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exhibitionData)
        });
      } else {
        response = await this.adminAuth.authenticatedFetch('/api/admin/exhibitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exhibitionData)
        });
      }
      
      if (!response.ok) throw new Error('Failed to save exhibition');
      
      const result = await response.json();
      const savedExhibition = result.exhibition;
      
      // Handle photo uploads
      const photoFiles = document.getElementById('exhibitionPhotos').files;
      if (photoFiles.length > 0) {
        await this.uploadPhotos(savedExhibition.id, photoFiles);
      }
      
      this.showMessage(isEdit ? 'Exhibition updated successfully' : 'Exhibition added successfully', 'success');
      this.closeModal();
      this.loadExhibitions();
      
    } catch (error) {
      console.error('Error saving exhibition:', error);
      this.showMessage('Failed to save exhibition', 'error');
    }
  }
  
  async uploadPhotos(exhibitionId, files) {
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }
    
    const response = await this.adminAuth.authenticatedFetch(`/api/admin/exhibitions/${exhibitionId}/photos`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Failed to upload photos');
  }
  
   confirmDeleteExhibition(exhibition) {
    // Get the modal elements fresh each time to avoid undefined references
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmDelete');
    
    if (!confirmModal || !confirmTitle || !confirmMessage || !confirmBtn) {
      console.error('Confirmation modal elements not found');
      // Fallback to browser confirm dialog
      if (confirm(`Are you sure you want to delete "${exhibition.title}"? This will also delete all associated photos. This action cannot be undone.`)) {
        this.deleteExhibition(exhibition.id);
      }
      return;
    }
    
    confirmTitle.textContent = 'Delete Exhibition';
    confirmMessage.textContent = 
      `Are you sure you want to delete "${exhibition.title}"? This will also delete all associated photos. This action cannot be undone.`;
    
    // Remove any existing event listeners and add new one
    confirmBtn.onclick = () => this.deleteExhibition(exhibition.id);
    
    confirmModal.style.display = 'flex';
  }
  
  async deleteExhibition(exhibitionId) {
    // Hide the confirmation modal
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
      confirmModal.style.display = 'none';
    }
    
    this.showLoading(true);
    
    try {
      const response = await this.adminAuth.authenticatedFetch(`/api/admin/exhibitions/${exhibitionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete exhibition');
      
      this.showMessage('Exhibition deleted successfully', 'success');
      this.loadExhibitions();
    } catch (error) {
      console.error('Error deleting exhibition:', error);
      this.showMessage('Failed to delete exhibition', 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  closeModal() {
    if (this.exhibitionModal) this.exhibitionModal.style.display = 'none';
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

// Global variables
let adminAuth;
let paintingAdmin;
let exhibitionAdmin;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize authentication first
  adminAuth = new AdminAuth();

  // Wait for auth to complete
  let authCheckCount = 0;
  const maxAuthChecks = 50;

  while (!adminAuth.isAuthenticated && authCheckCount < maxAuthChecks) {
    await new Promise(resolve => setTimeout(resolve, 100));
    authCheckCount++;
  }

  // If authenticated, initialize both admin panels
  if (adminAuth.isAuthenticated) {
    paintingAdmin = new PaintingAdmin(adminAuth);
    exhibitionAdmin = new ExhibitionAdmin(adminAuth);
    
    // Handle section switching
    const sectionBtns = document.querySelectorAll('.section-btn');
    const paintingsSection = document.getElementById('paintingsSection');
    const exhibitionsSection = document.getElementById('exhibitionsSection');
    
    sectionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        
        // Update active button
        sectionBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show/hide sections
        if (section === 'paintings') {
          paintingsSection.style.display = 'block';
          exhibitionsSection.style.display = 'none';
        } else if (section === 'exhibitions') {
          paintingsSection.style.display = 'none';
          exhibitionsSection.style.display = 'block';
          // IMPORTANT: Load exhibitions when switching to exhibitions tab
          exhibitionAdmin.loadExhibitions();
        }
      });
    });
    
    // Load paintings by default on startup
    paintingAdmin.loadPaintings();
  }
});