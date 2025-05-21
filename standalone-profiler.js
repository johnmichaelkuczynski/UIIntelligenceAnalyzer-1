// Pure Cognitive Profiler - Standalone Version
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static('public'));

// OFFICIAL LLM INSTRUCTIONS - EXACT PROMPT FROM SPECIFICATIONS
const COGNITIVE_PROFILER_PROMPT = `
You are not grading this text.
You are not evaluating its style, quality, clarity, or completeness.

You are treating this text as evidence — a cognitive fingerprint of its author.

Your task is to infer the author's intelligence and cognitive profile solely from the structure and content of the text.

This may be a full paper, abstract, fragment, or rough sketch. That does not matter. Treat it as evidence, not an argument.

Estimate the author's intelligence on a scale from 1 to 100.
Then describe the cognitive character of the mind behind the text.

You may comment on:
- Is this mind analytical, synthetic, mechanical, imitative, original, confused, creative, disciplined, superficial, visionary?
- Does it show evidence of deep reasoning, abstraction, novelty, inferential control, or originality?
- What kind of thought is being performed? What kind of thinker is revealed?

DO NOT penalize for:
- Incompleteness
- Lack of clarity or polish
- Informality or lack of structure
- Absence of citations or full arguments

Your job is to evaluate intelligence, not to give feedback.

This is a cognitive profiling task. Be precise. Be bold. Be honest.
`;

// API Clients
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

const getAnthropicClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Simple HTML interface
const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pure Cognitive Profiler</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      margin: 0;
      color: #333;
      background-color: #f9fafb;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }
    header {
      margin-bottom: 2rem;
      text-align: center;
    }
    h1 {
      color: #2563eb;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: #4b5563;
      font-size: 1.1rem;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .card h2 {
      margin-top: 0;
      color: #1e40af;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0.75rem;
    }
    .tabs {
      display: flex;
      margin-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .tab {
      padding: 0.75rem 1.5rem;
      font-weight: 500;
      color: #6b7280;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .tab.active {
      color: #2563eb;
      border-bottom: 2px solid #2563eb;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    textarea {
      width: 100%;
      min-height: 200px;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-family: inherit;
      margin-bottom: 1rem;
      resize: vertical;
    }
    .dropzone {
      border: 2px dashed #d1d5db;
      border-radius: 0.375rem;
      padding: 2rem;
      text-align: center;
      margin-bottom: 1.5rem;
      transition: all 0.3s ease;
    }
    .dropzone:hover, .dropzone.dragover {
      border-color: #2563eb;
      background-color: #eff6ff;
    }
    .dropzone p {
      margin: 0.5rem 0;
      color: #6b7280;
    }
    .dropzone-icon {
      font-size: 2rem;
      color: #9ca3af;
      margin-bottom: 0.5rem;
    }
    button {
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    button:hover {
      background-color: #1d4ed8;
    }
    button:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }
    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
    }
    .model-select {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .model-select select {
      padding: 0.5rem;
      border-radius: 0.375rem;
      border: 1px solid #d1d5db;
    }
    .loading {
      display: inline-block;
      width: 1.5rem;
      height: 1.5rem;
      border: 3px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
      margin-left: 0.5rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .result-card {
      display: none;
      white-space: pre-wrap;
    }
    .compare-container {
      display: flex;
      gap: 1rem;
    }
    .compare-column {
      flex: 1;
    }
    .hidden {
      display: none;
    }
    .status-indicator {
      display: inline-block;
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 50%;
      margin-right: 0.5rem;
    }
    .status-active {
      background-color: #10b981;
    }
    .status-inactive {
      background-color: #ef4444;
    }
    .api-status {
      background-color: #f3f4f6;
      border-radius: 0.375rem;
      padding: 1rem;
      margin: 1rem 0;
    }
    .api-status h3 {
      margin-top: 0;
      margin-bottom: 0.75rem;
    }
    .api-status p {
      margin: 0.25rem 0;
    }
    #result, #compareResult {
      background-color: #f9fafb;
      padding: 1rem;
      border-radius: 0.375rem;
      border-left: 4px solid #2563eb;
      line-height: 1.6;
    }
    .info-icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      background-color: #9ca3af;
      color: white;
      border-radius: 50%;
      text-align: center;
      line-height: 16px;
      font-size: 12px;
      margin-left: 0.25rem;
      cursor: help;
    }
    .tooltip {
      position: relative;
      display: inline-block;
    }
    .tooltip .tooltiptext {
      visibility: hidden;
      width: 200px;
      background-color: #333;
      color: #fff;
      text-align: center;
      border-radius: 6px;
      padding: 0.5rem;
      position: absolute;
      z-index: 1;
      bottom: 125%;
      left: 50%;
      transform: translateX(-50%);
      opacity: 0;
      transition: opacity 0.3s;
    }
    .tooltip:hover .tooltiptext {
      visibility: visible;
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Pure Cognitive Profiler</h1>
      <p class="subtitle">Analyze the intelligence and cognitive style behind any text</p>
    </header>
    
    <div class="card">
      <div class="tabs">
        <div class="tab active" data-tab="analyze">Analyze Single Text</div>
        <div class="tab" data-tab="compare">Compare Two Texts</div>
      </div>
      
      <div id="apiStatus" class="api-status">
        <h3>API Status</h3>
        <div id="apiStatusContent">Checking API status...</div>
      </div>
      
      <div id="analyzeTab" class="tab-content active">
        <h2>Upload or Paste Text</h2>
        <div id="dropzone" class="dropzone">
          <div class="dropzone-icon">📄</div>
          <p>Drag and drop a file here</p>
          <p>or</p>
          <input type="file" id="fileInput" style="display: none;">
          <button id="browseButton">Browse Files</button>
          <p class="small">Supports .txt, .docx, and .pdf</p>
        </div>
        
        <textarea id="textInput" placeholder="Or paste your text here..."></textarea>
        
        <div class="controls">
          <div class="model-select">
            <label for="modelSelect">AI Model:</label>
            <select id="modelSelect">
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
            <div class="tooltip">
              <span class="info-icon">?</span>
              <span class="tooltiptext">Choose the AI model that will perform cognitive profiling.</span>
            </div>
          </div>
          
          <button id="analyzeButton">
            Analyze Text
            <span id="analyzeLoading" class="loading hidden"></span>
          </button>
        </div>
      </div>
      
      <div id="compareTab" class="tab-content">
        <h2>Compare Two Texts</h2>
        <div class="compare-container">
          <div class="compare-column">
            <h3>Text A</h3>
            <textarea id="textInputA" placeholder="Paste the first text here..."></textarea>
          </div>
          <div class="compare-column">
            <h3>Text B</h3>
            <textarea id="textInputB" placeholder="Paste the second text here..."></textarea>
          </div>
        </div>
        
        <div class="controls">
          <div class="model-select">
            <label for="compareModelSelect">AI Model:</label>
            <select id="compareModelSelect">
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>
          
          <button id="compareButton">
            Compare Texts
            <span id="compareLoading" class="loading hidden"></span>
          </button>
        </div>
      </div>
    </div>
    
    <div id="resultCard" class="card result-card">
      <h2>Cognitive Profile</h2>
      <div id="result"></div>
    </div>
    
    <div id="compareResultCard" class="card result-card">
      <h2>Cognitive Comparison</h2>
      <div id="compareResult"></div>
    </div>
    
    <div class="card">
      <h2>About This Tool</h2>
      <p>The Pure Cognitive Profiler analyzes writing as a cognitive fingerprint to reveal the mind of the author. Unlike writing quality assessments or graders, this tool attempts to estimate intelligence and identify cognitive patterns.</p>
      <p>This tool sends your text directly to AI models with no intermediate processing, scoring, or adjustment.</p>
      <p><strong>How it works:</strong></p>
      <ol>
        <li>Upload or paste a text</li>
        <li>The tool sends it directly to the selected AI model with specific profiling instructions</li>
        <li>The AI evaluates the intelligence level (1-100) and cognitive style</li>
        <li>The unaltered AI response is displayed</li>
      </ol>
    </div>
  </div>
  
  <script>
    // DOM Elements
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const browseButton = document.getElementById('browseButton');
    const textInput = document.getElementById('textInput');
    const modelSelect = document.getElementById('modelSelect');
    const analyzeButton = document.getElementById('analyzeButton');
    const analyzeLoading = document.getElementById('analyzeLoading');
    const resultCard = document.getElementById('resultCard');
    const result = document.getElementById('result');
    const textInputA = document.getElementById('textInputA');
    const textInputB = document.getElementById('textInputB');
    const compareModelSelect = document.getElementById('compareModelSelect');
    const compareButton = document.getElementById('compareButton');
    const compareLoading = document.getElementById('compareLoading');
    const compareResultCard = document.getElementById('compareResultCard');
    const compareResult = document.getElementById('compareResult');
    const apiStatus = document.getElementById('apiStatus');
    const apiStatusContent = document.getElementById('apiStatusContent');
    
    // Check API Status
    async function checkApiStatus() {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        let statusHtml = '';
        if (data.openai) {
          statusHtml += '<p><span class="status-indicator status-active"></span>OpenAI: Active</p>';
        } else {
          statusHtml += '<p><span class="status-indicator status-inactive"></span>OpenAI: Inactive</p>';
        }
        
        if (data.anthropic) {
          statusHtml += '<p><span class="status-indicator status-active"></span>Anthropic: Active</p>';
        } else {
          statusHtml += '<p><span class="status-indicator status-inactive"></span>Anthropic: Inactive</p>';
        }
        
        apiStatusContent.innerHTML = statusHtml;
      } catch (error) {
        apiStatusContent.innerHTML = '<p>Error checking API status. APIs may be unavailable.</p>';
        console.error('Error checking API status:', error);
      }
    }
    
    // Tab Switching
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show active content
        tabContents.forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');
        
        // Hide result cards
        resultCard.style.display = 'none';
        compareResultCard.style.display = 'none';
      });
    });
    
    // File Upload Handling
    browseButton.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', handleFileSelect);
    
    function handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Show loading state
      dropzone.innerHTML = '<div class="dropzone-icon">⏳</div><p>Processing file...</p>';
      
      fetch('/api/extract-text', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.content) {
          textInput.value = data.content;
          dropzone.innerHTML = '<div class="dropzone-icon">✓</div><p>File processed: ' + file.name + '</p>';
        } else {
          throw new Error('No content extracted');
        }
      })
      .catch(error => {
        console.error('Error extracting text:', error);
        dropzone.innerHTML = '<div class="dropzone-icon">❌</div><p>Error processing file</p><button id="resetDropzone">Try Again</button>';
        document.getElementById('resetDropzone').addEventListener('click', resetDropzone);
      });
    }
    
    function resetDropzone() {
      dropzone.innerHTML = `
        <div class="dropzone-icon">📄</div>
        <p>Drag and drop a file here</p>
        <p>or</p>
        <button id="browseButton">Browse Files</button>
        <p class="small">Supports .txt, .docx, and .pdf</p>
      `;
      document.getElementById('browseButton').addEventListener('click', () => {
        fileInput.click();
      });
    }
    
    // Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
      dropzone.classList.add('dragover');
    }
    
    function unhighlight() {
      dropzone.classList.remove('dragover');
    }
    
    dropzone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      fileInput.files = files;
      handleFileSelect({target: {files: files}});
    }
    
    // Analyze Text
    analyzeButton.addEventListener('click', async () => {
      const text = textInput.value.trim();
      if (!text) {
        alert('Please enter or upload some text to analyze');
        return;
      }
      
      const provider = modelSelect.value;
      
      // Show loading state
      analyzeButton.disabled = true;
      analyzeLoading.classList.remove('hidden');
      
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text, provider })
        });
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.message || 'Analysis failed');
        }
        
        // Display result
        result.textContent = data.result;
        resultCard.style.display = 'block';
        
        // Scroll to result
        resultCard.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Analysis error:', error);
        alert('Error analyzing text: ' + error.message);
      } finally {
        // Reset loading state
        analyzeButton.disabled = false;
        analyzeLoading.classList.add('hidden');
      }
    });
    
    // Compare Texts
    compareButton.addEventListener('click', async () => {
      const textA = textInputA.value.trim();
      const textB = textInputB.value.trim();
      
      if (!textA || !textB) {
        alert('Please enter both texts to compare');
        return;
      }
      
      const provider = compareModelSelect.value;
      
      // Show loading state
      compareButton.disabled = true;
      compareLoading.classList.remove('hidden');
      
      try {
        const response = await fetch('/api/compare', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ textA, textB, provider })
        });
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.message || 'Comparison failed');
        }
        
        // Display result
        compareResult.textContent = data.result;
        compareResultCard.style.display = 'block';
        
        // Scroll to result
        compareResultCard.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Comparison error:', error);
        alert('Error comparing texts: ' + error.message);
      } finally {
        // Reset loading state
        compareButton.disabled = false;
        compareLoading.classList.add('hidden');
      }
    });
    
    // Initialize
    checkApiStatus();
  </script>
</body>
</html>
`;

// Write HTML to public directory
fs.writeFileSync(path.join(publicDir, 'index.html'), htmlTemplate);

// Extract text from file (simple version that just converts buffer to string)
app.post('/api/extract-text', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Simple text extraction - in a real app, use proper parsers for different file types
    const content = file.buffer.toString('utf8');
    
    res.json({
      content,
      filename: file.originalname
    });
  } catch (error) {
    console.error('Error extracting text:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Status endpoint
app.get('/api/status', (req, res) => {
  const status = {
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY)
  };
  
  res.json(status);
});

// PURE PASSTHROUGH - Analyze text endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, provider = 'openai' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: true, message: 'Text is required' });
    }
    
    let result;
    
    // Pure passthrough to selected AI model
    if (provider === 'anthropic') {
      console.log('Analyzing with Anthropic Claude (pure passthrough)');
      try {
        const anthropic = getAnthropicClient();
        
        const response = await anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219', // newest model
          messages: [
            { role: 'user', content: `${COGNITIVE_PROFILER_PROMPT}\n\n${text}` }
          ],
          max_tokens: 4000
        });
        
        result = (response.content[0]?.type === 'text') ? response.content[0].text : 'Analysis failed';
      } catch (error) {
        console.error('Anthropic API error:', error);
        return res.status(500).json({ 
          error: true, 
          message: `Anthropic API error: ${error.message}`,
          result: `Error: ${error.message}`
        });
      }
    } else {
      console.log('Analyzing with OpenAI GPT-4o (pure passthrough)');
      try {
        const openai = getOpenAIClient();
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o', // newest model
          messages: [
            { role: 'user', content: `${COGNITIVE_PROFILER_PROMPT}\n\n${text}` }
          ]
        });
        
        result = response.choices[0]?.message?.content || 'Analysis failed';
      } catch (error) {
        console.error('OpenAI API error:', error);
        return res.status(500).json({ 
          error: true, 
          message: `OpenAI API error: ${error.message}`,
          result: `Error: ${error.message}`
        });
      }
    }
    
    // Return pure, unmodified result
    res.json({ result });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: true, 
      message: error.message,
      result: `Error: ${error.message}`
    });
  }
});

// PURE PASSTHROUGH - Compare texts endpoint
app.post('/api/compare', async (req, res) => {
  try {
    const { textA, textB, provider = 'openai' } = req.body;
    
    if (!textA || !textB) {
      return res.status(400).json({ error: true, message: 'Both texts are required' });
    }
    
    const comparePrompt = `
${COGNITIVE_PROFILER_PROMPT}

I need you to analyze TWO separate texts and provide a cognitive profile for each:

TEXT A:
${textA}

TEXT B:
${textB}

For each text:
1. What kind of thinker wrote it?
2. Estimate the author's intelligence on a scale from 1 to 100
3. Explain your score based on the cognitive characteristics mentioned above

Then compare the two minds:
- What are the key differences in cognitive style?
- Which shows evidence of higher intelligence and why?
`;
    
    let result;
    
    // Pure passthrough to selected AI model
    if (provider === 'anthropic') {
      console.log('Comparing with Anthropic Claude (pure passthrough)');
      try {
        const anthropic = getAnthropicClient();
        
        const response = await anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219', // newest model
          messages: [
            { role: 'user', content: comparePrompt }
          ],
          max_tokens: 4000
        });
        
        result = (response.content[0]?.type === 'text') ? response.content[0].text : 'Comparison failed';
      } catch (error) {
        console.error('Anthropic API error:', error);
        return res.status(500).json({ 
          error: true, 
          message: `Anthropic API error: ${error.message}`,
          result: `Error: ${error.message}`
        });
      }
    } else {
      console.log('Comparing with OpenAI GPT-4o (pure passthrough)');
      try {
        const openai = getOpenAIClient();
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o', // newest model
          messages: [
            { role: 'user', content: comparePrompt }
          ]
        });
        
        result = response.choices[0]?.message?.content || 'Comparison failed';
      } catch (error) {
        console.error('OpenAI API error:', error);
        return res.status(500).json({ 
          error: true, 
          message: `OpenAI API error: ${error.message}`,
          result: `Error: ${error.message}`
        });
      }
    }
    
    // Return pure, unmodified result
    res.json({ result });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ 
      error: true, 
      message: error.message,
      result: `Error: ${error.message}`
    });
  }
});

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Pure Cognitive Profiler running on port ${port}`);
  console.log('API key status:');
  console.log('- OpenAI:', process.env.OPENAI_API_KEY ? 'Configured ✓' : 'Missing ✗');
  console.log('- Anthropic:', process.env.ANTHROPIC_API_KEY ? 'Configured ✓' : 'Missing ✗');
});
