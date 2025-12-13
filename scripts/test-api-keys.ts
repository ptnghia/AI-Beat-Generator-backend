/**
 * Quick API Test Script
 * Tests individual API keys to verify they work
 */

import 'dotenv/config';
import axios from 'axios';

async function testGeminiAPI() {
  console.log('\n🧪 Testing Gemini API...');
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not found');
    return false;
  }

  try {
    // Try the correct endpoint
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{
            text: 'Say "Hello, I am working!" in exactly 5 words.'
          }]
        }]
      }
    );
    
    if (response.status === 200 && response.data.candidates) {
      const text = response.data.candidates[0]?.content?.parts[0]?.text;
      console.log(`✅ Gemini API working!`);
      console.log(`   Response: ${text}`);
      return true;
    }
  } catch (error: any) {
    console.log(`❌ Gemini API failed: ${error.response?.status} - ${error.message}`);
    if (error.response?.data) {
      console.log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  
  return false;
}

async function testOpenAIAPI() {
  console.log('\n🧪 Testing OpenAI API...');
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY not found');
    return false;
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "Hello, I am working!" in exactly 5 words.' }],
        max_tokens: 20
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200 && response.data.choices) {
      const text = response.data.choices[0]?.message?.content;
      console.log(`✅ OpenAI API working!`);
      console.log(`   Response: ${text}`);
      return true;
    }
  } catch (error: any) {
    console.log(`❌ OpenAI API failed: ${error.response?.status} - ${error.message}`);
    if (error.response?.data) {
      console.log(`   Error details: ${JSON.stringify(error.response.data.error, null, 2)}`);
    }
  }
  
  return false;
}

async function testSunoAPI() {
  console.log('\n🧪 Testing Suno API Keys...');
  const apiKeys = process.env.SUNO_API_KEYS?.split(',') || [];
  
  if (apiKeys.length === 0) {
    console.log('❌ SUNO_API_KEYS not found');
    return false;
  }

  console.log(`Found ${apiKeys.length} Suno API keys to test`);
  
  let workingKeys = 0;
  
  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i].trim();
    console.log(`\n   Testing key ${i + 1}/${apiKeys.length}: ${key.substring(0, 8)}...`);
    
    try {
      // Test with a simple request
      const response = await axios.post(
        'https://api.suno.ai/v1/music',
        {
          prompt: 'Test prompt',
          model: 'chirp-v3-5'
        },
        {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log(`   ✅ Key ${i + 1} is working! Status: ${response.status}`);
      workingKeys++;
      
    } catch (error: any) {
      if (error.response) {
        console.log(`   ❌ Key ${i + 1} failed: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.data) {
          console.log(`      Details: ${JSON.stringify(error.response.data, null, 2).substring(0, 200)}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        console.log(`   ⚠️  Key ${i + 1} timeout (might still work)`);
      } else {
        console.log(`   ❌ Key ${i + 1} error: ${error.message}`);
      }
    }
  }
  
  console.log(`\n   Summary: ${workingKeys}/${apiKeys.length} keys working`);
  return workingKeys > 0;
}

async function runTests() {
  console.log('🔍 API Keys Configuration Test');
  console.log('='.repeat(60));
  
  const results = {
    gemini: await testGeminiAPI(),
    openai: await testOpenAIAPI(),
    suno: await testSunoAPI()
  };
  
  console.log('\n\n📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`Gemini API:  ${results.gemini ? '✅ Working' : '❌ Failed'}`);
  console.log(`OpenAI API:  ${results.openai ? '✅ Working' : '❌ Failed'}`);
  console.log(`Suno API:    ${results.suno ? '✅ Working' : '❌ Failed'}`);
  
  const allWorking = results.gemini && results.openai && results.suno;
  console.log('\n' + (allWorking ? '✅ All APIs are working!' : '⚠️  Some APIs need attention'));
  console.log('='.repeat(60));
}

runTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
