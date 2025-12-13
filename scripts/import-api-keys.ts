import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '../src/config/database.config';
import { ApiKeyManager } from '../src/services/apikey-manager.service';
import { loggingService } from '../src/services/logging.service';

dotenv.config();

async function importApiKeys() {
  try {
    console.log('🔑 Starting API Keys Import...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Get Suno API keys from environment
    const sunoKeysString = process.env.SUNO_API_KEYS || '';
    const sunoKeys = sunoKeysString
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (sunoKeys.length === 0) {
      console.log('⚠️  No Suno API keys found in .env file');
      await disconnectDatabase();
      return;
    }

    console.log(`📋 Found ${sunoKeys.length} Suno API keys in .env\n`);

    // Initialize API Key Manager
    const apiKeyManager = new ApiKeyManager();

    // Get existing keys
    const existingKeys = await apiKeyManager.getAllKeysStatus();
    const existingKeyStrings = new Set(existingKeys.map(k => k.key));

    let addedCount = 0;
    let skippedCount = 0;

    // Import each key
    for (let i = 0; i < sunoKeys.length; i++) {
      const key = sunoKeys[i];
      
      if (existingKeyStrings.has(key)) {
        console.log(`⏭️  Key ${i + 1}/${sunoKeys.length}: Already exists (${key.substring(0, 8)}...)`);
        skippedCount++;
        continue;
      }

      try {
        // Add key with default quota (you can adjust this)
        const defaultQuota = 500; // Default quota per key
        await apiKeyManager.addKey(key, defaultQuota);
        console.log(`✅ Key ${i + 1}/${sunoKeys.length}: Added successfully (${key.substring(0, 8)}...) - Quota: ${defaultQuota}`);
        addedCount++;
      } catch (error) {
        console.error(`❌ Key ${i + 1}/${sunoKeys.length}: Failed to add (${key.substring(0, 8)}...)`, error);
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Added: ${addedCount}`);
    console.log(`   ⏭️  Skipped (already exists): ${skippedCount}`);
    console.log(`   📝 Total keys in database: ${existingKeys.length + addedCount}`);

    // Display current key status
    console.log('\n🔍 Current API Keys Status:');
    const allKeys = await apiKeyManager.getAllKeysStatus();
    allKeys.forEach((key, index) => {
      const statusIcon = key.status === 'active' ? '🟢' : key.status === 'exhausted' ? '🔴' : '🟡';
      console.log(`   ${statusIcon} Key ${index + 1}: ${key.key.substring(0, 8)}... - Status: ${key.status} - Quota: ${key.quotaRemaining}`);
    });

    // Get statistics
    const stats = await apiKeyManager.getKeyStatistics();
    console.log('\n📈 Statistics:');
    console.log(`   Total Keys: ${stats.total}`);
    console.log(`   Active: ${stats.active}`);
    console.log(`   Exhausted: ${stats.exhausted}`);
    console.log(`   Error: ${stats.error}`);
    console.log(`   Total Quota Remaining: ${stats.totalQuotaRemaining}`);

    // Disconnect
    await disconnectDatabase();
    console.log('\n✅ Import completed successfully!');

  } catch (error) {
    console.error('❌ Import failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run import
importApiKeys();
