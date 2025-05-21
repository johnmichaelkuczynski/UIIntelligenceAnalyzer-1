// Simple and direct implementation to check API key functionality
const OpenAI = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');

// Check OpenAI API key
async function checkOpenAI() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return false;
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const result = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    
    return Boolean(result.choices && result.choices.length > 0);
  } catch (error) {
    console.error('OpenAI check error:', error.message);
    return false;
  }
}

// Check Anthropic API key
async function checkAnthropic() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return false;
    }
    
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    const result = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Hello' }]
    });
    
    return Boolean(result.content && result.content.length > 0);
  } catch (error) {
    console.error('Anthropic check error:', error.message);
    return false;
  }
}

module.exports = {
  checkOpenAI,
  checkAnthropic
};