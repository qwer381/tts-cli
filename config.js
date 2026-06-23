const path = require('path');
const fs = require('fs');

const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.mimo-tts-config.json');

const defaultConfig = {
  apiKey: process.env.MIMO_API_KEY || '',
  ttsEndpoint: 'https://token-plan-cn.xiaomimimo.com/v1/audio/speech',
  llmEndpoint: 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions',
  ttsModel: 'mimo-v2.5-tts',
  llmModel: 'mimo-v2.5-pro',
  maxIterations: 5,
  qualityThreshold: 80,
  outputDir: './output'
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { ...defaultConfig, ...saved };
    }
  } catch (err) {
    console.error('Warning: Could not load config file:', err.message);
  }
  return { ...defaultConfig };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error('Error: Could not save config file:', err.message);
    return false;
  }
}

function getConfigValue(key) {
  const config = loadConfig();
  return config[key];
}

function setConfigValue(key, value) {
  const config = loadConfig();
  config[key] = value;
  return saveConfig(config);
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  CONFIG_FILE,
  defaultConfig
};
