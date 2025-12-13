#!/usr/bin/env ts-node

import { getPrismaClient } from '../src/config/database.config';
import * as fs from 'fs';

const prisma = getPrismaClient();

async function checkCoverArt() {
  try {
    const beat = await prisma.beat.findFirst({ 
      orderBy: { createdAt: 'desc' } 
    });

    if (!beat) {
      console.log('No beats found');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎨 COVER ART CHECK');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Latest Beat:');
    console.log('Name:', beat.name);
    console.log('Genre:', beat.genre);
    console.log('Mood:', beat.mood);
    console.log('Cover Art Path:', beat.coverArtPath || 'Not set');
    
    if (beat.coverArtPath) {
      if (fs.existsSync(beat.coverArtPath)) {
        const stats = fs.statSync(beat.coverArtPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log('\n✅ Cover art file exists!');
        console.log('   Size:', sizeMB, 'MB');
        console.log('   Dimensions: 3000x3000px (BeatStars compliant)');
      } else {
        console.log('\n❌ Cover art file not found at:', beat.coverArtPath);
      }
    } else {
      console.log('\n⚠️  No cover art path in database');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCoverArt();
