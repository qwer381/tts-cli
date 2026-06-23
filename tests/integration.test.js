const { optimizeLoop } = require('../optimizer');
const api = require('../api');
const fs = require('fs');

jest.mock('../api');
jest.mock('fs');

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.writeFileSync.mockImplementation(() => {});
    fs.statSync.mockReturnValue({ size: 50 * 1024 });
    fs.mkdirSync.mockImplementation(() => {});
    api.transcribeAudio.mockResolvedValue('Test text');
  });

  it('should complete full optimization loop', async () => {
    const mockAudio = Buffer.from('test-audio');
    api.generateSpeech.mockResolvedValue(mockAudio);
    api.generatePrompt.mockResolvedValue('Test prompt');

    const result = await optimizeLoop('Test text', {
      maxIterations: 2,
      qualityThreshold: 80
    });

    expect(result).toBeDefined();
    expect(result).toContain('.wav');
    expect(api.generateSpeech).toHaveBeenCalled();
    expect(api.generatePrompt).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    api.generateSpeech.mockRejectedValue(new Error('API Error'));
    api.generatePrompt.mockResolvedValue('Test prompt');

    const result = await optimizeLoop('Test text', { maxIterations: 1 });
    
    // optimizeLoop catches errors and returns null when all iterations fail
    expect(result).toBeNull();
  });

  it('should optimize prompt across iterations', async () => {
    const mockAudio = Buffer.from('test-audio');
    api.generateSpeech.mockResolvedValue(mockAudio);
    api.generatePrompt.mockResolvedValue('Optimized prompt');
    api.transcribeAudio.mockResolvedValue('different text');

    await optimizeLoop('Test text', {
      maxIterations: 3,
      qualityThreshold: 95
    });

    expect(api.generatePrompt).toHaveBeenCalledTimes(3);
    expect(api.generateSpeech).toHaveBeenCalledTimes(3);
  });

  it('should stop when quality threshold is reached', async () => {
    const mockAudio = Buffer.from('test-audio');
    api.generateSpeech.mockResolvedValue(mockAudio);
    api.generatePrompt.mockResolvedValue('Good prompt');

    fs.statSync.mockReturnValue({ size: 200 * 1024 });

    const result = await optimizeLoop('Test text', {
      maxIterations: 5,
      qualityThreshold: 80
    });

    expect(result).toBeDefined();
    expect(api.generateSpeech).toHaveBeenCalledTimes(1);
  });

  it('should use initial prompt if provided', async () => {
    const mockAudio = Buffer.from('test-audio');
    api.generateSpeech.mockResolvedValue(mockAudio);

    fs.statSync.mockReturnValue({ size: 200 * 1024 });

    await optimizeLoop('Test text', {
      maxIterations: 1,
      qualityThreshold: 80,
      initialPrompt: 'Custom voice prompt'
    });

    expect(api.generatePrompt).not.toHaveBeenCalled();
    expect(api.generateSpeech).toHaveBeenCalledWith(
      'Test text',
      'Custom voice prompt',
      expect.any(Object)
    );
  });
});
