const axios = require('axios');
const fs = require('fs');
const { loadConfig } = require('./config');

const SAMPLE_RATE = 24000;

async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      console.error(`Attempt ${attempt} failed, retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function pcm16ToWav(pcmBuffer, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const wav = Buffer.alloc(headerSize + dataSize);

  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(numChannels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wav, headerSize);

  return wav;
}

async function generateSpeech(text, prompt, options = {}) {
  const config = loadConfig();

  if (!config.apiKey) {
    throw new Error('API key not configured. Run: mimo-tts --set-key YOUR_API_KEY');
  }

  const voice = options.voice || 'Chloe';
  const style = prompt || 'Clear, natural narration tone.';

  return retryWithBackoff(async () => {
    const response = await axios({
      method: 'POST',
      url: config.llmEndpoint,
      data: {
        model: config.ttsModel,
        messages: [
          { role: 'user', content: style },
          { role: 'assistant', content: text }
        ],
        audio: { format: 'pcm16', voice: voice },
        stream: true
      },
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      responseType: 'text'
    });

    const chunks = [];
    const lines = response.data.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const jsonStr = trimmed.slice(6);
      if (jsonStr === '[DONE]') break;

      try {
        const parsed = JSON.parse(jsonStr);
        const choice = parsed.choices?.[0];
        const audio = choice?.delta?.audio;
        if (audio && audio.data) {
          const pcm = Buffer.from(audio.data, 'base64');
          chunks.push(pcm);
        }
      } catch {}
    }

    if (chunks.length === 0) {
      throw new Error('No audio data received from API');
    }

    const pcmBuffer = Buffer.concat(chunks);
    return pcm16ToWav(pcmBuffer, SAMPLE_RATE);
  });
}

async function generatePrompt(text, currentPrompt = '', feedback = '') {
  const config = loadConfig();

  if (!config.apiKey) {
    throw new Error('API key not configured. Run: mimo-tts --set-key YOUR_API_KEY');
  }

  const systemMessage = `You are a voice prompt optimization expert. 
Your task is to generate or optimize TTS voice prompts.
The prompt should describe the desired voice characteristics, tone, and speaking style.
Keep prompts concise and effective.`;

  let userMessage = `Text to speak: "${text}"`;

  if (currentPrompt) {
    userMessage += `\n\nCurrent prompt: "${currentPrompt}"`;
  }

  if (feedback) {
    userMessage += `\n\nFeedback for improvement: ${feedback}`;
  }

  userMessage += `\n\nPlease provide an optimized voice prompt:`;

  return retryWithBackoff(async () => {
    const response = await axios({
      method: 'POST',
      url: config.llmEndpoint,
      data: {
        model: config.llmModel,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 200
      },
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.choices[0].message.content.trim();
  });
}

async function generateSpeechClone(text, referenceAudioPath, prompt, options = {}) {
  const config = loadConfig();

  if (!config.apiKey) {
    throw new Error('API key not configured. Run: mimo-tts --set-key YOUR_API_KEY');
  }

  if (!fs.existsSync(referenceAudioPath)) {
    throw new Error(`Reference audio not found: ${referenceAudioPath}`);
  }

  const refAudio = 'data:audio/wav;base64,' + fs.readFileSync(referenceAudioPath).toString('base64');
  const style = prompt || 'Natural narration tone.';

  return retryWithBackoff(async () => {
    const response = await axios({
      method: 'POST',
      url: config.llmEndpoint,
      data: {
        model: 'mimo-v2.5-tts-voiceclone',
        messages: [
          { role: 'user', content: style },
          { role: 'assistant', content: text }
        ],
        audio: { format: 'pcm16', voice: refAudio },
        stream: true
      },
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      responseType: 'text'
    });

    const chunks = [];
    const lines = response.data.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const jsonStr = trimmed.slice(6);
      if (jsonStr === '[DONE]') break;

      try {
        const parsed = JSON.parse(jsonStr);
        const choice = parsed.choices?.[0];
        const audio = choice?.delta?.audio;
        if (audio && audio.data) {
          const pcm = Buffer.from(audio.data, 'base64');
          chunks.push(pcm);
        }
      } catch {}
    }

    if (chunks.length === 0) {
      throw new Error('No audio data received from API');
    }

    const pcmBuffer = Buffer.concat(chunks);
    return pcm16ToWav(pcmBuffer, SAMPLE_RATE);
  });
}

async function transcribeAudio(audioPath) {
  const config = loadConfig();

  if (!config.apiKey) {
    throw new Error('API key not configured. Run: mimo-tts --set-key YOUR_API_KEY');
  }

  const audioData = fs.readFileSync(audioPath);
  const base64 = 'data:audio/wav;base64,' + audioData.toString('base64');

  return retryWithBackoff(async () => {
    const response = await axios({
      method: 'POST',
      url: config.llmEndpoint,
      data: {
        model: 'mimo-v2.5-asr',
        messages: [{
          role: 'user',
          content: [{ type: 'input_audio', input_audio: { data: base64, wav_format: 'wav' } }]
        }]
      },
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.choices[0].message.content.trim();
  });
}

module.exports = {
  generateSpeech,
  generateSpeechClone,
  generatePrompt,
  transcribeAudio
};
