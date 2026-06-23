#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { optimizeLoop } = require('./optimizer');
const { generateSpeech, generateSpeechClone, generateSpeechDesign } = require('./api');
const { loadConfig, setConfigValue, getConfigValue } = require('./config');

let verbose = false;
function log(...args) {
  if (verbose) console.log('[DEBUG]', ...args);
}

const program = new Command();

program
  .name('mimo-tts')
  .description('CLI tool for mimo-v2.5-tts with auto-prompt optimization')
  .version('1.0.0');

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
  .option('--show-config', 'Show current configuration')
  .option('--verbose', 'Verbose output')
  .action(async (text, options) => {
    verbose = options.verbose || false;
    log('Options:', options);

    if (options.setKey) {
      setConfigValue('apiKey', options.setKey);
      console.log(chalk.green('API key saved successfully'));
      return;
    }

    if (options.showConfig) {
      const config = loadConfig();
      console.log(chalk.blue('\nCurrent Configuration:'));
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    const config = loadConfig();
    if (!config.apiKey) {
      console.log(chalk.red('Error: API key not configured'));
      console.log('Run: mimo-tts --set-key YOUR_API_KEY');
      return;
    }

    // Batch mode
    if (options.batch) {
      const fs = require('fs');
      const path = require('path');

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

      const spinner = ora({ text: 'Processing...', spinner: 'dots' }).start();
      let completed = 0;
      let failed = 0;

      // Process in chunks for concurrency
      for (let i = 0; i < lines.length; i += concurrent) {
        const chunk = lines.slice(i, i + concurrent);
        const promises = chunk.map(async (line, j) => {
          const idx = i + j + 1;
          try {
            const audioData = await generateSpeech(line, options.prompt || 'Clear, natural narration tone.', { voice: options.voice });
            const audioPath = path.join(outputDir, `batch_${String(idx).padStart(3, '0')}.wav`);
            fs.writeFileSync(audioPath, audioData);
            completed++;
            spinner.text = `[${completed + failed}/${lines.length}] Processing...`;
            return { success: true, idx };
          } catch (err) {
            failed++;
            spinner.text = `[${completed + failed}/${lines.length}] Processing...`;
            return { success: false, idx, error: err.message };
          }
        });
        await Promise.all(promises);
      }

      spinner.succeed(chalk.green(`Batch complete! ${completed} succeeded, ${failed} failed`));
      console.log(chalk.blue(`Output: ${outputDir}`));
      return;
    }

    if (!text) {
      console.log(chalk.red('Error: Please provide text to convert'));
      console.log('Usage: mimo-tts "Hello world"');
      return;
    }

    // Voice Design mode
    if (options.design) {
      console.log(chalk.blue('\n🎤 Voice Design Mode'));
      console.log(chalk.blue(`Voice: ${options.design}`));

      try {
        const audioData = await generateSpeechDesign(text, options.design);
        const outputPath = options.output || `${config.outputDir}/design_${Date.now()}.wav`;
        const outputDir = require('path').dirname(outputPath);
        if (!require('fs').existsSync(outputDir)) {
          require('fs').mkdirSync(outputDir, { recursive: true });
        }
        require('fs').writeFileSync(outputPath, audioData);
        console.log(chalk.green(`\nGeneration complete!`));
        console.log(chalk.blue(`Output: ${outputPath}`));
      } catch (err) {
        console.log(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
      return;
    }

    const optimizeOptions = {
      initialPrompt: options.prompt,
      cloneRefAudio: options.clone || null,
      voice: options.voice,
      maxIterations: options.iterations || config.maxIterations,
      qualityThreshold: options.quality || config.qualityThreshold,
      outputDir: options.output ? require('path').dirname(options.output) : config.outputDir
    };

    const spinner = ora('Starting TTS generation...').start();

    try {
      spinner.stop();

      const result = await optimizeLoop(text, optimizeOptions);

      console.log(chalk.green('\nGeneration complete!'));
      console.log(chalk.blue(`Output: ${result}`));

      if (options.output) {
        const fs = require('fs');
        fs.copyFileSync(result, options.output);
        console.log(chalk.blue(`Copied to: ${options.output}`));
      }

    } catch (err) {
      spinner.fail('Generation failed');
      console.log(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

if (process.argv.length <= 2) {
  program.help();
}

program.parse();
