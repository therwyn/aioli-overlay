const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const app = express();
const PORT = 80;

// Detect if running as pkg executable
const isPkg = typeof process.pkg !== 'undefined';
const basePath = isPkg ? path.dirname(process.execPath) : __dirname;

// Middleware
app.use(cors());

// Handle static file serving
// When running as pkg, bundled assets (HTML, CSS, JS) are in the snapshot filesystem
// External files (user images, txt files) should be in basePath
if (isPkg) {
  // Serve bundled web files from snapshot filesystem
  app.use(express.static(__dirname));
  // Also serve external files from executable directory (user's img/, txt/ folders)
  app.use(express.static(basePath));
} else {
  app.use(express.static('.'));
}

// Configuration defaults
const defaultSections = [];

// Helper function to resolve file paths (handles relative paths from basePath)
function resolvePath(filePath) {
  if (!filePath) return null;
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(basePath, filePath);
}

// Helper function to check if hosts file entry exists
async function checkHostsEntry() {
  try {
    const hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
    const hostsContent = fs.readFileSync(hostsPath, 'utf8');
    return hostsContent.includes('127.0.0.1 aioli.local') || hostsContent.includes('127.0.0.1\taioli.local');
  } catch (error) {
    return false;
  }
}

// Helper function to add hosts file entry (requires admin elevation)
async function addHostsEntry() {
  try {
    const hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
    const entry = '\n127.0.0.1 aioli.local';
    
    // Check if already exists
    if (await checkHostsEntry()) {
      console.log('✓ Hosts file entry already exists');
      return true;
    }

    // Use PowerShell to append to hosts file (requires admin)
    const command = `powershell -Command "Start-Process powershell -ArgumentList '-Command', 'Add-Content -Path ''${hostsPath}'' -Value ''${entry}'' -Force' -Verb RunAs -Wait"`;
    
    await execAsync(command);
    
    // Verify it was added
    if (await checkHostsEntry()) {
      console.log('✓ Hosts file entry added successfully');
      return true;
    } else {
      console.warn('⚠ Failed to add hosts file entry. You may need to add it manually.');
      console.warn('  Add this line to C:\\Windows\\System32\\drivers\\etc\\hosts:');
      console.warn('  127.0.0.1 aioli.local');
      return false;
    }
  } catch (error) {
    console.warn('⚠ Failed to automatically add hosts file entry:', error.message);
    console.warn('  Please add this line to C:\\Windows\\System32\\drivers\\etc\\hosts manually:');
    console.warn('  127.0.0.1 aioli.local');
    return false;
  }
}

// Create default config.json template if it doesn't exist
function createDefaultConfig() {
  const configPath = path.join(basePath, 'config.json');
  const imgPath = path.join(basePath, 'img');
  const txtPath = path.join(basePath, 'txt');
  if (fs.existsSync(configPath) && fs.existsSync(imgPath) && fs.existsSync(txtPath)) {
    return;
  }

  const defaultConfig = {
    "sections": [
      {
        "title": "Counter",
        "image": null,
        "counter1": "txt/counter.txt",
        "counter2": null,
        "separator": null,
        "backgroundAlpha": 100
      }
    ]
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    fs.mkdirSync(imgPath, { recursive: true });
    fs.mkdirSync(txtPath, { recursive: true });
    console.log('✓ Created default config.json template and img/ and txt/ folders');
    console.log('  Please edit config.json to configure your sections.');
    console.log('  Text files and images need to be in the img/ and txt/ folders next to the executable.');
  } catch (error) {
    console.error('Error creating default config.json:', error.message);
  }
}

// Load configuration
let config = {};

function loadConfig() {
  try {
    const configPath = path.join(basePath, 'config.json');
    const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config = newConfig;
    
    // Validate sections array
    if (!Array.isArray(config.sections)) {
      console.error('Error: config.sections must be an array');
      return false;
    }
    
    console.log('✓ Config reloaded successfully');
    console.log(`  Sections: ${config.sections.length}`);
    return true;
  } catch (error) {
    console.error('Error loading config.json:', error.message);
    console.error('  Keeping previous configuration');
    return false;
  }
}

// First-run setup
console.log('Starting Aioli Overlay...');
if (isPkg) {
  console.log('Running as standalone executable');
}

// Create default config if missing
createDefaultConfig();

// Check and add hosts file entry
(async () => {
  if (!(await checkHostsEntry())) {
    console.log('Adding hosts file entry (may require admin elevation)...');
    await addHostsEntry();
  }
})();

// Initial load
if (!loadConfig()) {
  console.error('Failed to load config.json. Please check the file and try again.');
  process.exit(1);
}

// Watch for config file changes
let reloadTimeout;
const configPath = path.join(basePath, 'config.json');
if (fs.existsSync(configPath)) {
  fs.watch(configPath, (eventType) => {
    if (eventType === 'change') {
      // Debounce: wait 100ms before reloading to handle multiple events
      clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => {
        console.log('\n[Config change detected] Reloading config.json...');
        loadConfig();
      }, 100);
    }
  });
}

// API endpoint to get all sections configuration
app.get('/api/sections', (_req, res) => {
  try {
    if (!Array.isArray(config.sections)) {
      return res.status(500).json({ error: 'Invalid sections configuration' });
    }
    res.json({ sections: config.sections });
  } catch (error) {
    console.error('Error serving sections configuration:', error.message);
    res.status(500).json({ error: 'Failed to load sections configuration' });
  }
});

// API endpoint to get counter value from a file path
app.get('/api/counter', (req, res) => {
  try {
    const filePath = req.query.path;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path parameter required' });
    }

    const counterPath = resolvePath(filePath);
    
    if (!counterPath) {
      return res.status(500).json({ error: 'Invalid file path' });
    }

    // Check if file exists
    if (!fs.existsSync(counterPath)) {
      return res.status(404).json({ error: 'Counter file not found' });
    }

    // Read counter value
    const counterValue = fs.readFileSync(counterPath, 'utf8').trim();
    res.json({ count: counterValue });
  } catch (error) {
    console.error('Error reading counter file:', error.message);
    res.status(500).json({ error: 'Failed to read counter file' });
  }
});

// API endpoint to get image path
app.get('/api/image', (req, res) => {
  try {
    const filePath = req.query.path;
    
    if (!filePath) {
      return res.json({ imagePath: '' });
    }

    const imagePath = resolvePath(filePath);
    
    if (!imagePath) {
      return res.json({ imagePath: '' });
    }

    // Check if image file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    // Return path relative to basePath, normalized for web (forward slashes)
    const relativePath = path.relative(basePath, imagePath).replace(/\\/g, '/');
    res.json({ imagePath: relativePath });
  } catch (error) {
    console.error('Error reading image:', error.message);
    res.status(500).json({ error: 'Failed to read image' });
  }
});

app.listen(PORT, () => {
  console.log(`Aioli Overlay server running on http://aioli.local`);
  console.log('Add this URL as a link source in TikTok Live Studio');
  console.log(`Sections configured: ${config.sections ? config.sections.length : 0}`);
});
