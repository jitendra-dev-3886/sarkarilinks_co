<?php

namespace App\Application;

use Symfony\Component\Process\Process;

class AdvertisementExtractor
{
    public function extract(string $path): array
    {
        $process = new Process([config('advertisements.node'), '--max-old-space-size=512', config('advertisements.script'), $path]);
        $process->setTimeout(240);
        $process->run();
        if ($process->getExitCode() === 2) {
            $failure = json_decode($process->getOutput(), true);
            throw new AdvertisementRejected($failure['error']['code'] ?? 'invalid_document');
        }
        if (! $process->isSuccessful()) {
            throw new \RuntimeException('The advertisement extraction process failed.');
        }

        return json_decode($process->getOutput(), true, 512, JSON_THROW_ON_ERROR);
    }
}
