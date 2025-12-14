/**
 * Reset API Keys
 * Xóa tất cả API keys và import lại từ .env
 */

import { getPrismaClient } from '../src/config/database.config';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = getPrismaClient();

async function resetApiKeys() {
  console.log('🔄 Resetting API keys...\n');

  try {
    // 1. Check existing beats
    const beatCount = await prisma.beat.count();
    console.log(`📊 Current beats in database: ${beatCount}\n`);

    if (beatCount > 0) {
      console.log('⚠️  Warning: Cannot delete API keys with existing beats');
      console.log('   Option 1: Delete all beats first');
      console.log('   Option 2: Keep current key and update quota\n');
      
      const currentKeys = await prisma.apiKey.findMany();
      if (currentKeys.length > 0) {
        console.log('📝 Updating existing API key instead...\n');
        
        // Update first key
        const updated = await prisma.apiKey.update({
          where: { id: currentKeys[0].id },
          data: {
            key: process.env.SUNO_API_KEYS?.split(',')[0].trim() || currentKeys[0].key,
            status: 'active',
            quotaRemaining: 500,
            lastUsed: null,
          },
        });
        
        console.log(`✅ Updated key: ${updated.key.substring(0, 10)}... (ID: ${updated.id})`);
        
        // Delete other keys if any
        if (currentKeys.length > 1) {
          for (let i = 1; i < currentKeys.length; i++) {
            try {
              await prisma.apiKey.delete({ where: { id: currentKeys[i].id } });
              console.log(`✅ Deleted extra key: ${currentKeys[i].key.substring(0, 10)}...`);
            } catch (err) {
              console.log(`⚠️  Could not delete key ${currentKeys[i].key.substring(0, 10)}... (may have beats)`);
            }
          }
        }
        
        console.log('\n✅ API key updated successfully!\n');
      }
    } else {
      // No beats, safe to delete all keys
      console.log('📝 Deleting all existing API keys...');
      const deleted = await prisma.apiKey.deleteMany({});
      console.log(`✅ Deleted ${deleted.count} API key(s)\n`);

      // Import from .env
      const sunoKeys = process.env.SUNO_API_KEYS;
      
      if (!sunoKeys) {
        console.error('❌ SUNO_API_KEYS not found in .env');
        process.exit(1);
      }

      const keys = sunoKeys.split(',').map(k => k.trim()).filter(k => k);
      
      if (keys.length === 0) {
        console.error('❌ No valid API keys found');
        process.exit(1);
      }

      console.log(`📝 Found ${keys.length} API key(s) in .env`);
      console.log(`   Key: ${keys[0].substring(0, 10)}...\n`);

      // Import keys
      console.log('📝 Importing API keys...');
      
      for (const key of keys) {
        const apiKey = await prisma.apiKey.create({
          data: {
            key: key,
            status: 'active',
            quotaRemaining: 500,
            lastUsed: null,
          },
        });

        console.log(`✅ Imported: ${apiKey.key.substring(0, 10)}... (ID: ${apiKey.id})`);
      }
      
      console.log('\n✅ API keys reset successfully!\n');
    }

    // Verify
    const count = await prisma.apiKey.count({ where: { status: 'active' } });
    console.log(`📊 Total active keys: ${count}\n`);

    const allKeys = await prisma.apiKey.findMany({
      select: {
        id: true,
        key: true,
        status: true,
        quotaRemaining: true,
        lastUsed: true,
        createdAt: true,
      },
    });

    console.log('📋 Current API keys in database:');
    console.table(
      allKeys.map(k => ({
        ID: k.id.substring(0, 8) + '...',
        Key: k.key.substring(0, 10) + '...',
        Status: k.status,
        Quota: k.quotaRemaining,
        LastUsed: k.lastUsed ? k.lastUsed.toISOString().split('T')[0] : 'Never',
        Created: k.createdAt.toISOString().split('T')[0],
      }))
    );

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetApiKeys();
