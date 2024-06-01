import { LogLevel, attachLogger, err, info, warn } from './index'

attachLogger({
  minLevel: LogLevel.INFO,
  messageLimit: 50
});

setInterval(() => {
  info('Some info message.');
  err('lorem ipsum dolor sit amet, consectetur adipiscing elit. lorem ipsum dolor sit amet, consectetur adipiscing elit. lorem ipsum dolor sit amet, consectetur adipiscing elit.  lorem ipsum dolor sit amet, consectetur adipiscing elit.');
  warn('Some warning message.');
}, 1000);