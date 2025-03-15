/**
 * Helper functions for handling Word/Office document paste operations
 */

// Enhanced Word paste cleaning with better block element handling
export const cleanWordPasteContent = (html) => {
  if (!html) return '';
  
  try {
    // Parse the HTML into a DOM structure
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove Word-specific elements
    const removeElements = doc.querySelectorAll(
      'style, meta, xml, script, link, o\\:p, o\\:smarttagtype'
    );
    removeElements.forEach(el => el.parentNode?.removeChild(el));
    
    // Process all elements to remove Word attributes
    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
      // Remove all Word-specific attributes and styles
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('xmlns:') || 
            attr.name.startsWith('mso-') || 
            attr.name.startsWith('o:') ||
            attr.name === 'style' && attr.value.includes('mso-')) {
          el.removeAttribute(attr.name);
        }
      });
      
      // Convert Word paragraphs to normal paragraphs
      if (el.tagName === 'P' && el.classList.contains('MsoNormal')) {
        el.removeAttribute('class');
      }
      
      // Convert Word lists to HTML lists
      if (el.tagName === 'P' && el.classList.contains('MsoListParagraph')) {
        const li = document.createElement('li');
        li.innerHTML = el.innerHTML;
        
        // Find or create list container
        let list = el.previousElementSibling;
        if (!list || (list.tagName !== 'UL' && list.tagName !== 'OL')) {
          list = document.createElement('ul');
          el.parentNode.insertBefore(list, el);
        }
        
        // Add list item to list
        list.appendChild(li);
        // Remove original paragraph
        el.parentNode.removeChild(el);
      }
    });
    
    // Ensure paragraph elements for all content without containers
    const bodyChildren = Array.from(doc.body.childNodes);
    for (let i = 0; i < bodyChildren.length; i++) {
      const node = bodyChildren[i];
      // If this is a text node with content, wrap it in a paragraph
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = node.textContent;
        node.parentNode.replaceChild(p, node);
      }
    }
    
    // Ensure each text block has proper wrapping element
    ensureBlockElements(doc.body);
    
    // Remove any Word-specific divs
    doc.querySelectorAll('div[style*="mso-"]').forEach(el => {
      const div = document.createElement('div');
      div.innerHTML = el.innerHTML;
      el.parentNode.replaceChild(div, el);
    });
    
    // Remove any empty spans
    doc.querySelectorAll('span:empty').forEach(el => {
      el.parentNode.removeChild(el);
    });
    
    // Get cleaned HTML content
    return doc.body.innerHTML;
  } catch (err) {
    console.error("Error cleaning Word paste:", err);
    return html; // Return original HTML if cleaning fails
  }
};

// Helper function to ensure all text content is inside block elements
function ensureBlockElements(container) {
  // Get all direct text nodes
  const textNodes = [];
  for (let i = 0; i < container.childNodes.length; i++) {
    const node = container.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      textNodes.push(node);
    }
  }
  
  // Wrap each text node in a paragraph
  textNodes.forEach(textNode => {
    const p = document.createElement('p');
    p.textContent = textNode.textContent;
    container.replaceChild(p, textNode);
  });
  
  // Recursively process all child elements that could contain text
  const elements = container.querySelectorAll('*');
  elements.forEach(el => {
    if (el.tagName !== 'P' && el.tagName !== 'LI' && 
        el.tagName !== 'TD' && el.tagName !== 'TH' && 
        el.tagName !== 'H1' && el.tagName !== 'H2' && 
        el.tagName !== 'H3' && el.tagName !== 'H4' && 
        el.tagName !== 'H5' && el.tagName !== 'H6') {
      ensureBlockElements(el);
    }
  });
}

export default {
  cleanWordPasteContent
};
