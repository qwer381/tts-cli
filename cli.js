#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { optimizeLoop } = require('./optimizer');
const { generateSpeech, generateSpeechClone, generateSpeechDesign } = require('./api');
const { loadConfig, setConfigValue, getConfigValue } = require('./config');

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
  .option('-i, --iterations <n>', 'Maximum optimization iterations', parseInt)
  .option('-q, --quality <n>', 'Quality threshold (0-100)', parseInt)
  .option('--auto', 'Auto-optimize without confirmation', true)
  .option('--manual', 'Manual optimization mode')
  .option('--set-key <key>', 'Set API key')
  .option('--show-config', 'Show current configuration')
  .action(async (text, options) => {
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

      console.log(chalk.blue(`\nBatch processing ${lines.length} texts...\n`));

      const outputDir = config.outputDir;
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const tag = `[${i + 1}/${lines.length}]`;
        process.stdout.write(`${tag} "${line.substring(0, 30)}..." `);

        try {
          const audioData = await generateSpeech(line, options.prompt || 'Clear, natural narration tone.', { voice: options.voice });
          const audioPath = path.join(outputDir, `batch_${String(i + 1).padStart(3, '0')}.wav`);
          fs.writeFileSync(audioPath, audioData);
          console.log(chalk.green('OK'));
        } catch (err) {
          console.log(chalk.red(`FAIL: ${err.message}`));
        }
      }

      console.log(chalk.green(`\nBatch complete! Output: ${outputDir}`));
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
