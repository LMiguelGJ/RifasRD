<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CaptchaService;
use Illuminate\Http\JsonResponse;

class CaptchaController extends Controller
{
    public function show(CaptchaService $captcha): JsonResponse
    {
        $issued = $captcha->issue();

        return response()->json([
            'captcha_id' => $issued['captcha_id'],
            'captcha_svg' => $issued['captcha_svg'],
        ]);
    }
}
