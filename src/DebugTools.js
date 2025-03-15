import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const DebugTools = () => {
  const [serverStatus, setServerStatus] = useState('checking');
  const [diagnostics, setDiagnostics] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    // Check server status
    const checkServer = async () => {
      try {
        const response = await fetch("http://localhost:5000/health", {
          signal: AbortSignal.timeout(2000)
        });
        if (response.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('error');
          setErrorDetails(`Server responded with status: ${response.status}`);
        }
      } catch (err) {
        setServerStatus('offline');
        setErrorDetails(err.message);
      }
    };

    // Run environment diagnostics
    const runDiagnostics = () => {
      // Check for any ProseMirror elements
      const proseMirrorElements = document.querySelectorAll('.ProseMirror');
      const editorContainers = document.querySelectorAll('[data-testid="editor-container"]');
      
      setDiagnostics({
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href,
        reactVersion: React.version,
        localStorage: typeof localStorage !== 'undefined',
        editorDetected: Boolean(proseMirrorElements.length),
        editorContainersFound: editorContainers.length,
        currentRoute: window.location.pathname,
        domReady: document.readyState,
        hasEditorRef: Boolean(document.querySelector('[ref="editorRef"]')),
        proseMirrorCount: proseMirrorElements.length
      });
    };

    checkServer();
    runDiagnostics();
  }, []);

  // Fix the testEditorCreation function to use direct DOM manipulation instead of dynamic imports
  const testEditorCreation = () => {
    try {
      // Create a temporary container
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed; bottom:20px; right:20px; width:300px; height:200px; background:white; border:1px solid #ccc; z-index:9999; padding: 10px; overflow: auto;';
      container.id = 'test-editor-container';
      document.body.appendChild(container);
      
      // Add direct content - avoid ProseMirror as it may be causing issues
      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <strong>Simple Editor Test</strong>
          <button id="close-test" style="background:none; border:none; cursor:pointer;">×</button>
        </div>
        
        <div id="simple-editor" style="border:1px solid #ddd; padding:10px; min-height:100px;" contentEditable="true">
          <p>This is a simple contentEditable element for testing.</p>
        </div>
        
        <div style="margin-top:10px; font-size:12px; color:#666;">
          Note: Using basic contentEditable instead of ProseMirror for reliability
        </div>
      `;
      
      // Add close button handler
      document.getElementById('close-test').addEventListener('click', () => {
        document.body.removeChild(container);
      });
      
      // Focus the editor
      setTimeout(() => {
        document.getElementById('simple-editor').focus();
      }, 100);
      
    } catch (err) {
      console.error('Error creating test editor:', err);
      alert(`Error creating test editor: ${err.message}`);
    }
  };

  // Add a simple function to create a basic contentEditable element
  const createBasicEditor = () => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed; bottom:20px; right:20px; width:300px; height:200px; background:white; border:1px solid #ccc; z-index:9999; padding: 10px;';
    container.id = 'basic-editor-container';
    
    const editor = document.createElement('div');
    editor.contentEditable = true;
    editor.style.cssText = 'border: 1px solid #ddd; padding: 10px; min-height: 100px; margin-bottom: 10px;';
    editor.innerHTML = '<p>This is a simple contentEditable element.</p>';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = 'padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;';
    closeButton.onclick = () => document.body.removeChild(container);
    
    container.appendChild(editor);
    container.appendChild(closeButton);
    document.body.appendChild(container);
    
    editor.focus();
  };

  return (
    <div style={{ 
      padding: '24px',
      maxWidth: '1000px',
      margin: '0 auto'
    }}>
      <h1 style={{ 
        fontSize: '24px', 
        fontWeight: 'bold', 
        marginBottom: '16px' 
      }}>Editor Debug Tools</h1>
      
      <div style={{ marginBottom: '24px' }}>
        <Link 
          to="/" 
          style={{
            padding: '8px 16px',
            backgroundColor: '#3182ce',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            marginRight: '8px',
            display: 'inline-block'
          }}
        >
          Back to Home
        </Link>
      </div>

      {/* Server Status Section */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-bold mb-2">Server Status</h2>
        <div className="flex items-center mb-2">
          <span className="mr-2">Backend Server:</span>
          {serverStatus === 'checking' && (
            <span className="bg-gray-200 px-2 py-1 rounded text-gray-700">Checking...</span>
          )}
          {serverStatus === 'online' && (
            <span className="bg-green-100 px-2 py-1 rounded text-green-800">Online</span>
          )}
          {serverStatus === 'offline' && (
            <span className="bg-red-100 px-2 py-1 rounded text-red-800">Offline</span>
          )}
          {serverStatus === 'error' && (
            <span className="bg-yellow-100 px-2 py-1 rounded text-yellow-800">Error</span>
          )}
        </div>
        
        {errorDetails && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
            <code>{errorDetails}</code>
          </div>
        )}
        
        <div className="mt-4">
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm mr-2"
          >
            Refresh
          </button>
          <a 
            href="http://localhost:5000" 
            target="_blank" 
            rel="noreferrer"
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
          >
            Open Server Status Page
          </a>
        </div>
      </div>
      
      {/* Environment Diagnostics */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-bold mb-2">Environment Diagnostics</h2>
        {diagnostics && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(diagnostics).map(([key, value]) => (
                  <tr key={key} className="border-b">
                    <td className="py-2 font-medium">{key}</td>
                    <td className="py-2">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Editor Test - enhanced with direct creation test */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-bold mb-2">Editor Test</h2>
        <p className="mb-4">Click the buttons below to test ProseMirror:</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <button 
            onClick={() => {
              if (window.editorDiagnostics?.checkEditorFunctionality) {
                const result = window.editorDiagnostics.checkEditorFunctionality();
                console.log('Editor diagnostics result:', result);
                alert(result.success 
                  ? `Editor diagnostics complete. Check console for detailed results.` 
                  : `Editor diagnostics failed: ${result.error}`);
              } else {
                alert('Editor diagnostics not available. Please open this in a page with the editor.');
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#805ad5',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Run Editor Diagnostics
          </button>
          
          <button 
            onClick={testEditorCreation}
            style={{
              padding: '8px 16px',
              backgroundColor: '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create Test Editor
          </button>
          
          <button 
            onClick={createBasicEditor}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create Basic Editor
          </button>
          
          <button 
            onClick={() => window.location.href = '/editor/test-' + Date.now()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create New Document
          </button>
        </div>
        
        {/* Add direct manual test with simpler implementation */}
        <div style={{ 
          border: '1px dashed #ccc', 
          padding: '10px', 
          marginTop: '10px',
          backgroundColor: '#f9f9f9' 
        }}>
          <p style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            Manual Test Area (Simple Editor):
          </p>
          <div 
            id="manual-editor-test"
            style={{ 
              border: '1px solid #ddd', 
              padding: '10px', 
              minHeight: '100px', 
              background: 'white'
            }}
            contentEditable="true"
            suppressContentEditableWarning={true}
          >
            <p>This is a simple contentEditable element. You can edit this text directly.</p>
            <p>This bypasses ProseMirror to test if basic editing works in your browser.</p>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => {
                const editor = document.getElementById('manual-editor-test');
                editor.innerHTML = '<p>Text was reset</p>';
                editor.focus();
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reset Text
            </button>
            <button 
              onClick={() => {
                const editor = document.getElementById('manual-editor-test');
                editor.innerHTML = editor.innerHTML + '<p><strong>Bold text</strong> and <em>italic text</em></p>';
                editor.focus();
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#38a169',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Formatted Text
            </button>
          </div>
        </div>
      </div>

      {/* Troubleshooting steps */}
      <div className="p-4 border rounded">
        <h2 className="text-xl font-bold mb-2">Troubleshooting Steps</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Make sure the server is running at http://localhost:5000</li>
          <li>Try clearing your browser cache and cookies</li>
          <li>Check if you're using a supported browser (Chrome, Firefox, Edge)</li>
          <li>Make sure the document ID in the URL is valid</li>
          <li>Try creating a new document from the home page</li>
          <li>Check your browser console for JavaScript errors</li>
          <li>If using an ad blocker, try disabling it temporarily</li>
        </ol>
      </div>
    </div>
  );
};

export default DebugTools;
