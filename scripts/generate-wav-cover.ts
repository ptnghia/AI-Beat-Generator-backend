#!/usr/bin/env ts-node
/**
 * Generate WAV and Cover for beats that have sunoTaskId
 * Use case: Retroactively add WAV/Cover to existing beats
 */

import { getPrismaClient } from '../src/config/database.config';
import { wavConversionService } from '../src/services/wav-conversion.service';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = getPrismaClient();
const SUNO_API_KEY = process.env.SUNO_API_KEYS?.split(',')[0];
const SUNO_API_BASE = 'https://api.sunoapi.org';

async function generateWavAndCover() {
  console.log('='.repeat(70));
  console.log('🎵 GENERATE WAV & COVER FOR EXISTING BEATS 🎵');
  console.log('='.repeat(70));

  try {
    // Find beats with sunoTaskId but no WAV or cover
    const beats = await prisma.beat.findMany({
      where: {
        sunoTaskId: { not: null },
        sunoAudioId: { not: null },
        OR: [
          { wavUrl: null },
          { coverArtPath: null }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (beats.length === 0) {
      console.log('\n✅ No beats need WAV/Cover generation!\n');
      return;
    }

    console.log(`\n📝 Found ${beats.length} beats that can be enhanced:\n`);

    for (const beat of beats) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Beat: ${beat.name}`);
      console.log(`ID: ${beat.id}`);
      console.log(`Suno Task ID: ${beat.sunoTaskId}`);
      console.log(`Suno Audio ID: ${beat.sunoAudioId}`);
      console.log(`Has WAV: ${beat.wavUrl ? 'Yes' : 'No'}`);
      console.log(`Has Cover: ${beat.coverArtPath ? 'Yes' : 'No'}`);

      // Generate WAV if missing
      if (!beat.wavUrl && beat.sunoAudioId && beat.sunoTaskId) {
        try {
          console.log(`\n📤 Requesting WAV conversion...`);
          
          const wavFilePath = await wavConversionService.convertAndDownload(
            beat.sunoTaskId,
            beat.sunoAudioId,
            beat.id
          );

          console.log(`✅ WAV converted and saved!`);
          console.log(`  Path: ${wavFilePath}`);

          const relativePath = wavConversionService.getRelativePath(wavFilePath);

          await prisma.beat.update({
            where: { id: beat.id },
            data: {
              wavUrl: relativePath,
              wavConversionStatus: 'completed'
            }
          });

        } catch (error) {
          console.error(`❌ WAV conversion failed:`);
          console.error(error instanceof Error ? error.message : String(error));
        }
      }

      // Generate Cover if missing
      if (!beat.coverArtPath && beat.sunoTaskId) {
        try {
          console.log(`\n📤 Requesting cover generation...`);

          const response = await axios.post(
            `${SUNO_API_BASE}/api/v1/suno/cover/generate`,
            {
              taskId: beat.sunoTaskId,
              callBackUrl: process.env.SUNO_CALLBACK_URL || 'https://webhook.site/test'
            },
            {
              headers: {
                'Authorization': `Bearer ${SUNO_API_KEY}`,
                'Content-Type': 'application/json'
              },
              validateStatus: () => true
            }
          );

          if (response.data.code === 200) {
            const coverTaskId = response.data.data.taskId;
            console.log(`✅ Cover generation submitted!`);
            console.log(`  Cover Task ID: ${coverTaskId}`);
            console.log(`  Will be ready in ~30-60 seconds via webhook`);
          } else if (response.data.code === 400) {
            console.log(`ℹ️  Cover already exists for this beat`);
          } else {
            console.error(`❌ Cover generation failed: ${response.data.msg}`);
          }

        } catch (error) {
          console.error(`❌ Cover request failed:`);
          console.error(error instanceof Error ? error.message : String(error));
        }
      }

      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('✨ GENERATION COMPLETED! ✨');
    console.log('='.repeat(70));
    console.log('\nNote: Cover images will be available after webhook callback');
    console.log('Check database after 1-2 minutes for cover updates');

  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

generateWavAndCover();
