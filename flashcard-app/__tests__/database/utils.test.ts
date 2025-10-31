// Database utils tests

import {
  parseTimestamp,
  formatTimestamp,
  validateRequiredFields,
  sanitizeString,
  buildWhereClause,
} from '../../src/database/utils';
import { AppError, ERROR_CODES } from '../../src/types/errors';

describe('Database Utils', () => {
  describe('parseTimestamp', () => {
    it('should parse valid timestamp string', () => {
      const timestamp = '2023-01-01T00:00:00.000Z';
      const result = parseTimestamp(timestamp);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(timestamp);
    });

    it('should return current date for null timestamp', () => {
      const result = parseTimestamp(null);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeCloseTo(new Date().getTime(), -2);
    });
  });

  describe('formatTimestamp', () => {
    it('should format date to ISO string', () => {
      const date = new Date('2023-01-01T00:00:00.000Z');
      const result = formatTimestamp(date);
      
      expect(result).toBe('2023-01-01T00:00:00.000Z');
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass validation for valid data', () => {
      const data = {
        name: 'Test',
        value: 'Valid',
        number: 42,
      };
      
      expect(() => validateRequiredFields(data, ['name', 'value'])).not.toThrow();
    });

    it('should throw error for missing fields', () => {
      const data = {
        name: 'Test',
        value: '',
        missing: null,
      };
      
      expect(() => validateRequiredFields(data, ['name', 'value', 'missing'])).toThrow(AppError);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize valid string', () => {
      const result = sanitizeString('  test string  ');
      expect(result).toBe('test string');
    });

    it('should handle null input', () => {
      const result = sanitizeString(null);
      expect(result).toBe('');
    });

    it('should handle undefined input', () => {
      const result = sanitizeString(undefined);
      expect(result).toBe('');
    });
  });

  describe('buildWhereClause', () => {
    it('should build where clause for valid conditions', () => {
      const conditions = {
        name: 'test',
        id: 1,
        active: true,
      };
      
      const result = buildWhereClause(conditions);
      
      expect(result.whereClause).toBe('WHERE name = ? AND id = ? AND active = ?');
      expect(result.values).toEqual(['test', 1, true]);
    });

    it('should return empty clause for no conditions', () => {
      const conditions = {};
      
      const result = buildWhereClause(conditions);
      
      expect(result.whereClause).toBe('');
      expect(result.values).toEqual([]);
    });
  });
});