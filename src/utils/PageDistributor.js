/**
 * Improved utility functions for distributing content across multiple pages
 */

/**
 * Calculates how many pages are needed for the given content
 * with improved handling of pasted content
 * @param {string} htmlContent - HTML content to measure
 * @param {number} pageHeightInPx - Height of a page in pixels
 * @returns {number} - Number of pages needed
 */
export const calculateRequiredPages = (htmlContent, pageHeightInPx) => {
  if (!htmlContent) return 1;
  
  // Create a temporary container to measure content
  const tempContainer = document.createElement('div');
  tempContainer.style.cssText = `
    position: absolute; 
    left: -9999px; 
    width: 170mm; /* A4 width (210mm) minus 40mm margins */
    font-family: 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.6;
    visibility: hidden;
    padding: 0;
    margin: 0;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  `;
  tempContainer.innerHTML = htmlContent;
  document.body.appendChild(tempContainer);
  
  // Process HTML to ensure proper block elements for clean measurement
  ensureBlockElementsForMeasurement(tempContainer);
  
  // Total height of the content
  const contentHeight = tempContainer.scrollHeight;
  
  // Count explicit page breaks
  const pageBreakElements = tempContainer.querySelectorAll('.page-break-indicator');
  const explicitBreaks = pageBreakElements.length;
  
  // Calculate pages needed based on content height
  const heightBasedPages = Math.max(1, Math.ceil(contentHeight / pageHeightInPx));
  
  // Total pages is at least the height-based count plus explicit breaks
  const totalPages = Math.max(heightBasedPages, explicitBreaks + 1);
  
  // Clean up
  document.body.removeChild(tempContainer);
  
  return totalPages;
};

/**
 * Distributes HTML content across multiple pages with improved handling of pasted content
 * @param {string} htmlContent - Full HTML content
 * @param {number} pageHeightInPx - Height of a page in pixels
 * @returns {Array<string>} - Array of HTML content for each page
 */
export const distributeContent = (htmlContent, pageHeightInPx) => {
  if (!htmlContent) return [''];
  
  // Parse HTML content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Ensure proper block structure for measurement
  ensureBlockElementsForMeasurement(tempDiv);
  
  // Extract all block-level elements for better distribution
  const blockElements = Array.from(tempDiv.querySelectorAll(
    'p, div, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table, .page-break-indicator'
  ));
  
  // If no block elements found, treat the entire content as one block
  if (blockElements.length === 0 && htmlContent.trim() !== '') {
    // Create paragraph for the text content
    const textContent = tempDiv.textContent;
    const paragraphContent = `<p>${textContent}</p>`;
    return [paragraphContent];
  }
  
  // Measure each block element
  const tempMeasureDiv = document.createElement('div');
  tempMeasureDiv.style.cssText = `
    position: absolute; 
    left: -9999px; 
    width: 170mm;
    font-family: 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.6;
    visibility: hidden;
  `;
  document.body.appendChild(tempMeasureDiv);
  
  // Group elements into pages
  const pages = [];
  let currentPage = [];
  let currentHeight = 0;
  
  // Process each block element
  for (const element of blockElements) {
    // Handle explicit page breaks
    if (element.classList && element.classList.contains('page-break-indicator')) {
      // Add current page content if not empty
      if (currentPage.length > 0) {
        pages.push(currentPage.map(el => el.outerHTML).join(''));
        currentPage = [];
        currentHeight = 0;
      } else {
        // Add an empty page for consecutive page breaks
        pages.push('');
      }
      continue;
    }
    
    // Measure element height
    tempMeasureDiv.innerHTML = '';
    tempMeasureDiv.appendChild(element.cloneNode(true));
    const elementHeight = tempMeasureDiv.offsetHeight;
    
    // Check if element would cause overflow
    if (currentHeight + elementHeight > pageHeightInPx && currentPage.length > 0) {
      // Add current page and start a new one
      pages.push(currentPage.map(el => el.outerHTML).join(''));
      currentPage = [element];
      currentHeight = elementHeight;
    } else {
      // Add element to current page
      currentPage.push(element);
      currentHeight += elementHeight;
    }
  }
  
  // Add the last page if it has content
  if (currentPage.length > 0) {
    pages.push(currentPage.map(el => el.outerHTML).join(''));
  }
  
  // Ensure we have at least one page
  if (pages.length === 0) {
    pages.push('');
  }
  
  // Clean up
  document.body.removeChild(tempMeasureDiv);
  
  return pages;
};

/**
 * Helper function to ensure all content is in measurable block elements
 * @param {HTMLElement} container - Container element
 */
function ensureBlockElementsForMeasurement(container) {
  // Get all direct text nodes
  const childNodes = Array.from(container.childNodes);
  const textNodes = childNodes.filter(node => 
    node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');
  
  // Wrap text nodes in paragraphs
  textNodes.forEach(textNode => {
    const p = document.createElement('p');
    p.textContent = textNode.textContent;
    container.replaceChild(p, textNode);
  });
  
  // Convert <br> tags to paragraphs where they separate content
  const brs = container.querySelectorAll('br');
  brs.forEach(br => {
    // Replace <br> with paragraph break
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    br.parentNode.replaceChild(p, br);
  });
}

export default {
  calculateRequiredPages,
  distributeContent,
  ensureBlockElementsForMeasurement
};
