"""Download one permitted public video through a bounded, private worker."""
import ipaddress
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
from urllib.parse import urlsplit

import yt_dlp

ALLOWED_HOSTS = {'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'instagram.com', 'www.instagram.com', 'facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.watch'}
MAX_BYTES = 50 * 1024 * 1024

def validate_url(url):
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname not in ALLOWED_HOSTS or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError('Unsupported URL')

def public_address(value):
    address = ipaddress.ip_address(value.split('%')[0])
    if getattr(address, 'ipv4_mapped', None):
        address = address.ipv4_mapped
    if not address.is_global:
        raise ValueError('Private network access is prohibited')

def guard_network():
    resolve = socket.getaddrinfo
    connect = socket.socket.connect
    def safe_resolve(*args, **kwargs):
        results = resolve(*args, **kwargs)
        for result in results:
            public_address(result[4][0])
        return results
    def safe_connect(sock, address):
        if isinstance(address, tuple):
            public_address(address[0])
        return connect(sock, address)
    socket.getaddrinfo = safe_resolve
    socket.socket.connect = safe_connect

class QuietLogger:
    def debug(self, message): pass
    def info(self, message): pass
    def warning(self, message): pass
    def error(self, message): pass

def download(url, kind, output, ffmpeg):
    validate_url(url)
    if kind not in ('audio', 'video'):
        raise ValueError('Unsupported format')
    guard_network()
    def limit(progress):
        if progress.get('downloaded_bytes', 0) > MAX_BYTES:
            raise ValueError('Download exceeds limit')
    options = {
        'quiet': True, 'no_warnings': True, 'logger': QuietLogger(), 'noplaylist': True,
        'allowed_extractors': ['youtube', 'instagram', 'facebook'], 'proxy': '',
        'socket_timeout': 15, 'retries': 1, 'fragment_retries': 1, 'concurrent_fragment_downloads': 1,
        'max_filesize': MAX_BYTES, 'progress_hooks': [limit], 'ffmpeg_location': ffmpeg,
        'fixup': 'never', 'hls_prefer_native': True,
        'external_downloader': {'default': 'native'},
        'outtmpl': str(output / 'media.%(ext)s'), 'restrictfilenames': True,
        'js_runtimes': {'node': {}}, 'remote_components': set(),
        'format': 'bestaudio[filesize<=?52428800]/best[filesize<=?52428800]' if kind == 'audio' else 'best[height<=720][ext=mp4][filesize<=?52428800]/best[height<=720][filesize<=?52428800]',
    }
    with yt_dlp.YoutubeDL(options) as downloader:
        info = downloader.extract_info(url, download=False)
        if not info or info.get('_type') in ('playlist', 'multi_video') or info.get('is_live') or info.get('has_drm') or not info.get('duration') or info['duration'] > 600:
            raise ValueError('Use one non-live public video under ten minutes')
        downloader.process_info(info)
    files = [file for file in output.iterdir() if file.is_file() and file.suffix in ('.mp3', '.mp4', '.webm', '.mkv', '.m4a')]
    if len(files) != 1 or files[0].stat().st_size > MAX_BYTES:
        raise ValueError('No usable media output')
    if kind == 'audio':
        source = files[0]
        target = output / 'audio.mp3'
        binary = Path(ffmpeg) / ('ffmpeg.exe' if os.name == 'nt' else 'ffmpeg')
        # Only the downloaded local file is passed to FFmpeg; no remote protocols.
        subprocess.run([str(binary), '-nostdin', '-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'file,pipe', '-i', str(source), '-vn', '-codec:a', 'libmp3lame', '-b:a', '128k', '-fs', str(MAX_BYTES), '-y', str(target)], check=True, capture_output=True, timeout=60)
        source.unlink()
        files = [target]
    if not files[0].stat().st_size or files[0].stat().st_size > MAX_BYTES:
        raise ValueError('Invalid output size')
    return {'filename': files[0].name, 'title': info.get('title', 'Media download')}

if __name__ == '__main__':
    try:
        destination = Path(sys.argv[3]).resolve(strict=True)
        print(json.dumps(download(sys.argv[1], sys.argv[2], destination, sys.argv[4])))
    except Exception:
        print(json.dumps({'error': 'source_unavailable'}))
        sys.exit(1)
