<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\Announcement;
use Illuminate\Console\Command;

class Announce extends Command
{
    protected $signature = 'input:announce
        {subject : The subject line, also the heading of the email}
        {--file= : A Markdown file with the body of the message}
        {--body= : The body as text, when it is short (Markdown)}
        {--button= : Text of a button under the message}
        {--url= : Where the button leads (default: the game)}
        {--to= : Send to this one email address only, for example to try it out}
        {--force : Do not ask before sending to everyone}';

    protected $description = 'Send a general message to players: all with an activated account who want news, or one address';

    public function handle(): int
    {
        $body = $this->option('file') ? @file_get_contents($this->option('file')) : $this->option('body');
        if (! is_string($body) || trim($body) === '') {
            $this->error('Give the message with --file=path/to/message.md or --body="...".');

            return self::FAILURE;
        }

        $announcement = new Announcement(
            $this->argument('subject'),
            trim($body),
            $this->option('button'),
            $this->option('url'),
        );

        if ($to = $this->option('to')) {
            $user = User::where('email', $to)->first();
            if (! $user) {
                $this->error("No account has the address $to.");

                return self::FAILURE;
            }

            $user->notify($announcement);
            $this->info("Sent to $to.");

            return self::SUCCESS;
        }

        // Only players who activated their account and have not turned news off
        $players = User::query()->whereNotNull('email_verified_at')->where('news_emails', true);
        $count = $players->count();

        if ($count === 0) {
            $this->info('Nobody to send to.');

            return self::SUCCESS;
        }
        if (! $this->option('force') && ! $this->confirm("Send \"{$this->argument('subject')}\" to $count players?")) {
            return self::SUCCESS;
        }

        $players->each(fn (User $user) => $user->notify($announcement));
        $this->info("Sent to $count players.");

        return self::SUCCESS;
    }
}
