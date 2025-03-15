import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
import { v4 as uuidv4 } from 'uuid';
import { cleanWordPasteContent } from './utils/WordPasteHandler';
import { convertToDocx } from './utils/DocxExporter';

// Simple ContentEditable Editor component for reliable editing
const ContentEditableEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  
  // State for the editor
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [documentTitle, setDocumentTitle] = useState("Untitled Document");
  
  // Add pagination state
  const [pages, setPages] = useState([{ id: 1, content: "" }]);
  const pagesRef = useRef([]);
  const contentObserverRef = useRef(null);
  
  // Add state to track actual visible content for each page
  const [pageContents, setPageContents] = useState([]);
  
  // Track active formatting states
  const [activeFormatting, setActiveFormatting] = useState({
    bold: false,
    italic: false,
    underline: false,
    alignLeft: true,
    alignCenter: false,
    alignRight: false,
    alignJustify: false
  });
  
  // Add a state to track whether content was just pasted
  const [justPasted, setJustPasted] = useState(false);
  const pastedContentRef = useRef(null);
  
  // Update document title
  useEffect(() => {
    document.title = documentTitle || "Editor";
  }, [documentTitle]);
  
  // Load document content when ID changes
  useEffect(() => {
    if (!id) return;
    
    const loadDocument = async () => {
      setIsLoading(true);
      setServerError(null);
      
      try {
        const response = await fetch(`http://localhost:5000/load/${id}`, {
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Document not found");
          }
          throw new Error(`Failed to load document: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Initialize editor with content
        if (editorRef.current && data.content) {
          // If content is JSON, handle it appropriately
          if (typeof data.content === 'string' && data.content.trim().startsWith('{')) {
            try {
              // Try to parse as JSON
              const jsonContent = JSON.parse(data.content);
              editorRef.current.innerHTML = jsonContent;
            } catch (e) {
              // Not valid JSON, use as raw content
              editorRef.current.innerHTML = data.content;
            }
          } else {
            // Use content directly
            editorRef.current.innerHTML = data.content;
          }
          
          // Update word count
          updateWordCount();
        }
      } catch (error) {
        console.error("Error loading document:", error);
        setServerError(error.message);
        
        // Initialize with empty content
        if (editorRef.current) {
          editorRef.current.innerHTML = "<p>Start typing here...</p>";
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDocument();
  }, [id]);
  
  // Save document content - add more explicit user feedback
  const saveDocument = async () => {
    if (!id || !editorRef.current) return;
    
    setSaveStatus("saving");
    setServerError(null);
    
    try {
      // Get HTML content
      const htmlContent = editorRef.current.innerHTML;
      
      const response = await fetch("http://localhost:5000/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: id, content: htmlContent, title: documentTitle }),
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`);
      }
      
      setSaveStatus("saved");
      
      // Show more explicit save confirmation
      alert("Document saved successfully!");
      
      // Reset save status after a delay
      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    } catch (error) {
      console.error("Error saving document:", error);
      setSaveStatus("error");
      setServerError(error.message);
      // Show explicit error message
      alert(`Failed to save document: ${error.message}`);
    }
  };
  
  // Handle input changes - remove auto-save functionality
  const handleInput = () => {
    if (!editorRef.current) return;
    
    try {
      // Update content state
      setContent(editorRef.current.innerHTML);
      
      // Update word count
      updateWordCount();
      
      // Calculate pagination
      calculatePages();
      
      // Remove auto-save trigger - document only saves when Save button is clicked
    } catch (error) {
      console.error("Error in handleInput:", error);
    }
  };
  
  // Update word count
  const updateWordCount = () => {
    if (!editorRef.current) return;
    
    const text = editorRef.current.textContent || '';
    const words = text.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  };
  
  // Create new document - added explicit alert for better UX
  const handleNewDocument = async () => {
    setSaveStatus("saving");
    setServerError(null);
    
    // Generate a new document ID
    const newId = uuidv4 ? uuidv4() : Date.now().toString();
    
    try {
      // Initialize with empty content
      const initialContent = "<p>Start typing here...</p>";
      
      const response = await fetch("http://localhost:5000/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: newId, content: initialContent, title: "Untitled Document" }),
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create document: ${response.status}`);
      }
      
      // Navigate to the new document
      navigate(`/editor/${newId}`);
    } catch (error) {
      console.error("Error creating document:", error);
      setSaveStatus("error");
      setServerError(error.message);
      alert(`Failed to create new document: ${error.message}`);
    }
  };
  
  // Export as text file
  const exportAsText = () => {
    if (!editorRef.current) return;
    
    const text = editorRef.current.textContent || '';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${documentTitle}.txt`);
  };
  
  // Export as HTML
  const exportAsHTML = () => {
    if (!editorRef.current) return;
    
    const html = editorRef.current.innerHTML || '';
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `${documentTitle}.html`);
  };
  
  // Export as DOCX file - with better error handling
  const exportAsDocx = async () => {
    if (!editorRef.current) return;
    
    try {
      // Check if html-docx-js is loaded
      if (!window.htmlDocx && !window.htmlDocxLoaded) {
        // Try to dynamically load the library
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html-docx-js@0.3.1/dist/html-docx.js';
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        console.log("html-docx-js library loaded dynamically");
      }
      
      const html = editorRef.current.innerHTML || '';
      const blob = await convertToDocx(html);
      saveAs(blob, `${documentTitle}.docx`);
    } catch (error) {
      console.error("Error exporting to DOCX:", error);
      alert(`Failed to export to DOCX format: ${error.message}. Please try again.`);
    }
  };
  
  // Apply formatting with improved feedback
  const applyFormatting = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    checkFormatting();
  };
  
  // Apply text alignment
  const applyAlignment = (alignment) => {
    // Reset all alignment states first
    const newFormatting = {
      ...activeFormatting,
      alignLeft: false,
      alignCenter: false,
      alignRight: false,
      alignJustify: false
    };
    
    // Set the active alignment
    switch(alignment) {
      case 'left':
        newFormatting.alignLeft = true;
        document.execCommand('justifyLeft', false, null);
        break;
      case 'center':
        newFormatting.alignCenter = true;
        document.execCommand('justifyCenter', false, null);
        break;
      case 'right':
        newFormatting.alignRight = true;
        document.execCommand('justifyRight', false, null);
        break;
      case 'justify':
        newFormatting.alignJustify = true;
        document.execCommand('justifyFull', false, null);
        break;
      default:
        newFormatting.alignLeft = true;
        document.execCommand('justifyLeft', false, null);
    }
    
    setActiveFormatting(newFormatting);
    editorRef.current?.focus();
  };
  
  // Check current formatting state
  const checkFormatting = () => {
    if (!document.queryCommandSupported) return;
    
    setActiveFormatting({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      alignLeft: document.queryCommandState('justifyLeft'),
      alignCenter: document.queryCommandState('justifyCenter'),
      alignRight: document.queryCommandState('justifyRight'),
      alignJustify: document.queryCommandState('justifyFull')
    });
  };
  
  // Add selection change event to track formatting
  useEffect(() => {
    const handleSelectionChange = () => {
      checkFormatting();
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);
  
  // Insert HTML
  const insertHTML = (html) => {
    document.execCommand('insertHTML', false, html);
    editorRef.current?.focus();
  };
  
  // Improved pagination logic that accurately splits content between pages
  const calculatePages = () => {
    // Skip standard calculation if we just pasted content
    if (justPasted) {
      return;
    }
    
    if (!editorRef.current) return;
    
    // Get current editor content
    const content = editorRef.current.innerHTML;
    
    // Calculate A4 dimensions in pixels
    const pageHeightMM = 247; // A4 height (297mm) minus 50mm margins
    const pixelsPerMM = 3.7795275591; // Conversion factor for mm to px
    const pageHeightInPx = pageHeightMM * pixelsPerMM;
    
    // Create a temporary container that exactly matches editor dimensions
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: absolute; 
      left: -9999px; 
      width: ${editorRef.current.clientWidth}px;
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      visibility: hidden;
      padding: 0;
      margin: 0;
      overflow-wrap: break-word;
      white-space: pre-wrap;
      word-wrap: break-word;
    `;
    document.body.appendChild(tempContainer);
    
    // Use fragment to efficiently process HTML content
    const fragment = document.createDocumentFragment();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = content;
    fragment.appendChild(wrapper);
    
    // Extract all block-level elements (paragraphs, divs, etc.)
    const blockElements = [];
    const processNodes = (node) => {
      // Skip text nodes
      if (node.nodeType === 3) return;
      
      // Get all HTML element nodes
      if (node.nodeType === 1) {
        // Check if it's a block element or has special handling
        if (
          node.nodeName === 'P' || 
          node.nodeName === 'DIV' || 
          node.nodeName === 'H1' || 
          node.nodeName === 'H2' || 
          node.nodeName === 'H3' || 
          node.nodeName === 'H4' || 
          node.nodeName === 'H5' || 
          node.nodeName === 'H6' || 
          node.nodeName === 'UL' || 
          node.nodeName === 'OL' ||
          node.nodeName === 'BLOCKQUOTE' ||
          node.nodeName === 'PRE' ||
          node.classList?.contains('page-break-indicator')
        ) {
          blockElements.push(node.cloneNode(true));
        } else {
          // For other elements, process their children
          Array.from(node.childNodes).forEach(child => processNodes(child));
        }
      }
    };
    
    Array.from(wrapper.childNodes).forEach(node => processNodes(node));
    
    // If no block elements were found, wrap all content in a paragraph
    if (blockElements.length === 0 && content.trim() !== '') {
      const p = document.createElement('p');
      p.innerHTML = content;
      blockElements.push(p);
    }
    
    // Now distribute block elements into pages
    const pageContents = []; // Array to hold HTML content for each page
    let currentPage = [];
    let currentHeight = 0;
    
    // Process each block element
    blockElements.forEach((element) => {
      // Check if element is a page break indicator
      const isPageBreak = element.classList && 
                         element.classList.contains('page-break-indicator');
      
      if (isPageBreak) {
        // Add current page content and start a new page
        pageContents.push(currentPage.map(el => el.outerHTML).join(''));
        currentPage = [];
        currentHeight = 0;
        return; // Skip adding the page break element itself
      }
      
      // Add element to temp container to measure its height
      tempContainer.innerHTML = '';
      tempContainer.appendChild(element.cloneNode(true));
      const elementHeight = tempContainer.offsetHeight;
      
      // Check if element causes page overflow
      if (currentHeight + elementHeight > pageHeightInPx && currentPage.length > 0) {
        // Finalize current page and start a new one
        pageContents.push(currentPage.map(el => el.outerHTML).join(''));
        currentPage = [element];
        currentHeight = elementHeight;
      } else {
        // Add element to current page
        currentPage.push(element);
        currentHeight += elementHeight;
      }
    });
    
    // Add the last page if it has content
    if (currentPage.length > 0) {
      pageContents.push(currentPage.map(el => el.outerHTML).join(''));
    }
    
    // Ensure we have at least one page
    if (pageContents.length === 0) {
      pageContents.push('<p></p>');
    }
    
    // Clean up
    document.body.removeChild(tempContainer);
    
    // Update state with the new pages
    const newPages = pageContents.map((content, index) => ({
      id: index + 1,
      content
    }));
    
    setPages(newPages);
    setPageContents(pageContents);
    
    console.log(`Updated pagination: ${newPages.length} pages`);
  };
  
  // Enhanced handling for page breaks
  const insertPageBreak = () => {
    // Insert a visible page break marker
    document.execCommand('insertHTML', false, '<div class="page-break-indicator">Page Break</div>');
    
    // Ensure editor keeps focus
    editorRef.current?.focus();
    
    // Calculate pages after insertion
    setTimeout(calculatePages, 100);
  };
  
  // Add enhanced paste handling
  const handlePaste = (e) => {
    e.preventDefault();
    
    // Get clipboard content
    let text = '';
    let html = '';
    
    // Get clipboard data
    if (e.clipboardData) {
      text = e.clipboardData.getData('text/plain');
      html = e.clipboardData.getData('text/html');
    }
    
    // Set flag that content was just pasted - will trigger special pagination
    setJustPasted(true);
    
    // Store the pasted content for reference
    pastedContentRef.current = html || text;
    
    // Clean up Word/Office HTML if present
    if (html && (html.includes('urn:schemas-microsoft-com') || html.includes('mso-') || html.includes('office:'))) {
      console.log("Detected Word/Office content paste, cleaning up...");
      const cleanedHtml = cleanWordPasteContent(html);
      
      // Insert cleaned content
      document.execCommand('insertHTML', false, cleanedHtml);
    } 
    // Simple text paste - just insert as plain text
    else if (text) {
      document.execCommand('insertText', false, text);
    }
    
    // Special handling for pagination after paste
    setTimeout(() => {
      // Force complete recalculation of pagination
      calculatePagesAfterPaste();
      // Reset the paste flag after pagination is done
      setJustPasted(false);
    }, 100);
  };
  
  // Special pagination calculation after paste to ensure proper content distribution
  const calculatePagesAfterPaste = () => {
    if (!editorRef.current) return;
    
    // Get the entire editor content
    const fullContent = editorRef.current.innerHTML;
    
    // Create a temporary container with A4 dimensions to calculate pagination
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: absolute; 
      left: -9999px; 
      width: ${editorRef.current.clientWidth}px;
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      visibility: hidden;
      padding: 0;
      margin: 0;
      overflow-wrap: break-word;
      white-space: pre-wrap;
      word-wrap: break-word;
    `;
    document.body.appendChild(tempContainer);
    
    // Set content to temp container
    tempContainer.innerHTML = fullContent;
    
    // Get all block elements for proper pagination
    const allElements = tempContainer.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table');
    const blockElements = Array.from(allElements);
    
    // If no block elements found and text exists, wrap in paragraph
    if (blockElements.length === 0 && tempContainer.textContent.trim()) {
      // Extract the text content and wrap in paragraphs
      const textNodes = [];
      const extractTextNodes = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          if (node.textContent.trim()) {
            textNodes.push(node.textContent);
          }
        } else {
          node.childNodes.forEach(extractTextNodes);
        }
      };
      
      extractTextNodes(tempContainer);
      
      // Create paragraphs from text
      if (textNodes.length > 0) {
        const paragraphs = textNodes.map(text => `<p>${text}</p>`).join('');
        tempContainer.innerHTML = paragraphs;
        // Refresh block elements collection
        blockElements.push(...Array.from(tempContainer.querySelectorAll('p')));
      }
    }
    
    // Calculate A4 dimensions in pixels
    const pageHeightMM = 247; // A4 height (297mm) minus 50mm margins
    const pixelsPerMM = 3.7795275591; // Conversion factor for mm to px
    const pageHeightInPx = pageHeightMM * pixelsPerMM;
    
    // Distribute block elements into pages
    const pageContents = [];
    let currentPage = [];
    let currentHeight = 0;
    
    // Helper to measure element height
    const measureElementHeight = (element) => {
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = tempContainer.style.cssText;
      tempDiv.appendChild(element.cloneNode(true));
      document.body.appendChild(tempDiv);
      const height = tempDiv.offsetHeight;
      document.body.removeChild(tempDiv);
      return height;
    };
    
    // Distribute content across pages
    blockElements.forEach((element) => {
      // Handle explicit page breaks
      if (element.classList && element.classList.contains('page-break-indicator')) {
        pageContents.push(currentPage.map(el => el.outerHTML).join(''));
        currentPage = [];
        currentHeight = 0;
        return;
      }
      
      const elementHeight = measureElementHeight(element);
      
      // Check if adding this element would exceed page height
      if (currentHeight + elementHeight > pageHeightInPx && currentPage.length > 0) {
        // Finish current page and start a new one
        pageContents.push(currentPage.map(el => el.outerHTML).join(''));
        currentPage = [element];
        currentHeight = elementHeight;
      } else {
        // Add element to current page
        currentPage.push(element);
        currentHeight += elementHeight;
      }
    });
    
    // Add the last page if it has content
    if (currentPage.length > 0) {
      pageContents.push(currentPage.map(el => el.outerHTML).join(''));
    }
    
    // Clean up
    document.body.removeChild(tempContainer);
    
    // Ensure we have at least one page
    if (pageContents.length === 0) {
      pageContents.push('<p></p>');
    }
    
    // Update editor content for first page
    if (editorRef.current) {
      editorRef.current.innerHTML = pageContents[0] || '';
    }
    
    // Create page objects with proper IDs and content
    const newPages = pageContents.map((content, index) => ({
      id: index + 1,
      content
    }));
    
    // Update state with new pages
    setPages(newPages);
    setPageContents(pageContents);
    
    console.log(`Pagination after paste: ${newPages.length} pages`);
  };
  
  // Make all pages editable instead of just the first page
  const handlePageInput = (pageIndex) => {
    // Skip if main editor is still loading or missing
    if (!editorRef.current) return;
    
    // Get the edited page's content
    const pageElement = document.querySelector(`[data-page-index="${pageIndex}"]`);
    if (!pageElement) return;
    
    // Get current content from all pages
    const allPageContent = [...pageContents];
    
    // Update this page's content
    allPageContent[pageIndex] = pageElement.innerHTML;
    
    // Combine all content to ensure consistent state
    const combinedContent = allPageContent.join('');
    editorRef.current.innerHTML = combinedContent;
    
    // Recalculate pagination
    handleInput();
  };
  
  // Add event listeners when editor mounts
  useEffect(() => {
    if (editorRef.current) {
      // Add paste handler
      editorRef.current.addEventListener('paste', handlePaste);
      
      return () => {
        // Clean up event listener
        editorRef.current?.removeEventListener('paste', handlePaste);
      };
    }
  }, []);

  return (
    <div className="editor-app">
      {/* Enhanced Toolbar with Alignment Options */}
      <div className="ribbon">
        <div className="ribbon-group">
          <div className="ribbon-title">Font</div>
          <div className="ribbon-controls">
            <button 
              onClick={() => applyFormatting('bold')}
              className={activeFormatting.bold ? 'active' : ''}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button 
              onClick={() => applyFormatting('italic')}
              className={activeFormatting.italic ? 'active' : ''}
              title="Italic"
            >
              <em>I</em>
            </button>
            <button 
              onClick={() => applyFormatting('underline')}
              className={activeFormatting.underline ? 'active' : ''}
              title="Underline"
            >
              <span style={{ textDecoration: 'underline' }}>U</span>
            </button>
            
            <select 
              onChange={(e) => {
                document.execCommand('fontName', false, e.target.value);
                editorRef.current?.focus();
              }}
              value=""
              title="Font Family"
            >
              <option value="" disabled>Font</option>
              <option value="Arial">Arial</option>
              <option value="Verdana">Verdana</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
            </select>
          </div>
        </div>
        
        <div className="ribbon-divider"></div>
        
        <div className="ribbon-group">
          <div className="ribbon-title">Paragraph</div>
          <div className="ribbon-controls">
            {/* Alignment buttons */}
            <div className="button-group">
              <button 
                onClick={() => applyAlignment('left')}
                className={activeFormatting.alignLeft ? 'active' : ''}
                title="Align Left"
              >
                <span className="icon-align-left">⌫</span>
              </button>
              <button 
                onClick={() => applyAlignment('center')}
                className={activeFormatting.alignCenter ? 'active' : ''}
                title="Align Center"
              >
                <span className="icon-align-center">≡</span>
              </button>
              <button 
                onClick={() => applyAlignment('right')}
                className={activeFormatting.alignRight ? 'active' : ''}
                title="Align Right"
              >
                <span className="icon-align-right">⌦</span>
              </button>
              <button 
                onClick={() => applyAlignment('justify')}
                className={activeFormatting.alignJustify ? 'active' : ''}
                title="Justify"
              >
                <span className="icon-align-justify">≣</span>
              </button>
            </div>
            
            <button onClick={() => document.execCommand('formatBlock', false, 'p')} title="Paragraph">
              Paragraph
            </button>
          </div>
        </div>
        
        <div className="ribbon-divider"></div>
        
        <div class="ribbon-group">
          <div class="ribbon-title">Lists</div>
          <div class="ribbon-controls">
            <button onClick={() => document.execCommand('insertUnorderedList')} title="Bullet List">
              • List
            </button>
            <button onClick={() => document.execCommand('insertOrderedList')} title="Numbered List">
              1. List
            </button>
          </div>
        </div>
        
        <div className="ribbon-divider"></div>
        
        <div className="ribbon-group">
          <div className="ribbon-title">Insert</div>
          <div className="ribbon-controls">
            <button onClick={() => {
              const url = prompt("Enter image URL");
              if (url) {
                insertHTML(`<img src="${url}" alt="Image" style="max-width: 100%;" />`);
              }
            }} title="Insert Image">
              Image
            </button>
            
            <button onClick={() => {
              const url = prompt("Enter link URL");
              const text = prompt("Enter link text");
              if (url && text) {
                insertHTML(`<a href="${url}" target="_blank">${text}</a>`);
              }
            }} title="Insert Link">
              Link
            </button>
            
            <button onClick={insertPageBreak} title="Insert Page Break">
              Page Break
            </button>
          </div>
        </div>
        
        <div className="ribbon-divider"></div>
        
        <div className="ribbon-group">
          <div className="ribbon-title">Document</div>
          <div className="ribbon-controls">
            <button 
              onClick={saveDocument} 
              disabled={saveStatus === 'saving'} 
              title="Save Document"
              style={{
                backgroundColor: '#4CAF50',  // Green background
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save'}
            </button>
            <button onClick={handleNewDocument} title="Create New Document">
              New
            </button>
            
            <div className="dropdown">
              <button className="dropdown-trigger" title="Export Options">
                Export
              </button>
              <div className="dropdown-content">
                <button onClick={exportAsText}>Text (.txt)</button>
                <button onClick={exportAsHTML}>HTML (.html)</button>
                <button onClick={exportAsDocx}>Word (.docx)</button>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/')} 
              title="Back to Home"
              style={{
                backgroundColor: '#2196F3',  // Blue background
                color: 'white'
              }}
            >
              Home
            </button>
          </div>
        </div>
        
        {/* Save status indicator */}
        <div className="save-status">
          {saveStatus === 'saving' && <span className="status-saving">Saving...</span>}
          {saveStatus === 'saved' && <span className="status-saved">Saved</span>}
          {saveStatus === 'error' && <span className="status-error">Save failed</span>}
        </div>
      </div>

      {/* Editor container with MS Word-like styling */}
      <div className="editor-container">
        {isLoading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            padding: '40px'
          }}>
            <div style={{
              padding: '20px',
              background: 'white',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              Loading document...
            </div>
          </div>
        ) : serverError ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            padding: '20px',
            color: '#e53e3e',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Connection Error</h3>
            <p>{serverError}</p>
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4299e1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginRight: '8px'
                }}
              >
                Return to Home
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#38a169',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* First page - editable page */}
            <div className="a4-page page-container" key="page-1">
              <div
                className="content-editable-editor"
                ref={editorRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={handleInput}
                onPaste={handlePaste}
                data-testid="editor-container"
                data-page-index="0"
              />
              <div className="page-counter">Page 1 of {pages.length}</div>
              <div className="page-number">1</div>
            </div>
            
            {/* Additional pages - now also editable */}
            {pages.slice(1).map((page, index) => (
              <div className="a4-page page-container" key={`page-${page.id}`}>
                <div 
                  className="content-editable-editor page-content"
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  onInput={() => handlePageInput(index + 1)}
                  onPaste={handlePaste}
                  dangerouslySetInnerHTML={{ __html: pageContents[index + 1] || '' }}
                  data-page-index={index + 1}
                />
                <div className="page-counter">Page {page.id} of {pages.length}</div>
                <div className="page-number">{page.id}</div>
              </div>
            ))}
            
            {/* Document info bar */}
            <div className="document-info-bar">
              <div>Words: {wordCount} | Pages: {pages.length}</div>
              <div>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : ''}</div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="editor-footer">
        <div>Words: {wordCount}</div>
        <input
          type="text"
          value={documentTitle}
          onChange={(e) => setDocumentTitle(e.target.value)}
          placeholder="Document Title"
          style={{
            padding: '4px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            outline: 'none',
            width: '300px'
          }}
        />
        <button
          className="copy-button"
          onClick={() => {
            if (editorRef.current) {
              navigator.clipboard.writeText(editorRef.current.textContent || '');
              alert("Content copied to clipboard!");
            }
          }}
        >
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
};

export default ContentEditableEditor;