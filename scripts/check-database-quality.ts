/**
 * Check Database Quality Script
 * Kiểm tra chất lượng dữ liệu beat trong database
 */

import 'dotenv/config';
import { getPrismaClient } from '../src/config/database.config';

async function checkDatabaseQuality() {
  const prisma = getPrismaClient();
  
  console.log('\n📊 DATABASE QUALITY CHECK');
  console.log('='.repeat(70));
  
  try {
    // Lấy beat mới nhất
    const latestBeats = await prisma.beat.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        template: true
      }
    });
    
    if (latestBeats.length === 0) {
      console.log('⚠️  No beats found in database');
      return;
    }
    
    console.log(`\n✅ Found ${latestBeats.length} recent beats\n`);
    
    for (const beat of latestBeats) {
      console.log('─'.repeat(70));
      console.log(`\n🎵 Beat: ${beat.name}`);
      console.log(`   ID: ${beat.id}`);
      console.log(`   Created: ${beat.createdAt.toLocaleString()}`);
      
      // Basic Info
      console.log(`\n📋 Basic Info:`);
      console.log(`   Genre: ${beat.genre}`);
      console.log(`   Style: ${beat.style}`);
      console.log(`   Mood: ${beat.mood}`);
      console.log(`   Use Case: ${beat.useCase}`);
      
      // Metadata Quality
      console.log(`\n🎼 Metadata:`);
      console.log(`   BPM: ${beat.bpm || 'NOT SET ❌'}`);
      console.log(`   Musical Key: ${beat.musicalKey || 'NOT SET ❌'}`);
      
      // Tags Quality
      const tags = beat.tags as string[];
      console.log(`\n🏷️  Tags (${tags.length}/15):`);
      if (tags.length === 0) {
        console.log('   ❌ NO TAGS!');
      } else if (tags.length < 5) {
        console.log(`   ⚠️  Only ${tags.length} tags (recommend 10-15)`);
        console.log(`   ${tags.join(', ')}`);
      } else {
        console.log(`   ✅ ${tags.length} tags`);
        console.log(`   Primary: ${tags.slice(0, 5).join(', ')}`);
        if (tags.length > 5) {
          console.log(`   Secondary: ${tags.slice(5, 10).join(', ')}`);
        }
      }
      
      // Description Quality
      console.log(`\n📄 Description (${beat.description.length} chars):`);
      if (beat.description.length < 50) {
        console.log('   ⚠️  Description too short!');
      } else if (beat.description.length > 500) {
        console.log('   ⚠️  Description might be too long for BeatStars');
      } else {
        console.log('   ✅ Good length');
      }
      console.log(`   Preview: ${beat.description.substring(0, 100)}...`);
      
      // BPM/Key in description check
      const hasBPM = beat.description.includes('BPM') || beat.description.includes('bpm');
      const hasKey = beat.description.includes('Key') || beat.description.includes('key');
      console.log(`   Contains BPM: ${hasBPM ? '✅' : '⚠️'}`);
      console.log(`   Contains Key: ${hasKey ? '✅' : '⚠️'}`);
      
      // Files
      console.log(`\n📁 Files:`);
      console.log(`   Audio: ${beat.fileUrl ? '✅' : '❌'} ${beat.fileUrl || ''}`);
      console.log(`   Preview: ${beat.previewPath ? '✅' : '❌'} ${beat.previewPath || ''}`);
      console.log(`   Cover: ${beat.coverArtPath ? '✅' : '❌'} ${beat.coverArtPath || ''}`);
      console.log(`   Alternate: ${beat.alternateFileUrl ? '✅' : '❌'}`);
      
      // Prompts
      console.log(`\n🤖 AI Prompts:`);
      console.log(`   Base Prompt (${beat.basePrompt.length} chars):`);
      console.log(`   ${beat.basePrompt.substring(0, 80)}...`);
      console.log(`\n   Normalized Prompt (${beat.normalizedPrompt.length} chars):`);
      console.log(`   ${beat.normalizedPrompt.substring(0, 80)}...`);
      
      // Check if it follows Suno format
      const sunoFormat = beat.normalizedPrompt.toLowerCase();
      const hasInstrumentalOnly = sunoFormat.includes('instrumental only') || sunoFormat.includes('no vocals');
      const hasBPMInPrompt = /\d+\s*bpm/.test(sunoFormat);
      const hasKeyInPrompt = /(major|minor)/i.test(beat.normalizedPrompt);
      
      console.log(`\n   Suno Format Check:`);
      console.log(`   - "instrumental only, no vocals": ${hasInstrumentalOnly ? '✅' : '❌'}`);
      console.log(`   - BPM specified: ${hasBPMInPrompt ? '✅' : '❌'}`);
      console.log(`   - Key specified: ${hasKeyInPrompt ? '✅' : '❌'}`);
      
      // Concept Data
      if (beat.conceptData) {
        const concept = beat.conceptData as any;
        console.log(`\n💡 Concept Data:`);
        if (concept.suggestion) {
          console.log(`   Suggestion: ${concept.suggestion.substring(0, 80)}...`);
        }
        if (concept.trendAnalysis) {
          console.log(`   Trends: ${concept.trendAnalysis.substring(0, 80)}...`);
        }
      }
      
      // Quality Score
      let score = 0;
      let maxScore = 10;
      
      if (beat.bpm) score++;
      if (beat.musicalKey) score++;
      if (tags.length >= 10) score += 2;
      else if (tags.length >= 5) score += 1;
      if (beat.description.length >= 50 && beat.description.length <= 500) score++;
      if (hasBPM && hasKey) score++;
      if (beat.previewPath) score++;
      if (beat.coverArtPath) score++;
      if (hasInstrumentalOnly && hasBPMInPrompt && hasKeyInPrompt) score += 2;
      
      console.log(`\n⭐ Quality Score: ${score}/${maxScore}`);
      if (score >= 9) console.log('   🏆 EXCELLENT - Ready for BeatStars!');
      else if (score >= 7) console.log('   ✅ GOOD - Minor improvements needed');
      else if (score >= 5) console.log('   ⚠️  FAIR - Needs improvement');
      else console.log('   ❌ POOR - Major issues');
    }
    
    // Statistics
    console.log('\n\n' + '='.repeat(70));
    console.log('📊 OVERALL STATISTICS\n');
    
    const totalBeats = await prisma.beat.count();
    const beatsWithBPM = await prisma.beat.count({ where: { bpm: { not: null } } });
    const beatsWithKey = await prisma.beat.count({ where: { musicalKey: { not: null } } });
    const beatsWithPreview = await prisma.beat.count({ where: { previewPath: { not: null } } });
    const beatsWithCover = await prisma.beat.count({ where: { coverArtPath: { not: null } } });
    
    console.log(`Total Beats: ${totalBeats}`);
    console.log(`With BPM: ${beatsWithBPM} (${((beatsWithBPM/totalBeats)*100).toFixed(1)}%)`);
    console.log(`With Key: ${beatsWithKey} (${((beatsWithKey/totalBeats)*100).toFixed(1)}%)`);
    console.log(`With Preview: ${beatsWithPreview} (${((beatsWithPreview/totalBeats)*100).toFixed(1)}%)`);
    console.log(`With Cover: ${beatsWithCover} (${((beatsWithCover/totalBeats)*100).toFixed(1)}%)`);
    
    console.log('\n' + '='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseQuality()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
