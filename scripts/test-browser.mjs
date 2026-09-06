import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const php = process.env.PORTAL_PHP || resolve(root, '.cache/php84/php.exe');
const directory = resolve(root, '.cache', `browser-${Date.now()}`);
mkdirSync(directory, { recursive: true });
const database = resolve(directory, 'database.sqlite');
writeFileSync(database, '');
const env = { ...process.env, APP_ENV: 'testing', APP_KEY: `base64:${randomBytes(32).toString('base64')}`, DB_CONNECTION: 'sqlite', DB_DATABASE: database, SESSION_DRIVER: 'file', CACHE_STORE: 'file', QUEUE_CONNECTION: 'database', MAIL_MAILER: 'log', APP_URL: 'http://127.0.0.1:8005' };
for (const args of [['artisan', 'migrate', '--force'], ['artisan', 'db:seed', '--class=BrowserTestSeeder', '--force']]) {
  const result = spawnSync(php, args, { cwd: resolve(root, 'backend'), env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
// Serve with local environment so browser tests exercise real CSRF middleware.
const backend = spawn(php, ['-S', '127.0.0.1:8005', '../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'], { cwd: resolve(root, 'backend/public'), env: { ...env, APP_ENV: 'local' }, stdio: 'ignore' });
const built = process.argv.includes('--built');
const frontend = spawn(process.execPath, built ? [resolve(root, 'scripts/preview-built.mjs')] : ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175', '--strictPort'], { cwd: resolve(root, 'frontend'), env: { ...process.env, PORTAL_API_TARGET: 'http://127.0.0.1:8005', PORTAL_PREVIEW_PORT: '5175' }, stdio: 'ignore' });
const worker = spawn(php, ['artisan', 'queue:work', '--sleep=1', '--tries=1', '--timeout=270'], { cwd: resolve(root, 'backend'), env, stdio: 'ignore', windowsHide: true });
async function ready(url) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(url)).ok) return; } catch { /* Server is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not start: ${url}`);
}
try {
  await ready('http://127.0.0.1:8005/up');
  await ready('http://127.0.0.1:5175');
  const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2).filter(arg => arg !== '--built')], { cwd: resolve(root, 'frontend'), stdio: 'inherit' });
  process.exitCode = await new Promise(resolve => child.on('exit', code => resolve(code ?? 1)));
} finally {
  backend.kill();
  frontend.kill();
  worker.kill();
}
