const axios = require('axios');

jest.mock('axios');
jest.mock('../config', () => ({
  loadConfig: jest.fn(() => ({
    apiKey: 'test-api-key',
    ttsEndpoint: 'https://api.mimovoice.com/v1/audio/speech',
    llmEndpoint: 'https://api.mimovoice.com/v1/chat/completions',
    ttsModel: 'mimo-v2.5-tts',
    llmModel: 'MiMo-V2.5-Pro'
  }))
}));

const { generateSpeech, generatePrompt } = require('../api');
const { loadConfig } = require('../config');

describe('API Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setTimeout(15000); // Increase timeout for retry tests
  });

  describe('generateSpeech', () => {
    it('should call TTS API and return audio data', async () => {
      const mockAudioData = Buffer.from('fake-audio-data');
      axios.mockResolvedValue({ data: mockAudioData });

      const result = await generateSpeech('Hello world', 'Gentle voice', {});

      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: expect.stringContaining('/audio/speech'),
        responseType: 'arraybuffer'
      }));
      expect(result).toEqual(mockAudioData);
    });

    it('should throw error on API failure', async () => {
      axios.mockRejectedValue(new Error('API Error'));

      await expect(generateSpeech('Hello', 'Voice', {}))
        .rejects.toThrow('API Error');
    }, 15000);

    it('should throw error when API key is missing', async () => {
      loadConfig.mockReturnValueOnce({
        apiKey: '',
        ttsEndpoint: 'https://api.mimovoice.com/v1/audio/speech',
        ttsModel: 'mimo-v2.5-tts'
      });

      await expect(generateSpeech('Hello', 'Voice', {}))
        .rejects.toThrow('API key not configured');
    });

    it('should pass options to the API call', async () => {
      const mockAudioData = Buffer.from('audio');
      axios.mockResolvedValue({ data: mockAudioData });

      await generateSpeech('Hello', 'Warm voice', { format: 'wav', speed: 1.5 });

      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          response_format: 'wav',
          speed: 1.5
        })
      }));
    });
  });

  describe('generatePrompt', () => {
    it('should call LLM API and return optimized prompt', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Optimized prompt: Speak warmly and clearly'
            }
          }]
        }
      };
      axios.mockResolvedValue(mockResponse);

      const result = await generatePrompt('Hello world', '', '');

      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: expect.stringContaining('/chat/completions')
      }));
      expect(result).toContain('Optimized prompt');
    });

    it('should include current prompt and feedback in request', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: { content: 'Improved prompt' }
          }]
        }
      };
      axios.mockResolvedValue(mockResponse);

      await generatePrompt('Hello', 'Current voice', 'Make it warmer');

      const callArgs = axios.mock.calls[0][0];
      const userMsg = callArgs.data.messages[1].content;
      expect(userMsg).toContain('Current voice');
      expect(userMsg).toContain('Make it warmer');
    });

    it('should throw error when API key is missing', async () => {
      loadConfig.mockReturnValueOnce({
        apiKey: '',
        llmEndpoint: 'https://api.mimovoice.com/v1/chat/completions',
        llmModel: 'MiMo-V2.5-Pro'
      });

      await expect(generatePrompt('Hello', '', ''))
        .rejects.toThrow('API key not configured');
    });

    it('should throw error on API failure', async () => {
      axios.mockRejectedValue(new Error('LLM Error'));

      await expect(generatePrompt('Hello', '', ''))
        .rejects.toThrow('LLM Error');
    }, 15000);
  });
});
