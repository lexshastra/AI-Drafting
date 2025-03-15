import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * SimpleEditor component - A basic contentEditable-based editor
 * This serves as a fallback when ProseMirror doesn't work properly
 */
const SimpleEditor = ({ initialContent = '', onSave = () => {} }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const [errors, setErrors] = useState(null);

  // Initialize editor
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent || '<p>Start typing here...</p>';
      setLoading(false);
      
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      }, 100);
    }
    
    return () => {
      // Save content on unmount
      if (editorRef.current && id) {
        handleSave();
      }
    };
  }, [initialContent, id]);
  
  // Update word count when content changes
  const handleInput = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const words = text.split(/\s+/).filter(w => w.length > 0);
      setWordCount(words.length);
      setContent(editorRef.current.innerHTML);
      
      // Auto-save after delay
      if (id) {
        setSaveStatus('typing');
        const timeout = setTimeout(() => {
          handleSave();
        }, 1000);
        
        return () => clearTimeout(timeout);
      }
    }
  };
  
  // Handle saving content to server
  const handleSave = async () => {
    if (!id || !editorRef.current) return;
    
    setSaveStatus('saving');
    try {
      const html = editorRef.current.innerHTML;
      const response = await fetch('http://localhost:5000/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: id, content: html })
      });
      
      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`);
      }
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setErrors(error.message);
    }
  };
  
  const createNewDocument = () => {
    const newId = Date.now().toString();
    navigate(`/simple/${newId}`);
  };

  // Simple styling for buttons
  const buttonStyle = {
    padding: '8px 12px',
    margin: '0 5px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  };
  
  return (
    <div className="editor-app">
      <div className="ribbon" style={{ paddingLeft: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', marginRight: '15px' }}>Simple Editor</h1>
        
        <button 
          onClick={() => navigate('/')} 
          style={{ ...buttonStyle, backgroundColor: '#718096' }}
        >
          Back to Home
        </button>
        <button 
          onClick={handleSave}
          style={buttonStyle}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save'}
        </button>
        <button 
          onClick={createNewDocument}
          style={{ ...buttonStyle, backgroundColor: '#48bb78' }}
        >
          New Document
        </button>
        
        <div style={{ marginLeft: 'auto' }}>
          {saveStatus === 'saved' && <span style={{ color: 'green' }}>✓ Saved</span>}
          {saveStatus === 'error' && <span style={{ color: 'red' }}>❌ Save failed</span>}
        </div>
      </div>
      
      <div className="editor-container">
        {errors && (
          <div style={{ 
            width: '210mm',
            padding: '10px', 
            backgroundColor: '#fed7d7', 
            color: '#c53030',
            borderRadius: '4px',
            marginBottom: '10px'
          }}>
            Error: {errors}
          </div>
        )}
        
        <div className="a4-page">
          <div
            ref={editorRef}
            contentEditable={true}
            onInput={handleInput}
            className="content-editable-editor"
            suppressContentEditableWarning={true}
          />
          <div className="page-number">1</div>
        </div>
        
        <div className="document-info-bar">
          <span>Words: {wordCount}</span>
          <span>Document ID: {id}</span>
        </div>
      </div>
    </div>
  );
};

export default SimpleEditor;
