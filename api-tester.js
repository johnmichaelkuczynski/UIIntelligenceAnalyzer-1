// Simple API tester to verify keys are working
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

console.log('API Key Tester');
console.log('==============');

// Test OpenAI API
async function testOpenAI() {
  try {
    console.log('Testing OpenAI API...');
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OPENAI_API_KEY not found in environment');
      return false;
    }
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Say hello' }],
    });
    
    if (completion.choices && completion.choices.length > 0) {
      console.log('✅ OpenAI API working!');
      console.log(`Response: ${completion.choices[0].message.content.substring(0, 40)}...`);
      return true;
    } else {
      console.log('❌ OpenAI API response format unexpected');
      return false;
    }
  } catch (error) {
    console.log('❌ OpenAI API Error:', error.message);
    return false;
  }
}

// Test Anthropic API
async function testAnthropic() {
  try {
    console.log('Testing Anthropic API...');
    
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('❌ ANTHROPIC_API_KEY not found in environment');
      return false;
    }
    
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say hello' }],
    });
    
    if (message.content && message.content.length > 0) {
      console.log('✅ Anthropic API working!');
      console.log(`Response: ${message.content[0].text.substring(0, 40)}...`);
      return true;
    } else {
      console.log('❌ Anthropic API response format unexpected');
      return false;
    }
  } catch (error) {
    console.log('❌ Anthropic API Error:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('Environment Variables:');
  console.log('OPENAI_API_KEY exists:', Boolean(process.env.OPENAI_API_KEY));
  console.log('ANTHROPIC_API_KEY exists:', Boolean(process.env.ANTHROPIC_API_KEY));
  console.log('');
  
  const openaiResult = await testOpenAI();
  console.log('');
  
  const anthropicResult = await testAnthropic();
  console.log('');
  
  console.log('Test Results:');
  console.log('OpenAI API:', openaiResult ? 'WORKING' : 'FAILED');
  console.log('Anthropic API:', anthropicResult ? 'WORKING' : 'FAILED');
}

runTests();