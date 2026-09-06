"""Offline network-policy and real local audio-conversion checks; --live adds a public source check."""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('media', Path(__file__).with_name('download-media.py'))
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)
root = Path(__file__).resolve().parent.parent
ffmpeg = root / '.cache/tools-bin'

class MediaTests(unittest.TestCase):
    def test_source_allowlist(self):
        for url in ['https://youtu.be/test', 'https://www.instagram.com/reel/test/', 'https://www.facebook.com/watch/?v=123']:
            media.validate_url(url)
        for url in ['http://youtu.be/test', 'https://127.0.0.1', 'https://youtube.com.evil.test/video', 'https://user@youtube.com/test', 'https://youtube.com:8080/test', 'file:///etc/passwd']:
            with self.assertRaises(ValueError): media.validate_url(url)

    def test_private_ipv4_ipv6_and_metadata_addresses_are_rejected(self):
        for address in ['127.0.0.1', '10.1.2.3', '192.168.1.2', '169.254.169.254', '::1', 'fc00::1', '::ffff:127.0.0.1', '0.0.0.0']:
            with self.assertRaises(ValueError): media.public_address(address)
        media.public_address('8.8.8.8')
        media.public_address('2606:4700:4700::1111')

    def test_real_mp3_conversion_from_local_synthetic_audio(self):
        binary = ffmpeg / ('ffmpeg.exe' if sys.platform == 'win32' else 'ffmpeg')
        if not binary.exists(): self.skipTest('Run npm run setup:media first')
        cache = root / '.cache'; cache.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='media-test-', dir=cache) as directory:
            output = Path(directory)
            subprocess.run([str(binary), '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:a', 'aac', str(output / 'fixture.m4a')], check=True)
            class FixtureDownloader:
                def __init__(self, options): self.options = options
                def __enter__(self): return self
                def __exit__(self, *args): pass
                def extract_info(self, url, download=False): return {'duration': 1, 'title': 'Synthetic sine wave'}
                def process_info(self, info): shutil.move(output / 'fixture.m4a', output / 'media.m4a')
            with patch.object(media.yt_dlp, 'YoutubeDL', FixtureDownloader), patch.object(media, 'guard_network'):
                result = media.download('https://youtu.be/test', 'audio', output, str(ffmpeg))
            data = (output / result['filename']).read_bytes()
            self.assertGreater(len(data), 1000)
            self.assertTrue(data.startswith(b'ID3') or data[0] == 255)
            self.assertEqual(result['filename'], 'audio.mp3')

if __name__ == '__main__':
    if '--live' in sys.argv:
        directory = root / '.cache/media-live-check'; directory.mkdir(exist_ok=True)
        try:
            print(json.dumps(media.download('https://www.youtube.com/watch?v=BaW_jenozKc', 'video', directory, str(ffmpeg))))
        except Exception as error:
            print(type(error).__name__ + ': ' + str(error))
            sys.exit(1)
    else:
        unittest.main()
