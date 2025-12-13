import { CatalogParser } from '../../../src/parsers/catalog-parser';
import * as fs from 'fs';
import * as path from 'path';

describe('Catalog Parser Unit Tests', () => {
  const parser = new CatalogParser();
  const testDir = path.join(__dirname, '../../fixtures');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test files
    const testFiles = [
      'empty-test.xml',
      'malformed-test.xml',
      'missing-fields-test.xml',
      'special-chars-test.xml'
    ];

    testFiles.forEach(file => {
      const filePath = path.join(testDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty XML file', async () => {
      const emptyXmlPath = path.join(testDir, 'empty-test.xml');
      fs.writeFileSync(emptyXmlPath, '');

      await expect(parser.parseXML(emptyXmlPath)).rejects.toThrow();
    });

    it('should handle malformed XML structure', async () => {
      const malformedXmlPath = path.join(testDir, 'malformed-test.xml');
      const malformedXml = `<?xml version="1.0"?>
<Workbook>
  <Worksheet>
    <Table>
      <Row>
        <Cell><Data>Unclosed tag
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;
      
      fs.writeFileSync(malformedXmlPath, malformedXml);

      await expect(parser.parseXML(malformedXmlPath)).rejects.toThrow();
    });

    it('should handle missing required fields', async () => {
      const missingFieldsPath = path.join(testDir, 'missing-fields-test.xml');
      const missingFieldsXml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Beat Catalog">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Category Name</Data></Cell>
        <Cell><Data ss:Type="String">Genre</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Test Category</Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;
      
      fs.writeFileSync(missingFieldsPath, missingFieldsXml);

      const templates = await parser.parseXML(missingFieldsPath);
      // Should skip rows with missing required fields
      expect(templates.length).toBe(0);
    });

    it('should handle special characters in category names', async () => {
      const specialCharsPath = path.join(testDir, 'special-chars-test.xml');
      const specialCharsXml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Beat Catalog">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Category Name</Data></Cell>
        <Cell><Data ss:Type="String">Genre</Data></Cell>
        <Cell><Data ss:Type="String">Style</Data></Cell>
        <Cell><Data ss:Type="String">Mood</Data></Cell>
        <Cell><Data ss:Type="String">Use-case</Data></Cell>
        <Cell><Data ss:Type="String">Tags</Data></Cell>
        <Cell><Data ss:Type="String">Prompt</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Test @ Category #1 &amp; More!</Data></Cell>
        <Cell><Data ss:Type="String">Lo-fi</Data></Cell>
        <Cell><Data ss:Type="String">Test Style</Data></Cell>
        <Cell><Data ss:Type="String">Chill</Data></Cell>
        <Cell><Data ss:Type="String">Test</Data></Cell>
        <Cell><Data ss:Type="String">test, special, chars</Data></Cell>
        <Cell><Data ss:Type="String">Test prompt with special characters</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;
      
      fs.writeFileSync(specialCharsPath, specialCharsXml);

      const templates = await parser.parseXML(specialCharsPath);
      expect(templates.length).toBe(1);
      expect(templates[0].categoryName).toBe('Test @ Category #1 & More!');
      // ID should be slugified
      expect(templates[0].id).toMatch(/^test-category-1-more$/);
    });
  });

  describe('validateStructure', () => {
    it('should reject empty string', () => {
      expect(parser.validateStructure('')).toBe(false);
    });

    it('should reject whitespace only', () => {
      expect(parser.validateStructure('   ')).toBe(false);
    });

    it('should reject non-XML content', () => {
      expect(parser.validateStructure('not xml')).toBe(false);
    });

    it('should reject XML without required elements', () => {
      const invalidXml = '<?xml version="1.0"?><Root></Root>';
      expect(parser.validateStructure(invalidXml)).toBe(false);
    });

    it('should accept valid XML with all required elements', () => {
      const validXml = `<?xml version="1.0"?>
<Workbook>
  <Worksheet>
    <Table>
      <Row>
        <Cell></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;
      expect(parser.validateStructure(validXml)).toBe(true);
    });
  });
});
