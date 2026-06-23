# MIMO TTS CLI

CLI tool for mimo-v2.5-tts with auto-prompt optimization using MiMo-V2.5-Pro.

## Installation

```bash
cd tts-cli
npm install
npm link  # Optional: makes 'mimo-tts' command available globally
```

## Configuration

Set your API key:

```bash
mimo-tts --set-key YOUR_API_KEY
```

View current configuration:

```bash
mimo-tts --show-config
```

## Usage

### Basic Usage

```bash
mimo-tts "Hello, how are you today?"
```

### With Custom Prompt

```bash
mimo-tts "Hello world" --prompt "Warm and friendly female voice"
```

### Custom Output Path

```bash
mimo-tts "Hello" -o ./my-audio.mp3
```

### Custom Optimization Settings

```bash
mimo-tts "Hello" --iterations 10 --quality 90
```

### Manual Mode (with confirmation)

```bash
mimo-tts "Hello" --manual
```

## Options

- `-o, --output <path>`: Output file path
- `-p, --prompt <prompt>`: Initial voice prompt
- `-i, --iterations <n>`: Maximum optimization iterations (default: 5)
- `-q, --quality <n>`: Quality threshold 0-100 (default: 80)
- `--auto`: Auto-optimize without confirmation (default)
- `--manual`: Manual optimization mode
- `--set-key <key>`: Set API key
- `--show-config`: Show current configuration

## Environment Variables

- `MIMO_API_KEY`: API key (alternative to --set-key)

## Development

```bash
npm test          # Run tests
npm run start     # Run CLI directly
```

## License

MIT
