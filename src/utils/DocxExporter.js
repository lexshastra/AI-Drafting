/**
 * Utility functions for exporting HTML content to DOCX format
 */

/**
 * Converts HTML content to a Word document (DOCX)
 * 
 * @param {string} htmlContent - The HTML content to convert
 * @returns {Blob} - A Blob containing the DOCX document
 */
export const convertToDocx = async (htmlContent) => {
  // Check if htmlDocx is available from the global scope (loaded from CDN)
  if (!window.htmlDocx) {
    console.error("html-docx-js library not found in window. Trying to load it...");
    
    // Try to dynamically load the library
    try {
      await loadHtmlDocxLibrary();
    } catch (err) {
      console.error("Failed to load html-docx-js library:", err);
      throw new Error("DOCX export is not available. html-docx-js library could not be loaded.");
    }
  }
  
  try {
    // Prepare the HTML with proper styling
    const preparedHtml = prepareHtmlForDocx(htmlContent);
    
    // Convert to DOCX using the global htmlDocx object
    const docx = window.htmlDocx.asBlob(preparedHtml, {
      orientation: 'portrait',
      margins: { top: 720, right: 720, bottom: 720, left: 720 } // 0.5 inch margins (in twips)
    });
    
    return docx;
  } catch (error) {
    console.error("Error converting HTML to DOCX:", error);
    throw error;
  }
};

/**
 * Load the html-docx-js library dynamically
 * @returns {Promise} - Resolves when library is loaded
 */
const loadHtmlDocxLibrary = () => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html-docx-js@0.3.1/dist/html-docx.js';
    script.onload = () => {
      if (window.htmlDocx) {
        resolve();
      } else {
        reject(new Error("html-docx-js loaded but htmlDocx object not found in window"));
      }
    };
    script.onerror = () => {
      reject(new Error("Failed to load html-docx-js from CDN"));
    };
    document.head.appendChild(script);
  });
};

/**
 * Prepares HTML content for better conversion to DOCX format
 * 
 * @param {string} htmlContent - The raw HTML content
 * @returns {string} - Prepared HTML content
 */
const prepareHtmlForDocx = (htmlContent) => {
  // Create a temporary container to process the HTML
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = htmlContent;
  
  // Remove page breaks as they'll be handled differently in Word
  const pageBreaks = tempContainer.querySelectorAll('.page-break-indicator');
  pageBreaks.forEach(pageBreak => {
    // Replace with Word-compatible page break
    const wordPageBreak = document.createElement('div');
    wordPageBreak.innerHTML = '<br style="page-break-before: always">';
    pageBreak.parentNode.replaceChild(wordPageBreak, pageBreak);
  });
  
  // Add base styles to make document look better in Word
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
    }
    h1 { font-size: 18pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 14pt; }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    td, th {
      border: 1px solid #ddd;
      padding: 8px;
    }
  `;
  
  // Wrap the content in a complete HTML document
  const completeHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        ${styleElement.outerHTML}
      </head>
      <body>
        ${tempContainer.innerHTML}
      </body>
    </html>
  `;
  
  return completeHtml;
};

// Export both named and default exports
export default {
  convertToDocx
};
