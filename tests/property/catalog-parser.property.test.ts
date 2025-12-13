import fc from 'fast-check';
import { CatalogParser } from '../../src/parsers/catalog-parser';
import * as fs from 'fs';
import * as path from 'path';

describe('Catalog Parser Property Tests', () => {
  const parser = new CatalogParser();
  const testDir = path.join(__dirname, '../fixtures');

  beforeAll(() => {
    // Ensure test fixtures directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  /**
   * Feature: automated-beat-generation, Property 6: XML Validation Before Parse
   * Validates: Requirements 2.3
   */
  it('Property 6: XML Validation Before Parse - should reject invalid XML before parsing', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant('not xml at all'),
          fc.constant('<invalid>'),
          fc.constant('<?xml version="1.0"?><NoWorkbook></NoWorkbook>'),
          fc.constant('<?xml version="1.0"?><Workbook></Workbook>'), // Missing required elements
        ),
        (invalidXml) => {
          const isValid = parser.validateStructure(invalidXml);
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: XML Validation Before Parse - should accept valid XML structure', () => {
    const validXml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Beat Catalog">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Category Name</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

    const isValid = parser.validateStructure(validXml);
    expect(isValid).toBe(true);
  });

  it('Property 6: should validate structure before attempting to parse', async () => {
    const invalidXmlPath = path.join(testDir, 'invalid-test.xml');
    
    // Create invalid XML file
    fs.writeFileSync(invalidXmlPath, 'not valid xml');

    await expect(parser.parseXML(invalidXmlPath)).rejects.toThrow();

    // Cleanup
    if (fs.existsSync(invalidXmlPath)) {
      fs.unlinkSync(invalidXmlPath);
    }
  });
});
