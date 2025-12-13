import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.SUNO_API_KEYS?.split(',')[0];

async function testMusicGeneration() {
  console.log('🎵 Testing Suno Music Generation API Response\n');

  try {
    // 1. Submit job
    const submitResponse = await axios.post(
      'https://api.sunoapi.org/api/v1/generate',
      {
        customMode: 'true',
        instrumental: 'true',
        model: 'V4_5ALL',
        style: 'instrumental, beat',
        title: 'API Response Test',
        prompt: 'Test beat for API response analysis',
        callBackUrl: 'https://webhook.site/test'
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('📤 SUBMIT RESPONSE:');
    console.log(JSON.stringify(submitResponse.data, null, 2));
    
    const taskId = submitResponse.data.data.task_id;
    console.log('\n⏳ Waiting 10 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 2. Check status
    const statusResponse = await axios.get(
      `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${taskId}`,
      {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      }
    );

    console.log('📥 STATUS RESPONSE:');
    console.log(JSON.stringify(statusResponse.data, null, 2));

    if (statusResponse.data.data?.response) {
      console.log('\n✅ MUSIC GENERATION RESPONSE FIELDS:');
      const response = statusResponse.data.data.response;
      console.log('- task_id:', response.task_id);
      console.log('- audio_id:', response.audio_id);
      console.log('- song_id:', response.song_id);
      console.log('- audio_url:', response.audio_url);
      console.log('- image_url:', response.image_url);
      console.log('- title:', response.title);
      console.log('- status:', response.status);
      
      console.log('\n📋 FIELDS TO STORE:');
      console.log('  ✓ sunoTaskId: response.task_id (for tracking)');
      console.log('  ✓ sunoAudioId: response.audio_id (for WAV conversion)');
      console.log('  ✓ sunoSongId: response.song_id (for cover generation - if available)');
      console.log('  ✓ sunoImageUrl: response.image_url (default cover from Suno)');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testMusicGeneration();
