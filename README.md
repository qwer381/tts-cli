# MIMO TTS CLI

CLI tool for MiMo-V2.5-TTS with voice clone, auto-prompt optimization, and ASR-based quality evaluation.

## Features

- **TTS Synthesis** — Text-to-speech via `mimo-v2.5-tts`
- **Voice Clone** — Clone any voice from a reference audio via `mimo-v2.5-tts-voiceclone`
- **Auto Prompt Optimization** — Uses `mimo-v2.5-pro` to generate and optimize voice prompts
- **ASR Quality Evaluation** — Uses `mimo-v2.5-asr` to verify speech accuracy
- **Text Similarity** — Chinese number normalization for accurate comparison (handles "十万" vs "100000", "3万1千零29" vs "31029")

## Installation

### Prerequisites

- Node.js >= 18
- npm
- MiMo API key (get one from [Xiaomi MiMo platform](https://platform.xiaomimimo.com))

### Steps

```bash
# Clone the repository
git clone https://github.com/qwer381/tts-cli.git
cd tts-cli

# Install dependencies
npm install

# Set your API key
node cli.js --set-key YOUR_API_KEY

# Verify installation
node cli.js --show-config

# Quick test
node cli.js "你好，测试一下" --iterations 1 --quality 0
```

### Optional: Global Install

```bash
npm link
# Now you can use 'mimo-tts' command globally
mimo-tts --show-config
```

## Configuration

Set your API key:

```bash
node cli.js --set-key YOUR_API_KEY
```

Or use environment variable:

```bash
# Linux/macOS
export MIMO_API_KEY=YOUR_API_KEY

# Windows (PowerShell)
$env:MIMO_API_KEY="YOUR_API_KEY"

# Windows (CMD)
set MIMO_API_KEY=YOUR_API_KEY
```

View current configuration:

```bash
node cli.js --show-config
```

## Usage

### Basic TTS

```bash
# Simple text-to-speech
node cli.js "你好，今天天气怎么样？"

# Output: output/speech_1782182661593.wav
```

### With Custom Voice Prompt

```bash
# Use a specific voice style
node cli.js "你好世界" --prompt "温柔的女声"

# Professional narration style
node cli.js "各位观众大家好" --prompt "专业新闻播报风格，沉稳大气"

# Friendly conversation style
node cli.js "嘿，最近怎么样？" --prompt "轻松友好的聊天语气"
```

### Voice Clone

Clone a voice from a reference audio file:

```bash
# Basic voice clone
node cli.js "要合成的文本" --clone reference.wav

# Voice clone with custom prompt
node cli.js "要合成的文本" --clone reference.wav --prompt "保持自然语调"

# Voice clone with quality optimization
node cli.js "要合成的文本" --clone reference.wav --iterations 3 --quality 90
```

### Batch Processing

```bash
# Linux/macOS
for text in "你好" "谢谢" "再见"; do
  node cli.js "$text" -o "output/${text}.wav"
done

# Windows (PowerShell)
foreach ($text in "你好", "谢谢", "再见") {
  node cli.js $text -o "output/$text.wav"
}
```

### Custom Output Path

```bash
node cli.js "你好" -o ./my-audio.wav
node cli.js "你好" -o ~/Desktop/output.wav
```

### Quality Optimization

```bash
# Higher quality threshold (more iterations to reach target)
node cli.js "重要演示内容" --quality 95

# More iterations for better results
node cli.js "长文本内容" --iterations 10

# Both settings
node cli.js "关键内容" --iterations 10 --quality 95
```

## Options

| Option | Description |
|--------|-------------|
| `-o, --output <path>` | Output file path |
| `-p, --prompt <prompt>` | Initial voice prompt |
| `-c, --clone <ref-audio>` | Voice clone mode: path to reference audio |
| `-i, --iterations <n>` | Maximum optimization iterations (default: 5) |
| `-q, --quality <n>` | Quality threshold 0-100 (default: 80) |
| `--auto` | Auto-optimize without confirmation (default) |
| `--manual` | Manual optimization mode |
| `--set-key <key>` | Set API key |
| `--show-config` | Show current configuration |

## API Reference

This tool uses the MiMo API at `https://token-plan-cn.xiaomimimo.com/v1` (OpenAI-compatible).

### Models Used

| Model | Purpose |
|-------|---------|
| `mimo-v2.5-tts` | Text-to-speech synthesis |
| `mimo-v2.5-tts-voiceclone` | Voice cloning |
| `mimo-v2.5-pro` | Prompt generation and optimization |
| `mimo-v2.5-asr` | Speech recognition for quality evaluation |

### Protocol

All models use the chat completions protocol:

- **TTS**: `messages: [{role: user, content: style}, {role: assistant, content: text}]` + `audio: {format: 'pcm16', voice: 'Chloe'}`
- **VoiceClone**: Same as TTS, but `audio.voice` is a DataURL of the reference audio
- **ASR**: `messages: [{role: user, content: [{type: 'input_audio', input_audio: {data: 'data:audio/wav;base64,...', wav_format: 'wav'}}]}]`

## Evaluation

Run the evaluation suite:

```bash
node eval.js
```

Results: 15/15 pass, average similarity 98%, average score 92/100.

| Category | Avg Similarity | Avg Score |
|----------|---------------|-----------|
| Daily conversation | 100% | 95 |
| Poetry | 100% | 95 |
| News | 96% | 95 |
| Numbers/Dates | 100% | 95 |
| Technology | 98% | 95 |
| Long text | 100% | 95 |
| Children's songs | 100% | 95 |
| Tongue twisters | 100% | 95 |
| Recipes | 93% | 85 |
| Weather | 94% | 85 |

## Project Structure

```
tts-cli/
├── cli.js              # CLI entry point
├── api.js              # API calls (TTS, VoiceClone, ASR)
├── optimizer.js        # Auto-prompt optimization loop
├── config.js           # Configuration management
├── text-similarity.js  # Text normalization and similarity
├── eval.js             # Evaluation suite (15 test cases)
├── package.json
├── README.md
├── LICENSE
├── tests/
│   ├── api.test.js
│   ├── cli.test.js
│   ├── optimizer.test.js
│   └── integration.test.js
├── eval-report.json    # Latest evaluation results
└── output/             # Generated audio files
```

## Development

```bash
npm test          # Run tests
node cli.js       # Run CLI directly
```

## License

MIT
