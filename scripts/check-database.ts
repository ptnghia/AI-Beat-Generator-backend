#!/usr/bin/env ts-node

import { connectDatabase, disconnectDatabase, getPrismaClient } from '../src/config/database.config';

async function checkDatabase() {
  try {
    console.log('🔍 Checking database status...\n');

    await connectDatabase();
    const prisma = getPrismaClient();

    // Check API Keys
    const apiKeys = await prisma.apiKey.findMany();
    console.log('📊 API Keys:');
    console.log(`   Total: ${apiKeys.length}`);
    apiKeys.forEach((key, index) => {
      const statusIcon = key.status === 'active' ? '🟢' : key.status === 'exhausted' ? '🔴' : '🟡';
      console.log(`   ${statusIcon} ${index + 1}. ${key.key.substring(0, 8)}... - Status: ${key.status} - Quota: ${key.quotaRemaining}`);
    });

    // Check Beat Templates
    const templates = await prisma.beatTemplate.findMany({
      where: { isActive: true }
    });
    console.log('\n🎵 Beat Templates:');
    console.log(`   Total Active: ${templates.length}`);
    if (templates.length > 0) {
      templates.slice(0, 5).forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.categoryName} (${template.genre} - ${template.style} - ${template.mood})`);
      });
      if (templates.length > 5) {
        console.log(`   ... and ${templates.length - 5} more`);
      }
    }

    // Check Beats
    const beats = await prisma.beat.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('\n🎼 Generated Beats:');
    console.log(`   Total: ${await prisma.beat.count()}`);
    if (beats.length > 0) {
      beats.forEach((beat, index) => {
        console.log(`   ${index + 1}. ${beat.name} (${beat.genre} - ${beat.style})`);
        console.log(`      Created: ${beat.createdAt.toLocaleString()}`);
      });
    } else {
      console.log('   No beats generated yet');
    }

    // Check Prompts
    const prompts = await prisma.promptRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    console.log('\n📝 Prompt Records:');
    console.log(`   Total: ${await prisma.promptRecord.count()}`);
    if (prompts.length > 0) {
      prompts.forEach((prompt, index) => {
        console.log(`   ${index + 1}. Version ${prompt.version} - Result: ${prompt.executionResult}`);
      });
    } else {
      console.log('   No prompts recorded yet');
    }

    await disconnectDatabase();
    console.log('\n✅ Database check completed!');

  } catch (error) {
    console.error('❌ Database check failed:', error);
    process.exit(1);
  }
}

checkDatabase();
