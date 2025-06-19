
  function toggleSection(sectionId) {
      const content = document.getElementById(sectionId + 'Content');
      const icon = document.getElementById(sectionId + 'Icon');
      
      if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        icon.classList.remove('expanded');
        icon.textContent = '+';
      } else {
        content.classList.add('expanded');
        icon.classList.add('expanded');
        icon.textContent = '+';
      }
    }
