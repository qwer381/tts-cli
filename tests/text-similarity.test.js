const { normalizeText, textSimilarity } = require('../text-similarity');

describe('Text Similarity', () => {
  describe('normalizeText', () => {
    it('should remove punctuation and spaces', () => {
      expect(normalizeText('你好，世界！')).toBe('你好世界');
    });

    it('should convert digits to Chinese', () => {
      expect(normalizeText('123')).toBe('一二三');
    });

    it('should expand Chinese number words', () => {
      expect(normalizeText('十万')).toBe('一零零零零零');
    });

    it('should handle mixed Chinese and digits', () => {
      expect(normalizeText('3万1千零29')).toBe('三一零二九');
    });

    it('should handle date format', () => {
      expect(normalizeText('2026年6月23日')).toBe('二零二六年六月二三日');
    });

    it('should handle phone numbers', () => {
      expect(normalizeText('13800138000')).toBe('一三八零零一三八零零零');
    });

    it('should handle empty string', () => {
      expect(normalizeText('')).toBe('');
    });
  });

  describe('textSimilarity', () => {
    it('should return 100 for identical texts', () => {
      expect(textSimilarity('你好世界', '你好世界')).toBe(100);
    });

    it('should return 0 for empty strings', () => {
      expect(textSimilarity('', '你好')).toBe(0);
      expect(textSimilarity('你好', '')).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(textSimilarity(null, '你好')).toBe(0);
      expect(textSimilarity('你好', undefined)).toBe(0);
    });

    it('should handle digit vs Chinese number comparison', () => {
      expect(textSimilarity('十万', '100000')).toBe(100);
    });

    it('should handle mixed format comparison', () => {
      expect(textSimilarity('3万1千零29', '31029')).toBe(100);
    });

    it('should handle date comparison', () => {
      expect(textSimilarity('2026年6月23日', '二零二六年六月二十三日')).toBe(100);
    });

    it('should handle partially matching texts', () => {
      const sim = textSimilarity('你好世界', '你好');
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(100);
    });

    it('should handle completely different texts', () => {
      expect(textSimilarity('你好', '再见')).toBe(0);
    });

    it('should ignore punctuation differences', () => {
      expect(textSimilarity('你好，世界！', '你好世界')).toBe(100);
    });

    it('should handle ASR output with spaces', () => {
      expect(textSimilarity('MiMo大模型', 'MiMo 大模型')).toBe(100);
    });
  });
});
