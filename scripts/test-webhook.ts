import axios from 'axios';

/**
 * Test webhook callback endpoint
 */

const API_BASE = 'http://localhost:3000';

async function testWebhook() {
  console.log('🧪 Testing Suno Webhook Endpoint\n');

  // Test 1: Health check
  console.log('1️⃣ Testing webhook health check...');
  try {
    const healthResponse = await axios.get(`${API_BASE}/api/callbacks/suno/test`);
    console.log('✅ Health check:', healthResponse.data);
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }

  // Test 2: TEXT_SUCCESS callback
  console.log('\n2️⃣ Testing TEXT_SUCCESS callback...');
  try {
    const textSuccessData = {
      code: 200,
      msg: 'success',
      data: {
        taskId: 'test-task-' + Date.now(),
        status: 'TEXT_SUCCESS',
        response: {}
      }
    };

    const response = await axios.post(
      `${API_BASE}/api/callbacks/suno`,
      textSuccessData
    );
    console.log('✅ TEXT_SUCCESS response:', response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Failed:', error.response?.data || error.message);
    }
  }

  // Test 3: SUCCESS callback với audio URL
  console.log('\n3️⃣ Testing SUCCESS callback with audio...');
  try {
    const successData = {
      code: 200,
      msg: 'success',
      data: {
        taskId: 'test-task-complete-' + Date.now(),
        status: 'SUCCESS',
        response: {
          sunoData: [
            {
              id: 'test-audio-id',
              audioUrl: 'https://musicfile.api.box/test.mp3',
              sourceAudioUrl: 'https://cdn1.suno.ai/test.mp3',
              imageUrl: 'https://musicfile.api.box/test.jpeg',
              title: 'Test Beat',
              tags: 'test, instrumental',
              duration: 180.5,
              modelName: 'chirp-auk-turbo'
            }
          ]
        }
      }
    };

    const response = await axios.post(
      `${API_BASE}/api/callbacks/suno`,
      successData
    );
    console.log('✅ SUCCESS response:', response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Failed:', error.response?.data || error.message);
    }
  }

  // Test 4: FAILED callback
  console.log('\n4️⃣ Testing FAILED callback...');
  try {
    const failedData = {
      code: 200,
      msg: 'success',
      data: {
        taskId: 'test-task-failed-' + Date.now(),
        status: 'FAILED',
        errorMessage: 'Test error message'
      }
    };

    const response = await axios.post(
      `${API_BASE}/api/callbacks/suno`,
      failedData
    );
    console.log('✅ FAILED response:', response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Failed:', error.response?.data || error.message);
    }
  }

  console.log('\n✅ All webhook tests completed!');
}

// Run tests
testWebhook().catch(console.error);
