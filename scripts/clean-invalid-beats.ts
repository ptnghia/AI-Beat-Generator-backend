import { getPrismaClient } from '../src/config/database.config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script để xóa beats có fileUrl không hợp lệ
 */

async function cleanInvalidBeats() {
  console.log('🧹 Starting cleanup of invalid beats...\n');

  const prisma = getPrismaClient();

  try {
    // Lấy tất cả beats
    const allBeats = await prisma.beat.findMany({
      select: {
        id: true,
        name: true,
        fileUrl: true,
        createdAt: true
      }
    });

    console.log(`📊 Total beats in database: ${allBeats.length}\n`);

    const invalidBeats: typeof allBeats = [];
    const validBeats: typeof allBeats = [];

    // Kiểm tra từng beat
    for (const beat of allBeats) {
      const fileUrl = beat.fileUrl;

      // Check if it's a mock URL
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        if (fileUrl.includes('example.com')) {
          console.log(`❌ Invalid (Mock URL): ${beat.name}`);
          console.log(`   URL: ${fileUrl}`);
          invalidBeats.push(beat);
          continue;
        }
      }

      // Check if it's a local file path
      if (fileUrl.startsWith('./') || fileUrl.startsWith('/')) {
        // Resolve absolute path
        const absolutePath = path.isAbsolute(fileUrl) 
          ? fileUrl 
          : path.resolve(process.cwd(), fileUrl);

        // Check if file exists
        if (!fs.existsSync(absolutePath)) {
          console.log(`❌ Invalid (File not found): ${beat.name}`);
          console.log(`   Path: ${fileUrl}`);
          invalidBeats.push(beat);
          continue;
        }

        // Check file size
        const stats = fs.statSync(absolutePath);
        if (stats.size === 0) {
          console.log(`❌ Invalid (Empty file): ${beat.name}`);
          console.log(`   Path: ${fileUrl}`);
          invalidBeats.push(beat);
          continue;
        }

        console.log(`✅ Valid: ${beat.name} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        validBeats.push(beat);
      } else {
        console.log(`❓ Unknown format: ${beat.name}`);
        console.log(`   URL: ${fileUrl}`);
        invalidBeats.push(beat);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Valid beats: ${validBeats.length}`);
    console.log(`   ❌ Invalid beats: ${invalidBeats.length}`);

    if (invalidBeats.length > 0) {
      console.log('\n🗑️  Invalid beats to be deleted:');
      invalidBeats.forEach((beat, index) => {
        console.log(`   ${index + 1}. ${beat.name} (ID: ${beat.id.substring(0, 8)}...)`);
      });

      // Ask for confirmation
      console.log('\n⚠️  Do you want to delete these beats? (y/n)');
      
      // For automated execution, set to 'y'
      const shouldDelete = process.env.AUTO_CONFIRM === 'true' || process.argv.includes('--confirm');

      if (shouldDelete) {
        console.log('   Confirmed: Deleting invalid beats...\n');

        // Delete invalid beats
        const deleteResult = await prisma.beat.deleteMany({
          where: {
            id: {
              in: invalidBeats.map(b => b.id)
            }
          }
        });

        console.log(`✅ Deleted ${deleteResult.count} beats`);
      } else {
        console.log('   Skipped: Use --confirm flag to delete automatically');
        console.log('   Example: npx ts-node scripts/clean-invalid-beats.ts --confirm');
      }
    } else {
      console.log('\n✨ All beats are valid! No cleanup needed.');
    }

    await prisma.$disconnect();
    console.log('\n✅ Cleanup completed!');

  } catch (error) {
    console.error('❌ Error during cleanup:');
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run cleanup
cleanInvalidBeats();
