
    function toggleTechniques() {
      const content = document.getElementById('techniquesContent');
      const icon = document.getElementById('expandIcon');
      
      if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        icon.classList.remove('expanded');
        icon.textContent = '+';
      } else {
        content.classList.add('expanded');
        icon.classList.add('expanded');
        icon.textContent = '−';
      }
    }

document.addEventListener('DOMContentLoaded', async () => {
 
  // If authenticated, initialize the admin panel
    new toggleTechniques()
  
});
