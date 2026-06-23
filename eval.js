const fs = require('fs');
const path = require('path');
const api = require('./api');
const { textSimilarity, similarityToScore } = require('./text-similarity');

const TESTS = [
  { id: 1,  category: '日常口语',   text: '你好，今天天气怎么样？' },
  { id: 2,  category: '日常口语',   text: '今天我去了一家新开的咖啡店，点了一杯美式和一份提拉米苏，味道还不错，推荐给大家。' },
  { id: 3,  category: '古诗词',     text: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。' },
  { id: 4,  category: '古诗词',     text: '床前明月光，疑是地上霜。举头望明月，低头思故乡。' },
  { id: 5,  category: '新闻播报',   text: '各位观众大家好，欢迎收看今天的新闻联播。首先来看国内消息，我国科学家在量子计算领域取得重大突破。' },
  { id: 6,  category: '新闻播报',   text: '据报道，北京时间今天凌晨3点47分，一颗直径约2.5公里的小行星以每秒15.3公里的速度掠过地球。' },
  { id: 7,  category: '数字日期',   text: '今天是2026年6月23日，星期二。' },
  { id: 8,  category: '数字日期',   text: '联系电话是13800138000，邮编100000。' },
  { id: 9,  category: '科技',       text: '小米公司发布了最新的MiMo大模型，在多项基准测试中表现优异，特别是在中文理解和语音合成方面。' },
  { id: 10, category: '科技',       text: '人工智能正在深刻改变我们的生活方式，从智能家居到自动驾驶，从医疗诊断到教育创新，AI技术无处不在。' },
  { id: 11, category: '长文本',     text: '各位观众大家好，欢迎收看今天的新闻联播。首先来看国内消息，我国科学家在量子计算领域取得重大突破，成功研制出新一代超导量子处理器。该处理器拥有超过1000个量子比特，运算速度比上一代提升了10倍，为实现通用量子计算奠定了坚实基础。' },
  { id: 12, category: '儿歌',       text: '小星星，亮晶晶，满天都是小星星，挂在天空放光明，好像许多小眼睛。' },
  { id: 13, category: '绕口令',     text: '四是四，十是十，十四是十四，四十是四十。' },
  { id: 14, category: '菜谱',       text: '首先将鸡蛋打入碗中，加入少许盐和料酒，搅拌均匀。然后热锅凉油，倒入蛋液，翻炒至金黄色即可出锅。' },
  { id: 15, category: '天气预报',   text: '今天白天多云转晴，最高气温32度，最低气温24度，东南风3到4级，空气质量良好。' },
];

const OUTPUT_DIR = path.join(__dirname, 'eval-output');
const REPORT_PATH = path.join(__dirname, 'eval-report.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runEval() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  MiMo TTS + ASR 评测`);
  console.log(`  用例数: ${TESTS.length}`);
  console.log(`${'='.repeat(70)}\n`);

  const results = [];
  let passCount = 0;

  for (const t of TESTS) {
    const tag = `[${String(t.id).padStart(2)}][${t.category}]`;
    process.stdout.write(`${tag} TTS "${t.text.substring(0, 30)}..." `);

    let ttsMs = 0, asrMs = 0;
    let audioPath = null, recognized = null, similarity = 0, score = 0;
    let error = null;

    try {
      // TTS
      const t0 = Date.now();
      const wav = await api.generateSpeech(t.text, 'Clear, natural narration tone.');
      ttsMs = Date.now() - t0;
      audioPath = path.join(OUTPUT_DIR, `case_${String(t.id).padStart(2, '0')}.wav`);
      fs.writeFileSync(audioPath, wav);
      const sizeKB = (wav.length / 1024).toFixed(1);

      // ASR
      const t1 = Date.now();
      recognized = await api.transcribeAudio(audioPath);
      asrMs = Date.now() - t1;

      // Similarity
      similarity = textSimilarity(t.text, recognized);

      score = similarityToScore(similarity).score;
      const passed = score >= 80;
      if (passed) passCount++;

      const status = passed ? 'PASS' : 'FAIL';
      console.log(`${status}  sim=${similarity}%  score=${score}  tts=${ttsMs}ms  asr=${asrMs}ms  ${sizeKB}KB`);
      if (!passed) {
        console.log(`${' '.repeat(tag.length + 1)}  原文: ${t.text}`);
        console.log(`${' '.repeat(tag.length + 1)}  识别: ${recognized}`);
      }
    } catch (e) {
      error = e.message;
      console.log(`ERR  ${error}`);
    }

    results.push({
      id: t.id, category: t.category, text: t.text,
      audioPath, recognized, similarity, score, error,
      ttsMs, asrMs
    });

    await sleep(500);
  }

  // Summary
  const validResults = results.filter(r => !r.error);
  const avgSim = validResults.length
    ? Math.round(validResults.reduce((s, r) => s + r.similarity, 0) / validResults.length)
    : 0;
  const avgScore = validResults.length
    ? Math.round(validResults.reduce((s, r) => s + r.score, 0) / validResults.length)
    : 0;
  const avgTts = validResults.length
    ? Math.round(validResults.reduce((s, r) => s + r.ttsMs, 0) / validResults.length)
    : 0;
  const avgAsr = validResults.length
    ? Math.round(validResults.reduce((s, r) => s + r.asrMs, 0) / validResults.length)
    : 0;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  评测结果`);
  console.log(`${'='.repeat(70)}`);
  console.log(`  通过: ${passCount}/${validResults.length}`);
  console.log(`  平均相似度: ${avgSim}%`);
  console.log(`  平均分数: ${avgScore}/100`);
  console.log(`  平均TTS耗时: ${avgTts}ms`);
  console.log(`  平均ASR耗时: ${avgAsr}ms`);

  // Per-category
  const cats = {};
  for (const r of validResults) {
    if (!cats[r.category]) cats[r.category] = { sims: [], scores: [] };
    cats[r.category].sims.push(r.similarity);
    cats[r.category].scores.push(r.score);
  }
  console.log(`\n  分类统计:`);
  for (const [cat, data] of Object.entries(cats)) {
    const avgS = Math.round(data.sims.reduce((a, b) => a + b, 0) / data.sims.length);
    const avgSc = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
    console.log(`    ${cat.padEnd(8)}  平均相似度=${avgS}%  平均分数=${avgSc}`);
  }
  console.log(`${'='.repeat(70)}\n`);

  // Save report
  const report = { timestamp: new Date().toISOString(), summary: { passCount, total: validResults.length, avgSim, avgScore, avgTts, avgAsr }, categories: {}, results };
  for (const [cat, data] of Object.entries(cats)) {
    report.categories[cat] = {
      avgSimilarity: Math.round(data.sims.reduce((a, b) => a + b, 0) / data.sims.length),
      avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
    };
  }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`  报告已保存: ${REPORT_PATH}`);
  console.log(`  音频目录: ${OUTPUT_DIR}`);
}

runEval().catch(e => { console.error('Fatal:', e); process.exit(1); });
