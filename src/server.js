// Check for required dependencies
try {
  require('express');
  require('cors');
} catch (err) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Missing dependencies! Please run:');
  console.error('\x1b[33m%s\x1b[0m', 'npm install express cors');
  console.error('\x1b[31m%s\x1b[0m', 'Then try running the server again.\n');
  process.exit(1);
}

const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 5000;

// Allow CORS for local development
app.use(cors());
app.use(express.json({limit: '10mb'}));

const DOCUMENTS_DIR = path.join(__dirname, "documents");

// Ensure the documents folder exists
if (!fs.existsSync(DOCUMENTS_DIR)) {
  try {
    fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
    console.log(`Created documents directory at: ${DOCUMENTS_DIR}`);
  } catch (err) {
    console.error(`❌ Failed to create documents directory: ${err.message}`);
    console.error(`Please create the directory manually at: ${DOCUMENTS_DIR}`);
  }
}

// Enhanced health check endpoint to verify server is running
app.get("/health", (req, res) => {
  try {
    // Check if documents directory is accessible
    const filesExist = fs.existsSync(DOCUMENTS_DIR);
    const fileCount = filesExist ? fs.readdirSync(DOCUMENTS_DIR).length : 0;
    
    res.json({ 
      status: "ok", 
      timestamp: new Date(),
      details: {
        documentsDirectoryExists: filesExist,
        documentCount: fileCount,
        uptime: process.uptime() + " seconds",
        memory: process.memoryUsage(),
        node: process.version
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: "error",
      message: error.message
    });
  }
});

// Endpoint to save a file - update to handle any content type properly
app.post("/save", (req, res) => {
  const { fileId, content } = req.body;
  
  if (!fileId) {
    return res.status(400).json({ message: "fileId is required" });
  }
  
  const filePath = path.join(DOCUMENTS_DIR, `${fileId}.json`);
  
  try {
    // Store content directly without modification
    // This allows storing both HTML strings and JSON objects
    fs.writeFileSync(filePath, JSON.stringify(content));
    res.json({ message: "File saved successfully", fileId });
  } catch (err) {
    console.error(`Error saving file ${fileId}:`, err);
    res.status(500).json({ message: "Error saving file", error: err.message });
  }
});

// Endpoint to load a file
app.get("/load/:fileId", (req, res) => {
  const filePath = path.join(DOCUMENTS_DIR, `${req.params.fileId}.json`);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }
  
  try {
    const data = fs.readFileSync(filePath, "utf8");
    res.json({ content: data });
  } catch (err) {
    console.error(`Error loading file ${req.params.fileId}:`, err);
    res.status(500).json({ message: "Error loading file", error: err.message });
  }
});

// Endpoint to list files (for LandingPage)
app.get("/files", (req, res) => {
  try {
    const files = fs.readdirSync(DOCUMENTS_DIR);
    const fileList = files
      .filter(filename => filename.endsWith('.json'))
      .map(filename => {
        const id = path.basename(filename, ".json");
        const stats = fs.statSync(path.join(DOCUMENTS_DIR, filename));
        return { id, title: "Untitled", modifiedAt: stats.mtimeMs };
      });
    res.json(fileList);
  } catch (err) {
    console.error("Error reading files:", err);
    res.status(500).json({ message: "Error reading files", error: err.message });
  }
});

// Add DELETE endpoint to handle file deletion
app.delete("/files/:id", (req, res) => {
  const fileId = req.params.id;
  
  if (!fileId) {
    return res.status(400).json({ message: "fileId is required" });
  }
  
  const filePath = path.join(DOCUMENTS_DIR, `${fileId}.json`);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }
  
  try {
    fs.unlinkSync(filePath);
    console.log(`Successfully deleted file: ${fileId}`);
    res.json({ message: "File deleted successfully", fileId });
  } catch (err) {
    console.error(`Error deleting file ${fileId}:`, err);
    res.status(500).json({ message: "Error deleting file", error: err.message });
  }
});

// For development only: Add a simple HTML page that shows server status
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Editor Backend Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .container { max-width: 800px; margin: 0 auto; }
          .status { padding: 20px; background-color: #e6f7ff; border-radius: 5px; }
          code { background: #f4f4f4; padding: 2px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Editor Backend Server</h1>
          <div class="status">
            <p>✅ Server is running on <a href="http://localhost:${PORT}">http://localhost:${PORT}</a></p>
            <p>Available endpoints:</p>
            <ul>
              <li><code>GET /health</code> - Server health check</li>
              <li><code>GET /files</code> - List all documents</li>
              <li><code>POST /save</code> - Save a document</li>
              <li><code>GET /load/:fileId</code> - Load a document</li>
            </ul>
          </div>
          <h2>Instructions</h2>
          <p>To use the editor application:</p>
          <ol>
            <li>Keep this server running</li>
            <li>Open your React application in a separate terminal with <code>npm start</code></li>
            <li>Access your editor at <a href="http://localhost:3000">http://localhost:3000</a></li>
          </ol>
        </div>
      </body>
    </html>
  `);
});

// Add startup instructions at the end
app.listen(PORT, () => {
  console.log('\x1b[32m%s\x1b[0m', '✅ Server running successfully!');
  console.log('\x1b[36m%s\x1b[0m', `📋 Server URL: http://localhost:${PORT}`);
  console.log('\x1b[36m%s\x1b[0m', `📁 Documents directory: ${DOCUMENTS_DIR}`);
  console.log('\x1b[33m%s\x1b[0m', '\n📝 To use the editor:');
  console.log('   1. Keep this terminal window open');
  console.log('   2. Open another terminal and run: npm start');
  console.log('   3. Access your editor at: http://localhost:3000');
});

// Handle server errors
process.on('uncaughtException', (error) => {
  console.error('\x1b[31m%s\x1b[0m', '❌ Uncaught Exception:');
  console.error(error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\x1b[31m%s\x1b[0m', '❌ Unhandled Rejection at:');
  console.error(promise);
  console.error('Reason:', reason);
});
