<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // "Log in with Discord" and activating an account by connecting Discord
    // (App\Support\Discord). Left empty, nothing about Discord is offered.
    'discord' => [
        'client_id' => env('DISCORD_CLIENT_ID'),
        'client_secret' => env('DISCORD_CLIENT_SECRET'),
        // A channel webhook: games that were played are posted there (App\Support\DiscordFeed)
        'webhook' => env('DISCORD_WEBHOOK_URL'),
        // A bot in the same server, allowed to add reactions in that channel: it reacts to each
        // post (a webhook cannot). Left empty, the posts go out without reactions.
        'bot_token' => env('DISCORD_BOT_TOKEN'),
        // The bot's reactions on every post, in order: an emoji, or a server's own as "name:id"
        'reactions' => array_values(array_filter(array_map('trim', explode(',', (string) env(
            'DISCORD_REACTIONS', 'ogino:940682399086432336,idelazo:940679974803898388,🏹'
        ))))),
    ],

    // Google Analytics: the measurement id ("G-..."). Left empty, visits are not counted.
    'google' => [
        'analytics' => env('GOOGLE_ANALYTICS_ID'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
