// Genererer .expo/types/router.d.ts (typede ruter) ved å starte Expo kort.
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const target = '.expo/types/router.d.ts';
// Fjern gammel fil, ellers tror vi at genereringen er ferdig før den har kjørt.
fs.rmSync(target, { force: true });

// detached: egen prosessgruppe, slik at vi kan stoppe hele treet (npx + expo + metro).
const child = spawn('npx', ['expo', 'start', '--offline', '--port', '8199'], {
  env: { ...process.env, CI: '1' },
  stdio: 'ignore',
  detached: true,
});

function stop(code) {
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    // Prosessen er allerede avsluttet.
  }
  setTimeout(() => process.exit(code), 500);
}

const started = Date.now();
const timer = setInterval(() => {
  const ready = fs.existsSync(target);
  if (ready || Date.now() - started > 120000) {
    clearInterval(timer);
    stop(ready ? 0 : 1);
  }
}, 1000);
