const axios = require('axios');

jest.mock('axios');
jest.mock('fs');
jest.mock('../config', () => ({
  loadConfig: jest.fn(() => ({
    apiKey: 'test-api-key',
    ttsEndpoint: 'https://token-plan-cn.xiaomimimo.com/v1/audio/speech',
    llmEndpoint: 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions',
    ttsModel: 'mimo-v2.5-tts',
    llmModel: 'mimo-v2.5-pro'
  })),
  getNextApiKey: jest.fn(() => 'test-api-key')
}));

const { generateSpeech, generatePrompt, transcribeAudio } = require('../api');
const { loadConfig, getNextApiKey } = require('../config');
const fs = require('fs');

describe('API Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setTimeout(15000);
  });

  describe('generateSpeech', () => {
    it('should call TTS API and return WAV data', async () => {
      const pcmChunk = Buffer.from('fake-pcm-data').toString('base64');
      const mockStreamResponse = {
        data: `data: {"choices":[{"delta":{"audio":{"data":"${pcmChunk}"}}}]}\n\ndata: [DONE]\n`
      };
      axios.mockResolvedValue(mockStreamResponse);

      const result = await generateSpeech('Hello world', 'Gentle voice', {});

      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: expect.stringContaining('/chat/completions'),
        data: expect.objectContaining({
          model: 'mimo-v2.5-tts',
          audio: expect.objectContaining({ format: 'pcm16' })
        })
      }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw error on API failure', async () => {
      axios.mockRejectedValue(new Error('API Error'));

      await expect(generateSpeech('Hello', 'Voice', {}))
        .rejects.toThrow('API Error');
    }, 15000);

    it('should throw error when API key is missing', async () => {
      loadConfig.mockReturnValueOnce({
        apiKey: '',
        llmEndpoint: 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions',
        ttsModel: 'mimo-v2.5-tts'
      });
      getNextApiKey.mockReturnValueOnce('');

      await expect(generateSpeech('Hello', 'Voice', {}))
        .rejects.toThrow('API key not configured');
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
        url: expect.stringContaining('/chat/completions'),
        data: expect.objectContaining({
          model: 'mimo-v2.5-pro'
        })
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
        llmEndpoint: 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions',
        llmModel: 'mimo-v2.5-pro'
      });
      getNextApiKey.mockReturnValueOnce('');

      await expect(generatePrompt('Hello', '', ''))
        .rejects.toThrow('API key not configured');
    });

    it('should throw error on API failure', async () => {
      axios.mockRejectedValue(new Error('LLM Error'));

      await expect(generatePrompt('Hello', '', ''))
        .rejects.toThrow('LLM Error');
    }, 15000);
  });

  describe('transcribeAudio', () => {
    it('should call ASR API and return recognized text', async () => {
      fs.readFileSync.mockReturnValue(Buffer.from('fake-wav-data'));
      const mockResponse = {
        data: {
          choices: [{
            message: { content: 'Recognized text' }
          }]
        }
      };
      axios.mockResolvedValue(mockResponse);

      const result = await transcribeAudio('/path/to/audio.wav');

      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: expect.stringContaining('/chat/completions'),
        data: expect.objectContaining({
          model: 'mimo-v2.5-asr'
        })
      }));
      expect(result).toBe('Recognized text');
    });

    it('should throw error when API key is missing', async () => {
      loadConfig.mockReturnValueOnce({
        apiKey: '',
        llmEndpoint: 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions'
      });
      getNextApiKey.mockReturnValueOnce('');

      await expect(transcribeAudio('/path/to/audio.wav'))
        .rejects.toThrow('API key not configured');
    });
  });
});
