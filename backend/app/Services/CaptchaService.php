<?php

namespace App\Services;

/**
 * Self-contained math captcha: the id carries an HMAC of the answer plus an
 * expiry, both signed with the app key. No storage, no Redis.
 */
class CaptchaService
{
    private const TTL_SECONDS = 600;

    /** @return array{captcha_id: string, captcha_svg: string, answer: int} */
    public function issue(): array
    {
        $a = random_int(1, 9);
        $b = random_int(1, 9);
        $answer = $a + $b;

        $payload = [
            'h' => $this->answerHash($answer),
            'exp' => time() + self::TTL_SECONDS,
        ];
        $body = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
        $captchaId = $body . '.' . hash_hmac('sha256', $body, $this->key());

        return [
            'captcha_id' => $captchaId,
            'captcha_svg' => $this->svg("{$a} + {$b}"),
            'answer' => $answer,
        ];
    }

    public function verify(string $captchaId, string $answer): bool
    {
        [$body, $signature] = array_pad(explode('.', $captchaId, 2), 2, '');

        if ($body === '' || ! hash_equals(hash_hmac('sha256', $body, $this->key()), $signature)) {
            return false;
        }

        $payload = json_decode(base64_decode(strtr($body, '-_', '+/')), true);

        if (! is_array($payload) || ($payload['exp'] ?? 0) < time()) {
            return false;
        }

        return hash_equals($payload['h'] ?? '', $this->answerHash((int) $answer));
    }

    private function answerHash(int $answer): string
    {
        return hash_hmac('sha256', (string) $answer, $this->key());
    }

    private function key(): string
    {
        return (string) config('app.key');
    }

    private function svg(string $question): string
    {
        $noise = '';
        for ($i = 0; $i < 6; $i++) {
            $x1 = random_int(0, 160);
            $y1 = random_int(0, 50);
            $noise .= sprintf('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#999" stroke-width="1"/>', $x1, $y1, $x1 + random_int(5, 30), $y1 + random_int(-12, 12));
        }

        return sprintf(
            '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="50" viewBox="0 0 160 50">'
            . '<rect width="160" height="50" fill="#f4f4f5"/>%s'
            . '<text x="80" y="33" text-anchor="middle" font-family="monospace" font-size="24" fill="#18181b">%s</text></svg>',
            $noise,
            htmlspecialchars($question, ENT_QUOTES),
        );
    }
}
