import { wavConversionService } from '../src/services/wav-conversion.service';
import { beatRepository } from '../src/repositories/beat.repository';
import { loggingService } from '../src/services/logging.service';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Test WAV Conversion Service
 * 
 * This script tests the on-demand WAV conversion workflow:
 * 1. Get a beat with MP3 file
 * 2. Request WAV conversion
 * 3. Poll for completion
 * 4. Download WAV file
 */

async function main() {
  console.log('='.repeat(60));
  console.log('🎵 TEST WAV CONVERSION SERVICE 🎵');
  console.log('='.repeat(60));

  try {
    // Get a beat that has Suno task/audio IDs
    console.log('\n📝 Finding a beat for WAV conversion...\n');

    const result = await beatRepository.queryBeats({ limit: 10 });
    const beats = Array.isArray(result) ? result : result.data || [];
    
    if (beats.length === 0) {
      console.error('❌ No beats found. Generate a beat first using test-orchestrator.ts');
      process.exit(1);
    }

    // Find beat with Suno IDs and no WAV yet
    const beat = beats.find((b: any) => 
      b.sunoTaskId && 
      b.sunoAudioId && 
      b.wavConversionStatus !== 'completed'
    );

    if (!beat) {
      console.error('❌ No beats available for conversion.');
      console.log('Either all beats already have WAV, or no beats have Suno IDs.');
      console.log('\nBeats status:');
      beats.forEach((b: any) => {
        console.log(`  - ${b.name}: taskId=${!!b.sunoTaskId}, audioId=${!!b.sunoAudioId}, wav=${b.wavConversionStatus}`);
      });
      process.exit(1);
    }

    console.log('✅ Found beat for conversion:');
    console.log('  Beat ID:', beat.id);
    console.log('  Name:', beat.name);
    console.log('  MP3 Path:', beat.fileUrl);
    console.log('  Suno Task ID:', beat.sunoTaskId);
    console.log('  Suno Audio ID:', beat.sunoAudioId);
    console.log('  WAV Status:', beat.wavConversionStatus || 'not_started');

    // Submit conversion
    console.log('\n📤 Submitting WAV conversion request...\n');
    
    const wavTaskId = await wavConversionService.submitConversion(
      beat.sunoTaskId!,
      beat.sunoAudioId!
    );

    console.log('✅ WAV conversion submitted:');
    console.log('  WAV Task ID:', wavTaskId);

    // Update beat status
    await beatRepository.updateBeat(beat.id, {
      wavTaskId,
      wavConversionStatus: 'processing'
    });

    console.log('\n⏳ Polling for completion (this may take 2-5 minutes)...\n');

    // Poll for completion
    const maxAttempts = 60; // 10 minutes max
    const pollInterval = 10000; // 10 seconds
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;

      const status = await wavConversionService.checkConversionStatus(wavTaskId);

      console.log(`  Attempt ${attempts}/${maxAttempts}: ${status.status}`);

      if (status.status === 'SUCCESS' && status.wavUrl) {
        console.log('\n✅ WAV conversion completed!');
        console.log('  Remote WAV URL:', status.wavUrl);

        // Download file
        console.log('\n📥 Downloading WAV file...\n');
        
        const localPath = await wavConversionService.downloadWavFile(
          status.wavUrl,
          beat.id
        );

        const relativePath = wavConversionService.getRelativePath(localPath);

        // Update beat record
        await beatRepository.updateBeat(beat.id, {
          wavUrl: relativePath,
          wavConversionStatus: 'completed'
        });

        console.log('✅ WAV file saved:');
        console.log('  Local Path:', localPath);
        console.log('  Relative Path:', relativePath);

        console.log('\n' + '='.repeat(60));
        console.log('✨ WAV Conversion Test PASSED! ✨');
        console.log('='.repeat(60));

        console.log('\n📊 Summary:');
        console.log('  Beat:', beat.name);
        console.log('  MP3:', beat.fileUrl);
        console.log('  WAV:', relativePath);
        console.log('  Conversion Time:', (attempts * pollInterval / 1000).toFixed(0), 'seconds');

        process.exit(0);
      }

      if (status.status === 'FAILED') {
        console.error('\n❌ WAV conversion failed on Suno side');
        
        await beatRepository.updateBeat(beat.id, {
          wavConversionStatus: 'failed'
        });
        
        process.exit(1);
      }
    }

    console.error('\n❌ Timeout waiting for WAV conversion');
    console.error('  Waited:', (maxAttempts * pollInterval / 1000 / 60).toFixed(1), 'minutes');
    process.exit(1);

  } catch (error) {
    console.error('\n❌ Error during WAV conversion test:');
    console.error(error);
    
    if (error instanceof Error) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

main();
