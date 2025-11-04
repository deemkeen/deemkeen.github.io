// Add copy button to all code blocks
document.addEventListener('DOMContentLoaded', function() {
  // Find all pre elements
  const preElements = document.querySelectorAll('pre');
  
  preElements.forEach(function(pre) {
    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    
    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    copyButton.setAttribute('aria-label', 'Copy code to clipboard');
    copyButton.setAttribute('title', 'Copy code');
    
    // Add click event
    copyButton.addEventListener('click', function() {
      const code = pre.querySelector('code') || pre;
      const text = code.textContent;
      
      navigator.clipboard.writeText(text).then(function() {
        // Change button to checkmark
        copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        copyButton.classList.add('copied');
        
        // Reset after 2 seconds
        setTimeout(function() {
          copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
          copyButton.classList.remove('copied');
        }, 2000);
      }).catch(function(err) {
        console.error('Failed to copy text: ', err);
      });
    });
    
    // Wrap pre element and add button
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    wrapper.appendChild(copyButton);
  });
});
