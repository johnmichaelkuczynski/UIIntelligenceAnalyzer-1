import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// THE EXACT COGNITIVE PROFILER PROMPT - NO MODIFICATIONS
const COGNITIVE_PROFILER_PROMPT = `
You are not grading this text.
You are not evaluating its completeness.
You are evaluating the intelligence of the mind that produced it.

The text is a cognitive fingerprint.
Based on what it reveals, what kind of thinker wrote it?

Estimate intelligence from 1 to 100.
Explain your score.
Focus on originality, abstraction, synthesis, inference, and compression.
Ignore polish, structure, citations, or whether it's a full argument.
You are profiling a mind—not grading an essay.
`;

// Initialize API clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Health check route
app.get('/api/check', (req, res) => {
  res.json({
    status: 'ok',
    apis: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY)
    }
  });
});

// PURE PASSTHROUGH - Analyze route
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, provider = 'openai' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }
    
    let result;
    
    if (provider === 'anthropic') {
      console.log('Analyzing with Claude - pure passthrough');
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        messages: [
          { role: 'user', content: `${COGNITIVE_PROFILER_PROMPT}\n\n${text}` }
        ],
        max_tokens: 4000
      });
      
      result = response.content[0]?.type === 'text' ? response.content[0].text : 'Analysis failed';
    } else {
      console.log('Analyzing with OpenAI - pure passthrough');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: `${COGNITIVE_PROFILER_PROMPT}\n\n${text}` }
        ],
        temperature: 0.1
      });
      
      result = response.choices[0]?.message?.content || 'Analysis failed';
    }
    
    // Return pure, unmodified result
    res.json({ result });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message 
    });
  }
});

// PURE PASSTHROUGH - Compare route
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
2. Estimate intelligence from 1 to 100
3. Explain your score based on originality, abstraction, synthesis, inference, and compression

Then compare the two minds:
- What are the key differences in cognitive style?
- Which shows evidence of higher intelligence and why?
`;
    
    let result;
    
    if (provider === 'anthropic') {
      console.log('Comparing with Claude - pure passthrough');
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        messages: [
          { role: 'user', content: comparePrompt }
        ],
        max_tokens: 4000
      });
      
      result = response.content[0]?.type === 'text' ? response.content[0].text : 'Comparison failed';
    } else {
      console.log('Comparing with OpenAI - pure passthrough');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: comparePrompt }
        ],
        temperature: 0.1
      });
      
      result = response.choices[0]?.message?.content || 'Comparison failed';
    }
    
    // Return pure, unmodified result
    res.json({ result });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ 
      error: 'Comparison failed', 
      message: error.message 
    });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Pure Cognitive Profiler running on port ${port}`);
});