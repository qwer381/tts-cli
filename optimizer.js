const fs = require('fs');
const path = require('path');
const api = require('./api');
const { loadConfig } = require('./config');
const { textSimilarity, similarityToScore } = require('./text-similarity');

function safeWriteFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, data);
    return filePath;
  } catch (err) {
    console.error(`⚠️  Could not write to ${filePath}: ${err.message}`);
    const altPath = path.join(process.env.TEMP || process.env.TMP || '.', path.basename(filePath));
    console.log(`Trying alternative path: ${altPath}`);
    fs.writeFileSync(altPath, data);
    return altPath;
  }
}

async function evaluateSpeech(audioPath, originalText) {
  try {
    if (!fs.existsSync(audioPath)) {
      return { score: 0, feedback: 'Audio file not found' };
    }

    const stats = fs.statSync(audioPath);
    if (stats.size < 100) {
      return { score: 10, feedback: 'Audio file is empty or corrupted' };
    }

    if (!originalText) {
      const fileSizeKB = stats.size / 1024;
      const score = fileSizeKB < 10 ? 50 : 85;
      return { score, feedback: score >= 80 ? 'Good audio quality' : 'Audio file seems too small' };
    }

    console.log('👂 Recognizing speech with ASR...');
    const recognized = await api.transcribeAudio(audioPath);
    console.log(`📝 Recognized: "${recognized}"`);

    const sim = textSimilarity(originalText, recognized);
    const { score, feedback } = similarityToScore(sim);

    return { score, feedback, recognized, similarity: sim };
  } catch (err) {
    return { score: 0, feedback: `Evaluation error: ${err.message}` };
  }
}

async function optimizeLoop(text, options = {}) {
  const config = loadConfig();
  const maxIterations = options.maxIterations || config.maxIterations;
  const qualityThreshold = options.qualityThreshold || config.qualityThreshold;
  const outputDir = options.outputDir || config.outputDir;
  const cloneRefAudio = options.cloneRefAudio || null;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let currentPrompt = options.initialPrompt || '';
  let bestAudioPath = null;
  let bestScore = 0;
  let lastEvaluation = null;

  const mode = cloneRefAudio ? 'VoiceClone' : 'TTS';
  console.log(`\n🎤 Starting ${mode} optimization loop`);
  console.log(`📝 Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
  if (cloneRefAudio) {
    console.log(`🔊 Reference audio: ${cloneRefAudio}`);
  }
  console.log(`🎯 Quality threshold: ${qualityThreshold}`);
  console.log(`🔄 Max iterations: ${maxIterations}\n`);

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`--- Iteration ${iteration}/${maxIterations} ---`);

    try {
      if (!currentPrompt) {
        console.log('🤖 Generating initial prompt...');
        currentPrompt = await api.generatePrompt(text);
      } else if (iteration > 1) {
        console.log('🤖 Optimizing prompt...');
        let feedback = '';
        if (bestScore < qualityThreshold) {
          feedback = `Score: ${bestScore}/100, needs improvement.`;
          if (lastEvaluation && lastEvaluation.recognized) {
            feedback += ` ASR heard: "${lastEvaluation.recognized}". Focus on clarity and naturalness.`;
          }
        }
        currentPrompt = await api.generatePrompt(text, currentPrompt, feedback);
      }

      console.log(`💬 Prompt: "${currentPrompt}"`);

      console.log(`🔊 Generating speech (${mode})...`);
      const audioData = cloneRefAudio
        ? await api.generateSpeechClone(text, cloneRefAudio, currentPrompt, options)
        : await api.generateSpeech(text, currentPrompt, options);

      const timestamp = Date.now();
      const prefix = cloneRefAudio ? 'clone' : 'speech';
      const audioPath = path.join(outputDir, `${prefix}_${timestamp}.wav`);
      const savedPath = safeWriteFile(audioPath, audioData);
      console.log(`💾 Saved: ${savedPath}`);

      const evaluation = await evaluateSpeech(savedPath, text);
      lastEvaluation = evaluation;
      console.log(`📊 Quality score: ${evaluation.score}/100`);
      console.log(`💭 Feedback: ${evaluation.feedback}`);
      if (evaluation.similarity !== undefined) {
        console.log(`🔗 Similarity: ${evaluation.similarity}%`);
      }

      if (evaluation.score > bestScore) {
        bestScore = evaluation.score;
        bestAudioPath = savedPath;
      }

      if (evaluation.score >= qualityThreshold) {
        console.log(`\n✅ Quality threshold reached! (${evaluation.score} >= ${qualityThreshold})`);
        break;
      }

      console.log(`⚠️  Below threshold, optimizing...\n`);
    } catch (err) {
      console.error(`❌ Iteration ${iteration} failed: ${err.message}`);
      console.log('Skipping this iteration...\n');
    }
  }

  if (bestScore < qualityThreshold) {
    console.log(`\n⚠️  Max iterations reached. Best score: ${bestScore}`);
  }

  console.log(`\n🎉 Final audio: ${bestAudioPath}`);
  console.log(`📊 Final score: ${bestScore}/100`);

  return bestAudioPath;
}

module.exports = {
  optimizeLoop,
  evaluateSpeech
};
