<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Enums\RaffleStatus;
use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\Order;
use App\Models\Participant;
use App\Models\Raffle;
use App\Models\Ticket;
use App\Models\TicketCombo;
use App\Services\CaptchaService;
use App\Services\TurnstileVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutController extends Controller
{
    public function storeParticipant(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'cedula' => ['nullable', 'string', 'max:20'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:160'],
        ]);

        $phone = $this->normalizePhone($data['phone']);

        $participant = Participant::firstOrCreate(
            ['phone' => $phone],
            [
                'name' => $data['name'],
                'cedula' => $data['cedula'] ?? null,
                'email' => $data['email'] ?? null,
            ],
        );

        return response()->json(['participant' => ['id' => $participant->id]]);
    }

    public function checkout(Request $request, Raffle $raffle, CaptchaService $captcha, TurnstileVerifier $turnstile): JsonResponse
    {
        // Honeypot: bots fill hidden fields. Silent rejection, no hints.
        if ($request->input('website')) {
            return response()->json(['message' => 'Invalid request.'], 422);
        }

        $data = $request->validate([
            'customer_name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30'],
            'cedula' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:160'],
            'participant_id' => ['required', 'integer', 'exists:participants,id'],
            'bank_account_id' => ['required', 'integer', 'exists:bank_accounts,id'],
            'ticket_combo_id' => ['nullable', 'integer'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'voucher' => ['required', 'file', 'mimes:jpeg,jpg,png,pdf', 'max:10240'],
            'captcha_id' => ['nullable', 'string', 'max:512'],
            'captcha_answer' => ['nullable', 'string', 'max:10'],
            'turnstile_token' => ['nullable', 'string', 'max:1024'],
        ]);

        if ($raffle->status !== RaffleStatus::Active) {
            throw ValidationException::withMessages(['raffle' => ['This raffle is not open for sales.']]);
        }

        if ($raffle->draw_at !== null && $raffle->draw_at->isPast()) {
            throw ValidationException::withMessages(['raffle' => ['The draw has already happened.']]);
        }

        $bankAccount = BankAccount::query()
            ->whereKey($data['bank_account_id'])
            ->where('is_active', true)
            ->first();
        if ($bankAccount === null) {
            throw ValidationException::withMessages(['bank_account_id' => ['La cuenta bancaria ya no está disponible.']]);
        }

        if ($this->protectedByTurnstile()) {
            if (! $turnstile->verify((string) ($data['turnstile_token'] ?? ''), $request->ip())) {
                throw ValidationException::withMessages(['turnstile_token' => ['Security verification failed.']]);
            }
        } elseif (! $captcha->verify((string) ($data['captcha_id'] ?? ''), (string) ($data['captcha_answer'] ?? ''))) {
            // Documented fallback: the UI loads GET /api/captcha and resubmits.
            throw ValidationException::withMessages(['captcha_id' => ['Captcha is required or has expired.']]);
        }

        $combo = null;
        if (! empty($data['ticket_combo_id'])) {
            $combo = TicketCombo::query()
                ->where('raffle_id', $raffle->id)
                ->where('id', $data['ticket_combo_id'])
                ->where('show_on_public', true)
                ->first();

            if ($combo === null || ! $combo->isValidForCheckout($raffle)) {
                throw ValidationException::withMessages(['ticket_combo_id' => ['Invalid package.']]);
            }

            $quantity = (int) $combo->getAttributes()['quantity'];
            // Server-side pricing: the client never sends the amount.
            $total = number_format((float) $combo->package_price, 2, '.', '');
        } else {
            $quantity = (int) ($data['quantity'] ?? 0);

            if ($quantity < $raffle->min_tickets_per_user || $quantity > $raffle->max_tickets_per_user) {
                throw ValidationException::withMessages(['quantity' => [
                    sprintf('Quantity must be between %d and %d.', $raffle->min_tickets_per_user, $raffle->max_tickets_per_user),
                ]]);
            }

            $total = number_format($quantity * (float) $raffle->ticket_price, 2, '.', '');
        }

        if ($quantity > $raffle->tickets_available_count) {
            throw ValidationException::withMessages(['quantity' => ['Not enough tickets left.']]);
        }

        $voucherPath = $request->file('voucher')->store('vouchers', 'local');

        $order = DB::transaction(function () use ($data, $raffle, $combo, $quantity, $total, $voucherPath) {
            return Order::create([
                'raffle_id' => $raffle->id,
                'ticket_combo_id' => $combo?->id,
                'participant_id' => $data['participant_id'],
                'bank_account_id' => $data['bank_account_id'],
                'customer_name' => $data['customer_name'],
                'cedula' => $data['cedula'] ?? null,
                'phone' => $this->normalizePhone($data['phone']),
                'email' => $data['email'] ?? null,
                'quantity' => $quantity,
                'total_amount' => $total,
                'status' => OrderStatus::PendingValidation,
                'customer_slug' => Str::slug($data['customer_name']) ?: 'cliente',
                'public_view_token' => Str::random(24),
                'voucher_path' => $voucherPath,
            ]);
        });

        return response()->json([
            'id' => $order->id,
            'status' => $order->status->value,
            'total_amount' => $order->total_amount,
            'customer_name' => $order->customer_name,
            'phone' => $order->phone,
            'tickets' => [],
            'raffle_ticket_combo' => $combo === null ? null : ['quantity' => $combo->quantity],
            'customer_slug' => $order->customer_slug,
            'public_view_token' => $order->public_view_token,
            'public_view_url' => '/' . $order->customer_slug . '/' . $order->public_view_token,
        ], 201);
    }

    public function lookup(Request $request, Raffle $raffle): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['nullable', 'string', 'max:30'],
            'ticket_number' => ['nullable', 'string', 'max:10'],
        ]);

        $query = Order::query()
            ->where('raffle_id', $raffle->id)
            ->with(['tickets'])
            ->orderByDesc('created_at')
            ->limit(50);

        $lookupByPhone = false;
        if (! empty($data['ticket_number'])) {
            $query->whereHas('tickets', fn ($q) => $q->where('number', $data['ticket_number']));
        } elseif (! empty($data['phone'])) {
            // Contract example sends the local 10-digit form while orders store
            // E.164 digits (18095551234): match on the last 10 digits.
            $normalizedPhone = $this->normalizePhone($data['phone']);
            if (! preg_match('/^\\d{10,15}$/', $normalizedPhone)) {
                throw ValidationException::withMessages(['phone' => ['Provide a valid phone number with at least 10 digits.']]);
            }

            $suffix = substr($normalizedPhone, -10);
            $query->where('phone', 'like', '%' . $suffix);
            $lookupByPhone = true;
        } else {
            throw ValidationException::withMessages(['phone' => ['Provide a phone or a ticket number.']]);
        }

        $orders = $query->get();

        return response()->json([
            'raffle' => ['id' => $raffle->id, 'title' => $raffle->title, 'status' => $raffle->status->value],
            'orders' => $orders->map(function (Order $order) use ($lookupByPhone): array {
                $result = [
                    'id' => $order->id,
                    'status' => $order->status->value,
                    'created_at' => $order->created_at->toIso8601String(),
                    'total_amount' => $order->total_amount,
                    'tickets' => $order->tickets->map(fn (Ticket $ticket) => [
                        'id' => $ticket->id,
                        'number' => $ticket->number,
                        'status' => $ticket->status,
                    ])->values(),
                ];

                if ($lookupByPhone) {
                    $result += [
                        'customer_name' => $order->customer_name,
                        'email' => $order->email,
                        'phone' => $order->phone,
                    ];
                }

                return $result;
            })->values(),
            'message' => $orders->isEmpty() ? 'No encontramos boletos con esos datos.' : null,
        ]);
    }

    public function publicOrder(string $customerSlug, string $publicViewToken): JsonResponse
    {
        $order = Order::query()
            ->where('customer_slug', $customerSlug)
            ->where('public_view_token', $publicViewToken)
            ->with(['raffle.image', 'tickets'])
            ->first();

        abort_if($order === null, 404);

        return response()->json([
            'order_id' => $order->id,
            'customer_name' => $order->customer_name,
            'status' => $order->status->value,
            'validated_at' => $order->validated_at?->toIso8601String(),
            'total_amount' => $order->total_amount,
            'ticket_count' => $order->tickets->count(),
            'raffle' => [
                'id' => $order->raffle->id,
                'title' => $order->raffle->title,
                'banner_image' => $order->raffle->banner_image,
                'image' => $order->raffle->image ? ['url' => $order->raffle->image->url] : null,
            ],
            'tickets' => $order->tickets->map(fn (Ticket $ticket) => ['number' => $ticket->number])->values(),
        ]);
    }

    private function protectedByTurnstile(): bool
    {
        return (string) config('services.turnstile.secret') !== '';
    }

    private function normalizePhone(string $phone): string
    {
        return preg_replace('/\D+/', '', $phone) ?? $phone;
    }
}
