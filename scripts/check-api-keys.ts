import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '../src/config/database.config';
import { ApiKeyManager } from '../src/services/apikey-manager.service';

dotenv.config();

async function checkApiKeys() {
  try {
    console.log('🔍 Checking API Keys Status...\n');

    // Connect to database
    await connectDatabase();

    // Initialize API Key Manager
    const apiKeyManager = new ApiKeyManager();

    // Get all keys
    const allKeys = await apiKeyManager.getAllKeysStatus();

    if (allKeys.length === 0) {
      console.log('⚠️  No API keys found in database');
      console.log('💡 Run "npm run import:keys" to import keys from .env\n');
      await disconnectDatabase();
      return;
    }

    console.log(`📋 Total API Keys: ${allKeys.length}\n`);

    // Display each key
    allKeys.forEach((key, index) => {
      const statusIcon = key.status === 'active' ? '🟢' : key.status === 'exhausted' ? '🔴' : '🟡';
      const lastUsed = key.lastUsed ? new Date(key.lastUsed).toLocaleString() : 'Never';
      
      console.log(`${statusIcon} Key ${index + 1}:`);
      console.log(`   ID: ${key.id}`);
      console.log(`   Key: ${key.key.substring(0, 12)}...${key.key.substring(key.key.length - 4)}`);
      console.log(`   Status: ${key.status}`);
      console.log(`   Quota Remaining: ${key.quotaRemaining}`);
      console.log(`   Last Used: ${lastUsed}`);
      console.log(`   Created: ${new Date(key.createdAt).toLocaleString()}`);
      console.log('');
    });

    // Get statistics
    const stats = await apiKeyManager.getKeyStatistics();
    console.log('📈 Statistics:');
    console.log(`   Total Keys: ${stats.total}`);
    console.log(`   🟢 Active: ${stats.active}`);
    console.log(`   🔴 Exhausted: ${stats.exhausted}`);
    console.log(`   🟡 Error: ${stats.error}`);
    console.log(`   💰 Total Quota Remaining: ${stats.totalQuotaRemaining}`);

    // Check if any active keys available
    const hasActive = await apiKeyManager.hasActiveKeys();
    console.log(`\n${hasActive ? '✅' : '❌'} Active keys available: ${hasActive ? 'Yes' : 'No'}`);

    if (!hasActive) {
      console.log('⚠️  Warning: No active API keys with quota remaining!');
      console.log('💡 You may need to refresh quotas or add new keys.');
    }

    // Disconnect
    await disconnectDatabase();
    console.log('\n✅ Check completed!');

  } catch (error) {
    console.error('❌ Check failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run check
checkApiKeys();
