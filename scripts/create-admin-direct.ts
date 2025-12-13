/**
 * Create Admin User Directly
 * Quick script to create admin user without interactive prompts
 */

import { adminAuthService } from '../src/services/admin-auth.service';

async function createAdmin() {
  try {
    console.log('🔐 Creating admin user...\n');

    const username = 'admin';
    const email = 'admin@test.com';
    const password = 'O!0omj-kJ6yP';
    const role = 'admin';

    // Create admin user
    const adminUser = await adminAuthService.createAdmin(
      username,
      email,
      password,
      role
    );

    console.log('✅ Admin user created successfully!\n');
    console.log('Admin Details:');
    console.log(`  ID: ${adminUser.id}`);
    console.log(`  Username: ${adminUser.username}`);
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Role: ${adminUser.role}`);
    console.log(`  Created: ${adminUser.createdAt.toISOString()}`);

    console.log('\n🔑 Login credentials:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log(`\n  Login URL: http://localhost:3001/admin/login`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.message.includes('already exists')) {
      console.log('\n💡 Admin user already exists. You can use the existing credentials to login.');
    }
    process.exit(1);
  }
}

createAdmin();
