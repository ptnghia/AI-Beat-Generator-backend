import { MusicService } from '../src/services/music.service';
import { ApiKeyManager } from '../src/services/apikey-manager.service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Quick test của MusicService với NEW Suno API
 */

async function main() {
  console.log('='.repeat(60));
  console.log('🎵 QUICK TEST: MusicService với NEW SUNO API 🎵');
  console.log('='.repeat(60));

  const musicService = new MusicService();
  const apiKeyManager = new ApiKeyManager();

  try {
    // Get API key
    console.log('\n1️⃣ Getting API key...');
    const apiKey = await apiKeyManager.getNextAvailableKey();
    if (!apiKey) {
      throw new Error('No active API keys available');
    }
    console.log(`✅ API Key: ${apiKey.key.substring(0, 10)}...`);

    // Generate music
    console.log('\n2️⃣ Generating music...');
    const prompt = 'A peaceful piano instrumental with soft melodies';
    const beatName = 'Test Beat ' + Date.now();
    const tags = 'instrumental, piano, peaceful';

    console.log(`   Prompt: ${prompt}`);
    console.log(`   Beat Name: ${beatName}`);
    console.log(`   Tags: ${tags}`);
    console.log('\n⏳ Submitting request to Suno API...');

    const { jobId, fileUrl } = await musicService.generateMusic(
      prompt,
      apiKey.key,
      beatName,
      tags
    );

    console.log(`\n✅ Music generated successfully!`);
    console.log(`   Task ID: ${jobId}`);
    console.log(`   File URL: ${fileUrl}`);

    // Download file (optional)
    if (fileUrl.startsWith('http')) {
      console.log('\n3️⃣ Downloading audio file...');
      const localPath = await musicService.downloadAndSaveFile(fileUrl, jobId);
      console.log(`✅ File saved to: ${localPath}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ SUCCESS! Music service working với NEW Suno API');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error);
    
    if (error instanceof Error) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
