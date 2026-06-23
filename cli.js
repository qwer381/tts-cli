#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { optimizeLoop } = require('./optimizer');
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
  .option('-c, --clone <ref-audio>', 'Voice clone mode: path to reference audio file')
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

    if (!text) {
      console.log(chalk.red('Error: Please provide text to convert'));
      console.log('Usage: mimo-tts "Hello world"');
      return;
    }

    const config = loadConfig();
    if (!config.apiKey) {
      console.log(chalk.red('Error: API key not configured'));
      console.log('Run: mimo-tts --set-key YOUR_API_KEY');
      return;
    }

    const optimizeOptions = {
      initialPrompt: options.prompt,
      cloneRefAudio: options.clone || null,
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
