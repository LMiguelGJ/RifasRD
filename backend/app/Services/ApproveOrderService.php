<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Mail\OrderRejected;
use App\Mail\OrderValidated;
use App\Models\Order;
use App\Models\PrizeNumber;
use App\Models\Raffle;
use App\Models\Ticket;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

/**
 * Approving an order assigns its random ticket numbers, flips the order to
 * validated and queues the customer email, all inside ONE transaction with a
 * pessimistic lock on the raffle so concurrent approvals can never oversell
 * or hand out duplicate/prize numbers.
 */
class ApproveOrderService
{
    public function approve(Order $order): Order
    {
        $order = DB::transaction(function () use ($order) {
            Raffle::whereKey($order->raffle_id)->lockForUpdate()->firstOrFail();
            /** @var Order $locked */
            $locked = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== OrderStatus::PendingValidation) {
                throw new RuntimeException("Order {$locked->id} is not pending validation.");
            }

            foreach ($this->pickNumbers($locked) as $number) {
                Ticket::create([
                    'raffle_id' => $locked->raffle_id,
                    'order_id' => $locked->id,
                    'participant_id' => $locked->participant_id,
                    'number' => $number,
                    'status' => 'validated',
                ]);
            }

            $locked->update([
                'status' => OrderStatus::Validated,
                'validated_at' => now(),
            ]);

            Raffle::whereKey($locked->raffle_id)->increment('tickets_sold_count', $locked->quantity);

            if ($locked->email) {
                Mail::to($locked->email)->queue(new OrderValidated($locked->load('tickets')));
            }

            return $locked;
        });

        return $order;
    }

    public function reject(Order $order, string $reason = ''): Order
    {
        $order = DB::transaction(function () use ($order, $reason) {
            /** @var Order $locked */
            $locked = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== OrderStatus::PendingValidation) {
                throw new RuntimeException("Order {$locked->id} is not pending validation.");
            }

            $locked->update(['status' => OrderStatus::Cancelled]);

            if ($locked->email) {
                Mail::to($locked->email)->queue(new OrderRejected($locked, $reason));
            }

            return $locked;
        });

        Log::info('Order rejected', ['order_id' => $order->id, 'reason' => $reason]);

        return $order;
    }

    /** @return list<string> */
    private function pickNumbers(Order $order): array
    {
        $raffle = $order->raffle;
        $digits = max(1, min(7, (int) $raffle->digit_count));
        $pool = 10 ** $digits;

        if ($order->quantity > $pool) {
            throw new RuntimeException('Not enough number space for this order.');
        }

        $taken = Ticket::where('raffle_id', $raffle->id)->pluck('number')
            ->merge(PrizeNumber::where('raffle_id', $raffle->id)->pluck('number'))
            ->flip();

        $picked = [];
        $attempts = 0;

        while (count($picked) < $order->quantity) {
            if (++$attempts > $pool * 3) {
                throw new RuntimeException('Could not find free ticket numbers.');
            }

            $number = str_pad((string) random_int(0, $pool - 1), $digits, '0', STR_PAD_LEFT);

            if (! $taken->has($number) && ! isset($picked[$number])) {
                $picked[$number] = true;
            }
        }

        return array_keys($picked);
    }
}
