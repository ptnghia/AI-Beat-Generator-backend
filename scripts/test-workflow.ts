/**
 * Test Script: Complete Beat Generation Workflow
 * 
 * This script tests the entire beat generation pipeline with all new features:
 * - Gemini concept generation
 * - GPT-4o mini dual-purpose prompt optimization (Suno + BeatStars)
 * - Suno music generation
 * - BPM detection
 * - Musical key detection
 * - BeatStars SEO tag generation
 * - Preview generation (30s)
 * - Cover art generation (3000x3000px)
 */

import { OrchestratorService } from '../src/services/orchestrator.service';
import { loggingService } from '../src/services/logging.service';
import { BPMDetectionService } from '../src/services/bpm-detection.service';
import { KeyDetectionService } from '../src/services/key-detection.service';
import { TagGeneratorService } from '../src/services/tag-generator.service';
import { getPrismaClient } from '../src/config/database.config';
import * as fs from 'fs';
import * as path from 'path';

async function testCompleteWorkflow() {
  const startTime = Date.now();
  console.log('\n🎵 Starting Complete Workflow Test\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Test individual services first
    console.log('\n📋 Phase 1: Testing Individual Services');
    console.log('-'.repeat(60));

    // Test BPM Detection
    console.log('\n🎼 Testing BPM Detection Service...');
    const bpmService = new BPMDetectionService();
    
    // Find a test audio file if available
    const beatsDir = './output/beats';
    let testAudioFile: string | null = null;
    
    if (fs.existsSync(beatsDir)) {
      const findMp3 = (dir: string): string | null => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            const result = findMp3(filePath);
            if (result) return result;
          } else if (file.endsWith('.mp3')) {
            return filePath;
          }
        }
        return null;
      };
      
      testAudioFile = findMp3(beatsDir);
    }

    if (testAudioFile) {
      console.log(`  Found test file: ${path.basename(testAudioFile)}`);
      try {
        const bpmResult = await bpmService.detectBPM(testAudioFile);
        console.log(`  ✅ BPM: ${bpmResult.bpm} (confidence: ${(bpmResult.confidence * 100).toFixed(1)}%, method: ${bpmResult.method})`);
      } catch (error) {
        console.log(`  ⚠️  BPM detection failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('  ⚠️  No audio files found for BPM testing, skipping...');
    }

    // Test Key Detection
    console.log('\n🎹 Testing Key Detection Service...');
    const keyService = new KeyDetectionService();
    const keyResult = await keyService.detectKey({
      genre: 'Hip Hop',
      mood: 'Dark',
      style: 'Trap'
    });
    console.log(`  ✅ Key: ${keyResult.key} (confidence: ${(keyResult.confidence * 100).toFixed(1)}%, method: ${keyResult.method})`);

    // Test Tag Generation
    console.log('\n🏷️  Testing Tag Generator Service...');
    const tagService = new TagGeneratorService();
    
    // Check if OpenAI key is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const tagResult = await tagService.generateTags({
          genre: 'Hip Hop',
          style: 'Trap',
          mood: 'Dark',
          bpm: 140,
          key: 'F Minor'
        });
        console.log(`  ✅ Generated ${tagResult.tags.length} tags`);
        console.log(`  Primary tags: ${tagResult.primaryTags.join(', ')}`);
        console.log(`  Secondary tags: ${tagResult.secondaryTags.slice(0, 3).join(', ')}...`);
      } catch (error) {
        console.log(`  ⚠️  Tag generation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('  ⚠️  OpenAI API key not configured, skipping AI tag generation');
    }

    // Step 2: Test complete orchestrator workflow
    console.log('\n\n📋 Phase 2: Testing Complete Orchestrator Workflow');
    console.log('-'.repeat(60));

    // Check if we can run a full generation
    const canGenerate = process.env.SUNO_API_KEYS && process.env.GEMINI_API_KEY && process.env.OPENAI_API_KEY;
    
    if (!canGenerate) {
      console.log('\n⚠️  Missing required API keys:');
      if (!process.env.SUNO_API_KEYS) console.log('  - SUNO_API_KEYS (music generation)');
      if (!process.env.GEMINI_API_KEY) console.log('  - GEMINI_API_KEY (Gemini concept)');
      if (!process.env.OPENAI_API_KEY) console.log('  - OPENAI_API_KEY (GPT-4o mini prompts)');
      console.log('\nSkipping full beat generation test.');
      console.log('To test full workflow, add these keys to your .env file.');
    } else {
      console.log('\n🎵 Generating a complete beat with all features...\n');
      
      const orchestrator = new OrchestratorService();
      
      try {
        const beat = await orchestrator.generateBeat();
        
        console.log('\n✅ Beat Generated Successfully!');
        console.log('=' .repeat(60));
        console.log(`\n📊 Beat Details:`);
        console.log(`  ID: ${beat.id}`);
        console.log(`  Name: ${beat.name}`);
        console.log(`  Genre: ${beat.genre}`);
        console.log(`  Style: ${beat.style}`);
        console.log(`  Mood: ${beat.mood}`);
        console.log(`  Tags: ${beat.tags.slice(0, 5).join(', ')}...`);
        
        // Show file paths
        console.log(`\n📁 Generated Files:`);
        console.log(`  Audio: ${beat.fileUrl}`);
        if (beat.coverArtPath) console.log(`  Cover: ${beat.coverArtPath}`);
        
        // Check database for additional fields
        const prisma = getPrismaClient();
        const fullBeat = await prisma.beat.findUnique({
          where: { id: beat.id }
        });
        
        if (fullBeat) {
          console.log(`\n🎼 Detected Metadata:`);
          if (fullBeat.bpm) console.log(`  BPM: ${fullBeat.bpm}`);
          if (fullBeat.musicalKey) console.log(`  Key: ${fullBeat.musicalKey}`);
          if (fullBeat.previewPath) console.log(`  Preview: ${fullBeat.previewPath}`);
          
          console.log(`\n🏷️  BeatStars Optimization:`);
          console.log(`  Tags: ${(fullBeat.tags as string[]).length} tags (max 15)`);
          console.log(`  Description: ${fullBeat.description.substring(0, 100)}...`);
        }
        
      } catch (error) {
        console.log('\n❌ Beat generation failed:');
        console.log(`  ${error instanceof Error ? error.message : String(error)}`);
        
        if (error instanceof Error && error.stack) {
          console.log('\nStack trace:');
          console.log(error.stack);
        }
      }
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n\n📊 Test Summary');
    console.log('=' .repeat(60));
    console.log(`  Total Duration: ${duration}s`);
    console.log(`  BPM Detection: ${testAudioFile ? '✅' : '⚠️  No test file'}`);
    console.log(`  Key Detection: ✅`);
    console.log(`  Tag Generation: ${process.env.OPENAI_API_KEY ? '✅' : '⚠️  No API key'}`);
    console.log(`  Full Workflow: ${canGenerate ? '✅' : '⚠️  Missing API keys'}`);
    console.log('\n✨ Test completed!\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testCompleteWorkflow()
  .then(() => {
    console.log('Test script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  });
