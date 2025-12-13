import axios from 'axios';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
// @ts-ignore
import sizeOf from 'image-size';

dotenv.config();

const API_KEY = process.env.SUNO_API_KEYS?.split(',')[0];
const TASK_ID = 'beb02ed61afd6d170a6c4b0ca017bf71'; // Latest beat sunoTaskId

async function quickTest() {
  console.log('Testing Suno Cover API with taskId:', TASK_ID, '\n');

  try {
    // Try to generate cover (even if it exists, we get the taskId back)
    const response = await axios.post(
      'https://api.sunoapi.org/api/v1/suno/cover/generate',
      {
        taskId: TASK_ID,
        callBackUrl: 'https://webhook.site/test'
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Accept any status
      }
    );

    console.log('API Response:', JSON.stringify(response.data, null, 2));

    if (response.data.code === 400 && response.data.data?.taskId) {
      console.log('\n✅ Cover already exists, using existing taskId');
      const coverTaskId = response.data.data.taskId;
      
      // Get cover details
      const detailsResponse = await axios.get(
        'https://api.sunoapi.org/api/v1/suno/cover/record-info',
        {
          headers: { 'Authorization': `Bearer ${API_KEY}` },
          params: { taskId: coverTaskId }
        }
      );

      console.log('\nCover Details:', JSON.stringify(detailsResponse.data, null, 2));

      if (detailsResponse.data.data.response?.images) {
        const images = detailsResponse.data.data.response.images;
        console.log(`\n📸 Found ${images.length} images\n`);

        // Download and check first image
        const imageUrl = images[0];
        console.log('Downloading:', imageUrl);

        const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const dimensions = sizeOf(Buffer.from(imgResponse.data));

        console.log(`\n✅ Dimensions: ${dimensions.width}x${dimensions.height}px`);
        console.log(`Format: ${dimensions.type}`);
        console.log(`\nBeatStars requirement: 3000x3000px`);
        console.log(`Match: ${dimensions.width === 3000 && dimensions.height === 3000 ? '✅ YES' : '❌ NO'}`);

        // Save for inspection
        fs.writeFileSync('./test-cover.png', imgResponse.data);
        console.log('\nSaved to: ./test-cover.png');
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

quickTest();
