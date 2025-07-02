class ExhibitionGallery {
    constructor() {
        this.exhibitions = [];
        this.currentSort = 'date_desc';
        
        this.initializeElements();
        this.bindEvents();
        this.loadExhibitions();
    }
    
    initializeElements() {
        this.galleryContainer = document.getElementById('exhibitionsGallery');
        this.imageModal = document.getElementById('imageModal');
        this.closeImageModalBtn = document.getElementById('closeImageModal');
        this.modalImage = document.getElementById('modalImage');
        this.imageInfo = document.getElementById('imageInfo');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.sortSelect = document.getElementById('sortBy');
    }
    
    bindEvents() {
        // Sort change
        this.sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderExhibitions();
        });
        
        // Image modal close events
        this.closeImageModalBtn.addEventListener('click', () => this.closeImageModal());
        this.imageModal.addEventListener('click', (e) => {
            if (e.target === this.imageModal) this.closeImageModal();
        });
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeImageModal();
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
            const exhibitionElement = this.createExhibitionSection(exhibition);
            this.galleryContainer.appendChild(exhibitionElement);
            
            // Animate photos in with staggered delay
            setTimeout(() => {
                this.animatePhotosIn(exhibitionElement);
            }, index * 200);
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
    
    createExhibitionSection(exhibition) {
        const section = document.createElement('div');
        section.className = 'exhibition-section';
        
       const displayYear = new Date(exhibition.date).getFullYear();
        
        const photosHtml = exhibition.photos && exhibition.photos.length > 0
            ? exhibition.photos.map(photo => `
                <div class="photo-item" data-photo-url="${photo.imageurl}" data-photo-title="${photo.title || exhibition.title}">
                    <img src="${photo.imageurl}" alt="${photo.title || 'Exhibition photo'}" 
                         onerror="this.src='/assets/images/placeholder.jpg'">
                </div>
            `).join('')
            : '<p style="text-align: center; color: #666; grid-column: 1/-1;">No photos available for this exhibition.</p>';
        
        section.innerHTML = `
            <div class="exhibition-header">
                <h2>${exhibition.title}</h2>
                <div class="exhibition-meta">
                    <div class="meta-item">
                        <span>📅</span>
                        <span>${displayYear}</span>
                    </div>
                    ${exhibition.location ? `
                        <div class="meta-item">
                            <span>📍</span>
                            <span>${exhibition.location}</span>
                        </div>
                    ` : ''}
                    <div class="meta-item">
                        <span>📷</span>
                        <span>${exhibition.photos ? exhibition.photos.length : 0} photos</span>
                    </div>
                </div>
                ${exhibition.description ? `
                    <p class="exhibition-description">${exhibition.description}</p>
                ` : ''}
            </div>
            <div class="exhibition-photos">
                ${photosHtml}
            </div>
        `;
        
        // Add click events to photos
        section.querySelectorAll('.photo-item').forEach(photoItem => {
            photoItem.addEventListener('click', () => {
                const photoUrl = photoItem.dataset.photoUrl;
                const photoTitle = photoItem.dataset.photoTitle;
                this.openImageModal(photoUrl, photoTitle);
            });
        });
        
        return section;
    }
    
    animatePhotosIn(exhibitionElement) {
        const photos = exhibitionElement.querySelectorAll('.photo-item');
        photos.forEach((photo, index) => {
            setTimeout(() => {
                photo.classList.add('show');
            }, index * 100);
        });
    }
    
    openImageModal(imageUrl, title) {
        this.modalImage.src = imageUrl;
        this.imageInfo.innerHTML = ''
        this.imageModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    closeImageModal() {
        this.imageModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    
    showMessage(message, type = 'success') {
        // Keep your existing showMessage method
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