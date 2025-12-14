/**
 * PRODUCTION READINESS TEST
 * Test toàn bộ quy trình tạo beat thực tế
 * Sử dụng API keys thực, không mock
 */

import { OrchestratorService } from '../src/services/orchestrator.service';
import { loggingService } from '../src/services/logging.service';
import { beatRepository } from '../src/repositories/beat.repository';
import { getPrismaClient } from '../src/config/database.config';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const prisma = getPrismaClient();

interface TestResult {
  step: string;
  status: 'success' | 'failed' | 'warning';
  message: string;
  data?: any;
  duration?: number;
}

class ProductionReadinessTest {
  private results: TestResult[] = [];
  private orchestrator: OrchestratorService;
  private startTime: number = 0;

  constructor() {
    this.orchestrator = new OrchestratorService();
  }

  /**
   * Log kết quả test
   */
  private logResult(result: TestResult) {
    this.results.push(result);
    const icon = result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
    console.log(`${icon} ${result.step}: ${result.message}`);
    if (result.data) {
      console.log(`   Data:`, JSON.stringify(result.data, null, 2));
    }
    if (result.duration) {
      console.log(`   Duration: ${result.duration}ms`);
    }
    console.log('');
  }

  /**
   * Step 1: Kiểm tra cấu hình môi trường
   */
  async checkEnvironment(): Promise<boolean> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 STEP 1: Kiểm Tra Cấu Hình Môi Trường');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check SUNO_API_KEYS
    const sunoKeys = process.env.SUNO_API_KEYS;
    if (!sunoKeys) {
      this.logResult({
        step: 'Suno API Key',
        status: 'failed',
        message: 'SUNO_API_KEYS không tồn tại trong .env'
      });
      return false;
    }

    const keyCount = sunoKeys.split(',').length;
    this.logResult({
      step: 'Suno API Key',
      status: 'success',
      message: `Tìm thấy ${keyCount} API key(s)`,
      data: { keys: sunoKeys.substring(0, 10) + '...' }
    });

    // Check GEMINI_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      this.logResult({
        step: 'Gemini API Key',
        status: 'warning',
        message: 'GEMINI_API_KEY không tồn tại (sẽ dùng template concept)'
      });
    } else {
      this.logResult({
        step: 'Gemini API Key',
        status: 'success',
        message: 'Gemini API Key có sẵn',
        data: { key: geminiKey.substring(0, 15) + '...' }
      });
    }

    // Check GENERATION_SUNO
    const generationEnabled = process.env.GENERATION_SUNO !== 'false';
    if (!generationEnabled) {
      this.logResult({
        step: 'Generation Mode',
        status: 'warning',
        message: 'GENERATION_SUNO=false - Chỉ tạo database record'
      });
    } else {
      this.logResult({
        step: 'Generation Mode',
        status: 'success',
        message: 'GENERATION_SUNO=true - Sẽ gọi Suno API thực'
      });
    }

    // Check USE_MOCK_MUSIC
    const useMock = process.env.USE_MOCK_MUSIC === 'true';
    if (useMock) {
      this.logResult({
        step: 'Mock Mode',
        status: 'warning',
        message: 'USE_MOCK_MUSIC=true - Đang dùng mock data!'
      });
      return false;
    } else {
      this.logResult({
        step: 'Mock Mode',
        status: 'success',
        message: 'USE_MOCK_MUSIC=false - Production mode'
      });
    }

    // Check callback URL
    const callbackUrl = process.env.SUNO_CALLBACK_URL;
    if (callbackUrl) {
      this.logResult({
        step: 'Callback URL',
        status: 'success',
        message: 'Callback URL configured',
        data: { url: callbackUrl }
      });
    } else {
      this.logResult({
        step: 'Callback URL',
        status: 'warning',
        message: 'Callback URL chưa cấu hình (webhook sẽ không hoạt động)'
      });
    }

    return true;
  }

  /**
   * Step 2: Kiểm tra kết nối database
   */
  async checkDatabase(): Promise<boolean> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 STEP 2: Kiểm Tra Database');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      // Check connection
      await prisma.$queryRaw`SELECT 1`;
      this.logResult({
        step: 'Database Connection',
        status: 'success',
        message: 'Kết nối database thành công'
      });

      // Count beats
      const beatCount = await prisma.beat.count();
      this.logResult({
        step: 'Beat Count',
        status: 'success',
        message: `Có ${beatCount} beats trong database`,
        data: { count: beatCount }
      });

      // Count templates
      const templateCount = await prisma.beatTemplate.count();
      this.logResult({
        step: 'Template Count',
        status: 'success',
        message: `Có ${templateCount} templates`,
        data: { count: templateCount }
      });

      if (templateCount === 0) {
        this.logResult({
          step: 'Templates Check',
          status: 'failed',
          message: 'Không có template nào! Cần sync catalog trước'
        });
        return false;
      }

      // Count API keys
      const apiKeyCount = await prisma.apiKey.count({ where: { status: 'active' } });
      this.logResult({
        step: 'API Key Count',
        status: apiKeyCount > 0 ? 'success' : 'failed',
        message: `Có ${apiKeyCount} API keys active`,
        data: { count: apiKeyCount }
      });

      return apiKeyCount > 0;

    } catch (error) {
      this.logResult({
        step: 'Database Connection',
        status: 'failed',
        message: `Lỗi kết nối database: ${error instanceof Error ? error.message : String(error)}`
      });
      return false;
    }
  }

  /**
   * Step 3: Kiểm tra file system
   */
  async checkFileSystem(): Promise<boolean> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 STEP 3: Kiểm Tra File System');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const dirs = [
      'output/beats',
      'output/beats-wav',
      'output/covers',
      'logs'
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logResult({
          step: `Directory: ${dir}`,
          status: 'success',
          message: `Tạo thư mục thành công`
        });
      } else {
        this.logResult({
          step: `Directory: ${dir}`,
          status: 'success',
          message: `Thư mục đã tồn tại`
        });
      }
    }

    // Check disk space
    const beatDir = 'output/beats';
    const files = fs.readdirSync(beatDir, { recursive: true, withFileTypes: true });
    const mp3Files = files.filter(f => f.isFile() && f.name.endsWith('.mp3'));
    
    this.logResult({
      step: 'Beat Files',
      status: 'success',
      message: `Có ${mp3Files.length} file MP3 trong output/beats`,
      data: { count: mp3Files.length }
    });

    return true;
  }

  /**
   * Step 4: Test tạo beat thực tế
   */
  async testBeatGeneration(): Promise<boolean> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 STEP 4: Test Tạo Beat Thực Tế');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      // Get a random template
      const templates = await prisma.beatTemplate.findMany({
        where: { isActive: true },
        take: 5
      });

      if (templates.length === 0) {
        this.logResult({
          step: 'Get Template',
          status: 'failed',
          message: 'Không tìm thấy template active'
        });
        return false;
      }

      const template = templates[Math.floor(Math.random() * templates.length)];
      this.logResult({
        step: 'Get Template',
        status: 'success',
        message: `Chọn template: ${template.categoryName}`,
        data: {
          id: template.id,
          genre: template.genre,
          style: template.style,
          mood: template.mood
        }
      });

      // Start generation
      console.log('⏳ Bắt đầu tạo beat...\n');
      this.startTime = Date.now();

      const beat = await this.orchestrator.generateBeat(template.id);

      const duration = Date.now() - this.startTime;

      this.logResult({
        step: 'Beat Generation',
        status: 'success',
        message: 'Tạo beat thành công!',
        data: {
          beatId: beat.id,
          name: beat.name,
          fileUrl: beat.fileUrl,
          alternateFileUrl: beat.alternateFileUrl,
          bpm: beat.bpm,
          musicalKey: beat.musicalKey,
          duration: beat.duration,
          modelName: beat.modelName,
          sunoTaskId: beat.sunoTaskId
        },
        duration
      });

      // Verify files
      await this.verifyBeatFiles(beat);

      return true;

    } catch (error) {
      this.logResult({
        step: 'Beat Generation',
        status: 'failed',
        message: `Lỗi tạo beat: ${error instanceof Error ? error.message : String(error)}`
      });
      return false;
    }
  }

  /**
   * Verify beat files
   */
  async verifyBeatFiles(beat: any) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 STEP 5: Kiểm Tra Files Đã Tạo');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check MP3 file
    if (beat.fileUrl && fs.existsSync(beat.fileUrl)) {
      const stats = fs.statSync(beat.fileUrl);
      this.logResult({
        step: 'MP3 File (Track 1)',
        status: 'success',
        message: 'File tồn tại',
        data: {
          path: beat.fileUrl,
          size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`
        }
      });
    } else {
      this.logResult({
        step: 'MP3 File (Track 1)',
        status: 'failed',
        message: 'File không tồn tại!'
      });
    }

    // Check alternate MP3
    if (beat.alternateFileUrl && fs.existsSync(beat.alternateFileUrl)) {
      const stats = fs.statSync(beat.alternateFileUrl);
      this.logResult({
        step: 'MP3 File (Track 2)',
        status: 'success',
        message: 'File tồn tại',
        data: {
          path: beat.alternateFileUrl,
          size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`
        }
      });
    } else {
      this.logResult({
        step: 'MP3 File (Track 2)',
        status: 'warning',
        message: 'File không tồn tại (có thể chưa download)'
      });
    }

    // Check cover art
    if (beat.coverArtPath && fs.existsSync(beat.coverArtPath)) {
      const stats = fs.statSync(beat.coverArtPath);
      this.logResult({
        step: 'Cover Art',
        status: 'success',
        message: 'File tồn tại',
        data: {
          path: beat.coverArtPath,
          size: `${(stats.size / 1024).toFixed(2)} KB`
        }
      });
    } else {
      this.logResult({
        step: 'Cover Art',
        status: 'warning',
        message: 'Cover art chưa có (sẽ tạo qua webhook)'
      });
    }
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 KẾT QUẢ KIỂM TRA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const successCount = this.results.filter(r => r.status === 'success').length;
    const failedCount = this.results.filter(r => r.status === 'failed').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;

    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed:  ${failedCount}`);
    console.log(`⚠️  Warning: ${warningCount}`);
    console.log(`📝 Total:   ${this.results.length}\n`);

    if (failedCount === 0) {
      console.log('🎉 HỆ THỐNG SẴN SÀNG CHO PRODUCTION!\n');
    } else {
      console.log('⚠️  CÓ LỖI CẦN SỬA TRƯỚC KHI CHẠY PRODUCTION\n');
      console.log('Failed steps:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  - ${r.step}: ${r.message}`));
      console.log('');
    }
  }

  /**
   * Run all tests
   */
  async run() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║   🎵 PRODUCTION READINESS TEST - BEAT GENERATOR 🎵   ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('\n');

    const envOk = await this.checkEnvironment();
    if (!envOk) {
      console.log('\n❌ Cấu hình môi trường chưa đúng. Dừng test.\n');
      this.printSummary();
      process.exit(1);
    }

    const dbOk = await this.checkDatabase();
    if (!dbOk) {
      console.log('\n❌ Database chưa sẵn sàng. Dừng test.\n');
      this.printSummary();
      process.exit(1);
    }

    await this.checkFileSystem();

    const beatOk = await this.testBeatGeneration();

    this.printSummary();

    if (!beatOk) {
      process.exit(1);
    }

    console.log('✅ Test hoàn tất. Hệ thống sẵn sàng!\n');
    process.exit(0);
  }
}

// Run test
const test = new ProductionReadinessTest();
test.run().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
