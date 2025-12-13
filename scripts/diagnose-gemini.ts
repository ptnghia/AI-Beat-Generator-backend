/**
 * Gemini API Diagnostic Tool
 * Test different endpoints and model names
 */

import 'dotenv/config';
import axios from 'axios';

async function listGeminiModels() {
  console.log('\n🔍 Listing Available Gemini Models...\n');
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not found');
    return;
  }

  console.log(`Using API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

  // Try different API versions
  const versions = ['v1', 'v1beta'];
  
  for (const version of versions) {
    console.log(`\n📋 Testing API version: ${version}`);
    console.log('-'.repeat(60));
    
    try {
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`
      );
      
      if (response.data.models) {
        console.log(`✅ Success! Found ${response.data.models.length} models:\n`);
        
        // Filter for Gemini models that support generateContent
        const geminiModels = response.data.models.filter((m: any) => 
          m.name.includes('gemini') && 
          m.supportedGenerationMethods?.includes('generateContent')
        );
        
        console.log('🎯 Gemini models supporting generateContent:');
        geminiModels.forEach((model: any) => {
          console.log(`   - ${model.name}`);
          console.log(`     Display Name: ${model.displayName}`);
          console.log(`     Methods: ${model.supportedGenerationMethods.join(', ')}`);
          console.log('');
        });
        
        // Return first working model
        if (geminiModels.length > 0) {
          return { version, modelName: geminiModels[0].name };
        }
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.response?.status} - ${error.message}`);
      if (error.response?.data) {
        console.log(`   ${JSON.stringify(error.response.data, null, 2).substring(0, 200)}`);
      }
    }
  }
  
  return null;
}

async function testGenerateContent(version: string, modelName: string) {
  console.log('\n\n🧪 Testing generateContent...');
  console.log('='.repeat(60));
  
  const apiKey = process.env.GEMINI_API_KEY;
  const modelPath = modelName.replace('models/', '');
  
  console.log(`\nEndpoint: https://generativelanguage.googleapis.com/${version}/models/${modelPath}:generateContent`);
  console.log(`Model: ${modelPath}\n`);
  
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/${version}/models/${modelPath}:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{
            text: 'Generate a creative concept for a dark trap beat in exactly 20 words.'
          }]
        }]
      }
    );
    
    if (response.status === 200 && response.data.candidates) {
      const text = response.data.candidates[0]?.content?.parts[0]?.text;
      console.log('✅ SUCCESS!\n');
      console.log('Response:');
      console.log(text);
      console.log('\n✨ This endpoint is working correctly!');
      return true;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.response?.status} - ${error.message}`);
    if (error.response?.data) {
      console.log('\nError Details:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function diagnose() {
  console.log('🏥 GEMINI API DIAGNOSTIC');
  console.log('='.repeat(60));
  
  // Step 1: List available models
  const result = await listGeminiModels();
  
  if (!result) {
    console.log('\n\n❌ Could not find any working Gemini models');
    console.log('\nPossible reasons:');
    console.log('1. API key is invalid or expired');
    console.log('2. API key does not have access to Gemini API');
    console.log('3. Billing is not enabled on the project');
    console.log('4. API endpoint has changed');
    console.log('\nTo fix:');
    console.log('1. Go to https://aistudio.google.com/app/apikey');
    console.log('2. Create a new API key');
    console.log('3. Make sure Gemini API is enabled');
    return;
  }
  
  // Step 2: Test generateContent
  const success = await testGenerateContent(result.version, result.modelName);
  
  if (success) {
    console.log('\n\n✅ RECOMMENDED CONFIGURATION:');
    console.log('='.repeat(60));
    console.log(`\nAPI Version: ${result.version}`);
    console.log(`Model Name: ${result.modelName.replace('models/', '')}`);
    console.log('\nUpdate your code to use:');
    console.log(`\nconst response = await axios.post(`);
    console.log(`  \`https://generativelanguage.googleapis.com/${result.version}/models/${result.modelName.replace('models/', '')}:generateContent?key=\${apiKey}\`,`);
    console.log(`  { contents: [{ parts: [{ text: "your prompt" }] }] }`);
    console.log(`);`);
  }
}

diagnose()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Diagnostic failed:', error);
    process.exit(1);
  });
