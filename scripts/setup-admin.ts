/**
 * Setup Initial Admin User
 * Run this script once to create the first admin user
 */

import { adminAuthService } from '../src/services/admin-auth.service';
import { loggingService } from '../src/services/logging.service';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function setupAdmin() {
  console.log('🔐 Admin User Setup\n');
  console.log('This script will create an initial admin user for the system.');
  console.log('You can create more admins later through the admin panel.\n');

  try {
    // Get admin details
    const username = await question('Enter username: ');
    if (!username || username.length < 3) {
      console.error('❌ Username must be at least 3 characters');
      process.exit(1);
    }

    const email = await question('Enter email: ');
    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      process.exit(1);
    }

    const password = await question('Enter password (min 8 characters): ');
    if (!password || password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    const confirmPassword = await question('Confirm password: ');
    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match');
      process.exit(1);
    }

    const roleInput = await question('Enter role (admin/super_admin) [admin]: ');
    const role = roleInput.toLowerCase() === 'super_admin' ? 'super_admin' : 'admin';

    console.log('\n⏳ Creating admin user...\n');

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

    console.log('\n🔑 You can now login with these credentials:');
    console.log(`  POST http://localhost:3000/api/admin/login`);
    console.log(`  Body: { "username": "${username}", "password": "<your-password>" }`);

    loggingService.info('Initial admin user created', {
      service: 'SetupAdmin',
      username: adminUser.username,
      role: adminUser.role
    });

  } catch (error) {
    console.error('\n❌ Error creating admin user:', (error as Error).message);
    loggingService.logError('SetupAdmin', error as Error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
setupAdmin()
  .then(() => {
    console.log('\n✨ Setup complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
