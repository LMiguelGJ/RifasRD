<?php

namespace App\Http\Controllers\Api;

use App\Enums\RaffleStatus;
use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\Category;
use App\Models\PrizeNumber;
use App\Models\Raffle;
use App\Models\Setting;
use App\Models\Winner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function categories(): JsonResponse
    {
        return response()->json(Category::orderBy('sort_order', 'desc')->get());
    }

    public function raffles(Request $request): JsonResponse
    {
        $query = Raffle::query()
            ->with(['category', 'image', 'ticketCombos'])
            ->where('status', '!=', 'draft')
            ->orderBy('id');

        if ($request->filled('category_id')) {
            $query->where('category_id', (int) $request->input('category_id'));
        }

        $perPage = min(max((int) $request->input('per_page', 50), 1), 100);

        return response()->json($query->paginate($perPage));
    }

    public function show(Raffle $raffle): JsonResponse
    {
        abort_if($raffle->status === RaffleStatus::Draft, 404);

        return response()->json($raffle->load(['category', 'image', 'ticketCombos']));
    }

    public function prizeNumbers(Raffle $raffle): JsonResponse
    {
        return response()->json(PrizeNumber::where('raffle_id', $raffle->id)->orderBy('sort_order')->get());
    }

    public function winners(Request $request): JsonResponse
    {
        $query = Winner::query()
            ->with(['raffle', 'ticket', 'participant', 'portraitImage'])
            ->orderByDesc('drawn_at')
            ->orderByDesc('id');

        if ($request->input('kind') === 'main') {
            $query->where('winner_type', 'main');
        }

        $limit = min(max((int) $request->input('limit', 50), 1), 100);

        return response()->json($query->limit($limit)->get());
    }

    public function bankAccounts(): JsonResponse
    {
        return response()->json(
            BankAccount::with('image')->where('is_active', true)->orderBy('sort_order')->get(),
        );
    }

    public function orderBlock(): JsonResponse
    {
        $block = Setting::orderBlock();

        return response()->json([
            'blocked' => (bool) ($block['blocked'] ?? false),
            'message' => $block['message'] ?? null,
        ]);
    }
}
