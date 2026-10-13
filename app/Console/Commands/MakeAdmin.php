<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class MakeAdmin extends Command
{
    protected $signature = 'input:admin
        {email : The email address of the account}
        {--remove : Take the admin section away from this account}';

    protected $description = 'Let an account use the admin section (/admin), or stop it';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();

        if (! $user) {
            $this->error('No account has the address '.$this->argument('email').'.');

            return self::FAILURE;
        }

        $user->forceFill(['is_admin' => ! $this->option('remove')])->save();

        $this->info($user->is_admin
            ? "{$user->name} can now use the admin section."
            : "{$user->name} can no longer use the admin section.");

        return self::SUCCESS;
    }
}
