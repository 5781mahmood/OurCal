import type { FoodItem } from '../types'
import { FOOD_CATALOG_EXTRA } from './foodCatalogExtra'

/**
 * Built-in quick-add catalog.
 * Values are typical per-serving estimates (common nutrition labels / USDA-style
 * round numbers) so the app works offline without an API key.
 */
export const FOOD_CATALOG: FoodItem[] = [
  { id: 'egg', name: 'Egg (large)', servingLabel: '1 large', calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { id: 'egg-white', name: 'Egg white', servingLabel: '1 large', calories: 17, protein: 3.6, carbs: 0.2, fat: 0.1 },
  { id: 'oatmeal', name: 'Oatmeal (cooked)', servingLabel: '1 cup', calories: 158, protein: 5.5, carbs: 27, fat: 3.2 },
  { id: 'banana', name: 'Banana', servingLabel: '1 medium', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { id: 'apple', name: 'Apple', servingLabel: '1 medium', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { id: 'greek-yogurt', name: 'Greek yogurt (plain, nonfat)', servingLabel: '170 g', calories: 100, protein: 17, carbs: 6, fat: 0.7 },
  { id: 'milk-2', name: 'Milk (2%)', servingLabel: '1 cup', calories: 122, protein: 8.1, carbs: 11.7, fat: 4.8 },
  { id: 'almond-milk', name: 'Almond milk (unsweetened)', servingLabel: '1 cup', calories: 30, protein: 1, carbs: 1, fat: 2.5 },
  { id: 'protein-shake', name: 'Whey protein shake', servingLabel: '1 scoop + water', calories: 120, protein: 24, carbs: 3, fat: 1.5 },
  { id: 'chicken-breast', name: 'Chicken breast (grilled)', servingLabel: '100 g', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: 'salmon', name: 'Salmon (baked)', servingLabel: '100 g', calories: 208, protein: 20, carbs: 0, fat: 13 },
  { id: 'tuna', name: 'Tuna (canned in water)', servingLabel: '1 can drained', calories: 120, protein: 28, carbs: 0, fat: 1 },
  { id: 'ground-beef', name: 'Ground beef (90% lean, cooked)', servingLabel: '100 g', calories: 217, protein: 26, carbs: 0, fat: 12 },
  { id: 'tofu', name: 'Tofu (firm)', servingLabel: '100 g', calories: 144, protein: 17, carbs: 3, fat: 9 },
  { id: 'rice-white', name: 'White rice (cooked)', servingLabel: '1 cup', calories: 206, protein: 4.3, carbs: 45, fat: 0.4 },
  { id: 'rice-brown', name: 'Brown rice (cooked)', servingLabel: '1 cup', calories: 215, protein: 5, carbs: 45, fat: 1.6 },
  { id: 'pasta', name: 'Pasta (cooked)', servingLabel: '1 cup', calories: 220, protein: 8, carbs: 43, fat: 1.3 },
  { id: 'bread-ww', name: 'Whole wheat bread', servingLabel: '1 slice', calories: 81, protein: 4, carbs: 14, fat: 1.1 },
  { id: 'bagel', name: 'Bagel', servingLabel: '1 medium', calories: 270, protein: 10, carbs: 53, fat: 2 },
  { id: 'potato', name: 'Baked potato', servingLabel: '1 medium', calories: 161, protein: 4.3, carbs: 37, fat: 0.2 },
  { id: 'sweet-potato', name: 'Sweet potato (baked)', servingLabel: '1 medium', calories: 103, protein: 2.3, carbs: 24, fat: 0.2 },
  { id: 'broccoli', name: 'Broccoli (steamed)', servingLabel: '1 cup', calories: 55, protein: 3.7, carbs: 11, fat: 0.6 },
  { id: 'spinach', name: 'Spinach (raw)', servingLabel: '2 cups', calories: 14, protein: 1.8, carbs: 2.2, fat: 0.2 },
  { id: 'avocado', name: 'Avocado', servingLabel: '1/2 fruit', calories: 120, protein: 1.5, carbs: 6, fat: 11 },
  { id: 'almonds', name: 'Almonds', servingLabel: '28 g (about 23)', calories: 164, protein: 6, carbs: 6, fat: 14 },
  { id: 'peanut-butter', name: 'Peanut butter', servingLabel: '2 tbsp', calories: 188, protein: 8, carbs: 6, fat: 16 },
  { id: 'olive-oil', name: 'Olive oil', servingLabel: '1 tbsp', calories: 119, protein: 0, carbs: 0, fat: 13.5 },
  { id: 'butter', name: 'Butter', servingLabel: '1 tbsp', calories: 102, protein: 0.1, carbs: 0, fat: 11.5 },
  { id: 'cheese-cheddar', name: 'Cheddar cheese', servingLabel: '28 g', calories: 113, protein: 7, carbs: 0.4, fat: 9 },
  { id: 'pizza-slice', name: 'Cheese pizza', servingLabel: '1 slice', calories: 285, protein: 12, carbs: 36, fat: 10 },
  { id: 'burger', name: 'Hamburger (fast food)', servingLabel: '1 sandwich', calories: 540, protein: 25, carbs: 40, fat: 27 },
  { id: 'fries', name: 'French fries', servingLabel: 'medium', calories: 365, protein: 4, carbs: 48, fat: 17 },
  { id: 'salad-caesar', name: 'Caesar salad (with dressing)', servingLabel: '1 bowl', calories: 470, protein: 10, carbs: 20, fat: 40 },
  { id: 'sushi-roll', name: 'California roll', servingLabel: '8 pieces', calories: 255, protein: 9, carbs: 38, fat: 7 },
  { id: 'coffee-black', name: 'Coffee (black)', servingLabel: '1 cup', calories: 2, protein: 0.3, carbs: 0, fat: 0 },
  { id: 'latte', name: 'Latte (2% milk)', servingLabel: '16 oz', calories: 190, protein: 12, carbs: 18, fat: 7 },
  { id: 'orange-juice', name: 'Orange juice', servingLabel: '1 cup', calories: 112, protein: 1.7, carbs: 26, fat: 0.5 },
  { id: 'soda', name: 'Cola', servingLabel: '12 oz can', calories: 140, protein: 0, carbs: 39, fat: 0 },
  { id: 'beer', name: 'Beer', servingLabel: '12 oz', calories: 153, protein: 1.6, carbs: 13, fat: 0 },
  { id: 'wine', name: 'Red wine', servingLabel: '5 oz', calories: 125, protein: 0.1, carbs: 4, fat: 0 },
  { id: 'chocolate', name: 'Dark chocolate (70%)', servingLabel: '30 g', calories: 170, protein: 2, carbs: 13, fat: 12 },
  { id: 'ice-cream', name: 'Ice cream (vanilla)', servingLabel: '1/2 cup', calories: 137, protein: 2.3, carbs: 16, fat: 7 },
  { id: 'granola-bar', name: 'Granola bar', servingLabel: '1 bar', calories: 190, protein: 4, carbs: 29, fat: 7 },
  { id: 'hummus', name: 'Hummus', servingLabel: '2 tbsp', calories: 70, protein: 2, carbs: 6, fat: 5 },
  { id: 'chickpeas', name: 'Chickpeas (cooked)', servingLabel: '1/2 cup', calories: 135, protein: 7, carbs: 22, fat: 2 },
  { id: 'lentils', name: 'Lentils (cooked)', servingLabel: '1 cup', calories: 230, protein: 18, carbs: 40, fat: 0.8 },
  { id: 'quinoa', name: 'Quinoa (cooked)', servingLabel: '1 cup', calories: 222, protein: 8, carbs: 39, fat: 3.6 },
  { id: 'cottage-cheese', name: 'Cottage cheese (1%)', servingLabel: '1 cup', calories: 163, protein: 28, carbs: 6, fat: 2.3 },
  { id: 'turkey', name: 'Turkey breast (roasted)', servingLabel: '100 g', calories: 135, protein: 30, carbs: 0, fat: 1 },
  { id: 'shrimp', name: 'Shrimp (cooked)', servingLabel: '100 g', calories: 99, protein: 24, carbs: 0.2, fat: 0.3 },
]

export const ALL_BUILTIN_FOODS: FoodItem[] = [...FOOD_CATALOG, ...FOOD_CATALOG_EXTRA]

export function searchFoods(
  query: string,
  custom: FoodItem[] = [],
  community: FoodItem[] = [],
): FoodItem[] {
  const q = query.trim().toLowerCase()
  const all = [...community, ...custom, ...ALL_BUILTIN_FOODS]
  if (!q) return all.slice(0, 40)
  return all
    .filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.brand?.toLowerCase().includes(q) ?? false),
    )
    .slice(0, 50)
}