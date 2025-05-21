// pure-profiler.js - Strict Passthrough Cognitive Profiler
import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create public directory for static files
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static('public'));

// OFFICIAL LLM INSTRUCTIONS FROM REQUIREMENTS
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

// Basic HTML interface
const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cognitive Profiler</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      margin: 0;
      color: #333;
      background-color: #f9f9f9;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      margin-bottom: 30px;
      text-align: center;
    }
    h1 {
      color: #2563eb;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
    textarea {
      width: 100%;
      min-height: 200px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      margin-bottom: 15px;
    }
    button {
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover {
      background-color: #1d4ed8;
    }
    #result {
      white-space: pre-wrap;
      background-color: #f8fafc;
      padding: 15px;
      border-radius: 4px;
      border-left: 4px solid #2563eb;
    }
    .tabs {
      display: flex;
      margin-bottom: 15px;
    }
    .tab {
      padding: 8px 16px;
      background: #e5e7eb;
      border: none;
      margin-right: 5px;
      border-radius: 4px 4px 0 0;
      cursor: pointer;
    }
    .tab.active {
      background: #2563eb;
      color: white;
    }
    .hidden {
      display: none;
    }
    .loader {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255,255,255,.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
      margin-left: 10px;
      vertical-align: middle;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    #compareContainer {
      display: flex;
      gap: 20px;
    }
    .compareColumn {
      flex: 1;
    }
    #uploadForm {
      border: 2px dashed #ddd;
      padding: 20px;
      text-align: center;
      margin-bottom: 15px;
      border-radius: 4px;
    }
    footer {
      text-align: center;
      margin-top: 40px;
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Cognitive Profiler</h1>
      <p>Upload or paste text to analyze the cognitive profile of its author</p>
    </header>
    
    <div class="tabs">
      <button class="tab active" onclick="showTab('analyze')">Analyze Single Text</button>
      <button class="tab" onclick="showTab('compare')">Compare Two Texts</button>
    </div>
    
    <div id="analyzeTab">
      <div class="card">
        <h2>Upload Text</h2>
        <div id="uploadForm">
          <input type="file" id="fileInput" accept=".txt,.docx,.pdf">
          <p>or drag and drop file here</p>
        </div>
        
        <h2>Or Paste Text</h2>
        <textarea id="textInput" placeholder="Paste the text to analyze..."></textarea>
        
        <div>
          <label>AI Model:</label>
          <select id="modelSelect">
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
          <button id="analyzeBtn" onclick="analyzeText()">Analyze Text <span id="analyzeLoader" class="loader hidden"></span></button>
        </div>
      </div>
      
      <div class="card hidden" id="resultCard">
        <h2>Cognitive Profile</h2>
        <div id="result"></div>
      </div>
    </div>
    
    <div id="compareTab" class="hidden">
      <div class="card">
        <h2>Compare Two Texts</h2>
        <div id="compareContainer">
          <div class="compareColumn">
            <h3>Text A</h3>
            <textarea id="textInputA" placeholder="Paste the first text..."></textarea>
          </div>
          <div class="compareColumn">
            <h3>Text B</h3>
            <textarea id="textInputB" placeholder="Paste the second text..."></textarea>
          </div>
        </div>
        
        <div>
          <label>AI Model:</label>
          <select id="compareModelSelect">
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
          <button id="compareBtn" onclick="compareTexts()">Compare Texts <span id="compareLoader" class="loader hidden"></span></button>
        </div>
      </div>
      
      <div class="card hidden" id="compareResultCard">
        <h2>Comparison Results</h2>
        <div id="compareResult"></div>
      </div>
    </div>
    
    <footer>
      <p>Cognitive Profiler - A pure passthrough profiling tool</p>
    </footer>
  </div>
  
  <script>
    // Show/hide tabs
    function showTab(tabName) {
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      
      if (tabName === 'analyze') {
        document.querySelector('.tab:nth-child(1)').classList.add('active');
        document.getElementById('analyzeTab').classList.remove('hidden');
        document.getElementById('compareTab').classList.add('hidden');
      } else {
        document.querySelector('.tab:nth-child(2)').classList.add('active');
        document.getElementById('analyzeTab').classList.add('hidden');
        document.getElementById('compareTab').classList.remove('hidden');
      }
    }
    
    // Handle file upload
    document.getElementById('fileInput').addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('/api/extract-text', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        if (data.content) {
          document.getElementById('textInput').value = data.content;
        }
      } catch (error) {
        console.error('Error extracting text:', error);
        alert('Failed to extract text from file.');
      }
    });
    
    // Analyze text
    async function analyzeText() {
      const text = document.getElementById('textInput').value.trim();
      if (!text) {
        alert('Please enter or upload some text to analyze.');
        return;
      }
      
      const model = document.getElementById('modelSelect').value;
      const loader = document.getElementById('analyzeLoader');
      const button = document.getElementById('analyzeBtn');
      
      // Show loading state
      loader.classList.remove('hidden');
      button.disabled = true;
      
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, provider: model })
        });
        
        const data = await response.json();
        
        // Display result
        document.getElementById('result').textContent = data.result;
        document.getElementById('resultCard').classList.remove('hidden');
        
        // Scroll to result
        document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Analysis error:', error);
        alert('Failed to analyze text. Please try again.');
      } finally {
        // Hide loading state
        loader.classList.add('hidden');
        button.disabled = false;
      }
    }
    
    // Compare texts
    async function compareTexts() {
      const textA = document.getElementById('textInputA').value.trim();
      const textB = document.getElementById('textInputB').value.trim();
      
      if (!textA || !textB) {
        alert('Please enter both texts to compare.');
        return;
      }
      
      const model = document.getElementById('compareModelSelect').value;
      const loader = document.getElementById('compareLoader');
      const button = document.getElementById('compareBtn');
      
      // Show loading state
      loader.classList.remove('hidden');
      button.disabled = true;
      
      try {
        const response = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ textA, textB, provider: model })
        });
        
        const data = await response.json();
        
        // Display result
        document.getElementById('compareResult').textContent = data.result;
        document.getElementById('compareResultCard').classList.remove('hidden');
        
        // Scroll to result
        document.getElementById('compareResultCard').scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Comparison error:', error);
        alert('Failed to compare texts. Please try again.');
      } finally {
        // Hide loading state
        loader.classList.add('hidden');
        button.disabled = false;
      }
    }
    
    // Setup drag and drop for file upload
    const uploadArea = document.getElementById('uploadForm');
    
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
      uploadArea.style.borderColor = '#2563eb';
      uploadArea.style.backgroundColor = '#eff6ff';
    }
    
    function unhighlight() {
      uploadArea.style.borderColor = '#ddd';
      uploadArea.style.backgroundColor = 'transparent';
    }
    
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      
      if (files.length) {
        document.getElementById('fileInput').files = files;
        const event = new Event('change');
        document.getElementById('fileInput').dispatchEvent(event);
      }
    }
  </script>
</body>
</html>
`;

// API functions
// Initialize OpenAI client
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

// Initialize Anthropic client
const getAnthropicClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

// Extract text from file
async function extractTextFromFile(file) {
  // For simplicity, just convert buffer to text
  // In a production app, you'd use proper parsers for different file types
  return file.buffer.toString('utf8');
}

// Home page route
app.get('/', (req, res) => {
  res.send(htmlTemplate);
});

// API routes
// Health check
app.get('/api/check', (req, res) => {
  res.json({
    status: 'ok',
    apis: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY)
    }
  });
});

// Extract text from uploaded file
app.post('/api/extract-text', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const content = await extractTextFromFile(file);
    res.json({ 
      content,
      filename: file.originalname 
    });
  } catch (error) {
    console.error('Error extracting text:', error);
    res.status(500).json({ error: error.message });
  }
});

// PURE PASSTHROUGH - Analyze text
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, provider = 'openai' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }
    
    let result;
    
    if (provider === 'anthropic') {
      console.log('PURE PASSTHROUGH: Analyzing with Anthropic Claude');
      const anthropic = getAnthropicClient();
      
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        messages: [
          { role: 'user', content: `${COGNITIVE_PROFILER_PROMPT}\n\n${text}` }
        ],
        max_tokens: 4000
      });
      
      if (response.content && response.content[0] && response.content[0].type === 'text') {
        result = response.content[0].text;
      } else {
        result = 'Analysis failed: Could not retrieve Claude response';
      }
    } else {
      console.log('PURE PASSTHROUGH: Analyzing with OpenAI GPT-4o');
      const openai = getOpenAIClient();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          { role: 'user', content: `${COGNITIVE_PROFILER_PROMPT}\n\n${text}` }
        ]
      });
      
      result = response.choices[0]?.message?.content || 'Analysis failed: Could not retrieve OpenAI response';
    }
    
    // Return pure, unmodified result
    res.json({ result });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message,
      result: `Error: ${error.message}` 
    });
  }
});

// PURE PASSTHROUGH - Compare texts
app.post('/api/compare', async (req, res) => {
  try {
    const { textA, textB, provider = 'openai' } = req.body;
    
    if (!textA || !textB) {
      return res.status(400).json({ error: 'Both texts are required' });
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
      console.log('PURE PASSTHROUGH: Comparing with Anthropic Claude');
      const anthropic = getAnthropicClient();
      
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        messages: [
          { role: 'user', content: comparePrompt }
        ],
        max_tokens: 4000
      });
      
      if (response.content && response.content[0] && response.content[0].type === 'text') {
        result = response.content[0].text;
      } else {
        result = 'Comparison failed: Could not retrieve Claude response';
      }
    } else {
      console.log('PURE PASSTHROUGH: Comparing with OpenAI GPT-4o');
      const openai = getOpenAIClient();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          { role: 'user', content: comparePrompt }
        ]
      });
      
      result = response.choices[0]?.message?.content || 'Comparison failed: Could not retrieve OpenAI response';
    }
    
    // Return pure, unmodified result
    res.json({ result });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ 
      error: 'Comparison failed', 
      message: error.message,
      result: `Error: ${error.message}`
    });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Pure Cognitive Profiler running on port ${port}`);
  console.log(`Visit http://localhost:${port} to use the app`);
});

// Detect API keys
const checkApiKeys = () => {
  const apiStatus = {
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY)
  };
  
  console.log('API Key Status:', {
    openai: apiStatus.openai ? 'Configured ✓' : 'Missing ✗',
    anthropic: apiStatus.anthropic ? 'Configured ✓' : 'Missing ✗'
  });
  
  if (!apiStatus.openai && !apiStatus.anthropic) {
    console.warn('⚠️ WARNING: Neither OpenAI nor Anthropic API keys are configured!');
    console.warn('The app will not function without at least one API key.');
  }
};

// Check API keys on startup
checkApiKeys();