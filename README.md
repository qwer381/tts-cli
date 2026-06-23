# MIMO TTS CLI

CLI tool for MiMo-V2.5-TTS with voice clone, auto-prompt optimization, and ASR-based quality evaluation.

## Features

- **TTS Synthesis** — Text-to-speech via `mimo-v2.5-tts`
- **Voice Clone** — Clone any voice from a reference audio via `mimo-v2.5-tts-voiceclone`
- **Auto Prompt Optimization** — Uses `mimo-v2.5-pro` to generate and optimize voice prompts
- **ASR Quality Evaluation** — Uses `mimo-v2.5-asr` to verify speech accuracy
- **Text Similarity** — Chinese number normalization for accurate comparison (handles "十万" vs "100000", "3万1千零29" vs "31029")

## Installation

```bash
cd tts-cli
npm install
```

## Configuration

Set your API key:

```bash
node cli.js --set-key YOUR_API_KEY
```

View current configuration:

```bash
node cli.js --show-config
```

## Usage

### Basic TTS

```bash
node cli.js "你好，今天天气怎么样？"
```

### With Custom Prompt

```bash
node cli.js "你好世界" --prompt "温柔的女声"
```

### Voice Clone

Clone a voice from a reference audio file:

```bash
node cli.js "要合成的文本" --clone reference.wav
```

With optimization:

```bash
node cli.js "要合成的文本" --clone reference.wav --iterations 3 --quality 90
```

### Custom Output Path

```bash
node cli.js "你好" -o ./output.wav
```

### Custom Optimization Settings

```bash
node cli.js "你好" --iterations 10 --quality 90
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

## Development

```bash
npm test          # Run tests
node cli.js       # Run CLI directly
```

## License

MIT
