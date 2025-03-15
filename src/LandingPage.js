import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Server availability check function
const checkServerAvailability = async () => {
  try {
    const response = await fetch("http://localhost:5000/health", { 
      method: 'GET',
      // Set a short timeout to quickly determine if the server is responding
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch (error) {
    console.error("Server availability check failed:", error);
    return false;
  }
};

const LandingPage = () => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [serverAvailable, setServerAvailable] = useState(null); // null = unknown, true/false based on check
  const navigate = useNavigate();

  // Check server availability when component mounts
  useEffect(() => {
    const checkServer = async () => {
      const available = await checkServerAvailability();
      setServerAvailable(available);
      
      if (available) {
        fetchFiles();
      } else {
        setIsLoading(false);
        setErrorMessage("Server is not available. Please make sure the backend server is running on http://localhost:5000");
      }
    };
    
    checkServer();
  }, []);

  // Fetch file list from backend
  const fetchFiles = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("http://localhost:5000/files", {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      if (!response.ok) throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error("Error fetching files:", error);
      if (error.name === "AbortError" || error.name === "TypeError") {
        setErrorMessage("Could not connect to the server. Please make sure the server is running.");
        setServerAvailable(false);
      } else {
        setErrorMessage(`Failed to load documents: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createNewFile = async () => {
    if (!serverAvailable) {
      setErrorMessage("Cannot create a document: Server is not available. Please start the server and try again.");
      return;
    }
    
    setIsCreating(true);
    setErrorMessage(null);
    const newId = Date.now().toString();
    console.log("[Landing] Creating new document with ID:", newId);
    
    // Create an empty ProseMirror doc JSON with an initial paragraph
    const emptyDoc = { 
      type: "doc", 
      content: [{ 
        type: "paragraph", 
        content: [{ 
          type: "text", 
          text: "Start typing here..." 
        }] 
      }] 
    };
    
    try {
      const response = await fetch("http://localhost:5000/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: newId, content: emptyDoc }),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Status: ${response.status} ${response.statusText}` }));
        throw new Error(errorData.message || "Failed to create file");
      }
      
      console.log(`[Landing] Document created successfully, navigating to /editor/${newId}`);
      
      // Navigate with hard URL to avoid any React Router issues
      window.location.href = `/editor/${newId}`;
    } catch (error) {
      console.error("[Landing] Error creating file:", error);
      if (error.name === "AbortError" || error.name === "TypeError") {
        setErrorMessage("Failed to connect to the server when creating document. Is the server running?");
        setServerAvailable(false);
      } else {
        setErrorMessage(`Error creating new document: ${error.message}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Add restart server function (for local development only)
  const restartServer = () => {
    window.open("http://localhost:5000/restart", "_blank");
  };

  const openFile = (id) => {
    console.log(`[Landing] Opening document with ID: ${id}`);
    // Use direct navigation to avoid potential React Router issues
    window.location.href = `/editor/${id}`;
  };

  const refreshFiles = () => {
    fetchFiles();
  };

  // Updated delete document functionality to match the server-side implementation
  const handleDeleteDocument = async (id, title = "this document") => {
    if (!serverAvailable) {
      setErrorMessage("Cannot delete document: Server is not available.");
      return;
    }
    
    // Ask for user confirmation before deleting
    const confirmDelete = window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`);
    
    if (!confirmDelete) {
      return; // User cancelled the operation
    }
    
    setIsDeleting(true);
    setErrorMessage(null);
    
    try {
      // Use the files endpoint with DELETE method
      const response = await fetch(`http://localhost:5000/files/${id}`, {
        method: "DELETE",
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: `Failed to delete document (Status: ${response.status})` 
        }));
        throw new Error(errorData.message || "Failed to delete document");
      }
      
      // Update files state by removing the deleted file
      setFiles(prevFiles => prevFiles.filter(file => file.id !== id));
      
      // Show success message
      alert("Document deleted successfully!");
      
    } catch (error) {
      console.error("Error deleting document:", error);
      
      if (error.name === "AbortError" || error.name === "TypeError") {
        setErrorMessage("Failed to connect to the server when deleting document. Is the server running?");
        setServerAvailable(false);
      } else {
        setErrorMessage(`Error deleting document: ${error.message}`);
        
        // Add instructions for setting up the delete endpoint
        console.error("Delete operation failed. Please ensure:");
        console.error("1. Your server has a DELETE endpoint at /files/:id");
        console.error("2. The endpoint is properly implemented to delete files");
        console.error("3. You can implement the server code provided in the server.js file");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateNewDocument = () => {
    createNewFile();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="landing-header">
        <h1>Document Manager</h1>
        <button 
          className="create-button"
          onClick={handleCreateNewDocument}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}
        >
          Create New Document
        </button>
      </div>
      
      {/* Server status indicator */}
      <div className="mb-4 flex items-center">
        <span className="mr-2">Server status:</span>
        {serverAvailable === null ? (
          <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-sm">Checking...</span>
        ) : serverAvailable ? (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Connected</span>
        ) : (
          <div className="flex items-center">
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">Disconnected</span>
            <button 
              onClick={async () => {
                const available = await checkServerAvailability();
                setServerAvailable(available);
                if (available) fetchFiles();
              }}
              className="ml-2 text-blue-500 text-sm underline"
            >
              Retry connection
            </button>
          </div>
        )}
      </div>
      
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          <p>{errorMessage}</p>
          {!serverAvailable && (
            <div className="mt-2 text-sm">
              <p>Make sure your Express server is running with:</p>
              <pre className="bg-gray-800 text-white p-2 rounded mt-1">node src/server.js</pre>
            </div>
          )}
        </div>
      )}
      
      <div className="flex gap-2 mb-4">
        <button 
          onClick={createNewFile} 
          className="p-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
          disabled={isCreating || !serverAvailable}
        >
          {isCreating ? "Creating..." : "New Document"}
        </button>
        
        <button 
          onClick={fetchFiles}
          className="p-2 bg-gray-200 text-gray-700 rounded disabled:bg-gray-100"
          disabled={isLoading || !serverAvailable}
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>
      
      {isLoading ? (
        <div className="p-4 text-center">Loading documents...</div>
      ) : !serverAvailable ? (
        <div className="p-4 text-center text-gray-500">
          Cannot display documents while server is unavailable.
        </div>
      ) : files.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No documents found. Create your first document!
        </div>
      ) : (
        <div className="document-grid">
          {files.map((file) => (
            <div className="document-card" key={file.id}>
              <h3>{file.title || "Untitled Document"}</h3>
              <p>Last modified: {new Date(file.modifiedAt).toLocaleString()}</p>
              <div className="document-actions">
                <button 
                  className="open-button"
                  onClick={() => navigate(`/editor/${file.id}`)}
                  style={{
                    backgroundColor: '#2196F3',
                    color: 'white',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Open
                </button>
                <button 
                  className="delete-button"
                  onClick={() => handleDeleteDocument(file.id, file.title || "Untitled Document")}
                  disabled={isDeleting}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginLeft: '8px',
                    opacity: isDeleting ? 0.7 : 1
                  }}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandingPage;
