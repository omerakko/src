class ExhibitionGallery {
    constructor() {
        this.exhibitions = [];
        this.currentView = 'masonry';
        this.currentSort = 'date_desc';
        
        this.initializeElements();
        this.bindEvents();
        this.loadExhibitions();
    }
    
    initializeElements() {
        this.galleryContainer = document.getElementById('exhibitionsGallery');
        this.exhibitionModal = document.getElementById('exhibitionModal');
        this.closeModalBtn = document.getElementById('closeExhibitionModal');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.sortSelect = document.getElementById('sortBy');
        
        this.viewToggles = document.querySelectorAll('.toggle-btn');
    }
    
    bindEvents() {
        // View toggle buttons
        this.viewToggles.forEach(btn => {
            btn.addEventListener('click', (e) => this.changeView(e.target.dataset.view));
        });
        
        // Sort change
        this.sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderExhibitions();
        });
        
        // Modal close events
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.exhibitionModal.addEventListener('click', (e) => {
            if (e.target === this.exhibitionModal) this.closeModal();
        });
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }
    
    async loadExhibitions() {
        this.showLoading(true);
        try {
            const response = await fetch('/api/exhibitions');
            const data = await response.json();
            this.exhibitions = data.exhibitions || [];
            this.renderExhibitions();
        } catch (error) {
            console.error('Error loading exhibitions:', error);
            this.showMessage('Failed to load exhibitions', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    renderExhibitions() {
        const sortedExhibitions = this.sortExhibitions([...this.exhibitions]);
        
        this.galleryContainer.innerHTML = '';
        
        sortedExhibitions.forEach((exhibition, index) => {
            const exhibitionElement = this.createExhibitionElement(exhibition);
            this.galleryContainer.appendChild(exhibitionElement);
            
            // Animate in with delay
            setTimeout(() => {
                exhibitionElement.classList.add('show');
            }, index * 100);
        });
    }
    
    sortExhibitions(exhibitions) {
        return exhibitions.sort((a, b) => {
            switch (this.currentSort) {
                case 'date_desc':
                    return new Date(b.date) - new Date(a.date);
                case 'date_asc':
                    return new Date(a.date) - new Date(b.date);
                case 'title_asc':
                    return a.title.localeCompare(b.title);
                case 'title_desc':
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });
    }
    
    createExhibitionElement(exhibition) {
        const element = document.createElement('div');
        element.className = 'exhibition-item';
        element.dataset.exhibitionId = exhibition.id;
        
        const coverImage = exhibition.photos && exhibition.photos.length > 0 
            ? exhibition.photos[0].imageurl 
            : '/assets/images/placeholder.jpg';
            
        const photoCount = exhibition.photos ? exhibition.photos.length : 0;
        const displayDate = new Date(exhibition.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        element.innerHTML = `
            <img src="${coverImage}" alt="${exhibition.title}" class="exhibition-cover" 
                 onerror="this.src='/assets/images/placeholder.jpg'">
            <div class="exhibition-info">
                <h3 class="exhibition-title">${exhibition.title}</h3>
                <div class="exhibition-date">${displayDate}</div>
                <p class="exhibition-description">${exhibition.description || 'No description available.'}</p>
                <div class="exhibition-stats">
                    <span class="photo-count">
                        <span>📷</span>
                        ${photoCount} photos
                    </span>
                    <button class="view-exhibition">View Exhibition</button>
                </div>
            </div>
        `;
        
        // Add click event to open modal
        element.addEventListener('click', () => this.openExhibitionModal(exhibition));
        
        return element;
    }
    
    changeView(view) {
        if (view === this.currentView) return;
        
        this.currentView = view;
        
        // Update toggle buttons
        this.viewToggles.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Update gallery classes
        this.galleryContainer.classList.remove('gallery-masonry', 'gallery-grid');
        this.galleryContainer.classList.add(`gallery-${view}`);
        
        // Re-render with new layout
        this.renderExhibitions();
    }
    
    async openExhibitionModal(exhibition) {
        try {
            // Load full exhibition details with photos
            const response = await fetch(`/api/exhibitions/${exhibition.id}`);
            const fullExhibition = await response.json();
            
            this.renderExhibitionModal(fullExhibition);
            this.exhibitionModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } catch (error) {
            console.error('Error loading exhibition details:', error);
            this.showMessage('Failed to load exhibition details', 'error');
        }
    }
    
    renderExhibitionModal(exhibition) {
        const detailContainer = document.getElementById('exhibitionDetail');
        
        const displayDate = new Date(exhibition.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const photosHtml = exhibition.photos && exhibition.photos.length > 0
            ? exhibition.photos.map(photo => `
                <div class="photo-item">
                    <img src="${photo.imageurl}" alt="${photo.title || 'Exhibition photo'}" 
                         onerror="this.src='/assets/images/placeholder.jpg'">
                </div>
            `).join('')
            : '<p>No photos available for this exhibition.</p>';
        
        detailContainer.innerHTML = `
            <h2>${exhibition.title}</h2>
            <div class="exhibition-meta">
                <div class="meta-item">
                    <span class="meta-label">Date</span>
                    <span class="meta-value">${displayDate}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Location</span>
                    <span class="meta-value">${exhibition.location || 'Not specified'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Photos</span>
                    <span class="meta-value">${exhibition.photos ? exhibition.photos.length : 0}</span>
                </div>
            </div>
            ${exhibition.description ? `<p>${exhibition.description}</p>` : ''}
            <div class="exhibition-photos">
                ${photosHtml}
            </div>
        `;
    }
    
    closeModal() {
        this.exhibitionModal.style.display = 'none';
        document.body.style.overflow = 'auto';
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ExhibitionGallery();
});