const bcrypt = require('bcrypt');

// Generate the correct hash for 'admin123'
async function generateHash() {
  try {
    const password = 'admin123';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('Password:', password);
    console.log('Generated hash:', hash);
    
    // Verify it works
    const isValid = await bcrypt.compare(password, hash);
    console.log('Verification:', isValid);
    
    // Also test the current hash
    const currentHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    const currentValid = await bcrypt.compare(password, currentHash);
    console.log('Current hash valid for admin123:', currentValid);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

generateHash();