<?php

return [
    'python' => env('MEDIA_PYTHON', base_path('../.cache/tools-python/'.(PHP_OS_FAMILY === 'Windows' ? 'Scripts/python.exe' : 'bin/python'))),
    'script' => env('MEDIA_SCRIPT', base_path('../scripts/download-media.py')),
    'ffmpeg' => env('MEDIA_FFMPEG', base_path('../.cache/tools-bin')),
];
