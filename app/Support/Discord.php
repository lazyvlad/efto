<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;

/**
 * Discord's "log in with" service (OAuth2): where to send a player to approve, and who they
 * turned out to be once Discord sends them back. Set up in config/services.php ("discord").
 */
class Discord
{
    private const AUTHORIZE = 'https://discord.com/oauth2/authorize';

    private const API = 'https://discord.com/api/v10';

    /**
     * Whether a Discord application has been set up for this site. Without one, nothing about
     * Discord is offered.
     */
    public static function enabled(): bool
    {
        return filled(config('services.discord.client_id')) && filled(config('services.discord.client_secret'));
    }

    /**
     * Discord's page asking the player to let this site see who they are.
     *
     * @param  string  $state  Sent back unchanged, to prove the answer belongs to this visitor.
     */
    public static function authorizeUrl(string $state): string
    {
        return self::AUTHORIZE.'?'.http_build_query([
            'client_id' => config('services.discord.client_id'),
            'redirect_uri' => route('discord.callback'),
            'response_type' => 'code',
            'scope' => 'identify email',
            'state' => $state,
            'prompt' => 'none',
        ]);
    }

    /**
     * The Discord account behind the code Discord sent the player back with, or null when
     * Discord would not say.
     *
     * @return array{id: string, name: string, email: ?string}|null  The email only when
     *                                                              Discord has verified it.
     */
    public static function account(string $code): ?array
    {
        $token = Http::asForm()->timeout(10)->post(self::API.'/oauth2/token', [
            'client_id' => config('services.discord.client_id'),
            'client_secret' => config('services.discord.client_secret'),
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => route('discord.callback'),
        ]);

        if ($token->failed() || blank($token->json('access_token'))) {
            return null;
        }

        $me = Http::withToken($token->json('access_token'))->timeout(10)->get(self::API.'/users/@me');

        if ($me->failed() || blank($me->json('id'))) {
            return null;
        }

        return [
            'id' => (string) $me->json('id'),
            'name' => (string) ($me->json('global_name') ?: $me->json('username')),
            'email' => $me->json('verified') && filled($me->json('email'))
                ? mb_strtolower($me->json('email'))
                : null,
        ];
    }
}
