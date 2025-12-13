import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Set test timeout
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Setup code that runs once before all tests
});

// Global test teardown
afterAll(async () => {
  // Cleanup code that runs once after all tests
});
