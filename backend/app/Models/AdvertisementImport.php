<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdvertisementImport extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['path', 'sha256'];

    protected function casts(): array
    {
        return ['suggestions' => 'array', 'extraction' => 'array'];
    }
}
