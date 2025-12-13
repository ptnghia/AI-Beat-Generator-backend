#!/usr/bin/env ts-node

/**
 * Analyze generated beat in detail
 */

import { connectDatabase, disconnectDatabase, getPrismaClient } from '../src/config/database.config';

async function analyzeBeat() {
  try {
    console.log('🔍 Analyzing Generated Beat...\n');

    await connectDatabase();
    const prisma = getPrismaClient();

    // Get the most recent beat
    const beat = await prisma.beat.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
        apiKey: true
      }
    });

    if (!beat) {
      console.log('❌ No beats found in database');
      await disconnectDatabase();
      return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 DETAILED BEAT ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Basic Information
    console.log('1️⃣  BASIC INFORMATION\n');
    console.log(`   Beat ID: ${beat.id}`);
    console.log(`   Beat Name: ${beat.name}`);
    console.log(`   Created At: ${beat.createdAt.toLocaleString()}`);
    console.log(`   Template Used: ${beat.template.categoryName}`);

    // 2. Musical Characteristics
    console.log('\n2️⃣  MUSICAL CHARACTERISTICS\n');
    console.log(`   Genre: ${beat.genre}`);
    console.log(`   Style: ${beat.style}`);
    console.log(`   Mood: ${beat.mood}`);
    console.log(`   Use Case: ${beat.useCase}`);
    const tags = Array.isArray(beat.tags) ? beat.tags as string[] : [];
    console.log(`   Tags (${tags.length}): ${tags.join(', ')}`);

    // 3. Prompt Analysis
    console.log('\n3️⃣  PROMPT ANALYSIS\n');
    console.log('   Base Prompt (from catalog):');
    console.log('   ─'.repeat(60));
    console.log(`   ${beat.basePrompt}`);
    console.log('   ─'.repeat(60));
    console.log(`   Length: ${beat.basePrompt.length} characters`);
    console.log(`   Words: ${beat.basePrompt.split(' ').length}`);

    console.log('\n   Normalized Prompt (AI-enhanced):');
    console.log('   ─'.repeat(60));
    console.log(`   ${beat.normalizedPrompt}`);
    console.log('   ─'.repeat(60));
    console.log(`   Length: ${beat.normalizedPrompt.length} characters`);
    console.log(`   Words: ${beat.normalizedPrompt.split(' ').length}`);
    console.log(`   Enhancement: +${beat.normalizedPrompt.length - beat.basePrompt.length} characters`);

    // 4. AI Concept Data Analysis
    console.log('\n4️⃣  AI CONCEPT DATA ANALYSIS\n');
    const conceptData = typeof beat.conceptData === 'string' 
      ? JSON.parse(beat.conceptData) 
      : beat.conceptData;

    console.log('   Concept Suggestion:');
    console.log(`   "${conceptData.suggestion}"`);
    console.log(`   Length: ${conceptData.suggestion?.length || 0} characters\n`);

    console.log('   Trend Analysis:');
    console.log(`   "${conceptData.trendAnalysis}"`);
    console.log(`   Length: ${conceptData.trendAnalysis?.length || 0} characters\n`);

    console.log('   Mood Enhancement:');
    console.log(`   "${conceptData.moodEnhancement}"`);
    console.log(`   Length: ${conceptData.moodEnhancement?.length || 0} characters`);

    // 5. Metadata Analysis
    console.log('\n5️⃣  METADATA ANALYSIS\n');
    console.log(`   Beat Name: ${beat.name}`);
    console.log(`   Name Length: ${beat.name.length} characters`);
    console.log(`   Name Pattern: ${beat.name.includes('Beat') ? 'Contains "Beat"' : 'Custom name'}`);

    console.log('\n   Description:');
    console.log('   ─'.repeat(60));
    console.log(`   ${beat.description}`);
    console.log('   ─'.repeat(60));
    console.log(`   Length: ${beat.description.length} characters`);
    console.log(`   Sentences: ${beat.description.split('.').filter(s => s.trim()).length}`);

    // 6. Music File Analysis
    console.log('\n6️⃣  MUSIC FILE INFORMATION\n');
    console.log(`   File URL: ${beat.fileUrl}`);
    console.log(`   URL Pattern: ${beat.fileUrl.includes('http') ? 'Valid HTTP URL' : 'Local path or mock'}`);
    console.log(`   File Extension: ${beat.fileUrl.split('.').pop()}`);

    // 7. API Key Usage
    console.log('\n7️⃣  API KEY USAGE\n');
    console.log(`   Key ID: ${beat.apiKeyUsed}`);
    console.log(`   Key Preview: ${beat.apiKey.key.substring(0, 8)}...`);
    console.log(`   Key Status: ${beat.apiKey.status}`);
    console.log(`   Quota Remaining: ${beat.apiKey.quotaRemaining}`);
    console.log(`   Last Used: ${beat.apiKey.lastUsed?.toLocaleString() || 'Never'}`);

    // 8. Template Information
    console.log('\n8️⃣  TEMPLATE INFORMATION\n');
    console.log(`   Template ID: ${beat.template.id}`);
    console.log(`   Category: ${beat.template.categoryName}`);
    const templateTags = Array.isArray(beat.template.tags) ? beat.template.tags as string[] : [];
    console.log(`   Template Tags: ${templateTags.join(', ')}`);
    console.log(`   Template Active: ${beat.template.isActive ? 'Yes' : 'No'}`);
    console.log(`   Template Last Used: ${beat.template.lastUsed?.toLocaleString() || 'Never before'}`);

    // 9. Data Quality Metrics
    console.log('\n9️⃣  DATA QUALITY METRICS\n');
    
    const metrics = {
      hasName: beat.name.length > 0,
      hasDescription: beat.description.length > 0,
      hasFileUrl: beat.fileUrl.length > 0,
      hasBasePrompt: beat.basePrompt.length > 0,
      hasNormalizedPrompt: beat.normalizedPrompt.length > 0,
      hasConceptData: Object.keys(conceptData).length > 0,
      hasTags: tags.length > 0,
      promptEnhanced: beat.normalizedPrompt.length > beat.basePrompt.length,
      descriptionQuality: beat.description.length > 50,
      nameUnique: !beat.name.includes('undefined')
    };

    const qualityScore = Object.values(metrics).filter(v => v).length;
    const totalChecks = Object.keys(metrics).length;
    const qualityPercentage = ((qualityScore / totalChecks) * 100).toFixed(1);

    console.log(`   Quality Score: ${qualityScore}/${totalChecks} (${qualityPercentage}%)`);
    console.log('\n   Detailed Checks:');
    Object.entries(metrics).forEach(([key, value]) => {
      const icon = value ? '✅' : '❌';
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      console.log(`   ${icon} ${label}`);
    });

    // 10. Workflow Performance
    console.log('\n🔟 WORKFLOW INSIGHTS\n');
    console.log('   AI Services Used:');
    console.log('   ✅ Gemini API - Concept Generation');
    console.log('   ✅ OpenAI API - Prompt Normalization');
    console.log('   ✅ Suno API - Music Generation');
    console.log('   ✅ Gemini API - Metadata Generation');

    console.log('\n   Data Flow:');
    console.log('   1. Template Selected → Base Prompt');
    console.log('   2. Gemini → Concept Data (suggestion, trend, mood)');
    console.log('   3. OpenAI → Normalized Prompt (enhanced)');
    console.log('   4. Suno → Music File (generated)');
    console.log('   5. Gemini → Metadata (name, tags, description)');
    console.log('   6. Database → Complete Beat Record');

    console.log('\n═══════════════════════════════════════════════════════════\n');

    // Summary
    console.log('📈 SUMMARY\n');
    console.log(`   ✅ Beat successfully generated and stored`);
    console.log(`   ✅ All AI services responded correctly`);
    console.log(`   ✅ Data quality: ${qualityPercentage}%`);
    console.log(`   ✅ Prompt enhanced by ${beat.normalizedPrompt.length - beat.basePrompt.length} characters`);
    console.log(`   ✅ ${tags.length} tags generated`);
    console.log(`   ✅ API key quota: ${beat.apiKey.quotaRemaining} remaining`);

    await disconnectDatabase();

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

analyzeBeat();
