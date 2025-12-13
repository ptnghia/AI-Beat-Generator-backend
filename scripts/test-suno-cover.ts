import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
// @ts-ignore
import sizeOf from 'image-size';

dotenv.config();

/**
 * Test Suno Cover Generation API
 * Check if generated images meet BeatStars requirements (3000x3000px)
 */

const SUNO_API_BASE = process.env.SUNO_API_BASE_URL || 'https://api.sunoapi.org';
const SUNO_API_KEY = process.env.SUNO_API_KEY || process.env.SUNO_API_KEYS?.split(',')[0];

async function testSunoCoverGeneration() {
  console.log('='.repeat(70));
  console.log('🎨 TEST SUNO COVER GENERATION API 🎨');
  console.log('='.repeat(70));

  try {
    // Step 1: Find a recent beat with sunoTaskId
    console.log('\n📝 Finding a beat with Suno task ID...\n');
    
    const { beatRepository } = await import('../src/repositories/beat.repository');
    const result = await beatRepository.queryBeats({ limit: 10, page: 1 });
    const beats = result.data;
    
    const beat = beats.find((b: any) => b.sunoTaskId);
    
    if (!beat) {
      console.error('❌ No beats with Suno task ID found.');
      console.log('Generate a beat first using: npx ts-node scripts/test-orchestrator.ts');
      process.exit(1);
    }

    console.log('✅ Found beat:');
    console.log('  Beat ID:', beat.id);
    console.log('  Name:', beat.name);
    console.log('  Suno Task ID:', beat.sunoTaskId);

    // Step 2: Submit cover generation
    console.log('\n📤 Submitting cover generation request...\n');

    const submitResponse = await axios.post(
      `${SUNO_API_BASE}/api/v1/suno/cover/generate`,
      {
        taskId: beat.sunoTaskId,
        callBackUrl: 'https://webhook.site/test-cover'
      },
      {
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let coverTaskId: string;

    if (submitResponse.data.code === 400) {
      console.log('ℹ️  Cover already generated for this beat, fetching existing...');
      // Try to get existing taskId from error response
      if (submitResponse.data.data?.taskId) {
        coverTaskId = submitResponse.data.data.taskId;
      } else {
        // Skip this beat, try to generate new cover
        console.log('⚠️  Cannot get existing cover taskId. Trying new generation...');
        throw new Error('Cover already exists, cannot retrieve taskId');
      }
    } else if (submitResponse.data.code !== 200) {
      throw new Error(`API error: ${submitResponse.data.msg}`);
    } else {
      coverTaskId = submitResponse.data.data.taskId;
    }
    console.log('✅ Cover task submitted:');
    console.log('  Cover Task ID:', coverTaskId);

    // Step 3: Poll for completion
    console.log('\n⏳ Waiting for cover generation (30-60 seconds)...\n');

    let attempts = 0;
    const maxAttempts = 20; // 10 minutes
    const pollInterval = 30000; // 30 seconds

    let coverImages: string[] = [];

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;

      const statusResponse = await axios.get(
        `${SUNO_API_BASE}/api/v1/suno/cover/record-info`,
        {
          headers: {
            'Authorization': `Bearer ${SUNO_API_KEY}`
          },
          params: {
            taskId: coverTaskId
          }
        }
      );

      const data = statusResponse.data.data;
      console.log(`  Attempt ${attempts}/${maxAttempts}: ${data.successFlag === 1 ? 'SUCCESS' : 'PROCESSING'}`);

      if (data.successFlag === 1 && data.response?.images) {
        coverImages = data.response.images;
        console.log('\n✅ Cover generation completed!');
        console.log(`  Generated ${coverImages.length} images`);
        break;
      }

      if (data.successFlag === 0 && data.errorMessage) {
        throw new Error(`Cover generation failed: ${data.errorMessage}`);
      }
    }

    if (coverImages.length === 0) {
      throw new Error('Timeout waiting for cover generation');
    }

    // Step 4: Download and check dimensions
    console.log('\n📥 Downloading and checking image dimensions...\n');

    const testDir = './output/test-covers';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const results = [];

    for (let i = 0; i < coverImages.length; i++) {
      const imageUrl = coverImages[i];
      const fileName = `cover_${i + 1}.png`;
      const filePath = path.join(testDir, fileName);

      console.log(`📸 Image ${i + 1}:`);
      console.log(`  URL: ${imageUrl}`);

      // Download image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      fs.writeFileSync(filePath, response.data);

      // Check dimensions
      const dimensions = sizeOf(Buffer.from(response.data));
      const fileSizeMB = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);

      console.log(`  Dimensions: ${dimensions.width}x${dimensions.height}px`);
      console.log(`  Format: ${dimensions.type}`);
      console.log(`  File Size: ${fileSizeMB} MB`);
      console.log(`  Saved to: ${filePath}`);

      // Check BeatStars requirements
      const meetsRequirements = 
        dimensions.width === 3000 && 
        dimensions.height === 3000 &&
        (dimensions.type === 'png' || dimensions.type === 'jpg');

      console.log(`  Meets BeatStars (3000x3000)? ${meetsRequirements ? '✅ YES' : '❌ NO'}`);

      results.push({
        index: i + 1,
        url: imageUrl,
        width: dimensions.width,
        height: dimensions.height,
        format: dimensions.type,
        sizeMB: fileSizeMB,
        meetsRequirements
      });

      console.log();
    }

    // Summary
    console.log('='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));

    const allMeetRequirements = results.every(r => r.meetsRequirements);

    console.log(`\n✨ Generated ${results.length} cover images`);
    console.log(`\n📐 Image Details:`);
    
    results.forEach(r => {
      console.log(`  Image ${r.index}: ${r.width}x${r.height}px (${r.format?.toUpperCase() || 'UNKNOWN'}) - ${r.sizeMB} MB`);
    });

    console.log(`\n🎯 BeatStars Compatibility:`);
    console.log(`  Required: 3000x3000px (PNG/JPG)`);
    console.log(`  Result: ${allMeetRequirements ? '✅ COMPATIBLE' : '❌ NOT COMPATIBLE'}`);

    if (allMeetRequirements) {
      console.log('\n💡 RECOMMENDATION:');
      console.log('  ✅ Suno Cover API meets BeatStars requirements!');
      console.log('  ✅ Can replace current DALL-E implementation');
      console.log('  ✅ Benefits:');
      console.log('     - Same vendor (consistency)');
      console.log('     - Save OpenAI API credits');
      console.log('     - Generated 2 options for selection');
    } else {
      console.log('\n💡 RECOMMENDATION:');
      console.log('  ❌ Suno Cover API does NOT meet requirements');
      console.log('  ❌ Keep current DALL-E implementation (3000x3000px)');
      console.log('  ℹ️  Current size: ' + results.map(r => `${r.width}x${r.height}`).join(', '));
    }

    console.log('\n' + '='.repeat(70));

    process.exit(allMeetRequirements ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Error during test:');
    console.error(error);
    
    if (axios.isAxiosError(error)) {
      console.error('\nAPI Response:');
      console.error(JSON.stringify(error.response?.data, null, 2));
    }
    
    process.exit(1);
  }
}

testSunoCoverGeneration();
