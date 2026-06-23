const CN_UNITS = { 十: 10, 百: 100, 千: 1000, 万: 10000, 亿: 100000000 };
const CN_DIGITS = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const DIGIT_TO_CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const PUNCT_RE = /[，。！？、；：""''【】《》（）()\[\]{}!?,.:;'\-\s]/g;

function digitsToChinese(numStr) {
  return numStr.split('').map(d => DIGIT_TO_CN[parseInt(d)]).join('');
}

function parseCnNumber(str) {
  let total = 0;
  let current = 0;
  let pendingNum = '';

  function flushNum() {
    if (pendingNum) {
      current = parseInt(pendingNum);
      pendingNum = '';
    }
  }

  for (const ch of str) {
    if (/\d/.test(ch)) {
      pendingNum += ch;
    } else if (CN_DIGITS[ch] !== undefined) {
      flushNum();
      current = CN_DIGITS[ch];
    } else if (CN_UNITS[ch]) {
      flushNum();
      const u = CN_UNITS[ch];
      if (u >= 10000) {
        total = (total + current) * u;
      } else {
        total += (current || 1) * u;
      }
      current = 0;
    }
  }
  flushNum();
  return total + current;
}

function expandCnNumbers(text) {
  let result = '';
  let buf = '';
  let hasUnit = false;

  for (const ch of text) {
    if (CN_DIGITS[ch] !== undefined || CN_UNITS[ch] || /\d/.test(ch)) {
      buf += ch;
      if (CN_UNITS[ch]) hasUnit = true;
    } else {
      if (buf && hasUnit) {
        result += String(parseCnNumber(buf));
      } else {
        result += buf;
      }
      result += ch;
      buf = '';
      hasUnit = false;
    }
  }
  if (buf && hasUnit) {
    result += String(parseCnNumber(buf));
  } else {
    result += buf;
  }
  return result;
}

function normalizeText(text) {
  let s = text.replace(PUNCT_RE, '');
  s = expandCnNumbers(s);
  s = s.replace(/\d+/g, m => digitsToChinese(m));
  return s;
}

function textSimilarity(a, b) {
  if (!a || !b) return 0;
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na.length === 0 || nb.length === 0) return 0;

  const freqB = new Map();
  for (const ch of nb) {
    freqB.set(ch, (freqB.get(ch) || 0) + 1);
  }

  let matches = 0;
  for (const ch of na) {
    const count = freqB.get(ch) || 0;
    if (count > 0) {
      matches++;
      freqB.set(ch, count - 1);
    }
  }
  return Math.round((matches / Math.max(na.length, nb.length)) * 100);
}

module.exports = { normalizeText, textSimilarity, similarityToScore };

function similarityToScore(sim) {
  if (sim >= 95) return { score: 95, feedback: 'Excellent: near-perfect recognition' };
  if (sim >= 80) return { score: 85, feedback: 'Good: high recognition accuracy' };
  if (sim >= 60) return { score: 70, feedback: 'Fair: some words misrecognized' };
  return { score: 50, feedback: 'Poor: significant recognition errors' };
}
