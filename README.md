# log-panel
Simple plug'n'log panel for your app.

# Installation
```bash
npm install log-panel
```

# Usage
```ts
import { attachLogger, info, err, warn, detachLogger } from 'log-panel';

attachLogger({});

info('Some info message');
warn('Some warning message');
err('Some error message.');

detachLogger();
```