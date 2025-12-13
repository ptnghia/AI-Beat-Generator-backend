import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Script để test Suno API với API keys có sẵn
 * Phiên bản mới: https://docs.sunoapi.org/
 */

const SUNO_API_BASE = 'https://api.sunoapi.org';
const API_KEYS = process.env.SUNO_API_KEYS?.split(',') || [];

interface SunoApiResponse {
  code: number;
  msg: string;
  data: any;
}

/**
 * Test 1: Kiểm tra credits còn lại
 */
async function checkCredits(apiKey: string): Promise<void> {
  console.log('\n=== TEST 1: Kiểm tra Credits ===');
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  
  try {
    const response = await axios.get<SunoApiResponse>(
      `${SUNO_API_BASE}/api/v1/get-credits`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.code === 200) {
      console.log(`💰 Credits còn lại: ${response.data.data.credits}`);
    } else {
      console.log(`❌ Lỗi: ${response.data.msg}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Lỗi API:', error.response?.status, error.response?.data);
    } else {
      console.error('❌ Lỗi:', error);
    }
  }
}

/**
 * Test 2: Generate một bài nhạc đơn giản (Non-custom mode)
 */
async function generateSimpleMusic(apiKey: string): Promise<string | null> {
  console.log('\n=== TEST 2: Generate Nhạc Đơn Giản (Non-custom Mode) ===');
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  
  try {
    const requestBody = {
      customMode: false,
      instrumental: true,
      model: "V4_5ALL",
      prompt: "A peaceful piano instrumental with soft melodies",
      callBackUrl: "https://webhook.site/unique-id" // Callback URL giả để test
    };

    console.log('📤 Request:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post<SunoApiResponse>(
      `${SUNO_API_BASE}/api/v1/generate`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.code === 200) {
      const taskId = response.data.data.taskId;
      console.log(`🎵 Task ID: ${taskId}`);
      return taskId;
    } else {
      console.log(`❌ Lỗi: ${response.data.msg}`);
      return null;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Lỗi API:', error.response?.status, error.response?.data);
    } else {
      console.error('❌ Lỗi:', error);
    }
    return null;
  }
}

/**
 * Test 3: Generate nhạc với Custom mode
 */
async function generateCustomMusic(apiKey: string): Promise<string | null> {
  console.log('\n=== TEST 3: Generate Nhạc Custom Mode ===');
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  
  try {
    const requestBody = {
      customMode: true,
      instrumental: true,
      model: "V4_5ALL",
      style: "Electronic, Ambient",
      title: "Test Beat",
      prompt: "A calm and relaxing electronic ambient track",
      callBackUrl: "https://webhook.site/unique-id" // Callback URL giả để test
    };

    console.log('📤 Request:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post<SunoApiResponse>(
      `${SUNO_API_BASE}/api/v1/generate`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.code === 200) {
      const taskId = response.data.data.taskId;
      console.log(`🎵 Task ID: ${taskId}`);
      return taskId;
    } else {
      console.log(`❌ Lỗi: ${response.data.msg}`);
      return null;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Lỗi API:', error.response?.status, error.response?.data);
    } else {
      console.error('❌ Lỗi:', error);
    }
    return null;
  }
}

/**
 * Test 4: Kiểm tra trạng thái task
 */
async function checkTaskStatus(apiKey: string, taskId: string): Promise<void> {
  console.log('\n=== TEST 4: Kiểm tra Task Status ===');
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`Task ID: ${taskId}`);
  
  try {
    const response = await axios.get<SunoApiResponse>(
      `${SUNO_API_BASE}/api/v1/generate/record-info?taskId=${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.code === 200) {
      const status = response.data.data.status;
      console.log(`📊 Status: ${status}`);
      
      if (status === 'SUCCESS') {
        // Suno API trả về trong sunoData
        const tracks = response.data.data.response?.sunoData || [];
        console.log(`🎵 Số bài nhạc: ${tracks.length}`);
        tracks.forEach((track: any, index: number) => {
          console.log(`\nBài ${index + 1}:`);
          console.log(`  - ID: ${track.id}`);
          console.log(`  - Title: ${track.title}`);
          console.log(`  - Duration: ${track.duration}s`);
          console.log(`  - Audio URL: ${track.audioUrl}`);
          console.log(`  - Image URL: ${track.imageUrl}`);
          console.log(`  - Tags: ${track.tags}`);
          console.log(`  - Model: ${track.modelName}`);
        });
      }
    } else {
      console.log(`❌ Lỗi: ${response.data.msg}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Lỗi API:', error.response?.status, error.response?.data);
    } else {
      console.error('❌ Lỗi:', error);
    }
  }
}

/**
 * Test 5: Poll task cho đến khi hoàn thành
 */
async function waitForTaskCompletion(
  apiKey: string, 
  taskId: string, 
  maxWaitTime: number = 180000 // 3 phút
): Promise<void> {
  console.log('\n=== TEST 5: Đợi Task Hoàn Thành ===');
  console.log(`Max wait time: ${maxWaitTime / 1000}s`);
  
  const startTime = Date.now();
  const pollInterval = 10000; // 10 giây
  let pollCount = 0;

  while (Date.now() - startTime < maxWaitTime) {
    pollCount++;
    console.log(`\n⏳ Poll #${pollCount} (${Math.floor((Date.now() - startTime) / 1000)}s)...`);
    
    try {
      const response = await axios.get<SunoApiResponse>(
        `${SUNO_API_BASE}/api/v1/generate/record-info?taskId=${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      if (response.data.code === 200) {
        const status = response.data.data.status;
        console.log(`Status: ${status}`);
        
        if (status === 'SUCCESS') {
          console.log('✅ Task hoàn thành!');
          const tracks = response.data.data.response?.sunoData || [];
          console.log(`\n🎵 Số bài nhạc: ${tracks.length}`);
          tracks.forEach((track: any, index: number) => {
            console.log(`\nBài ${index + 1}:`);
            console.log(`  - ID: ${track.id}`);
            console.log(`  - Title: ${track.title}`);
            console.log(`  - Duration: ${track.duration}s`);
            console.log(`  - Audio URL: ${track.audioUrl}`);
            console.log(`  - Image URL: ${track.imageUrl}`);
            console.log(`  - Tags: ${track.tags}`);
          });
          return;
        } else if (status === 'FAILED') {
          console.log('❌ Task thất bại!');
          return;
        }
        // Status is GENERATING, PENDING, etc. - continue polling
      }
    } catch (error) {
      console.error('❌ Lỗi khi poll:', error);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  console.log('⏰ Timeout - Task chưa hoàn thành trong thời gian cho phép');
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🎵 SUNO API TEST SCRIPT 🎵');
  console.log('='.repeat(60));
  console.log(`API Base: ${SUNO_API_BASE}`);
  console.log(`Số API keys: ${API_KEYS.length}`);
  
  if (API_KEYS.length === 0) {
    console.error('❌ Không tìm thấy SUNO_API_KEYS trong .env');
    return;
  }

  // Chọn API key đầu tiên để test
  const testApiKey = API_KEYS[0].trim();
  
  // Test 1: Check credits
  await checkCredits(testApiKey);
  
  // Hỏi người dùng muốn test gì
  const args = process.argv.slice(2);
  
  if (args.includes('--full')) {
    console.log('\n🔄 Chạy full test...\n');
    
    // Test 2: Generate simple music
    const taskId1 = await generateSimpleMusic(testApiKey);
    
    if (taskId1) {
      // Test 4: Check status ngay lập tức
      await checkTaskStatus(testApiKey, taskId1);
      
      // Test 5: Wait for completion
      await waitForTaskCompletion(testApiKey, taskId1);
    }
    
    // Test 3: Generate custom music
    const taskId2 = await generateCustomMusic(testApiKey);
    if (taskId2) {
      await checkTaskStatus(testApiKey, taskId2);
    }
  } else if (args.includes('--generate')) {
    // Chỉ test generate
    const taskId = await generateSimpleMusic(testApiKey);
    if (taskId) {
      await checkTaskStatus(testApiKey, taskId);
    }
  } else if (args.includes('--check') && args.length >= 2) {
    // Check status của một task ID cụ thể
    const taskId = args[args.indexOf('--check') + 1];
    await checkTaskStatus(testApiKey, taskId);
  } else if (args.includes('--wait') && args.length >= 2) {
    // Đợi một task ID hoàn thành
    const taskId = args[args.indexOf('--wait') + 1];
    await waitForTaskCompletion(testApiKey, taskId);
  } else {
    // Default: chỉ check credits
    console.log('\n💡 Sử dụng:');
    console.log('  npx ts-node scripts/test-suno-api.ts           # Chỉ check credits');
    console.log('  npx ts-node scripts/test-suno-api.ts --full    # Chạy tất cả tests');
    console.log('  npx ts-node scripts/test-suno-api.ts --generate # Generate và check status');
    console.log('  npx ts-node scripts/test-suno-api.ts --check <taskId> # Check status task cụ thể');
    console.log('  npx ts-node scripts/test-suno-api.ts --wait <taskId>  # Đợi task hoàn thành');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test hoàn thành!');
  console.log('='.repeat(60));
}

// Run the script
main().catch(console.error);
