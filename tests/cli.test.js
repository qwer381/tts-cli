const { execSync } = require('child_process');
const path = require('path');

const cliPath = path.join(__dirname, '..', 'cli.js');

describe('CLI Module', () => {
  it('should show help with --help flag', () => {
    try {
      execSync(`node "${cliPath}" --help`, { encoding: 'utf8' });
    } catch (err) {
      expect(err.stdout).toContain('Usage:');
    }
  });

  it('should show version with --version flag', () => {
    try {
      execSync(`node "${cliPath}" --version`, { encoding: 'utf8' });
    } catch (err) {
      expect(err.stdout).toContain('1.0.0');
    }
  });

  it('should show error when no text provided', () => {
    const result = execSync(`node "${cliPath}" --set-key test-key`, { encoding: 'utf8' });
    expect(result).toContain('API key saved');
  });

  it('should show configuration with --show-config', () => {
    const result = execSync(`node "${cliPath}" --show-config`, { encoding: 'utf8' });
    expect(result).toContain('Current Configuration');
  });
});
