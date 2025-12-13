import * as xml2js from 'xml2js';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { BeatTemplate } from '../types/beat.types';
import { loggingService } from '../services/logging.service';

export interface XMLRow {
  categoryName: string;
  genre: string;
  style: string;
  mood: string;
  useCase: string;
  tags: string;
  prompt: string;
}

export class CatalogParser {
  /**
   * Parse XML catalog file and extract beat templates
   */
  async parseXML(filePath: string): Promise<BeatTemplate[]> {
    try {
      const xmlContent = await fs.promises.readFile(filePath, 'utf-8');
      
      // Validate XML structure before parsing
      if (!this.validateStructure(xmlContent)) {
        throw new Error('Invalid XML structure');
      }

      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true,
        trim: true
      });

      const result = await parser.parseStringPromise(xmlContent);
      
      // Navigate to the worksheet data
      const worksheet = result.Workbook.Worksheet;
      const table = worksheet.Table;
      const rows = Array.isArray(table.Row) ? table.Row : [table.Row];

      // Skip header row (first row)
      const dataRows = rows.slice(1);

      const templates: BeatTemplate[] = [];

      for (const row of dataRows) {
        if (!row.Cell) continue;

        const cells = Array.isArray(row.Cell) ? row.Cell : [row.Cell];
        
        // Skip empty rows
        if (cells.length < 7) continue;

        const xmlRow = this.extractRowData(cells);
        if (!xmlRow) continue;

        const template = this.mapXMLRowToTemplate(xmlRow, xmlContent);
        templates.push(template);
      }

      loggingService.info('XML catalog parsed successfully', {
        service: 'CatalogParser',
        templatesCount: templates.length
      });

      return templates;
    } catch (error) {
      loggingService.logError('CatalogParser', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Validate XML structure
   */
  validateStructure(xml: string): boolean {
    try {
      // Basic validation checks
      if (!xml || xml.trim().length === 0) {
        return false;
      }

      // Check for required XML elements
      const requiredElements = [
        '<Workbook',
        '<Worksheet',
        '<Table',
        '<Row',
        '<Cell'
      ];

      for (const element of requiredElements) {
        if (!xml.includes(element)) {
          loggingService.warn('Missing required XML element', {
            service: 'CatalogParser',
            element
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      loggingService.logError('CatalogParser', error as Error);
      return false;
    }
  }

  /**
   * Extract data from XML row cells
   */
  private extractRowData(cells: any[]): XMLRow | null {
    try {
      const getData = (index: number): string => {
        if (!cells[index] || !cells[index].Data) return '';
        const data = cells[index].Data;
        // Handle both string and object (with _ property for text content)
        if (typeof data === 'string') {
          return data.trim();
        } else if (typeof data === 'object' && data._) {
          return String(data._).trim();
        } else if (typeof data === 'object') {
          return String(data).trim();
        }
        return String(data).trim();
      };

      const categoryName = getData(0);
      const genre = getData(1);
      const style = getData(2);
      const mood = getData(3);
      const useCase = getData(4);
      const tags = getData(5);
      const prompt = getData(6);

      // Validate required fields
      if (!categoryName || !genre || !prompt) {
        return null;
      }

      return {
        categoryName,
        genre,
        style,
        mood,
        useCase,
        tags,
        prompt
      };
    } catch (error) {
      loggingService.logError('CatalogParser', error as Error);
      return null;
    }
  }

  /**
   * Map XML row to BeatTemplate
   */
  private mapXMLRowToTemplate(row: XMLRow, xmlContent: string): BeatTemplate {
    const id = this.generateSlug(row.categoryName);
    const checksum = this.calculateChecksum(JSON.stringify(row));

    return {
      id,
      categoryName: row.categoryName,
      genre: row.genre,
      style: row.style,
      mood: row.mood,
      useCase: row.useCase,
      tags: row.tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
      basePrompt: row.prompt,
      isActive: true,
      xmlChecksum: checksum
    };
  }

  /**
   * Generate slug from category name for consistent IDs
   */
  private generateSlug(categoryName: string): string {
    return categoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Calculate MD5 checksum for change detection
   */
  private calculateChecksum(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }
}
