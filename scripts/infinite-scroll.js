// scripts/infinite-scroll.js

let page = 1; // Start from the first page
const paintingsContainer = document.getElementById('paintings-container');


// Fetch paintings dynamically from your server or locally
function fetchPaintings(page) {
    const paintings = [
        '../assets/images/test',
        '../assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
       '../assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
       '../assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
       '../assets/images/WhatsApp Image 2024-09-16 at 16.45.23 (1).jpeg',
        // Add more painting paths
    ];

    // Simulate an API call to get paintings
    return new Promise((resolve) => {
        setTimeout(() => {
            const newPaintings = paintings.slice((page - 1) * 3, page * 3); // Fetch 3 paintings per page
            resolve(newPaintings);
            
        }, 1000); // Simulating delay
    });
}

// Function to append paintings to the container
function loadPaintings(page) {

    fetchPaintings(page).then((newPaintings) => {
        newPaintings.forEach((painting) => {
            const img = document.createElement('img');
            img.src = painting;
            img.classList.add('w-full', 'h-auto', 'rounded-lg'); // Add Tailwind classes for styling
            paintingsContainer.appendChild(img);
        });

    });
}

// Event listener for infinite scroll
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        page += 1;
        loadPaintings(page);
    }
});

// Load the initial batch of paintings when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadPaintings(page);
});
