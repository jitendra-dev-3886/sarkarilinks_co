import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const environment = resolve(root, '.cache/tools-python');
const python = resolve(environment, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
function run(command, args) { const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', windowsHide: true }); if (result.error) throw result.error; if (result.status !== 0) process.exit(result.status || 1); }
if (!existsSync(python)) run(process.env.PORTAL_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), ['-m', 'venv', environment]);
run(python, ['-m', 'pip', 'install', '-r', 'scripts/requirements-media.txt', '--cache-dir', '.cache/pip']);
run(python, ['-c', "import imageio_ffmpeg,pathlib,shutil,os; target=pathlib.Path('.cache/tools-bin'); target.mkdir(exist_ok=True); shutil.copy2(imageio_ffmpeg.get_ffmpeg_exe(),target/('ffmpeg.exe' if os.name == 'nt' else 'ffmpeg'))"]);
console.log('Media worker installed. Keep the Laravel queue worker and scheduler running.');
