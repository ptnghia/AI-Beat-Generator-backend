import fc from 'fast-check';
import { getPrismaClient } from '../../src/config/database.config';

describe('Parameterized Query Property Tests', () => {
  const prisma = getPrismaClient();

  // Generator for potentially malicious SQL injection strings
  const sqlInjectionArb = fc.oneof(
    fc.constant("'; DROP TABLE beats; --"),
    fc.constant("' OR '1'='1"),
    fc.constant("admin'--"),
    fc.constant("' UNION SELECT * FROM api_keys--"),
    fc.constant("1' AND '1'='1"),
    fc.constant("'; DELETE FROM beat_templates WHERE '1'='1"),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}'; DROP TABLE beats; --`)
  );

  // Generator for normal strings that might contain SQL-like characters
  const stringWithSpecialCharsArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => 
    s.includes("'") || s.includes('"') || s.includes(';') || s.includes('--') || s.includes('/*')
  );

  beforeEach(async () => {
    // Clean up test data
    await prisma.beatTemplate.deleteMany({
      where: {
        id: {
          startsWith: 'test-param-'
        }
      }
    });
    await prisma.apiKey.deleteMany({
      where: {
        key: {
          startsWith: 'test-param-'
        }
      }
    });
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.beatTemplate.deleteMany({
      where: {
        id: {
          startsWith: 'test-param-'
        }
      }
    });
    await prisma.apiKey.deleteMany({
      where: {
        key: {
          startsWith: 'test-param-'
        }
      }
    });
  });

  /**
   * Feature: automated-beat-generation, Property 25: Parameterized Query Usage
   * Validates: Requirements 8.4
   * 
   * For any database query with user input, the query should use parameterized 
   * statements (no string concatenation of user data into SQL).
   * This test verifies that SQL injection attempts are safely handled.
   */
  it('Property 25: Parameterized Query Usage - should safely handle SQL injection attempts in WHERE clauses', async () => {
    await fc.assert(
      fc.asyncProperty(
        sqlInjectionArb,
        async (maliciousInput) => {
          // Create a test template first
          const testTemplate = await prisma.beatTemplate.create({
            data: {
              id: `test-param-${Date.now()}`,
              categoryName: `test-param-category-${Date.now()}`,
              genre: 'Lo-fi',
              style: 'Test',
              mood: 'Chill',
              useCase: 'Test',
              tags: ['test'],
              basePrompt: 'Test prompt',
              isActive: true,
              xmlChecksum: 'abc123'
            }
          });

          // Try to query with malicious input - should not cause SQL injection
          // Prisma automatically parameterizes this query
          const result = await prisma.beatTemplate.findMany({
            where: {
              genre: maliciousInput // This should be safely parameterized
            }
          });

          // The malicious input should be treated as a literal string
          // It should not execute any SQL commands
          // Result should be empty (no genre matches the malicious string)
          expect(Array.isArray(result)).toBe(true);

          // Verify our test template still exists (wasn't dropped by injection)
          const templateStillExists = await prisma.beatTemplate.findUnique({
            where: { id: testTemplate.id }
          });
          expect(templateStillExists).toBeDefined();

          // Verify beats table still exists (wasn't dropped)
          const beatsTableExists = await prisma.beat.findMany({ take: 1 });
          expect(Array.isArray(beatsTableExists)).toBe(true);

          // Cleanup
          await prisma.beatTemplate.delete({
            where: { id: testTemplate.id }
          });
        }
      ),
      { numRuns: 20 } // Test with multiple SQL injection patterns
    );
  }, 60000);

  /**
   * Property 25b: Parameterized Query Usage - INSERT operations
   * Verifies that INSERT operations safely handle special characters
   */
  it('Property 25b: Parameterized Query Usage - should safely handle special characters in INSERT', async () => {
    await fc.assert(
      fc.asyncProperty(
        stringWithSpecialCharsArb,
        async (inputWithSpecialChars) => {
          const testId = `test-param-insert-${Date.now()}`;
          const testCategory = `test-param-cat-${Date.now()}`;

          // Insert data with special characters - should be safely escaped
          const created = await prisma.beatTemplate.create({
            data: {
              id: testId,
              categoryName: testCategory,
              genre: 'Lo-fi',
              style: inputWithSpecialChars, // Contains special chars
              mood: 'Chill',
              useCase: 'Test',
              tags: ['test'],
              basePrompt: inputWithSpecialChars, // Contains special chars
              isActive: true,
              xmlChecksum: 'abc123'
            }
          });

          // Verify data was inserted correctly
          expect(created.style).toBe(inputWithSpecialChars);
          expect(created.basePrompt).toBe(inputWithSpecialChars);

          // Retrieve and verify
          const retrieved = await prisma.beatTemplate.findUnique({
            where: { id: testId }
          });

          expect(retrieved).toBeDefined();
          expect(retrieved?.style).toBe(inputWithSpecialChars);
          expect(retrieved?.basePrompt).toBe(inputWithSpecialChars);

          // Cleanup
          await prisma.beatTemplate.delete({
            where: { id: testId }
          });
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Property 25c: Parameterized Query Usage - UPDATE operations
   * Verifies that UPDATE operations safely handle SQL injection attempts
   */
  it('Property 25c: Parameterized Query Usage - should safely handle SQL injection in UPDATE', async () => {
    await fc.assert(
      fc.asyncProperty(
        sqlInjectionArb,
        async (maliciousInput) => {
          const testId = `test-param-update-${Date.now()}`;
          const testCategory = `test-param-cat-${Date.now()}`;

          // Create initial record
          await prisma.beatTemplate.create({
            data: {
              id: testId,
              categoryName: testCategory,
              genre: 'Lo-fi',
              style: 'Original',
              mood: 'Chill',
              useCase: 'Test',
              tags: ['test'],
              basePrompt: 'Original prompt',
              isActive: true,
              xmlChecksum: 'abc123'
            }
          });

          // Update with malicious input - should be safely parameterized
          const updated = await prisma.beatTemplate.update({
            where: { id: testId },
            data: {
              style: maliciousInput // Should be treated as literal string
            }
          });

          // Verify update worked and malicious input was treated as data
          expect(updated.style).toBe(maliciousInput);

          // Verify database integrity - other records should be unaffected
          const allTemplates = await prisma.beatTemplate.findMany();
          expect(Array.isArray(allTemplates)).toBe(true);

          // Cleanup
          await prisma.beatTemplate.delete({
            where: { id: testId }
          });
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Property 25d: Parameterized Query Usage - Complex WHERE conditions
   * Verifies that complex queries with multiple conditions are safe
   */
  it('Property 25d: Parameterized Query Usage - should safely handle complex WHERE conditions', async () => {
    await fc.assert(
      fc.asyncProperty(
        sqlInjectionArb,
        sqlInjectionArb,
        async (maliciousGenre, maliciousMood) => {
          // Create test template
          const testId = `test-param-complex-${Date.now()}`;
          const testCategory = `test-param-cat-${Date.now()}`;

          await prisma.beatTemplate.create({
            data: {
              id: testId,
              categoryName: testCategory,
              genre: 'Lo-fi',
              style: 'Test',
              mood: 'Chill',
              useCase: 'Test',
              tags: ['test'],
              basePrompt: 'Test prompt',
              isActive: true,
              xmlChecksum: 'abc123'
            }
          });

          // Query with multiple malicious conditions
          const result = await prisma.beatTemplate.findMany({
            where: {
              AND: [
                { genre: maliciousGenre },
                { mood: maliciousMood },
                { isActive: true }
              ]
            }
          });

          // Should return empty result (no matches) but not cause SQL injection
          expect(Array.isArray(result)).toBe(true);

          // Verify our test template still exists
          const templateExists = await prisma.beatTemplate.findUnique({
            where: { id: testId }
          });
          expect(templateExists).toBeDefined();

          // Cleanup
          await prisma.beatTemplate.delete({
            where: { id: testId }
          });
        }
      ),
      { numRuns: 15 }
    );
  }, 60000);

  /**
   * Property 25e: Parameterized Query Usage - JSON field queries
   * Verifies that queries on JSON fields are safe
   */
  it('Property 25e: Parameterized Query Usage - should safely handle JSON field queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(sqlInjectionArb, { minLength: 1, maxLength: 3 }),
        async (maliciousTags) => {
          const testId = `test-param-json-${Date.now()}`;
          const testCategory = `test-param-cat-${Date.now()}`;

          // Create template with malicious strings in JSON field
          const created = await prisma.beatTemplate.create({
            data: {
              id: testId,
              categoryName: testCategory,
              genre: 'Lo-fi',
              style: 'Test',
              mood: 'Chill',
              useCase: 'Test',
              tags: maliciousTags, // JSON field with malicious content
              basePrompt: 'Test prompt',
              isActive: true,
              xmlChecksum: 'abc123'
            }
          });

          // Verify JSON data was stored correctly
          expect(Array.isArray(created.tags)).toBe(true);
          expect(created.tags).toEqual(maliciousTags);

          // Retrieve and verify
          const retrieved = await prisma.beatTemplate.findUnique({
            where: { id: testId }
          });

          expect(retrieved).toBeDefined();
          expect(retrieved?.tags).toEqual(maliciousTags);

          // Cleanup
          await prisma.beatTemplate.delete({
            where: { id: testId }
          });
        }
      ),
      { numRuns: 15 }
    );
  }, 60000);
});
