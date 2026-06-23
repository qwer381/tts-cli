const path = require('path');
const fs = require('fs');

const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.mimo-tts-config.json');
const CACHE_TTL_MS = 5000;

const defaultConfig = {
  apiKey: process.env.MIMO_API_KEY || '',
  apiKeys: [],
  ttsEndpoint: 'https://token-plan-cn.xiaomimimo.com/v1/audio/speech',
  llmEndpoint: 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions',
  ttsModel: 'mimo-v2.5-tts',
  llmModel: 'mimo-v2.5-pro',
  maxIterations: 5,
  qualityThreshold: 80,
  outputDir: './output',
  proxy: null
};

let configCache = null;
let configCacheTime = 0;

function loadPersistedKeyIndex() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (typeof raw._keyIndex === 'number') keyIndex = raw._keyIndex;
    }
  } catch {}
}
loadPersistedKeyIndex();

function loadConfig() {
  const now = Date.now();
  if (configCache && (now - configCacheTime) < CACHE_TTL_MS) {
    return configCache;
  }
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      configCache = { ...defaultConfig, ...saved };
    } else {
      configCache = { ...defaultConfig };
    }
  } catch (err) {
    console.error('Warning: Could not load config file:', err.message);
    configCache = { ...defaultConfig };
  }
  configCacheTime = now;
  return configCache;
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    configCache = config;
    configCacheTime = Date.now();
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

let keyIndex = 0;
let keyIndexDirty = 0;

function getNextApiKey() {
  const config = loadConfig();
  const keys = config.apiKeys || [];
  if (keys.length === 0) return config.apiKey || '';
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  keyIndexDirty++;
  if (keyIndexDirty >= 10) {
    persistKeyIndex();
  }
  return key;
}

function persistKeyIndex() {
  if (keyIndexDirty === 0) return;
  try {
    const raw = fs.existsSync(CONFIG_FILE)
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      : {};
    raw._keyIndex = keyIndex;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(raw, null, 2));
    if (configCache) configCache._keyIndex = keyIndex;
    keyIndexDirty = 0;
  } catch {}
}

function addApiKey(key) {
  const config = loadConfig();
  if (!config.apiKeys) config.apiKeys = [];
  if (!config.apiKeys.includes(key)) {
    config.apiKeys.push(key);
    saveConfig(config);
  }
  return config.apiKeys.length;
}

function removeApiKey(key) {
  const config = loadConfig();
  if (!config.apiKeys) return false;
  const idx = config.apiKeys.indexOf(key);
  if (idx !== -1) {
    config.apiKeys.splice(idx, 1);
    saveConfig(config);
    return true;
  }
  return false;
}

function clearConfigCache() {
  configCache = null;
  configCacheTime = 0;
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  getNextApiKey,
  addApiKey,
  removeApiKey,
  clearConfigCache,
  persistKeyIndex,
  CONFIG_FILE,
  defaultConfig
};
