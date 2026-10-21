import { Category } from '../models/models';

/** Demo categories. Higher `sort_order` comes first. */
export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: 'Vehículos', slug: 'vehiculo', sort_order: 40 },
  { id: 2, name: 'Tecnología', slug: 'tecnologia', sort_order: 30 },
  { id: 3, name: 'Relojes', slug: 'relojes', sort_order: 20 },
  { id: 5, name: 'Dinero', slug: 'dinero', sort_order: 10 },
];
