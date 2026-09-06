<?php

namespace App\Domain\Access;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];
}
