// Utility untuk formatting log messages

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

class Logger {
  constructor() {
    this.enableColors = process.stdout.isTTY;
  }

  formatTime() {
    const now = new Date();
    const time = now.toLocaleTimeString('id-ID', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return `[${time}]`;
  }

  colorize(text, color) {
    if (!this.enableColors) return text;
    return `${color}${text}${colors.reset}`;
  }

  info(message, ...args) {
    const time = this.colorize(this.formatTime(), colors.dim);
    const prefix = this.colorize('ℹ', colors.brightCyan) + this.colorize(' INFO', colors.brightCyan);
    console.log(`${time} ${prefix} ${message}`, ...args);
  }

  success(message, ...args) {
    const time = this.colorize(this.formatTime(), colors.dim);
    const prefix = this.colorize('✓', colors.brightGreen) + this.colorize(' SUCCESS', colors.brightGreen);
    console.log(`${time} ${prefix} ${message}`, ...args);
  }

  error(message, ...args) {
    const time = this.colorize(this.formatTime(), colors.dim);
    const prefix = this.colorize('✗', colors.brightRed) + this.colorize(' ERROR', colors.brightRed);
    console.error(`${time} ${prefix} ${message}`, ...args);
  }

  warning(message, ...args) {
    const time = this.colorize(this.formatTime(), colors.dim);
    const prefix = this.colorize('⚠', colors.brightYellow) + this.colorize(' WARNING', colors.brightYellow);
    console.warn(`${time} ${prefix} ${message}`, ...args);
  }

  debug(message, ...args) {
    const time = this.colorize(this.formatTime(), colors.dim);
    const prefix = this.colorize('🔍', colors.brightBlue) + this.colorize(' DEBUG', colors.brightBlue);
    console.log(`${time} ${prefix} ${message}`, ...args);
  }

  whatsapp(message, ...args) {
    const time = this.colorize(this.formatTime(), colors.dim);
    const prefix = this.colorize('📱', colors.brightMagenta) + this.colorize(' WHATSAPP', colors.brightMagenta);
    console.log(`${time} ${prefix} ${message}`, ...args);
  }

  connection(message, ...args) {
    const time = this.colorize(this.formatTime(), colors.dim);
    const prefix = this.colorize('🔌', colors.brightCyan) + this.colorize(' CONNECTION', colors.brightCyan);
    console.log(`${time} ${prefix} ${message}`, ...args);
  }

  message(message, ...args) {
    const time = this.colorize(this.formatTime(), colors.dim);
    const prefix = this.colorize('📨', colors.brightMagenta) + this.colorize(' MESSAGE', colors.brightMagenta);
    console.log(`${time} ${prefix} ${message}`, ...args);
  }

  api(message, ...args) {
    const time = this.colorize(this.formatTime(), colors.dim);
    const prefix = this.colorize('🌐', colors.brightGreen) + this.colorize(' API', colors.brightGreen);
    console.log(`${time} ${prefix} ${message}`, ...args);
  }

  separator(char = '─', length = 60) {
    const line = char.repeat(length);
    console.log(this.colorize(line, colors.dim));
  }

  header(title) {
    this.separator('═', 60);
    const header = `  ${title.toUpperCase()}`;
    console.log(this.colorize(header, colors.bright + colors.brightCyan));
    this.separator('═', 60);
  }
}

export const logger = new Logger();

