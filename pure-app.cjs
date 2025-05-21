// Simple Cognitive Profiler - Pure Passthrough Implementation
const express = require('express');
const { OpenAI } = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// COGNITIVE PROFILER PROMPT - Exactly as specified in the requirements
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

// Simple HTML interface - No API status displayed to users
const htmlInterface = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cognitive Profiler</title>
  <style>
    :root {
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --background: #f9fafb;
      --card: #ffffff;
      --text: #333333;
      --border: #e5e7eb;
      --error: #ef4444;
      --success: #10b981;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      color: var(--text);
      background-color: var(--background);
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    h1 {
      color: var(--primary);
      margin-bottom: 0.5rem;
    }
    
    .subtitle {
      color: #666;
      font-size: 1.1rem;
    }
    
    .card {
      background: var(--card);
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 1rem;
      color: var(--primary);
    }
    
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      margin-bottom: 1.5rem;
    }
    
    .tab {
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      font-weight: 500;
    }
    
    .tab.active {
      border-bottom-color: var(--primary);
      color: var(--primary);
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
      border: 1px solid var(--border);
      border-radius: 0.375rem;
      font-family: inherit;
      margin-bottom: 1rem;
      box-sizing: border-box;
      font-size: 1rem;
    }
    
    button {
      background-color: var(--primary);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      font-weight: 500;
      cursor: pointer;
      font-size: 1rem;
      transition: background-color 0.2s;
    }
    
    button:hover {
      background-color: var(--primary-hover);
    }
    
    button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    select {
      padding: 0.5rem;
      border-radius: 0.375rem;
      border: 1px solid var(--border);
      margin-right: 1rem;
      font-size: 1rem;
    }
    
    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
    }
    
    .upload-area {
      border: 2px dashed var(--border);
      padding: 2rem;
      text-align: center;
      margin-bottom: 1.5rem;
      border-radius: 0.375rem;
      transition: all 0.2s;
    }
    
    .upload-area:hover, .upload-area.dragover {
      border-color: var(--primary);
      background-color: rgba(37, 99, 235, 0.05);
    }
    
    #result, #compareResult {
      white-space: pre-wrap;
      background-color: #f3f4f6;
      padding: 1rem;
      border-radius: 0.375rem;
      border-left: 4px solid var(--primary);
      max-height: 500px;
      overflow-y: auto;
      font-family: 'Georgia', serif;
      line-height: 1.6;
    }
    
    .result-card {
      display: none;
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    
    @media (max-width: 768px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }
    }
    
    .loader {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
      margin-left: 0.5rem;
      vertical-align: middle;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .hidden {
      display: none;
    }
    
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      margin-bottom: 1rem;
    }
    
    .alert-error {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    
    .alert-success {
      background-color: #d1fae5;
      color: #047857;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Cognitive Profiler</h1>
      <p class="subtitle">Analyze the intelligence and thinking style revealed in any text</p>
    </header>
    
    <div class="card">
      <div class="tabs">
        <div class="tab active" data-tab="analyze">Analyze Single Text</div>
        <div class="tab" data-tab="compare">Compare Two Texts</div>
      </div>
      
      <div id="alertBox" class="alert hidden"></div>
      
      <div id="analyzeTab" class="tab-content active">
        <div class="upload-area" id="uploadArea">
          <p>Drop your file here or click to browse</p>
          <input type="file" id="fileInput" style="display: none;" accept=".txt">
        </div>
        
        <textarea id="textInput" placeholder="Or paste your text here..."></textarea>
        
        <div class="controls">
          <div>
            <label for="providerSelect">AI Model:</label>
            <select id="providerSelect">
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>
          
          <button id="analyzeBtn">
            Analyze Text
            <span id="analyzeLoader" class="loader hidden"></span>
          </button>
        </div>
      </div>
      
      <div id="compareTab" class="tab-content">
        <div class="grid-2">
          <div>
            <h3>Text A</h3>
            <textarea id="textInputA" placeholder="Paste the first text here..."></textarea>
          </div>
          <div>
            <h3>Text B</h3>
            <textarea id="textInputB" placeholder="Paste the second text here..."></textarea>
          </div>
        </div>
        
        <div class="controls">
          <div>
            <label for="compareProviderSelect">AI Model:</label>
            <select id="compareProviderSelect">
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>
          
          <button id="compareBtn">
            Compare Texts
            <span id="compareLoader" class="loader hidden"></span>
          </button>
        </div>
      </div>
    </div>
    
    <div id="resultCard" class="card result-card">
      <h2 class="card-title">Cognitive Profile</h2>
      <div id="result"></div>
    </div>
    
    <div id="compareResultCard" class="card result-card">
      <h2 class="card-title">Cognitive Comparison</h2>
      <div id="compareResult"></div>
    </div>
    
    <div class="card">
      <h2 class="card-title">About This Tool</h2>
      <p>The Cognitive Profiler analyzes text as a cognitive fingerprint to reveal the mind behind it. Unlike writing assessments that focus on quality, style, or completeness, this tool aims to evaluate intelligence (on a 1-100 scale) and identify cognitive patterns.</p>
      <p>The system is a pure passthrough that sends your text directly to AI models with specific profiling instructions. There is no internal scoring or evaluation—the AI model performs all assessment with no modifications.</p>
    </div>
  </div>
  
  <script>
    // DOM Elements
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const textInput = document.getElementById('textInput');
    const providerSelect = document.getElementById('providerSelect');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeLoader = document.getElementById('analyzeLoader');
    const resultCard = document.getElementById('resultCard');
    const result = document.getElementById('result');
    const textInputA = document.getElementById('textInputA');
    const textInputB = document.getElementById('textInputB');
    const compareProviderSelect = document.getElementById('compareProviderSelect');
    const compareBtn = document.getElementById('compareBtn');
    const compareLoader = document.getElementById('compareLoader');
    const compareResultCard = document.getElementById('compareResultCard');
    const compareResult = document.getElementById('compareResult');
    const alertBox = document.getElementById('alertBox');
    
    // Helper functions
    function showAlert(message, type = 'error') {
      alertBox.textContent = message;
      alertBox.className = type === 'error' 
        ? 'alert alert-error' 
        : 'alert alert-success';
      alertBox.classList.remove('hidden');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        alertBox.classList.add('hidden');
      }, 5000);
    }
    
    function hideAlert() {
      alertBox.classList.add('hidden');
    }
    
    // Tab switching
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show active content
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(tabName + 'Tab').classList.add('active');
        
        // Hide result cards
        resultCard.style.display = 'none';
        compareResultCard.style.display = 'none';
        
        // Hide any alerts
        hideAlert();
      });
    });
    
    // File Upload
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', handleFileSelect);
    
    function handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      
      reader.onload = function(e) {
        const contents = e.target.result;
        textInput.value = contents;
        uploadArea.innerHTML = '<p>File loaded successfully!</p>';
      };
      
      reader.onerror = function() {
        showAlert('Error reading file');
        uploadArea.innerHTML = '<p>Drop your file here or click to browse</p>';
      };
      
      reader.readAsText(file);
    }
    
    // Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
      uploadArea.classList.add('dragover');
    }
    
    function unhighlight() {
      uploadArea.classList.remove('dragover');
    }
    
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      
      if (files.length) {
        fileInput.files = files;
        handleFileSelect({target: {files: files}});
      }
    }
    
    // Analyze Text
    analyzeBtn.addEventListener('click', async () => {
      const text = textInput.value.trim();
      if (!text) {
        showAlert('Please enter or upload some text to analyze');
        return;
      }
      
      // Show loading state
      analyzeBtn.disabled = true;
      analyzeLoader.classList.remove('hidden');
      hideAlert();
      
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: text,
            provider: providerSelect.value
          })
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
        showAlert('Error analyzing text. Please try again.');
      } finally {
        // Reset loading state
        analyzeBtn.disabled = false;
        analyzeLoader.classList.add('hidden');
      }
    });
    
    // Compare Texts
    compareBtn.addEventListener('click', async () => {
      const textA = textInputA.value.trim();
      const textB = textInputB.value.trim();
      
      if (!textA || !textB) {
        showAlert('Please enter both texts to compare');
        return;
      }
      
      // Show loading state
      compareBtn.disabled = true;
      compareLoader.classList.remove('hidden');
      hideAlert();
      
      try {
        const response = await fetch('/api/compare', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            textA: textA,
            textB: textB,
            provider: compareProviderSelect.value
          })
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
        showAlert('Error comparing texts. Please try again.');
      } finally {
        // Reset loading state
        compareBtn.disabled = false;
        compareLoader.classList.add('hidden');
      }
    });
  </script>
</body>
</html>
`;

// Write HTML to public directory
fs.writeFileSync(path.join(publicDir, 'index.html'), htmlInterface);

// OpenAI Client
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Anthropic Client
function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Routes
// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Analyze text - Pure passthrough
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, provider = 'openai' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: true, message: 'No text provided' });
    }
    
    let result;
    
    if (provider === 'anthropic') {
      try {
        console.log('Processing with Anthropic Claude');
        const anthropic = getAnthropicClient();
        
        const response = await anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219', // newest model
          messages: [
            { role: 'user', content: `${COGNITIVE_PROFILER_PROMPT}\n\n${text}` }
          ],
          max_tokens: 4000
        });
        
        if (response.content && response.content[0] && response.content[0].type === 'text') {
          result = response.content[0].text;
        } else {
          throw new Error('Unexpected response format from Anthropic');
        }
      } catch (error) {
        console.error('Anthropic API error:', error);
        throw new Error(`Anthropic API error: ${error.message}`);
      }
    } else {
      try {
        console.log('Processing with OpenAI GPT-4o');
        const openai = getOpenAIClient();
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o', // newest model
          messages: [
            { role: 'user', content: `${COGNITIVE_PROFILER_PROMPT}\n\n${text}` }
          ],
          temperature: 0.1
        });
        
        result = response.choices[0]?.message?.content;
        if (!result) {
          throw new Error('Unexpected response format from OpenAI');
        }
      } catch (error) {
        console.error('OpenAI API error:', error);
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
    
    // Return raw result
    res.json({ result });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Analysis failed'
    });
  }
});

// Compare texts - Pure passthrough
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
    
    if (provider === 'anthropic') {
      try {
        console.log('Comparing with Anthropic Claude');
        const anthropic = getAnthropicClient();
        
        const response = await anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219', // newest model
          messages: [
            { role: 'user', content: comparePrompt }
          ],
          max_tokens: 4000
        });
        
        if (response.content && response.content[0] && response.content[0].type === 'text') {
          result = response.content[0].text;
        } else {
          throw new Error('Unexpected response format from Anthropic');
        }
      } catch (error) {
        console.error('Anthropic API error:', error);
        throw new Error(`Anthropic API error: ${error.message}`);
      }
    } else {
      try {
        console.log('Comparing with OpenAI GPT-4o');
        const openai = getOpenAIClient();
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o', // newest model
          messages: [
            { role: 'user', content: comparePrompt }
          ],
          temperature: 0.1
        });
        
        result = response.choices[0]?.message?.content;
        if (!result) {
          throw new Error('Unexpected response format from OpenAI');
        }
      } catch (error) {
        console.error('OpenAI API error:', error);
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
    
    // Return raw result
    res.json({ result });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Comparison failed'
    });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Pure Cognitive Profiler running on port ${port}`);
});