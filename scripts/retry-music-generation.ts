#!/usr/bin/env ts-node
/**
 * Generate music for beats that have database records but no MP3 files
 * Use case: When GENERATION_SUNO=false was used or generation failed
 */

import { getPrismaClient } from '../src/config/database.config';
import { MusicService } from '../src/services/music.service';
import { ApiKeyManager } from '../src/services/apikey-manager.service';
import { loggingService } from '../src/services/logging.service';

const prisma = getPrismaClient();
const musicService = new MusicService();
const apiKeyManager = new ApiKeyManager();

async function retryMusicGeneration() {
  console.log('='.repeat(70));
  console.log('🎵 RETRY MUSIC GENERATION FOR INCOMPLETE BEATS 🎵');
  console.log('='.repeat(70));

  try {
    // Find beats without file URL (pending generation)
    const incompleteBeats = await prisma.beat.findMany({
      where: {
        OR: [
          { fileUrl: '' },
          { generationStatus: 'pending' as any }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (incompleteBeats.length === 0) {
      console.log('\n✅ No incomplete beats found. All beats have music files!\n');
      return;
    }

    console.log(`\n📝 Found ${incompleteBeats.length} beats without music files:\n`);

    for (const beat of incompleteBeats) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Beat: ${beat.name}`);
      console.log(`ID: ${beat.id}`);
      console.log(`Genre: ${beat.genre} | Style: ${beat.style}`);
      console.log(`Created: ${beat.createdAt}`);
      console.log(`Status: ${(beat as any).generationStatus}`);

      try {
        // Get API key
        const apiKey = await apiKeyManager.selectKey();
        
        console.log(`\n📤 Generating music with prompt...`);
        console.log(`Prompt: ${beat.normalizedPrompt.substring(0, 100)}...`);

        // Generate music
        if (!apiKey) {
          throw new Error('No API key available');
        }
        const result = await musicService.generateMusic(
          beat.normalizedPrompt,
          apiKey.key,
          beat.name
        );

        console.log(`\n✅ Music generated!`);
        console.log(`  Task ID: ${result.jobId}`);
        console.log(`  Audio ID: ${result.audioId}`);

        // Download files
        let localFilePath = result.fileUrl;
        let alternateLocalFilePath: string | undefined;

        if (result.fileUrl && result.fileUrl.startsWith('http')) {
          console.log(`\n📥 Downloading primary track...`);
          localFilePath = await musicService.downloadAndSaveFile(result.fileUrl, result.jobId);
          console.log(`  Saved: ${localFilePath}`);
        }

        if (result.alternateFileUrl && result.alternateFileUrl.startsWith('http')) {
          console.log(`\n📥 Downloading alternate track...`);
          alternateLocalFilePath = await musicService.downloadAndSaveFile(
            result.alternateFileUrl,
            `${result.jobId}_alt`
          );
          console.log(`  Saved: ${alternateLocalFilePath}`);
        }

        // Update beat record
        await prisma.beat.update({
          where: { id: beat.id },
          data: {
            fileUrl: localFilePath,
            sunoTaskId: result.jobId,
            sunoAudioId: result.audioId,
            alternateFileUrl: alternateLocalFilePath as any,
            alternateAudioId: result.alternateAudioId as any,
            generationStatus: 'completed' as any
          }
        });

        console.log(`\n✅ Beat updated successfully!`);

        // Mark API key as used
        if (apiKey) {
          await apiKeyManager.markKeyUsed(apiKey.id);
        }

      } catch (error) {
        console.error(`\n❌ Failed to generate music for ${beat.name}:`);
        console.error(error instanceof Error ? error.message : String(error));

        // Mark as failed
        await prisma.beat.update({
          where: { id: beat.id },
          data: { generationStatus: 'failed' as any }
        });
      }

      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('✨ RETRY GENERATION COMPLETED! ✨');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Error during retry generation:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

retryMusicGeneration();
