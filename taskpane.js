// Global references
let officeInitialized = false;
let turndownService = null;
let currentMarkdown = "";

// Initialize Office JS
Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    officeInitialized = true;
    updateStatus('Connected to Word', 'connected');
    
    // Auto-detect raw markdown in the active document
    checkForRawMarkdown();
  } else {
    updateStatus('Not in Word', 'connecting');
    showFeedback('Running in browser sandbox (Office.js mock mode)', 'info');
  }

  // Set up all event listeners and UI controls
  initializeUI();
});

// Setup Status Indicator
function updateStatus(text, className) {
  const statusEl = document.getElementById('connection-status');
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.className = `status-badge ${className}`;
  }
}

// Setup Alert Messages
function showFeedback(message, type = 'info', autoHideMs = 4000) {
  const alertEl = document.getElementById('feedback-alert');
  const messageEl = document.getElementById('alert-message');
  
  if (alertEl && messageEl) {
    messageEl.textContent = message;
    alertEl.className = `alert ${type}`;
    alertEl.classList.remove('hidden');
    
    if (autoHideMs) {
      setTimeout(() => {
        alertEl.classList.add('hidden');
      }, autoHideMs);
    }
  }
}

// Initialize UI Interactions
function initializeUI() {
  // 1. Tab Switching Logic
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(btn.getAttribute('data-target'));
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      // If switching to import tab, check for markdown again
      if (btn.getAttribute('data-target') === 'panel-import') {
        checkForRawMarkdown();
      }
    });
  });

  // Close Alert Button
  document.getElementById('btn-close-alert').addEventListener('click', () => {
    document.getElementById('feedback-alert').classList.add('hidden');
  });

  // 2. Drag & Drop File Zone Setup
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  if (dropZone && fileInput) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    ['dragleave', 'dragend', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelection(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  // 3. Import Preview Switcher
  const btnEditImport = document.getElementById('btn-edit-import');
  const btnPreviewImport = document.getElementById('btn-preview-import');
  const importEditorWrapper = document.getElementById('import-editor-wrapper');
  const importPreviewWrapper = document.getElementById('import-preview-wrapper');
  const importTextArea = document.getElementById('import-markdown-textarea');

  btnEditImport.addEventListener('click', () => {
    btnEditImport.classList.add('active');
    btnPreviewImport.classList.remove('active');
    importEditorWrapper.classList.remove('hidden');
    importPreviewWrapper.classList.add('hidden');
  });

  btnPreviewImport.addEventListener('click', () => {
    btnPreviewImport.classList.add('active');
    btnEditImport.classList.remove('active');
    importPreviewWrapper.classList.remove('hidden');
    importEditorWrapper.classList.add('hidden');
    
    // Update preview with whatever was edited
    renderImportPreview(importTextArea.value);
  });

  // Textarea change syncs content
  importTextArea.addEventListener('input', () => {
    currentMarkdown = importTextArea.value;
  });

  // Clear Import Button
  document.getElementById('btn-clear-import').addEventListener('click', () => {
    currentMarkdown = "";
    document.getElementById('import-preview-container').classList.add('hidden');
    document.getElementById('paste-prompt').classList.remove('hidden');
    fileInput.value = '';
  });

  // Insert into Word Button
  document.getElementById('btn-insert-document').addEventListener('click', () => {
    insertMarkdownToWord(currentMarkdown);
  });

  // Direct Paste Insert Button
  document.getElementById('btn-insert-pasted').addEventListener('click', () => {
    const markdown = document.getElementById('direct-paste-textarea').value;
    if (!markdown.trim()) {
      showFeedback('Please paste some Markdown first!', 'error');
      return;
    }
    insertMarkdownToWord(markdown);
  });

  // 4. Export Controls
  document.getElementById('btn-extract-markdown').addEventListener('click', extractMarkdownFromWord);
  
  document.getElementById('btn-copy-markdown').addEventListener('click', () => {
    const mdText = document.getElementById('export-markdown-textarea').value;
    if (!mdText) return;
    
    navigator.clipboard.writeText(mdText).then(() => {
      showFeedback('Markdown copied to clipboard!', 'success');
    }).catch(err => {
      showFeedback('Failed to copy text.', 'error');
    });
  });

  document.getElementById('btn-download-markdown').addEventListener('click', () => {
    const mdText = document.getElementById('export-markdown-textarea').value;
    if (!mdText) return;
    
    downloadMarkdownFile(mdText, 'word-document.md');
  });

  // Auto-Detect Banner Convert Action
  document.getElementById('btn-banner-convert').addEventListener('click', formatRawMarkdownDocument);
}

// Handle selected file (MD/Markdown)
function handleFileSelection(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    currentMarkdown = e.target.result;
    
    // Show Preview Container
    document.getElementById('import-preview-container').classList.remove('hidden');
    document.getElementById('paste-prompt').classList.add('hidden');
    
    // Update contents
    document.getElementById('import-markdown-textarea').value = currentMarkdown;
    renderImportPreview(currentMarkdown);
    
    showFeedback(`File "${file.name}" loaded successfully!`, 'success');
  };
  reader.readAsText(file);
}

// Render HTML Preview in Task Pane
function renderImportPreview(markdown) {
  const previewWrapper = document.getElementById('import-preview-wrapper');
  if (previewWrapper && window.marked) {
    try {
      previewWrapper.innerHTML = window.marked.parse(markdown);
    } catch (e) {
      previewWrapper.textContent = "Error rendering preview: " + e.message;
    }
  }
}

// Insert Markdown Content into Active Word Document
async function insertMarkdownToWord(markdown) {
  if (!officeInitialized) {
    showFeedback('Not connected to Word. Cannot write to document.', 'error');
    return;
  }

  if (!markdown || !markdown.trim()) {
    showFeedback('No content to insert.', 'error');
    return;
  }

  const insertLocation = document.getElementById('insert-location').value;
  const htmlContent = window.marked.parse(markdown);

  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      
      if (insertLocation === 'replace') {
        body.insertHtml(htmlContent, Word.InsertLocation.replace);
        showFeedback('Document replaced with styled Markdown!', 'success');
      } else {
        const selection = context.document.getActiveSelection();
        selection.insertHtml(htmlContent, Word.InsertLocation.replace);
        showFeedback('Markdown inserted at cursor!', 'success');
      }
      
      await context.sync();
    });
  } catch (error) {
    console.error(error);
    showFeedback('Error inserting HTML: ' + error.message, 'error');
  }
}

// Check if current document has raw markdown
async function checkForRawMarkdown() {
  if (!officeInitialized) return;

  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      body.load('text');
      await context.sync();

      const text = body.text;
      const banner = document.getElementById('detect-banner');
      
      if (isMarkdownContent(text)) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    });
  } catch (e) {
    console.warn("Could not check document for markdown on load:", e);
  }
}

// Heuristic to check if text contains raw Markdown
function isMarkdownContent(text) {
  if (!text || text.trim().length < 5) return false;
  
  // Look for telltale markdown tags (at start of lines or within text)
  const lines = text.split('\n');
  let mdScore = 0;
  
  // Headers starting with #
  const hasHeaders = lines.some(l => l.trim().startsWith('# ') || l.trim().startsWith('## ') || l.trim().startsWith('### '));
  if (hasHeaders) mdScore += 3;
  
  // Bullet lists starting with - or * (but look for spaces, common in markdown)
  const hasBullets = lines.some(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
  if (hasBullets) mdScore += 1;
  
  // Code blocks (fenced code with ```)
  const hasCodeBlocks = text.includes('```');
  if (hasCodeBlocks) mdScore += 3;
  
  // Bold/Italic formatting signs (e.g. **bold**, *italic*)
  const hasBoldItalics = /(\*\*|__)[^*_]+(\*\*|__)/.test(text) || /(\*|_)[^*_]+(\*|_)/.test(text);
  if (hasBoldItalics) mdScore += 2;
  
  // Links like [text](url)
  const hasLinks = /\[[^\]]+\]\([^)]+\)/.test(text);
  if (hasLinks) mdScore += 2;

  // If score is at least 3, highly likely it is Markdown
  return mdScore >= 3;
}

// Format the raw Markdown text inside the active document
async function formatRawMarkdownDocument() {
  if (!officeInitialized) return;

  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      body.load('text');
      await context.sync();

      const rawMarkdown = body.text;
      if (!rawMarkdown || !rawMarkdown.trim()) {
        showFeedback('Document is empty.', 'error');
        return;
      }

      const htmlContent = window.marked.parse(rawMarkdown);
      body.insertHtml(htmlContent, Word.InsertLocation.replace);
      
      await context.sync();
      
      // Hide banner now that it's formatted
      document.getElementById('detect-banner').classList.add('hidden');
      showFeedback('Document successfully formatted from Raw Markdown!', 'success');
    });
  } catch (error) {
    showFeedback('Error formatting document: ' + error.message, 'error');
  }
}

// Convert HTML to clean Markdown
function cleanWordHtmlAndConvert(html) {
  // Initialize Turndown Service if needed
  if (!turndownService && window.TurndownService) {
    turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      hr: '---'
    });
    
    // Add custom rules if we want to ignore MS Word metadata tags
    turndownService.addRule('ignoreWordTrash', {
      filter: ['style', 'script', 'title', 'meta', 'link', 'xml'],
      replacement: () => ''
    });

    // Special handling for pre/code elements to keep spacing
    turndownService.addRule('codeBlockKeepSpacing', {
      filter: 'pre',
      replacement: (content, node) => {
        return '\n```\n' + node.textContent.trim() + '\n```\n';
      }
    });
  }

  // Pre-process Word HTML:
  // Word exports standard HTML wrapper with a head, stylesheet, and XML configurations.
  // We extract the actual <body> content to avoid Turndown digesting metadata.
  let bodyContent = html;
  const bodyStartIndex = html.indexOf('<body');
  const bodyEndIndex = html.indexOf('</body>');
  
  if (bodyStartIndex !== -1 && bodyEndIndex !== -1) {
    const contentStart = html.indexOf('>', bodyStartIndex) + 1;
    bodyContent = html.substring(contentStart, bodyEndIndex);
  }

  // Strip empty paragraphs, XML namespaces, and style tags to keep it clean
  bodyContent = bodyContent
    .replace(/<o:p>\s*<\/o:p>/g, '') // empty MS Office paragraphs
    .replace(/<o:p>&nbsp;<\/o:p>/g, '')
    .replace(/<\/?[a-z]+:[a-z]+[^>]*>/gi, '') // namespaced MS tags like <w:WordDocument>
    .replace(/class="Mso[^"]*"/gi, '') // clean MS Word specific classes
    .replace(/style="[^"]*"/gi, ''); // strip inline styles for clean output

  return turndownService.turndown(bodyContent);
}

// Read Word Document HTML and Export it to Markdown
async function extractMarkdownFromWord() {
  if (!officeInitialized) {
    showFeedback('Not connected to Word. Cannot export document.', 'error');
    return;
  }

  showFeedback('Analyzing document structure...', 'info', 1000);

  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      const html = body.getHtml();
      await context.sync();

      // Convert the Word HTML into clean Markdown
      const markdown = cleanWordHtmlAndConvert(html.value);
      
      if (!markdown || !markdown.trim()) {
        showFeedback('No text content found in the document.', 'warning');
        return;
      }

      // Display results
      const exportTextArea = document.getElementById('export-markdown-textarea');
      exportTextArea.value = markdown;
      
      const charCount = markdown.length;
      document.getElementById('export-word-count').textContent = `${charCount} characters`;
      
      document.getElementById('export-preview-container').classList.remove('hidden');
      showFeedback('Markdown extracted successfully!', 'success');
    });
  } catch (error) {
    console.error(error);
    showFeedback('Error extracting document: ' + error.message, 'error');
  }
}

// Download local file in browser (WKWebView supports blob downloads)
function downloadMarkdownFile(text, filename) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showFeedback('Markdown downloaded!', 'success');
}
