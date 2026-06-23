#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const chalk = require('chalk');
const { optimizeLoop } = require('./optimizer');
const { generateSpeech, generateSpeechDesign } = require('./api');
const { loadConfig, setConfigValue, addApiKey, removeApiKey, persistKeyIndex } = require('./config');

let verbose = false;
function log(...args) {
  if (verbose) console.log('[DEBUG]', ...args);
}

let interrupted = false;
process.on('SIGINT', () => {
  if (interrupted) process.exit(1);
  interrupted = true;
  persistKeyIndex();
  console.log(chalk.yellow('\n⚠️  Interrupted. Finishing current task...'));
});

function handleConfigCommands(options) {
  if (options.setKey) {
    setConfigValue('apiKey', options.setKey);
    console.log(chalk.green('API key saved successfully'));
    return true;
  }

  if (options.addKey) {
    const count = addApiKey(options.addKey);
    console.log(chalk.green(`API key added. Total keys: ${count}`));
    return true;
  }

  if (options.removeKey) {
    const removed = removeApiKey(options.removeKey);
    console.log(removed ? chalk.green('API key removed') : chalk.yellow('API key not found'));
    return true;
  }

  if (options.listKeys) {
    const config = loadConfig();
    const keys = config.apiKeys || [];
    if (keys.length === 0) {
      console.log(chalk.yellow('No rotation keys configured'));
    } else {
      console.log(chalk.blue('\nAPI Keys:'));
      keys.forEach((key, i) => {
        console.log(`  ${i + 1}. ${key.substring(0, 8)}...${key.substring(key.length - 4)}`);
      });
    }
    return true;
  }

  if (options.setProxy) {
    try {
      const url = new URL(options.setProxy);
      setConfigValue('proxy', { host: url.hostname, port: parseInt(url.port) || 80 });
      console.log(chalk.green(`Proxy set: ${url.hostname}:${url.port}`));
    } catch {
      console.log(chalk.red('Invalid proxy URL. Use format: http://host:port'));
    }
    return true;
  }

  if (options.showConfig) {
    const config = loadConfig();
    console.log(chalk.blue('\nCurrent Configuration:'));
    console.log(JSON.stringify(config, null, 2));
    return true;
  }

  return false;
}

async function handleBatchMode(options, config) {
  if (!fs.existsSync(options.batch)) {
    console.log(chalk.red(`Error: Batch file not found: ${options.batch}`));
    return;
  }

  const lines = fs.readFileSync(options.batch, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const concurrent = Math.max(1, options.concurrent || 1);
  console.log(chalk.blue(`\n🎤 Batch processing ${lines.length} texts (concurrency: ${concurrent})...\n`));

  const outputDir = config.outputDir;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let completed = 0;
  let failed = 0;

  for (let i = 0; i < lines.length && !interrupted; i += concurrent) {
    const chunk = lines.slice(i, i + concurrent);
    const promises = chunk.map(async (line, j) => {
      const idx = i + j + 1;
      try {
        const audioData = await generateSpeech(line, options.prompt || 'Clear, natural narration tone.', { voice: options.voice });
        const audioPath = path.join(outputDir, `batch_${String(idx).padStart(3, '0')}.wav`);
        fs.writeFileSync(audioPath, audioData);
        completed++;
        process.stdout.write(`\r[${completed + failed}/${lines.length}] Processing...`);
        return { success: true, idx };
      } catch (err) {
        failed++;
        process.stdout.write(`\r[${completed + failed}/${lines.length}] Processing...`);
        return { success: false, idx, error: err.message };
      }
    });
    await Promise.all(promises);
  }

  console.log(chalk.green(`\nBatch complete! ${completed} succeeded, ${failed} failed${interrupted ? ' (interrupted)' : ''}`));
  console.log(chalk.blue(`Output: ${outputDir}`));
}

async function handleDesignMode(text, options, config) {
  console.log(chalk.blue('\n🎤 Voice Design Mode'));
  console.log(chalk.blue(`Voice: ${options.design}`));

  const audioData = await generateSpeechDesign(text, options.design);
  const outputPath = options.output || `${config.outputDir}/design_${Date.now()}.wav`;
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, audioData);
  console.log(chalk.green(`\nGeneration complete!`));
  console.log(chalk.blue(`Output: ${outputPath}`));
}

async function handleOptimizeMode(text, options, config) {
  const optimizeOptions = {
    initialPrompt: options.prompt,
    cloneRefAudio: options.clone || null,
    voice: options.voice,
    maxIterations: options.iterations || config.maxIterations,
    qualityThreshold: options.quality || config.qualityThreshold,
    outputDir: options.output ? path.dirname(options.output) : config.outputDir
  };

  const result = await optimizeLoop(text, optimizeOptions);

  console.log(chalk.green('\nGeneration complete!'));
  console.log(chalk.blue(`Output: ${result}`));

  if (options.output) {
    fs.copyFileSync(result, options.output);
    console.log(chalk.blue(`Copied to: ${options.output}`));
  }
}

const program = new Command();

program
  .name('mimo-tts')
  .description('CLI tool for mimo-v2.5-tts with auto-prompt optimization')
  .version(require('./package.json').version);

program
  .argument('[text]', 'Text to convert to speech')
  .option('-o, --output <path>', 'Output file path')
  .option('-p, --prompt <prompt>', 'Initial voice prompt')
  .option('-v, --voice <name>', 'Voice name (e.g. Chloe, alloy)', 'Chloe')
  .option('-c, --clone <ref-audio>', 'Voice clone mode: path to reference audio file')
  .option('-d, --design <description>', 'Voice design mode: describe the desired voice')
  .option('-b, --batch <file>', 'Batch mode: read texts from file (one per line)')
  .option('-n, --concurrent <n>', 'Concurrent requests for batch mode', parseInt, 1)
  .option('-i, --iterations <n>', 'Maximum optimization iterations', parseInt)
  .option('-q, --quality <n>', 'Quality threshold (0-100)', parseInt)
  .option('--auto', 'Auto-optimize without confirmation', true)
  .option('--manual', 'Manual optimization mode')
  .option('--set-key <key>', 'Set API key')
  .option('--add-key <key>', 'Add API key for rotation')
  .option('--remove-key <key>', 'Remove API key from rotation')
  .option('--list-keys', 'List all API keys')
  .option('--set-proxy <url>', 'Set proxy (e.g. http://127.0.0.1:7890)')
  .option('--show-config', 'Show current configuration')
  .option('--verbose', 'Verbose output')
  .action(async (text, options) => {
    verbose = options.verbose || false;
    log('Options:', options);

    if (handleConfigCommands(options)) return;

    const config = loadConfig();
    if (!config.apiKey) {
      console.log(chalk.red('Error: API key not configured'));
      console.log('Run: mimo-tts --set-key YOUR_API_KEY');
      return;
    }

    try {
      if (options.batch) {
        await handleBatchMode(options, config);
      } else if (!text) {
        console.log(chalk.red('Error: Please provide text to convert'));
        console.log('Usage: mimo-tts "Hello world"');
      } else if (options.design) {
        await handleDesignMode(text, options, config);
      } else {
        await handleOptimizeMode(text, options, config);
      }
    } catch (err) {
      console.log(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    } finally {
      persistKeyIndex();
    }
  });

if (process.argv.length <= 2) {
  program.help();
}

program.parse();
