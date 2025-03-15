const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Directory for storing data files
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Get all files
app.get('/files', (req, res) => {
  try {
    // Read all files from the data directory
    const files = fs.readdirSync(DATA_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(DATA_DIR, file);
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        return {
          id: file.replace('.json', ''),
          title: fileData.title || 'Untitled Document',
          modifiedAt: fileData.modifiedAt || new Date().toISOString()
        };
      })
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt)); // Sort by modification date
    
    res.json(files);
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: 'Failed to read files' });
  }
});

// Load a specific file
app.get('/load/:id', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(DATA_DIR, `${id}.json`);
  
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(fileData);
  } catch (error) {
    console.error(`Error loading file ${id}:`, error);
    res.status(500).json({ error: 'Failed to load file' });
  }
});

// Save a file
app.post('/save', (req, res) => {
  const { fileId, content, title } = req.body;
  
  if (!fileId) {
    return res.status(400).json({ error: 'File ID is required' });
  }
  
  const filePath = path.join(DATA_DIR, `${fileId}.json`);
  
  try {
    const fileData = {
      content,
      title: title || 'Untitled Document',
      modifiedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
    res.json({ success: true, fileId });
  } catch (error) {
    console.error(`Error saving file ${fileId}:`, error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Delete a file endpoint
app.delete('/files/:id', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(DATA_DIR, `${id}.json`);
  
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    fs.unlinkSync(filePath); // Delete the file
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error(`Error deleting file ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
