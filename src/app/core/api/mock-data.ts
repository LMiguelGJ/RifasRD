/* eslint-disable */
// GENERATED from the reference capture by tools/gen-mock. Edit freely: this is demo data.
import { BankAccount, PrizeNumber, Raffle, Winner } from '../models/models';
import { DEMO_RAFFLES } from './mock-raffles-extra';

export { MOCK_CATEGORIES } from './mock-categories';

const BASE_RAFFLES: Raffle[] = [
  {
    "id": 22,
    "category_id": 2,
    "banner_image": "/demo/raffles/raffle_6ac527b5e90bc6.55168274.webp",
    "title": "10 IPhone 18 Pro Max X $ 25 pesos",
    "description": "10 IPhone 18 Pro Max X $ 25 pesos",
    "ticket_goal": 99999,
    "ticket_price": "25.00",
    "max_tickets_per_user": 10000,
    "min_tickets_per_user": 4,
    "winners_count": 0,
    "digit_count": 5,
    "status": "active",
    "type": "standard",
    "starts_at": "2026-10-06T16:54:00.000000Z",
    "ends_at": null,
    "draw_at": null,
    "show_available_tickets": false,
    "show_ends_at": false,
    "tickets_sold_count": 45310,
    "tickets_available_count": 45379,
    "category": {
      "id": 2,
      "name": "Tecnología",
      "slug": "tecnologia"
    },
    "image": {
      "id": 63464,
      "path": "static/raffle_6ac527b5e90bc6.55168274.webp",
      "url": "/demo/raffles/raffle_6ac527b5e90bc6.55168274.webp",
      "mime_type": "image/webp",
      "size": 181916
    },
    "ticket_combos": [
      {
        "id": 201,
        "raffle_id": 22,
        "quantity": 4,
        "package_price": "100.00",
        "sort_order": 1,
        "show_on_public": true,
        "accent": "blue"
      },
      {
        "id": 202,
        "raffle_id": 22,
        "quantity": 8,
        "package_price": "200.00",
        "sort_order": 2,
        "show_on_public": true,
        "accent": "blue"
      },
      {
        "id": 203,
        "raffle_id": 22,
        "quantity": 20,
        "package_price": "500.00",
        "sort_order": 3,
        "show_on_public": true,
        "accent": "blue"
      },
      {
        "id": 204,
        "raffle_id": 22,
        "quantity": 40,
        "package_price": "1000.00",
        "sort_order": 4,
        "show_on_public": true,
        "accent": "blue"
      },
      {
        "id": 205,
        "raffle_id": 22,
        "quantity": 60,
        "package_price": "1500.00",
        "sort_order": 5,
        "show_on_public": true,
        "accent": "blue"
      },
      {
        "id": 206,
        "raffle_id": 22,
        "quantity": 120,
        "package_price": "3000.00",
        "sort_order": 6,
        "show_on_public": true,
        "accent": "blue"
      },
      {
        "id": 207,
        "raffle_id": 22,
        "quantity": 200,
        "package_price": "5000.00",
        "sort_order": 7,
        "show_on_public": true,
        "accent": "gold"
      }
    ]
  },
  {
    "id": 20,
    "category_id": 1,
    "banner_image": "/demo/raffles/raffle_6abdd945dfe627.19199125.webp",
    "title": "Honda CRV Touring Híbrida 2026",
    "description": "Por tan solo $75 pesos, ¡esta Honda CR‑V Híbrida 2026 puede ser tuya! 😍\r\n\r\nCon solo 3,000 millas, está prácticamente nueva y podrías ser su primer dueño. 🚘🔥\r\n\r\nY eso no es todo: también hay 20 premios de $10,000. Si sale uno de tus números, ¡te llevas tus $10,000 de inmediato! 💸",
    "ticket_goal": 99999,
    "ticket_price": "75.00",
    "max_tickets_per_user": 1000,
    "min_tickets_per_user": 2,
    "winners_count": 20,
    "digit_count": 5,
    "status": "active",
    "type": "standard",
    "starts_at": "2026-09-30T19:20:00.000000Z",
    "ends_at": null,
    "draw_at": "2026-10-20T02:00:00.000000Z",
    "show_available_tickets": false,
    "show_ends_at": false,
    "tickets_sold_count": 66427,
    "tickets_available_count": 17277,
    "category": {
      "id": 1,
      "name": "Vehículos",
      "slug": "vehiculo"
    },
    "image": {
      "id": 57298,
      "path": "static/raffle_6abdd945dfe627.19199125.webp",
      "url": "/demo/raffles/raffle_6abdd945dfe627.19199125.webp",
      "mime_type": "image/webp",
      "size": 328310
    },
    "ticket_combos": [
      {
        "id": 179,
        "raffle_id": 20,
        "quantity": 2,
        "package_price": "150.00",
        "sort_order": 1,
        "show_on_public": true,
        "accent": "blue"
      },
      {
        "id": 180,
        "raffle_id": 20,
        "quantity": 4,
        "package_price": "300.00",
        "sort_order": 2,
        "show_on_public": true,
        "accent": "blue"
      },
      {
        "id": 181,
        "raffle_id": 20,
        "quantity": 8,
        "package_price": "600.00",
        "sort_order": 3,
        "show_on_public": true,
        "accent": "blue"
      },
      {
        "id": 182,
        "raffle_id": 20,
        "quantity": 14,
        "package_price": "1050.00",
        "sort_order": 4,
        "show_on_public": true,
        "accent": "blue"
      },
      {
        "id": 183,
        "raffle_id": 20,
        "quantity": 20,
        "package_price": "1500.00",
        "sort_order": 5,
        "show_on_public": true,
        "accent": "blue"
      },
      {
        "id": 184,
        "raffle_id": 20,
        "quantity": 27,
        "package_price": "2025.00",
        "sort_order": 6,
        "show_on_public": true,
        "accent": "blue"
      },
      {
        "id": 185,
        "raffle_id": 20,
        "quantity": 50,
        "package_price": "3750.00",
        "sort_order": 7,
        "show_on_public": true,
        "accent": "gold"
      },
      {
        "id": 214,
        "raffle_id": 20,
        "quantity": 100,
        "package_price": "7500.00",
        "sort_order": 8,
        "show_on_public": true,
        "accent": "gold"
      }
    ]
  }
] as Raffle[];

/** Display order of the catalog: the grid mixes categories and urgency states. */
const CATALOG_ORDER = [31, 32, 37, 36, 22, 33, 20, 38, 34, 39, 35, 40];
const ALL_RAFFLES: Raffle[] = [...BASE_RAFFLES, ...DEMO_RAFFLES];
export const MOCK_RAFFLES: Raffle[] = CATALOG_ORDER.map(id => ALL_RAFFLES.find(r => r.id === id)!);

export const MOCK_PRIZE_NUMBERS: Record<number, PrizeNumber[]> = {
  "20": [
    {
      "id": 627,
      "number": "10100",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 1
    },
    {
      "id": 628,
      "number": "11111",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 2
    },
    {
      "id": 629,
      "number": "12222",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 3
    },
    {
      "id": 630,
      "number": "13333",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 4
    },
    {
      "id": 631,
      "number": "14444",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "available",
      "sort_order": 5
    },
    {
      "id": 632,
      "number": "15555",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 6
    },
    {
      "id": 633,
      "number": "16666",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 7
    },
    {
      "id": 634,
      "number": "17777",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "available",
      "sort_order": 8
    },
    {
      "id": 635,
      "number": "18888",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 9
    },
    {
      "id": 636,
      "number": "19999",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "available",
      "sort_order": 10
    },
    {
      "id": 637,
      "number": "21111",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 11
    },
    {
      "id": 638,
      "number": "22222",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 12
    },
    {
      "id": 639,
      "number": "23333",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 13
    },
    {
      "id": 640,
      "number": "24444",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "available",
      "sort_order": 14
    },
    {
      "id": 641,
      "number": "25555",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "available",
      "sort_order": 15
    },
    {
      "id": 642,
      "number": "26666",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 16
    },
    {
      "id": 643,
      "number": "27777",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 17
    },
    {
      "id": 644,
      "number": "28888",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "claimed",
      "sort_order": 18
    },
    {
      "id": 645,
      "number": "29999",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "available",
      "sort_order": 19
    },
    {
      "id": 646,
      "number": "33322",
      "prize_label": null,
      "prize_amount": "10000.00",
      "status": "available",
      "sort_order": 20
    }
  ],
  "22": []
} as Record<number, PrizeNumber[]>;

export const MOCK_WINNERS: Winner[] = [
  {
    "id": 100,
    "display_name": "Cleison Miguel",
    "prize_label": "Dahiatsu Mira",
    "drawn_at": "2026-09-19T23:48:55.000000Z",
    "display_raffle_title": "Dahiatsu Mira",
    "display_ticket_number": null,
    "portrait_image": {
      "id": 1099,
      "url": "/demo/winners/winner_6aaf1f670d75a7.87015097.webp"
    }
  },
  {
    "id": 99,
    "display_name": "Liliana Duarte",
    "prize_label": "Ford Mustang",
    "drawn_at": "2026-09-04T22:23:55.000000Z",
    "display_raffle_title": "Ford Mustang",
    "display_ticket_number": null,
    "portrait_image": {
      "id": 1098,
      "url": "/demo/winners/winner_6a9b44fb71fe73.07557685.webp"
    }
  },
  {
    "id": 98,
    "display_name": "Eliezer Fernandez",
    "prize_label": "Honda Dio 140cc",
    "drawn_at": "2026-07-06T15:52:36.000000Z",
    "display_raffle_title": "Honda Dio 140cc",
    "display_ticket_number": null,
    "portrait_image": {
      "id": 1097,
      "url": "/demo/winners/winner_6a4bcf44360774.80639351.webp"
    }
  },
  {
    "id": 97,
    "display_name": "Jose Osvaldo",
    "prize_label": "Mercedes Benz",
    "drawn_at": "2026-07-03T19:28:12.000000Z",
    "display_raffle_title": "Mercedes Benz",
    "display_ticket_number": null,
    "portrait_image": {
      "id": 1096,
      "url": "/demo/winners/winner_6a480d4c1a9dc7.96498095.webp"
    }
  },
  {
    "id": 96,
    "display_name": "Rigoberto mercedes",
    "prize_label": "Honda XR 650cc",
    "drawn_at": "2026-07-03T19:26:20.000000Z",
    "display_raffle_title": "Honda XR 650cc",
    "display_ticket_number": null,
    "portrait_image": {
      "id": 1095,
      "url": "/demo/winners/winner_6a480cdc4b61a2.57892772.webp"
    }
  },
  {
    "id": 95,
    "display_name": "Wilkins Luzon",
    "prize_label": "Mercedes Benz C250",
    "drawn_at": "2026-05-26T14:42:14.000000Z",
    "display_raffle_title": "Mercedes Benz C250",
    "display_ticket_number": null,
    "portrait_image": {
      "id": 1094,
      "url": "/demo/winners/winner_6a15b1456686c9.21762674.webp"
    }
  },
  {
    "id": 94,
    "display_name": "David Durán",
    "prize_label": "Pasola",
    "drawn_at": "2026-04-10T04:10:54.000000Z",
    "display_raffle_title": "Pasola",
    "display_ticket_number": null,
    "portrait_image": {
      "id": 1093,
      "url": "/demo/winners/winner_69d8784d91db96.08239754.webp"
    }
  },
  {
    "id": 93,
    "display_name": "Miguel Díaz",
    "prize_label": "IPhone",
    "drawn_at": "2026-04-10T04:10:53.000000Z",
    "display_raffle_title": "IPhone",
    "display_ticket_number": null,
    "portrait_image": {
      "id": 1092,
      "url": "/demo/winners/winner_69d8784d13b757.32264425.webp"
    }
  },
  {
    "id": 92,
    "display_name": "Yendry Victoriano",
    "prize_label": "yfz",
    "drawn_at": "2026-04-10T04:10:53.000000Z",
    "display_raffle_title": "yfz",
    "display_ticket_number": null,
    "portrait_image": {
      "id": 1091,
      "url": "/demo/winners/winner_69d8784c193907.60400533.webp"
    }
  },
  {
    "id": 91,
    "display_name": "Marino Paredes",
    "prize_label": "Gacella KTR",
    "drawn_at": "2026-04-10T03:50:24.000000Z",
    "display_raffle_title": "Gacella KTR",
    "display_ticket_number": null,
    "portrait_image": {
      "id": 1090,
      "url": "/demo/winners/winner_69d8737fb17236.62438086.webp"
    }
  },
  {
    "id": 90,
    "display_name": "Harol",
    "prize_label": "iPhone 17 Pro",
    "drawn_at": "2026-04-10T03:35:39.000000Z",
    "display_raffle_title": "iPhone 17 Pro",
    "display_ticket_number": null,
    "portrait_image": {
      "id": 1089,
      "url": "/demo/winners/winner_69d8700ac93c77.39410184.webp"
    }
  },
  {
    "id": 89,
    "display_name": "Ranyeli Durán",
    "prize_label": "Ford Mustang",
    "drawn_at": "2026-04-10T03:30:46.000000Z",
    "display_raffle_title": "Ford Mustang",
    "display_ticket_number": null,
    "portrait_image": {
      "id": 1088,
      "url": "/demo/winners/winner_69d86ee5114d03.05335652.webp"
    }
  }
];

export const MOCK_BANK_ACCOUNTS: BankAccount[] = [
  {
    "id": 18,
    "bank_name": "Asociacion Popular (APAP)",
    "account_type": "Ahorro",
    "account_number": "0000-0000-0001",
    "account_holder_name": "Titular Demo",
    "holder_id": "000-0000000-0",
    "currency": "DOP",
    "is_active": true,
    "sort_order": 0,
    "color": null,
    "image": {
      "id": 67122,
      "url": "/demo/banks/bank_6ac7dfcc9cf482.59477549.webp"
    }
  },
  {
    "id": 3,
    "bank_name": "Banco Reservas",
    "account_type": "Ahorro",
    "account_number": "0000-0000-0002",
    "account_holder_name": "Titular Demo",
    "holder_id": "000-0000000-0",
    "currency": "DOP",
    "is_active": true,
    "sort_order": 0,
    "color": "#05b8f3",
    "image": {
      "id": 29,
      "url": "/demo/banks/bank_69dab21deaf941.87069052.webp"
    }
  },
  {
    "id": 19,
    "bank_name": "BHD",
    "account_type": "Ahorro",
    "account_number": "0000-0000-0003",
    "account_holder_name": "Titular Demo",
    "holder_id": "000-0000000-0",
    "currency": "DOP",
    "is_active": true,
    "sort_order": 0,
    "color": null,
    "image": {
      "id": 67646,
      "url": "/demo/banks/bank_6ac835e6cd6689.12766233.webp"
    }
  },
  {
    "id": 7,
    "bank_name": "Efectivo",
    "account_type": "Solo personas de Constanza.",
    "account_number": "0000-0000-0004",
    "account_holder_name": "Titular Demo",
    "holder_id": "000-0000000-0",
    "currency": "DOP",
    "is_active": true,
    "sort_order": 0,
    "color": "#15803d",
    "image": {
      "id": 14200,
      "url": "/demo/banks/bank_6a41e7020aa879.09808133.webp"
    }
  },
  {
    "id": 14,
    "bank_name": "Interbancaria a Qik",
    "account_type": "Ahorro",
    "account_number": "0000-0000-0005",
    "account_holder_name": "Titular Demo",
    "holder_id": "000-0000000-0",
    "currency": "DOP",
    "is_active": true,
    "sort_order": 0,
    "color": null,
    "image": {
      "id": 74579,
      "url": "/demo/banks/bank_6ace292399ee67.16376278.webp"
    }
  },
  {
    "id": 17,
    "bank_name": "Popular",
    "account_type": "Corriente",
    "account_number": "0000-0000-0006",
    "account_holder_name": "Titular Demo",
    "holder_id": "000-0000000-0",
    "currency": "DOP",
    "is_active": true,
    "sort_order": 0,
    "color": null,
    "image": {
      "id": 66595,
      "url": "/demo/banks/bank_6ac79cb4b02f07.73812463.webp"
    }
  },
  {
    "id": 8,
    "bank_name": "Qik",
    "account_type": "Ahorro",
    "account_number": "0000-0000-0007",
    "account_holder_name": "Titular Demo",
    "holder_id": "000-0000000-0",
    "currency": "DOP",
    "is_active": true,
    "sort_order": 0,
    "color": "#05b8f3",
    "image": {
      "id": 15612,
      "url": "/demo/banks/bank_6a4d33336d19a3.28320167.webp"
    }
  }
];
