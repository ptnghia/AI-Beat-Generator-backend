#!/usr/bin/env ts-node

/**
 * Verify beat files existence and quality
 */

import { connectDatabase, disconnectDatabase, getPrismaClient } from '../src/config/database.config';
import * as fs from 'fs';
import * as path from 'path';

async function verifyBeatFiles() {
  try {
    console.log('🔍 Verifying Beat Files...\n');

    await connectDatabase();
    const prisma = getPrismaClient();

    // Get all beats
    const beats = await prisma.beat.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (beats.length === 0) {
      console.log('❌ No beats found in database');
      await disconnectDatabase();
      return;
    }

    console.log(`📊 Found ${beats.length} beat(s) in database\n`);

    const outputDir = process.env.BEAT_OUTPUT_DIR || './output/beats';
    const coversDir = './output/covers';

    // Check directories
    console.log('📁 Directory Status:');
    console.log(`   Output Dir: ${outputDir}`);
    console.log(`   Exists: ${fs.existsSync(outputDir) ? '✅' : '❌'}`);
    console.log(`   Covers Dir: ${coversDir}`);
    console.log(`   Exists: ${fs.existsSync(coversDir) ? '✅' : '❌'}\n`);

    // Verify each beat
    console.log('🎵 Beat Files Verification:\n');

    for (const beat of beats) {
      console.log(`Beat: ${beat.name}`);
      console.log(`ID: ${beat.id}`);
      console.log(`Created: ${beat.createdAt.toLocaleString()}`);

      // Check file URL
      console.log(`\n📄 File Information:`);
      console.log(`   URL: ${beat.fileUrl}`);
      
      // Check if it's a local file or remote URL
      if (beat.fileUrl.startsWith('http')) {
        console.log(`   Type: Remote URL (Suno API)`);
        console.log(`   Status: ⚠️  Mock implementation - file not downloaded`);
        console.log(`   Action Required: Implement file download in MusicService`);
      } else {
        // Local file
        const filePath = beat.fileUrl;
        const exists = fs.existsSync(filePath);
        console.log(`   Type: Local file`);
        console.log(`   Exists: ${exists ? '✅' : '❌'}`);
        
        if (exists) {
          const stats = fs.statSync(filePath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`   Size: ${sizeMB} MB`);
          console.log(`   Format: ${path.extname(filePath)}`);
        }
      }

      // Check for cover art
      console.log(`\n🎨 Cover Art:`);
      const coverPath = `${coversDir}/${beat.id}.jpg`;
      const coverExists = fs.existsSync(coverPath);
      console.log(`   Expected Path: ${coverPath}`);
      console.log(`   Exists: ${coverExists ? '✅' : '❌'}`);
      
      if (!coverExists) {
        console.log(`   Status: ⚠️  Missing - needs to be generated`);
      }

      // Check metadata completeness
      console.log(`\n📋 Metadata Completeness:`);
      const checks = {
        'Name': beat.name.length > 0,
        'Genre': beat.genre.length > 0,
        'BPM': beat.basePrompt.includes('BPM'),
        'Key': false, // Not implemented yet
        'Tags': Array.isArray(beat.tags) && (beat.tags as any[]).length > 0,
        'Description': beat.description.length > 50,
        'Cover Art': coverExists
      };

      Object.entries(checks).forEach(([key, value]) => {
        const icon = value ? '✅' : '❌';
        console.log(`   ${icon} ${key}`);
      });

      const completeness = Object.values(checks).filter(v => v).length;
      const total = Object.keys(checks).length;
      const percentage = ((completeness / total) * 100).toFixed(1);
      
      console.log(`\n   Completeness: ${completeness}/${total} (${percentage}%)`);

      // BeatStars readiness
      console.log(`\n🎯 BeatStars Readiness:`);
      const beatStarsReady = checks['Name'] && 
                            checks['Genre'] && 
                            checks['BPM'] && 
                            checks['Key'] && 
                            checks['Tags'] && 
                            checks['Description'] && 
                            checks['Cover Art'];
      
      if (beatStarsReady) {
        console.log(`   Status: ✅ Ready for upload`);
      } else {
        console.log(`   Status: ⚠️  Not ready - missing critical elements`);
        console.log(`   Missing:`);
        if (!checks['Key']) console.log(`      - Key information (CRITICAL)`);
        if (!checks['Cover Art']) console.log(`      - Cover art (CRITICAL)`);
        if (!checks['Name']) console.log(`      - Professional name`);
        if (!checks['Tags']) console.log(`      - Optimized tags`);
      }

      console.log('\n' + '─'.repeat(70) + '\n');
    }

    // Summary
    console.log('📈 SUMMARY\n');
    console.log(`Total Beats: ${beats.length}`);
    console.log(`Output Directory: ${fs.existsSync(outputDir) ? '✅ Exists' : '❌ Missing'}`);
    console.log(`Covers Directory: ${fs.existsSync(coversDir) ? '✅ Exists' : '❌ Missing'}`);
    
    const mockImplementation = beats.every(b => b.fileUrl.startsWith('http'));
    if (mockImplementation) {
      console.log(`\n⚠️  WARNING: All beats using mock implementation`);
      console.log(`   Action Required: Implement real Suno API integration`);
      console.log(`   Files need to be downloaded and saved locally`);
    }

    console.log(`\n🎯 Next Steps:`);
    console.log(`   1. Implement file download in MusicService`);
    console.log(`   2. Generate cover art for all beats`);
    console.log(`   3. Add key detection/assignment`);
    console.log(`   4. Optimize titles and tags`);
    console.log(`   5. Create SEO-optimized descriptions`);

    await disconnectDatabase();

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyBeatFiles();
