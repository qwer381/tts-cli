const { optimizeLoop, evaluateSpeech } = require('../optimizer');
const api = require('../api');
const fs = require('fs');

jest.mock('../api');
jest.mock('fs');

describe('Optimizer Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.writeFileSync.mockImplementation(() => {});
    fs.statSync.mockReturnValue({ size: 50 * 1024 });
    fs.mkdirSync.mockImplementation(() => {});
  });

  describe('optimizeLoop', () => {
    it('should generate speech and return output path', async () => {
      const mockAudio = Buffer.from('audio-data');
      api.generateSpeech.mockResolvedValue(mockAudio);
      api.generatePrompt.mockResolvedValue('Warm voice');

      const result = await optimizeLoop('Hello world', {
        maxIterations: 1,
        outputDir: './output'
      });

      expect(result).toContain('.mp3');
      expect(api.generateSpeech).toHaveBeenCalled();
    });

    it('should optimize prompt when quality is low', async () => {
      const mockAudio = Buffer.from('audio-data');
      api.generateSpeech.mockResolvedValue(mockAudio);
      api.generatePrompt.mockResolvedValue('Improved prompt');

      const result = await optimizeLoop('Hello world', {
        maxIterations: 3,
        qualityThreshold: 90
      });

      expect(api.generatePrompt).toHaveBeenCalled();
    });
  });

  describe('evaluateSpeech', () => {
    it('should return quality score and feedback', async () => {
      const result = await evaluateSpeech('/path/to/audio.mp3');

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('feedback');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
