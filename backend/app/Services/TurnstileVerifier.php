<?php

namespace App\Services;

/**
 * Cloudflare Turnstile siteverify. Only used when TURNSTILE_SECRET_KEY is set;
 * failures fail closed (no ticket is sold without a valid token).
 */
class TurnstileVerifier
{
    public function verify(string $token, string $remoteIp = ''): bool
    {
        $secret = (string) config('services.turnstile.secret');

        if ($secret === '' || $token === '') {
            return false;
        }

        $payload = http_build_query([
            'secret' => $secret,
            'response' => $token,
            'remoteip' => $remoteIp,
        ]);

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => $payload,
                'timeout' => 10,
                'ignore_errors' => true,
            ],
        ]);

        $raw = @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $context);

        if ($raw === false) {
            return false;
        }

        $result = json_decode($raw, true);

        return (bool) ($result['success'] ?? false);
    }
}
