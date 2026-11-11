// Genererer .expo/types/router.d.ts (typede ruter) ved å starte Expo kort.
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const target = '.expo/types/router.d.ts';
const child = spawn('npx', ['expo', 'start', '--offline', '--port', '8199'], {
  env: { ...process.env, CI: '1' },
  stdio: 'ignore',
});
const started = Date.now();
const timer = setInterval(() => {
  const ready = fs.existsSync(target);
  if (ready || Date.now() - started > 120000) {
    clearInterval(timer);
    child.kill('SIGTERM');
    setTimeout(() => process.exit(ready ? 0 : 1), 500);
  }
}, 1000);
