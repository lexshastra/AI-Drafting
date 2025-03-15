/**
 * Fallback method for exporting Word documents when html-docx-js is unavailable
 * Uses a server-side conversion approach with a form submission
 */

/**
 * Creates a hidden form and submits it to convert HTML to DOCX
 * 
 * @param {string} html - HTML content to convert
 * @param {string} fileName - Name for the exported file
 * @returns {boolean} - Whether the conversion was attempted
 */
export const exportToDocxViaForm = (html, fileName = 'document.docx') => {
  // Create a form for submission
  const form = document.createElement('form');
  form.style.display = 'none';
  form.method = 'post';
  form.action = 'https://htmltoword-converter.azurewebsites.net/api/convert';
  form.target = '_blank';
  
  // Add the HTML content as a form field
  const htmlField = document.createElement('input');
  htmlField.type = 'hidden';
  htmlField.name = 'html';
  htmlField.value = prepareHtmlForConversion(html);
  form.appendChild(htmlField);
  
  // Add the filename as a form field
  const nameField = document.createElement('input');
  nameField.type = 'hidden';
  nameField.name = 'filename';
  nameField.value = fileName;
  form.appendChild(nameField);
  
  // Append form to the document and submit it
  document.body.appendChild(form);
  form.submit();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(form);
  }, 1000);
  
  return true;
};

/**
 * Prepare HTML for conversion by adding appropriate styling
 */
const prepareHtmlForConversion = (html) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; }
          h1 { font-size: 18pt; }
          h2 { font-size: 16pt; }
          h3 { font-size: 14pt; }
          .page-break-indicator { page-break-before: always; height: 1px; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ddd; padding: 8px; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
};

export default {
  exportToDocxViaForm
};
