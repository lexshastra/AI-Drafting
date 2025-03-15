import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import LandingPage from "./LandingPage";
// Import the simplified editor instead of AIPoweredEditor
import ContentEditableEditor from "./AIPoweredEditor";  
import DebugTools from "./DebugTools";

// Error boundary component
function ErrorFallback({ error, children }) {
  if (!error) {
    return children;
  }
  
  return (
    <div style={{
      padding: '20px',
      margin: '20px auto',
      maxWidth: '600px',
      backgroundColor: '#fff8f8',
      border: '1px solid #fed7d7',
      borderRadius: '4px'
    }}>
      <h2 style={{ color: '#c53030' }}>Something went wrong</h2>
      <p style={{ margin: '10px 0' }}>{error?.message || 'Unknown error occurred'}</p>
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4299e1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          Go to Home
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#48bb78',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

function App() {
  const mountedRef = useRef(false);
  
  useEffect(() => {
    console.log("[App] App component mounted");
    console.log("[App] Current URL:", window.location.href);
    
    // Add mount flag
    mountedRef.current = true;
    
    // Log route params if any
    const path = window.location.pathname;
    if (path.includes('/editor/')) {
      const id = path.split('/editor/')[1];
      console.log('[App] Editor route detected with ID:', id);
    }
    
    // Simple global error handler
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      console.error(`[Global Error] ${message}`, { source, lineno, colno, error });
      
      // Call original handler if it exists
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };
    
    return () => {
      console.log("[App] App component unmounting");
      mountedRef.current = false;
      window.onerror = originalOnError;
    };
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/editor/:id" element={<ContentEditableEditor key={window.location.pathname} />} />
          <Route path="/debug" element={<DebugTools />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;