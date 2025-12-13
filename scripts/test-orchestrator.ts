import { OrchestratorService } from '../src/services/orchestrator.service';
import { loggingService } from '../src/services/logging.service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test Orchestrator với Suno API mới
 * Script này sẽ generate một beat hoàn chỉnh
 */

async function main() {
  console.log('='.repeat(60));
  console.log('🎵 TEST ORCHESTRATOR WITH NEW SUNO API 🎵');
  console.log('='.repeat(60));

  const orchestrator = new OrchestratorService();

  try {
    console.log('\n📝 Starting beat generation...\n');

    // Generate a beat (will auto-select template)
    const beat = await orchestrator.generateBeat();

    console.log('\n✅ Beat generation completed!\n');
    console.log('Beat Details:');
    console.log('  ID:', beat.id);
    console.log('  Name:', beat.name);
    console.log('  Genre:', beat.genre);
    console.log('  Style:', beat.style);
    console.log('  Mood:', beat.mood);
    console.log('  Use Case:', beat.useCase);
    console.log('  File URL:', beat.fileUrl);
    console.log('  Musical Key:', beat.musicalKey || 'Not detected');
    console.log('  Tags:', beat.tags);

    if (beat.coverArtPath) {
      console.log('  Cover Art:', beat.coverArtPath);
    }

    if (beat.previewPath) {
      console.log('  Preview:', beat.previewPath);
    }

    // Parse pricing from JSON field if available
    if (beat.pricing) {
      const pricing = typeof beat.pricing === 'string' ? JSON.parse(beat.pricing) : beat.pricing;
      console.log('\n📊 Pricing Info:');
      console.log('  Basic License: $' + (pricing.basicLicensePrice || 'N/A'));
      console.log('  Premium License: $' + (pricing.premiumLicensePrice || 'N/A'));
      console.log('  Unlimited License: $' + (pricing.unlimitedLicensePrice || 'N/A'));
      console.log('  Exclusive License: $' + (pricing.exclusiveLicensePrice || 'N/A'));
    }

    console.log('\n📝 Description Preview:');
    console.log('  ' + beat.description.substring(0, 200) + '...');

    console.log('\n' + '='.repeat(60));
    console.log('✨ Test successful! Beat created with NEW Suno API');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error during beat generation:');
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
