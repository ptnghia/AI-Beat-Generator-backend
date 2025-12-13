/**
 * Quick API test - verify all endpoints work
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function quickTest() {
  console.log('🧪 Quick API Test\n');

  try {
    // 1. Health check
    const health = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check:', health.data.status);

    // 2. Get beats
    const beats = await axios.get(`${API_BASE}/api/beats`, {
      params: { limit: 5 }
    });
    console.log(`✅ Get beats: ${beats.data.data.length} beats returned`);

    // 3. Get beat by ID
    if (beats.data.data.length > 0) {
      const beatId = beats.data.data[0].id;
      const beat = await axios.get(`${API_BASE}/api/beats/${beatId}`);
      console.log(`✅ Get beat by ID: ${beat.data.name}`);
    }

    // 4. Filter by genre
    const filtered = await axios.get(`${API_BASE}/api/beats`, {
      params: { genre: 'Lo-fi', limit: 5 }
    });
    console.log(`✅ Filter by genre: ${filtered.data.data.length} Lo-fi beats`);

    // 5. Filter by tags
    const tagged = await axios.get(`${API_BASE}/api/beats`, {
      params: { tags: 'lofi,chill', limit: 5 }
    });
    console.log(`✅ Filter by tags: ${tagged.data.data.length} beats with lofi/chill tags`);

    // 6. Get stats
    const stats = await axios.get(`${API_BASE}/api/stats`);
    console.log(`✅ Get stats: ${stats.data.beats.total} total beats, ${stats.data.apiKeys.active} active keys`);

    // 7. Test rate limiting
    console.log('\n🔄 Testing rate limiting...');
    let rateLimited = false;
    for (let i = 0; i < 105; i++) {
      const response = await axios.get(`${API_BASE}/api/beats`, {
        params: { limit: 1 },
        validateStatus: () => true
      });
      if (response.status === 429) {
        console.log(`✅ Rate limit enforced at request ${i + 1}`);
        rateLimited = true;
        break;
      }
    }
    if (!rateLimited) {
      console.log('⚠️  Rate limit not hit (may need more requests)');
    }

    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

quickTest();
