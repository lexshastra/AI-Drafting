/**
 * Helper functions for working with the ProseMirror editor
 */

// Creates a simple standalone editor for testing - useful for diagnostics
export const createTestEditor = (container, initialContent = "Test editor content") => {
  // Ensure dependent modules are available
  if (!window.prosemirror) {
    // Load ProseMirror dependencies from CDN in sequence
    return new Promise((resolve, reject) => {
      const loadScript = (src, callback) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = callback;
        script.onerror = reject;
        document.head.appendChild(script);
      };
      
      loadScript('https://cdn.jsdelivr.net/npm/prosemirror-model@1.19.3/dist/index.min.js', () => {
        loadScript('https://cdn.jsdelivr.net/npm/prosemirror-state@1.4.3/dist/index.min.js', () => {
          loadScript('https://cdn.jsdelivr.net/npm/prosemirror-view@1.31.5/dist/index.min.js', () => {
            loadScript('https://cdn.jsdelivr.net/npm/prosemirror-schema-basic@1.2.2/dist/index.min.js', () => {
              createBasicEditor(container, initialContent);
              resolve();
            });
          });
        });
      });
    });
  } else {
    return createBasicEditor(container, initialContent);
  }
};

// Simple function to verify the editor container is in a good state
export const validateEditorContainer = (container) => {
  if (!container) {
    console.error("Editor container is null or undefined");
    return false;
  }
  
  // Check if container is attached to the DOM
  if (!document.body.contains(container)) {
    console.error("Editor container is not attached to the document");
    return false;
  }
  
  // Check if container has dimensions
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    console.error("Editor container has zero dimensions", rect);
    return false;
  }
  
  // Check if container is visible
  const style = window.getComputedStyle(container);
  if (style.display === 'none' || style.visibility === 'hidden') {
    console.error("Editor container is not visible", style);
    return false;
  }
  
  return true;
};

// Initialize the editor with safer logic
export const safelyInitEditor = async (editorRef, viewRef, editorState, handlers) => {
  // Ensure we wait for the DOM to be ready
  if (document.readyState !== 'complete') {
    await new Promise(resolve => {
      const checkReady = () => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }
  
  // Extra safety check to ensure DOM element exists
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Validate container
  if (!validateEditorContainer(editorRef.current)) {
    throw new Error("Editor container is not in a valid state");
  }
  
  // Import needed modules - synchronously to avoid issues
  const { EditorView } = await import('prosemirror-view');
  
  try {
    // Clear any existing content
    while (editorRef.current.firstChild) {
      editorRef.current.removeChild(editorRef.current.firstChild);
    }
    
    // Create the editor view
    const view = new EditorView(editorRef.current, {
      state: editorState,
      ...handlers
    });
    
    viewRef.current = view;
    
    // Verify the editor was created
    setTimeout(() => {
      const pmElement = editorRef.current.querySelector('.ProseMirror');
      if (!pmElement) {
        console.error("ProseMirror element not created");
      } else {
        console.log("ProseMirror element created successfully");
        // Add a special class for diagnostics
        pmElement.classList.add('editor-initialized');
      }
    }, 100);
    
    return view;
  } catch (error) {
    console.error("Error creating editor view:", error);
    throw error;
  }
};

export default {
  createTestEditor,
  validateEditorContainer,
  safelyInitEditor
};
