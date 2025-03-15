/**
 * Utilities to control text selection and highlighting behavior
 */

/**
 * Clears any current text selection in the document
 */
export const clearTextSelection = () => {
  if (window.getSelection) {
    if (window.getSelection().empty) {  // Chrome
      window.getSelection().empty();
    } else if (window.getSelection().removeAllRanges) {  // Firefox
      window.getSelection().removeAllRanges();
    }
  } else if (document.selection) {  // IE
    document.selection.empty();
  }
};

/**
 * Places the cursor at the end of the content in an editable element
 * @param {HTMLElement} editableElement - The contentEditable element
 */
export const placeCursorAtEnd = (editableElement) => {
  if (!editableElement) return;
  
  // Clear any existing selection
  clearTextSelection();
  
  // Create a range and set the cursor at the end
  const range = document.createRange();
  const selection = window.getSelection();
  
  // Find the last text node or use the element itself
  let lastNode = editableElement;
  
  // Try to find the deepest last child that's a text node
  const findLastTextNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node;
    if (node.lastChild) return findLastTextNode(node.lastChild);
    return node;
  };
  
  lastNode = findLastTextNode(editableElement);
  
  // Set the range to the end of the last node
  if (lastNode.nodeType === Node.TEXT_NODE) {
    range.setStart(lastNode, lastNode.length);
    range.setEnd(lastNode, lastNode.length);
  } else {
    range.selectNodeContents(lastNode);
    range.collapse(false); // Collapse to end
  }
  
  // Apply the range to the selection
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * Prevents the default focus behavior that might select all text
 * @param {HTMLElement} element - The element to modify
 */
export const preventAutoSelection = (element) => {
  if (!element) return;
  
  element.addEventListener('mousedown', (e) => {
    // If the element is already focused, prevent default behavior
    if (document.activeElement === element) {
      e.preventDefault();
    }
  });
  
  // Clear selection on blur to prevent issues when refocusing
  element.addEventListener('blur', () => {
    clearTextSelection();
  });
};

export default {
  clearTextSelection,
  placeCursorAtEnd,
  preventAutoSelection
};
