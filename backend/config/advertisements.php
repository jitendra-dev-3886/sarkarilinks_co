<?php

return [
    'node' => env('ADVERTISEMENT_NODE', 'node'),
    'script' => env('ADVERTISEMENT_SCRIPT', base_path('../scripts/extract-advertisement.mjs')),
];
