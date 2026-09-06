import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const php = process.env.PORTAL_PHP || (existsSync(resolve(root, '.cache/php84/php.exe')) ? resolve(root, '.cache/php84/php.exe') : 'php');
const children = [];
function start(command, args, directory) {
  const child = spawn(command, args, { cwd: resolve(root, directory), stdio: 'inherit', windowsHide: true });
  child.on('error', error => { console.error(error.message); shutdown(1); });
  child.on('exit', code => { if (code) shutdown(code); });
  children.push(child);
}
let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach(child => child.kill());
  process.exitCode = code;
}
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
start(php, ['-d', 'upload_max_filesize=10M', '-d', 'post_max_size=12M', '-S', '127.0.0.1:8000', '../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'], 'backend/public');
start(php, ['artisan', 'schedule:work'], 'backend');
start(php, ['artisan', 'queue:work', '--sleep=1', '--tries=1', '--timeout=270'], 'backend');
start(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], 'frontend');
console.log('\nPortal: http://127.0.0.1:5173\nStaff: http://127.0.0.1:5173/admin\nKeep this terminal open. Ctrl+C stops the services.\n');
