# Changelog

## [1.1.0] - 2026-06-23

### Added
- VoiceClone: clone voice from reference audio (`--clone reference.wav`)
- VoiceDesign: design custom voice by description (`--design "warm female voice"`)
- Multi-voice selection: choose built-in voices (`--voice Chloe`)
- Batch processing: synthesize multiple texts from file (`--batch texts.txt`)
- Concurrent batch requests (`--concurrent 3`)
- Progress bar with ora for batch mode
- Multi-API key rotation (`--add-key`, `--remove-key`, `--list-keys`)
- Proxy support (`--set-proxy http://host:port`)
- Verbose mode (`--verbose`)
- GitHub Actions CI (Node 18/20/22)
- Text similarity unit tests (38 tests total)

### Improved
- Better error messages: 429 rate limit auto-retry, 401 immediate error
- Error info includes failure reason and retry count

### Fixed
- CLI version now reads from package.json instead of hardcoded string

## [1.0.0] - 2026-06-23

### Added
- TTS synthesis via `mimo-v2.5-tts`
- Auto prompt optimization via `mimo-v2.5-pro`
- ASR quality evaluation via `mimo-v2.5-asr`
- Text similarity with Chinese number normalization
- 15-case evaluation suite
- CLI with --set-key, --prompt, --iterations, --quality options
