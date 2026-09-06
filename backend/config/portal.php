<?php

return [
    'url' => env('PORTAL_PUBLIC_URL', env('APP_URL', 'http://localhost:5173')),
    'shell' => env('PORTAL_HTML_SHELL', base_path('../frontend/dist/index.html')),
];
