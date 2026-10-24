<?php

namespace Database\Seeders;

use App\Models\BankAccount;
use App\Models\Category;
use App\Models\Image;
use App\Models\PrizeNumber;
use App\Models\Raffle;
use App\Models\TicketCombo;
use App\Models\Winner;
use Illuminate\Database\Seeder;

/**
 * Demo catalog: 12 raffles, 4 categories, 7 FAKE banks (never real accounts),
 * prize numbers and winners. Data comes from the storefront demo mocks.
 */
class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $data = json_decode(file_get_contents(__DIR__ . '/data/catalog.json'), true);
        $now = now();

        foreach ($data['categories'] as $c) {
            Category::updateOrCreate(['id' => $c['id']], $c);
        }

        $imageId = function (string $path) use ($now): ?int {
            if ($path === '') {
                return null;
            }

            $image = Image::firstOrCreate(
                ['path' => $path],
                ['mime_type' => str_ends_with($path, '.png') ? 'image/png' : 'image/webp', 'size' => 0],
            );

            return $image->id;
        };

        foreach ($data['raffles'] as $r) {
            $image = $imageId($r['banner_image']);
            $raffle = Raffle::updateOrCreate(['id' => $r['id']], [
                'category_id' => $r['category_id'],
                'image_id' => $image,
                'title' => $r['title'],
                'description' => $r['description'],
                'ticket_goal' => $r['ticket_goal'],
                'ticket_price' => $r['ticket_price'],
                'max_tickets_per_user' => $r['max_tickets_per_user'],
                'min_tickets_per_user' => $r['min_tickets_per_user'],
                'winners_count' => $r['winners_count'],
                'digit_count' => $r['digit_count'],
                'status' => $r['status'],
                'type' => $r['type'],
                'starts_at' => $now->copy()->subDays(5),
                'ends_at' => null,
                'draw_at' => $r['draw_in_hours'] === null ? null : $now->copy()->addHours($r['draw_in_hours']),
                'show_available_tickets' => $r['show_available_tickets'],
                'show_ends_at' => $r['show_ends_at'],
                'tickets_sold_count' => $r['tickets_sold_count'],
            ]);

            foreach ($r['combos'] as $i => $combo) {
                TicketCombo::updateOrCreate(
                    ['raffle_id' => $raffle->id, 'quantity' => $combo['quantity']],
                    [
                        'package_price' => $combo['package_price'],
                        'sort_order' => $combo['sort_order'] ?? ($i + 1),
                        'show_on_public' => $combo['show_on_public'] ?? true,
                        'accent' => $combo['accent'] ?? 'blue',
                    ],
                );
            }

            foreach ($data['prize_numbers'][$r['id']] ?? [] as $prize) {
                PrizeNumber::updateOrCreate(
                    ['raffle_id' => $raffle->id, 'number' => $prize['number']],
                    [
                        'prize_label' => $prize['prize_label'],
                        'prize_amount' => $prize['prize_amount'],
                        'status' => $prize['status'],
                        'sort_order' => $prize['sort_order'],
                    ],
                );
            }
        }

        foreach ($data['banks'] as $i => $b) {
            BankAccount::updateOrCreate(
                ['bank_name' => $b['bank_name'], 'account_number' => $b['account_number']],
                [
                    'account_type' => $b['account_type'],
                    'account_holder_name' => $b['account_holder_name'],
                    'holder_id' => $b['holder_id'],
                    'currency' => $b['currency'],
                    'is_active' => $b['is_active'],
                    'sort_order' => $b['sort_order'] ?? $i,
                    'color' => $b['color'],
                    'image_id' => $imageId($b['image_url'] ?? ''),
                ],
            );
        }

        foreach ($data['winners'] as $w) {
            Winner::updateOrCreate(
                [
                    'display_name' => $w['display_name'],
                    'prize_label' => $w['prize_label'],
                    'drawn_at' => $w['drawn_at'],
                ],
                [
                    'winner_type' => $w['winner_type'],
                    'custom_raffle_title' => $w['custom_raffle_title'],
                    'custom_ticket_number' => $w['custom_ticket_number'],
                    'portrait_image_id' => $imageId($w['portrait_url'] ?? ''),
                ],
            );
        }

        $this->command->info(sprintf(
            'Catalog seeded: %d raffles, %d banks, %d winners.',
            Raffle::count(),
            BankAccount::count(),
            Winner::count(),
        ));
    }
}
