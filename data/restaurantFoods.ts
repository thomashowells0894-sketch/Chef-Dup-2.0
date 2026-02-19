import { RESTAURANT_FOODS_PART2A } from './restaurantFoodsPart2a';
import { RESTAURANT_FOODS_PART2B } from './restaurantFoodsPart2b';
import { RESTAURANT_FOODS_PART3 } from './restaurantFoodsPart3';

export interface RestaurantFoodItem {
  id: string;
  name: string;
  chain: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
  serving: string;
  servingSize: number;
  servingUnit: string;
  popular?: boolean;
}

const PART_1: RestaurantFoodItem[] = [
  // ─── McDonald's ───
  { id: 'mcdonalds_big_mac', name: 'Big Mac', chain: "McDonald's", category: 'burger', calories: 550, protein: 25, carbs: 45, fat: 30, fiber: 3, sodium: 1010, sugar: 9, serving: '1 sandwich', servingSize: 200, servingUnit: 'g', popular: true },
  { id: 'mcdonalds_quarter_pounder_cheese', name: 'Quarter Pounder with Cheese', chain: "McDonald's", category: 'burger', calories: 520, protein: 30, carbs: 42, fat: 27, fiber: 2, sodium: 1140, sugar: 10, serving: '1 sandwich', servingSize: 201, servingUnit: 'g', popular: true },
  { id: 'mcdonalds_mcdouble', name: 'McDouble', chain: "McDonald's", category: 'burger', calories: 400, protein: 22, carbs: 33, fat: 20, fiber: 2, sodium: 920, sugar: 7, serving: '1 sandwich', servingSize: 155, servingUnit: 'g', popular: true },
  { id: 'mcdonalds_mcchicken', name: 'McChicken', chain: "McDonald's", category: 'chicken', calories: 400, protein: 14, carbs: 40, fat: 21, fiber: 2, sodium: 780, sugar: 5, serving: '1 sandwich', servingSize: 143, servingUnit: 'g', popular: true },
  { id: 'mcdonalds_10pc_mcnuggets', name: '10 Piece Chicken McNuggets', chain: "McDonald's", category: 'chicken', calories: 410, protein: 25, carbs: 25, fat: 24, fiber: 1, sodium: 900, sugar: 0, serving: '10 pieces', servingSize: 162, servingUnit: 'g', popular: true },
  { id: 'mcdonalds_filet_o_fish', name: 'Filet-O-Fish', chain: "McDonald's", category: 'sandwich', calories: 390, protein: 16, carbs: 39, fat: 19, fiber: 2, sodium: 580, sugar: 5, serving: '1 sandwich', servingSize: 142, servingUnit: 'g' },
  { id: 'mcdonalds_medium_fries', name: 'Medium French Fries', chain: "McDonald's", category: 'side', calories: 320, protein: 5, carbs: 43, fat: 15, fiber: 4, sodium: 260, sugar: 0, serving: '1 medium', servingSize: 117, servingUnit: 'g' },
  { id: 'mcdonalds_large_fries', name: 'Large French Fries', chain: "McDonald's", category: 'side', calories: 480, protein: 7, carbs: 65, fat: 23, fiber: 6, sodium: 400, sugar: 0, serving: '1 large', servingSize: 178, servingUnit: 'g' },
  { id: 'mcdonalds_egg_mcmuffin', name: 'Egg McMuffin', chain: "McDonald's", category: 'breakfast', calories: 300, protein: 17, carbs: 30, fat: 13, fiber: 2, sodium: 770, sugar: 3, serving: '1 sandwich', servingSize: 137, servingUnit: 'g' },
  { id: 'mcdonalds_sausage_mcmuffin_egg', name: 'Sausage McMuffin with Egg', chain: "McDonald's", category: 'breakfast', calories: 480, protein: 21, carbs: 30, fat: 31, fiber: 2, sodium: 870, sugar: 2, serving: '1 sandwich', servingSize: 165, servingUnit: 'g' },
  { id: 'mcdonalds_hotcakes', name: 'Hotcakes', chain: "McDonald's", category: 'breakfast', calories: 580, protein: 9, carbs: 101, fat: 16, fiber: 2, sodium: 640, sugar: 45, serving: '3 hotcakes', servingSize: 221, servingUnit: 'g' },
  { id: 'mcdonalds_hash_brown', name: 'Hash Brown', chain: "McDonald's", category: 'side', calories: 140, protein: 1, carbs: 16, fat: 8, fiber: 2, sodium: 310, sugar: 0, serving: '1 piece', servingSize: 56, servingUnit: 'g' },
  { id: 'mcdonalds_mcflurry_oreo', name: 'McFlurry with Oreo Cookies (Regular)', chain: "McDonald's", category: 'dessert', calories: 510, protein: 12, carbs: 80, fat: 17, fiber: 1, sodium: 280, sugar: 63, serving: '1 regular', servingSize: 285, servingUnit: 'g' },
  { id: 'mcdonalds_medium_coke', name: 'Coca-Cola (Medium)', chain: "McDonald's", category: 'drink', calories: 210, protein: 0, carbs: 58, fat: 0, fiber: 0, sodium: 15, sugar: 58, serving: '1 medium', servingSize: 620, servingUnit: 'g' },
  { id: 'mcdonalds_double_quarter_pounder', name: 'Double Quarter Pounder with Cheese', chain: "McDonald's", category: 'burger', calories: 740, protein: 48, carbs: 43, fat: 42, fiber: 2, sodium: 1360, sugar: 10, serving: '1 sandwich', servingSize: 272, servingUnit: 'g' },
  { id: 'mcdonalds_crispy_chicken_sandwich', name: 'McCrispy', chain: "McDonald's", category: 'chicken', calories: 470, protein: 26, carbs: 46, fat: 20, fiber: 2, sodium: 1140, sugar: 7, serving: '1 sandwich', servingSize: 190, servingUnit: 'g' },
  { id: 'mcdonalds_cheeseburger', name: 'Cheeseburger', chain: "McDonald's", category: 'burger', calories: 300, protein: 15, carbs: 32, fat: 13, fiber: 1, sodium: 720, sugar: 7, serving: '1 sandwich', servingSize: 119, servingUnit: 'g' },

  // ─── Burger King ───
  { id: 'bk_whopper', name: 'Whopper', chain: 'Burger King', category: 'burger', calories: 660, protein: 28, carbs: 49, fat: 40, fiber: 2, sodium: 980, sugar: 11, serving: '1 sandwich', servingSize: 270, servingUnit: 'g', popular: true },
  { id: 'bk_whopper_cheese', name: 'Whopper with Cheese', chain: 'Burger King', category: 'burger', calories: 740, protein: 33, carbs: 49, fat: 46, fiber: 2, sodium: 1310, sugar: 11, serving: '1 sandwich', servingSize: 291, servingUnit: 'g', popular: true },
  { id: 'bk_double_whopper', name: 'Double Whopper', chain: 'Burger King', category: 'burger', calories: 900, protein: 48, carbs: 49, fat: 56, fiber: 2, sodium: 1050, sugar: 11, serving: '1 sandwich', servingSize: 374, servingUnit: 'g' },
  { id: 'bk_bacon_king', name: 'Bacon King', chain: 'Burger King', category: 'burger', calories: 1150, protein: 61, carbs: 49, fat: 79, fiber: 1, sodium: 2150, sugar: 10, serving: '1 sandwich', servingSize: 364, servingUnit: 'g', popular: true },
  { id: 'bk_original_chicken', name: 'Original Chicken Sandwich', chain: 'Burger King', category: 'chicken', calories: 660, protein: 24, carbs: 54, fat: 40, fiber: 3, sodium: 1170, sugar: 7, serving: '1 sandwich', servingSize: 209, servingUnit: 'g', popular: true },
  { id: 'bk_chicken_fries_9pc', name: 'Chicken Fries (9 Piece)', chain: 'Burger King', category: 'chicken', calories: 280, protein: 17, carbs: 17, fat: 17, fiber: 1, sodium: 780, sugar: 0, serving: '9 pieces', servingSize: 100, servingUnit: 'g' },
  { id: 'bk_medium_fries', name: 'Medium French Fries', chain: 'Burger King', category: 'side', calories: 380, protein: 5, carbs: 53, fat: 17, fiber: 4, sodium: 570, sugar: 0, serving: '1 medium', servingSize: 128, servingUnit: 'g' },
  { id: 'bk_onion_rings_medium', name: 'Onion Rings (Medium)', chain: 'Burger King', category: 'side', calories: 410, protein: 5, carbs: 51, fat: 21, fiber: 3, sodium: 590, sugar: 6, serving: '1 medium', servingSize: 113, servingUnit: 'g' },
  { id: 'bk_impossible_whopper', name: 'Impossible Whopper', chain: 'Burger King', category: 'burger', calories: 630, protein: 25, carbs: 58, fat: 34, fiber: 4, sodium: 1080, sugar: 12, serving: '1 sandwich', servingSize: 276, servingUnit: 'g' },
  { id: 'bk_croissanwich_sausage', name: 'Sausage, Egg & Cheese Croissan\'wich', chain: 'Burger King', category: 'breakfast', calories: 490, protein: 19, carbs: 27, fat: 34, fiber: 1, sodium: 1020, sugar: 5, serving: '1 sandwich', servingSize: 160, servingUnit: 'g', popular: true },
  { id: 'bk_french_toast_sticks_5pc', name: 'French Toast Sticks (5 Piece)', chain: 'Burger King', category: 'breakfast', calories: 320, protein: 4, carbs: 39, fat: 16, fiber: 1, sodium: 330, sugar: 10, serving: '5 pieces', servingSize: 90, servingUnit: 'g' },
  { id: 'bk_cheeseburger', name: 'Cheeseburger', chain: 'Burger King', category: 'burger', calories: 300, protein: 16, carbs: 27, fat: 14, fiber: 1, sodium: 710, sugar: 6, serving: '1 sandwich', servingSize: 123, servingUnit: 'g' },
  { id: 'bk_bacon_cheeseburger', name: 'Bacon Cheeseburger', chain: 'Burger King', category: 'burger', calories: 340, protein: 19, carbs: 27, fat: 17, fiber: 1, sodium: 810, sugar: 6, serving: '1 sandwich', servingSize: 137, servingUnit: 'g' },
  { id: 'bk_chocolate_shake_medium', name: 'Chocolate Shake (Medium)', chain: 'Burger King', category: 'drink', calories: 590, protein: 13, carbs: 89, fat: 20, fiber: 2, sodium: 440, sugar: 75, serving: '1 medium', servingSize: 397, servingUnit: 'g' },
  { id: 'bk_big_fish', name: 'Big Fish Sandwich', chain: 'Burger King', category: 'sandwich', calories: 510, protein: 18, carbs: 51, fat: 26, fiber: 2, sodium: 1050, sugar: 6, serving: '1 sandwich', servingSize: 199, servingUnit: 'g' },

  // ─── Wendy's ───
  { id: 'wendys_daves_single', name: "Dave's Single", chain: "Wendy's", category: 'burger', calories: 570, protein: 30, carbs: 39, fat: 34, fiber: 3, sodium: 1150, sugar: 9, serving: '1 sandwich', servingSize: 218, servingUnit: 'g', popular: true },
  { id: 'wendys_daves_double', name: "Dave's Double", chain: "Wendy's", category: 'burger', calories: 810, protein: 48, carbs: 40, fat: 50, fiber: 3, sodium: 1480, sugar: 9, serving: '1 sandwich', servingSize: 308, servingUnit: 'g', popular: true },
  { id: 'wendys_daves_triple', name: "Dave's Triple", chain: "Wendy's", category: 'burger', calories: 1090, protein: 69, carbs: 40, fat: 72, fiber: 3, sodium: 1760, sugar: 9, serving: '1 sandwich', servingSize: 398, servingUnit: 'g' },
  { id: 'wendys_baconator', name: 'Baconator', chain: "Wendy's", category: 'burger', calories: 950, protein: 57, carbs: 38, fat: 63, fiber: 2, sodium: 1810, sugar: 8, serving: '1 sandwich', servingSize: 310, servingUnit: 'g', popular: true },
  { id: 'wendys_jr_bacon_cheeseburger', name: 'Jr. Bacon Cheeseburger', chain: "Wendy's", category: 'burger', calories: 380, protein: 20, carbs: 26, fat: 22, fiber: 1, sodium: 720, sugar: 5, serving: '1 sandwich', servingSize: 139, servingUnit: 'g' },
  { id: 'wendys_spicy_chicken', name: 'Spicy Chicken Sandwich', chain: "Wendy's", category: 'chicken', calories: 500, protein: 29, carbs: 48, fat: 21, fiber: 3, sodium: 1310, sugar: 4, serving: '1 sandwich', servingSize: 218, servingUnit: 'g', popular: true },
  { id: 'wendys_classic_chicken', name: 'Classic Chicken Sandwich', chain: "Wendy's", category: 'chicken', calories: 490, protein: 28, carbs: 48, fat: 20, fiber: 3, sodium: 1250, sugar: 5, serving: '1 sandwich', servingSize: 218, servingUnit: 'g' },
  { id: 'wendys_10pc_nuggets', name: '10 Piece Chicken Nuggets', chain: "Wendy's", category: 'chicken', calories: 430, protein: 22, carbs: 29, fat: 25, fiber: 0, sodium: 920, sugar: 0, serving: '10 pieces', servingSize: 150, servingUnit: 'g', popular: true },
  { id: 'wendys_medium_fries', name: 'Medium French Fries', chain: "Wendy's", category: 'side', calories: 350, protein: 5, carbs: 47, fat: 16, fiber: 5, sodium: 410, sugar: 0, serving: '1 medium', servingSize: 142, servingUnit: 'g' },
  { id: 'wendys_chili_large', name: 'Chili (Large)', chain: "Wendy's", category: 'side', calories: 330, protein: 23, carbs: 33, fat: 12, fiber: 8, sodium: 1170, sugar: 10, serving: '1 large', servingSize: 340, servingUnit: 'g' },
  { id: 'wendys_baked_potato_sour_cream', name: 'Baked Potato with Sour Cream & Chives', chain: "Wendy's", category: 'side', calories: 310, protein: 7, carbs: 63, fat: 4, fiber: 7, sodium: 30, sugar: 3, serving: '1 potato', servingSize: 312, servingUnit: 'g' },
  { id: 'wendys_apple_pecan_salad_full', name: 'Apple Pecan Chicken Salad (Full)', chain: "Wendy's", category: 'salad', calories: 560, protein: 35, carbs: 39, fat: 30, fiber: 5, sodium: 1070, sugar: 28, serving: '1 salad', servingSize: 397, servingUnit: 'g' },
  { id: 'wendys_chocolate_frosty_medium', name: 'Chocolate Frosty (Medium)', chain: "Wendy's", category: 'dessert', calories: 460, protein: 11, carbs: 73, fat: 13, fiber: 1, sodium: 280, sugar: 57, serving: '1 medium', servingSize: 298, servingUnit: 'g' },
  { id: 'wendys_vanilla_frosty_medium', name: 'Vanilla Frosty (Medium)', chain: "Wendy's", category: 'dessert', calories: 450, protein: 11, carbs: 70, fat: 13, fiber: 0, sodium: 260, sugar: 55, serving: '1 medium', servingSize: 298, servingUnit: 'g' },
  { id: 'wendys_breakfast_baconator', name: 'Breakfast Baconator', chain: "Wendy's", category: 'breakfast', calories: 700, protein: 34, carbs: 37, fat: 46, fiber: 1, sodium: 1580, sugar: 6, serving: '1 sandwich', servingSize: 224, servingUnit: 'g' },
  { id: 'wendys_honey_butter_biscuit', name: 'Honey Butter Chicken Biscuit', chain: "Wendy's", category: 'breakfast', calories: 500, protein: 18, carbs: 53, fat: 24, fiber: 1, sodium: 1150, sugar: 12, serving: '1 sandwich', servingSize: 170, servingUnit: 'g' },

  // ─── Chick-fil-A ───
  { id: 'cfa_chicken_sandwich', name: 'Chick-fil-A Chicken Sandwich', chain: 'Chick-fil-A', category: 'chicken', calories: 440, protein: 28, carbs: 40, fat: 19, fiber: 1, sodium: 1400, sugar: 5, serving: '1 sandwich', servingSize: 183, servingUnit: 'g', popular: true },
  { id: 'cfa_deluxe_sandwich', name: 'Chick-fil-A Deluxe Sandwich', chain: 'Chick-fil-A', category: 'chicken', calories: 500, protein: 29, carbs: 42, fat: 22, fiber: 2, sodium: 1640, sugar: 6, serving: '1 sandwich', servingSize: 208, servingUnit: 'g', popular: true },
  { id: 'cfa_spicy_chicken_sandwich', name: 'Spicy Chicken Sandwich', chain: 'Chick-fil-A', category: 'chicken', calories: 450, protein: 28, carbs: 42, fat: 19, fiber: 2, sodium: 1620, sugar: 5, serving: '1 sandwich', servingSize: 183, servingUnit: 'g', popular: true },
  { id: 'cfa_grilled_chicken_sandwich', name: 'Grilled Chicken Sandwich', chain: 'Chick-fil-A', category: 'chicken', calories: 390, protein: 29, carbs: 44, fat: 12, fiber: 3, sodium: 960, sugar: 9, serving: '1 sandwich', servingSize: 211, servingUnit: 'g' },
  { id: 'cfa_nuggets_12ct', name: 'Chicken Nuggets (12 Count)', chain: 'Chick-fil-A', category: 'chicken', calories: 380, protein: 40, carbs: 15, fat: 18, fiber: 0, sodium: 1620, sugar: 1, serving: '12 pieces', servingSize: 170, servingUnit: 'g', popular: true },
  { id: 'cfa_nuggets_8ct', name: 'Chicken Nuggets (8 Count)', chain: 'Chick-fil-A', category: 'chicken', calories: 250, protein: 27, carbs: 10, fat: 12, fiber: 0, sodium: 1080, sugar: 1, serving: '8 pieces', servingSize: 113, servingUnit: 'g' },
  { id: 'cfa_grilled_nuggets_12ct', name: 'Grilled Nuggets (12 Count)', chain: 'Chick-fil-A', category: 'chicken', calories: 200, protein: 38, carbs: 2, fat: 4, fiber: 0, sodium: 860, sugar: 1, serving: '12 pieces', servingSize: 170, servingUnit: 'g' },
  { id: 'cfa_waffle_fries_medium', name: 'Waffle Potato Fries (Medium)', chain: 'Chick-fil-A', category: 'side', calories: 420, protein: 5, carbs: 46, fat: 24, fiber: 5, sodium: 240, sugar: 1, serving: '1 medium', servingSize: 125, servingUnit: 'g', popular: true },
  { id: 'cfa_mac_and_cheese_medium', name: 'Mac & Cheese (Medium)', chain: 'Chick-fil-A', category: 'side', calories: 450, protein: 17, carbs: 45, fat: 22, fiber: 1, sodium: 1210, sugar: 5, serving: '1 medium', servingSize: 227, servingUnit: 'g' },
  { id: 'cfa_chicken_biscuit', name: 'Chick-fil-A Chicken Biscuit', chain: 'Chick-fil-A', category: 'breakfast', calories: 440, protein: 17, carbs: 47, fat: 20, fiber: 2, sodium: 1250, sugar: 5, serving: '1 sandwich', servingSize: 163, servingUnit: 'g' },
  { id: 'cfa_chicken_egg_cheese_biscuit', name: 'Chick-fil-A Chicken, Egg & Cheese Biscuit', chain: 'Chick-fil-A', category: 'breakfast', calories: 550, protein: 25, carbs: 48, fat: 28, fiber: 2, sodium: 1560, sugar: 6, serving: '1 sandwich', servingSize: 212, servingUnit: 'g' },
  { id: 'cfa_hash_brown_scramble_bowl', name: 'Hash Brown Scramble Bowl', chain: 'Chick-fil-A', category: 'breakfast', calories: 460, protein: 28, carbs: 28, fat: 27, fiber: 3, sodium: 1170, sugar: 2, serving: '1 bowl', servingSize: 234, servingUnit: 'g' },
  { id: 'cfa_cobb_salad', name: 'Cobb Salad (with Nuggets)', chain: 'Chick-fil-A', category: 'salad', calories: 510, protein: 40, carbs: 26, fat: 28, fiber: 5, sodium: 1560, sugar: 6, serving: '1 salad', servingSize: 397, servingUnit: 'g' },
  { id: 'cfa_cookies_cream_milkshake', name: 'Cookies & Cream Milkshake (Small)', chain: 'Chick-fil-A', category: 'drink', calories: 540, protein: 13, carbs: 78, fat: 21, fiber: 1, sodium: 430, sugar: 67, serving: '1 small', servingSize: 397, servingUnit: 'g' },
  { id: 'cfa_frosted_lemonade', name: 'Frosted Lemonade (Small)', chain: 'Chick-fil-A', category: 'drink', calories: 330, protein: 6, carbs: 64, fat: 7, fiber: 0, sodium: 160, sugar: 61, serving: '1 small', servingSize: 397, servingUnit: 'g' },
  { id: 'cfa_chicken_cool_wrap', name: 'Grilled Chicken Cool Wrap', chain: 'Chick-fil-A', category: 'wrap', calories: 350, protein: 37, carbs: 29, fat: 13, fiber: 15, sodium: 1060, sugar: 4, serving: '1 wrap', servingSize: 227, servingUnit: 'g' },

  // ─── Taco Bell ───
  { id: 'tacobell_crunchy_taco', name: 'Crunchy Taco', chain: 'Taco Bell', category: 'taco', calories: 170, protein: 8, carbs: 13, fat: 10, fiber: 3, sodium: 310, sugar: 1, serving: '1 taco', servingSize: 78, servingUnit: 'g', popular: true },
  { id: 'tacobell_crunchy_taco_supreme', name: 'Crunchy Taco Supreme', chain: 'Taco Bell', category: 'taco', calories: 190, protein: 8, carbs: 14, fat: 11, fiber: 3, sodium: 350, sugar: 2, serving: '1 taco', servingSize: 92, servingUnit: 'g' },
  { id: 'tacobell_soft_taco', name: 'Soft Taco', chain: 'Taco Bell', category: 'taco', calories: 180, protein: 9, carbs: 18, fat: 9, fiber: 2, sodium: 510, sugar: 1, serving: '1 taco', servingSize: 99, servingUnit: 'g' },
  { id: 'tacobell_doritos_locos_taco', name: 'Doritos Locos Taco', chain: 'Taco Bell', category: 'taco', calories: 170, protein: 8, carbs: 13, fat: 10, fiber: 3, sodium: 350, sugar: 1, serving: '1 taco', servingSize: 78, servingUnit: 'g', popular: true },
  { id: 'tacobell_chalupa_supreme_beef', name: 'Chalupa Supreme - Beef', chain: 'Taco Bell', category: 'taco', calories: 350, protein: 12, carbs: 30, fat: 21, fiber: 4, sodium: 600, sugar: 4, serving: '1 chalupa', servingSize: 153, servingUnit: 'g' },
  { id: 'tacobell_cheesy_gordita_crunch', name: 'Cheesy Gordita Crunch', chain: 'Taco Bell', category: 'taco', calories: 500, protein: 20, carbs: 41, fat: 28, fiber: 4, sodium: 880, sugar: 5, serving: '1 item', servingSize: 153, servingUnit: 'g', popular: true },
  { id: 'tacobell_crunchwrap_supreme', name: 'Crunchwrap Supreme', chain: 'Taco Bell', category: 'wrap', calories: 530, protein: 16, carbs: 71, fat: 21, fiber: 5, sodium: 1220, sugar: 6, serving: '1 wrap', servingSize: 254, servingUnit: 'g', popular: true },
  { id: 'tacobell_bean_burrito', name: 'Bean Burrito', chain: 'Taco Bell', category: 'taco', calories: 380, protein: 14, carbs: 55, fat: 11, fiber: 10, sodium: 1060, sugar: 3, serving: '1 burrito', servingSize: 198, servingUnit: 'g' },
  { id: 'tacobell_beef_burrito', name: 'Beefy 5-Layer Burrito', chain: 'Taco Bell', category: 'taco', calories: 500, protein: 18, carbs: 62, fat: 20, fiber: 6, sodium: 1400, sugar: 4, serving: '1 burrito', servingSize: 248, servingUnit: 'g' },
  { id: 'tacobell_quesadilla_chicken', name: 'Chicken Quesadilla', chain: 'Taco Bell', category: 'taco', calories: 500, protein: 27, carbs: 37, fat: 27, fiber: 3, sodium: 1230, sugar: 3, serving: '1 quesadilla', servingSize: 184, servingUnit: 'g', popular: true },
  { id: 'tacobell_nachos_bellgrande', name: 'Nachos BellGrande', chain: 'Taco Bell', category: 'side', calories: 740, protein: 16, carbs: 82, fat: 38, fiber: 9, sodium: 1060, sugar: 4, serving: '1 order', servingSize: 308, servingUnit: 'g' },
  { id: 'tacobell_mexican_pizza', name: 'Mexican Pizza', chain: 'Taco Bell', category: 'taco', calories: 540, protein: 20, carbs: 46, fat: 31, fiber: 7, sodium: 1000, sugar: 3, serving: '1 pizza', servingSize: 213, servingUnit: 'g' },
  { id: 'tacobell_power_bowl_chicken', name: 'Power Menu Bowl - Chicken', chain: 'Taco Bell', category: 'bowl', calories: 470, protein: 26, carbs: 50, fat: 18, fiber: 7, sodium: 1230, sugar: 3, serving: '1 bowl', servingSize: 340, servingUnit: 'g' },
  { id: 'tacobell_cinnabon_delights_12', name: 'Cinnabon Delights (12 Pack)', chain: 'Taco Bell', category: 'dessert', calories: 930, protein: 12, carbs: 108, fat: 50, fiber: 1, sodium: 530, sugar: 48, serving: '12 pieces', servingSize: 264, servingUnit: 'g' },
  { id: 'tacobell_baja_blast_medium', name: 'Baja Blast (Medium)', chain: 'Taco Bell', category: 'drink', calories: 220, protein: 0, carbs: 60, fat: 0, fiber: 0, sodium: 55, sugar: 60, serving: '1 medium', servingSize: 590, servingUnit: 'g' },
  { id: 'tacobell_cheese_quesadilla', name: 'Cheese Quesadilla', chain: 'Taco Bell', category: 'taco', calories: 470, protein: 19, carbs: 38, fat: 26, fiber: 3, sodium: 1020, sugar: 3, serving: '1 quesadilla', servingSize: 156, servingUnit: 'g' },

  // ─── Chipotle ───
  { id: 'chipotle_chicken_burrito', name: 'Chicken Burrito (standard)', chain: 'Chipotle', category: 'bowl', calories: 1005, protein: 55, carbs: 105, fat: 37, fiber: 12, sodium: 2120, sugar: 4, serving: '1 burrito', servingSize: 510, servingUnit: 'g', popular: true },
  { id: 'chipotle_chicken_bowl', name: 'Chicken Burrito Bowl', chain: 'Chipotle', category: 'bowl', calories: 740, protein: 52, carbs: 65, fat: 27, fiber: 10, sodium: 1880, sugar: 4, serving: '1 bowl', servingSize: 480, servingUnit: 'g', popular: true },
  { id: 'chipotle_steak_burrito', name: 'Steak Burrito (standard)', chain: 'Chipotle', category: 'bowl', calories: 1035, protein: 52, carbs: 106, fat: 40, fiber: 12, sodium: 2090, sugar: 4, serving: '1 burrito', servingSize: 510, servingUnit: 'g', popular: true },
  { id: 'chipotle_steak_bowl', name: 'Steak Burrito Bowl', chain: 'Chipotle', category: 'bowl', calories: 770, protein: 49, carbs: 66, fat: 30, fiber: 10, sodium: 1850, sugar: 4, serving: '1 bowl', servingSize: 480, servingUnit: 'g' },
  { id: 'chipotle_barbacoa_bowl', name: 'Barbacoa Burrito Bowl', chain: 'Chipotle', category: 'bowl', calories: 760, protein: 48, carbs: 66, fat: 29, fiber: 11, sodium: 2010, sugar: 5, serving: '1 bowl', servingSize: 480, servingUnit: 'g' },
  { id: 'chipotle_carnitas_bowl', name: 'Carnitas Burrito Bowl', chain: 'Chipotle', category: 'bowl', calories: 790, protein: 46, carbs: 66, fat: 33, fiber: 10, sodium: 1950, sugar: 4, serving: '1 bowl', servingSize: 480, servingUnit: 'g' },
  { id: 'chipotle_sofritas_bowl', name: 'Sofritas Burrito Bowl', chain: 'Chipotle', category: 'bowl', calories: 695, protein: 27, carbs: 73, fat: 28, fiber: 12, sodium: 1780, sugar: 6, serving: '1 bowl', servingSize: 480, servingUnit: 'g' },
  { id: 'chipotle_chicken_tacos_3', name: 'Chicken Tacos (3 Crispy)', chain: 'Chipotle', category: 'taco', calories: 750, protein: 42, carbs: 57, fat: 35, fiber: 6, sodium: 1350, sugar: 3, serving: '3 tacos', servingSize: 360, servingUnit: 'g', popular: true },
  { id: 'chipotle_chicken_quesadilla', name: 'Chicken Quesadilla', chain: 'Chipotle', category: 'taco', calories: 900, protein: 52, carbs: 60, fat: 48, fiber: 3, sodium: 1810, sugar: 3, serving: '1 quesadilla', servingSize: 290, servingUnit: 'g', popular: true },
  { id: 'chipotle_chips_guac', name: 'Chips & Guacamole', chain: 'Chipotle', category: 'side', calories: 770, protein: 10, carbs: 73, fat: 48, fiber: 11, sodium: 520, sugar: 1, serving: '1 order', servingSize: 214, servingUnit: 'g' },
  { id: 'chipotle_chips_queso', name: 'Chips & Queso Blanco', chain: 'Chipotle', category: 'side', calories: 780, protein: 15, carbs: 78, fat: 44, fiber: 4, sodium: 1100, sugar: 2, serving: '1 order', servingSize: 220, servingUnit: 'g' },
  { id: 'chipotle_guacamole_side', name: 'Guacamole (Side)', chain: 'Chipotle', category: 'side', calories: 230, protein: 3, carbs: 12, fat: 22, fiber: 7, sodium: 375, sugar: 1, serving: '1 side', servingSize: 100, servingUnit: 'g' },
  { id: 'chipotle_chips', name: 'Chips', chain: 'Chipotle', category: 'side', calories: 540, protein: 7, carbs: 61, fat: 26, fiber: 4, sodium: 345, sugar: 0, serving: '1 bag', servingSize: 114, servingUnit: 'g' },
  { id: 'chipotle_white_rice', name: 'White Rice (Side)', chain: 'Chipotle', category: 'side', calories: 210, protein: 4, carbs: 40, fat: 4, fiber: 0, sodium: 340, sugar: 0, serving: '1 serving', servingSize: 130, servingUnit: 'g' },
  { id: 'chipotle_chicken_salad', name: 'Chicken Salad Bowl', chain: 'Chipotle', category: 'salad', calories: 580, protein: 50, carbs: 26, fat: 28, fiber: 8, sodium: 1590, sugar: 4, serving: '1 bowl', servingSize: 420, servingUnit: 'g' },

  // ─── Subway ───
  { id: 'subway_italian_bmt_6in', name: 'Italian B.M.T. (6-inch)', chain: 'Subway', category: 'sandwich', calories: 370, protein: 17, carbs: 40, fat: 16, fiber: 2, sodium: 1260, sugar: 6, serving: '1 sandwich', servingSize: 226, servingUnit: 'g', popular: true },
  { id: 'subway_turkey_breast_6in', name: 'Turkey Breast (6-inch)', chain: 'Subway', category: 'sandwich', calories: 270, protein: 18, carbs: 40, fat: 4, fiber: 2, sodium: 790, sugar: 6, serving: '1 sandwich', servingSize: 218, servingUnit: 'g', popular: true },
  { id: 'subway_chicken_teriyaki_6in', name: 'Sweet Onion Chicken Teriyaki (6-inch)', chain: 'Subway', category: 'sandwich', calories: 330, protein: 26, carbs: 47, fat: 5, fiber: 2, sodium: 880, sugar: 15, serving: '1 sandwich', servingSize: 264, servingUnit: 'g', popular: true },
  { id: 'subway_meatball_marinara_6in', name: 'Meatball Marinara (6-inch)', chain: 'Subway', category: 'sandwich', calories: 480, protein: 21, carbs: 53, fat: 20, fiber: 5, sodium: 1070, sugar: 12, serving: '1 sandwich', servingSize: 292, servingUnit: 'g', popular: true },
  { id: 'subway_cold_cut_combo_6in', name: 'Cold Cut Combo (6-inch)', chain: 'Subway', category: 'sandwich', calories: 360, protein: 15, carbs: 41, fat: 14, fiber: 2, sodium: 1100, sugar: 6, serving: '1 sandwich', servingSize: 226, servingUnit: 'g' },
  { id: 'subway_tuna_6in', name: 'Tuna (6-inch)', chain: 'Subway', category: 'sandwich', calories: 480, protein: 20, carbs: 40, fat: 27, fiber: 2, sodium: 730, sugar: 5, serving: '1 sandwich', servingSize: 240, servingUnit: 'g' },
  { id: 'subway_steak_cheese_6in', name: 'Steak & Cheese (6-inch)', chain: 'Subway', category: 'sandwich', calories: 380, protein: 25, carbs: 42, fat: 12, fiber: 3, sodium: 1100, sugar: 7, serving: '1 sandwich', servingSize: 244, servingUnit: 'g', popular: true },
  { id: 'subway_chicken_bacon_ranch_6in', name: 'Chicken Bacon Ranch (6-inch)', chain: 'Subway', category: 'sandwich', calories: 530, protein: 33, carbs: 41, fat: 26, fiber: 2, sodium: 1170, sugar: 5, serving: '1 sandwich', servingSize: 260, servingUnit: 'g' },
  { id: 'subway_veggie_delite_6in', name: 'Veggie Delite (6-inch)', chain: 'Subway', category: 'sandwich', calories: 200, protein: 7, carbs: 39, fat: 2, fiber: 2, sodium: 310, sugar: 5, serving: '1 sandwich', servingSize: 163, servingUnit: 'g' },
  { id: 'subway_spicy_italian_6in', name: 'Spicy Italian (6-inch)', chain: 'Subway', category: 'sandwich', calories: 470, protein: 19, carbs: 40, fat: 26, fiber: 2, sodium: 1520, sugar: 5, serving: '1 sandwich', servingSize: 226, servingUnit: 'g' },
  { id: 'subway_blt_6in', name: 'B.L.T. (6-inch)', chain: 'Subway', category: 'sandwich', calories: 320, protein: 12, carbs: 40, fat: 12, fiber: 2, sodium: 750, sugar: 5, serving: '1 sandwich', servingSize: 175, servingUnit: 'g' },
  { id: 'subway_rotisserie_chicken_6in', name: 'Rotisserie-Style Chicken (6-inch)', chain: 'Subway', category: 'sandwich', calories: 300, protein: 25, carbs: 40, fat: 5, fiber: 2, sodium: 820, sugar: 6, serving: '1 sandwich', servingSize: 232, servingUnit: 'g' },
  { id: 'subway_chocolate_chip_cookie', name: 'Chocolate Chip Cookie', chain: 'Subway', category: 'dessert', calories: 200, protein: 2, carbs: 28, fat: 9, fiber: 1, sodium: 130, sugar: 17, serving: '1 cookie', servingSize: 45, servingUnit: 'g' },
  { id: 'subway_white_chip_macadamia', name: 'White Chip Macadamia Nut Cookie', chain: 'Subway', category: 'dessert', calories: 210, protein: 2, carbs: 28, fat: 10, fiber: 0, sodium: 130, sugar: 18, serving: '1 cookie', servingSize: 45, servingUnit: 'g' },
  { id: 'subway_chips', name: 'Lay\'s Classic Chips', chain: 'Subway', category: 'side', calories: 230, protein: 3, carbs: 25, fat: 13, fiber: 2, sodium: 270, sugar: 1, serving: '1 bag', servingSize: 43, servingUnit: 'g' },

  // ─── Starbucks ───
  { id: 'starbucks_caramel_frappuccino_grande', name: 'Caramel Frappuccino (Grande)', chain: 'Starbucks', category: 'drink', calories: 380, protein: 5, carbs: 57, fat: 16, fiber: 0, sodium: 250, sugar: 54, serving: '1 grande', servingSize: 473, servingUnit: 'g', popular: true },
  { id: 'starbucks_psl_grande', name: 'Pumpkin Spice Latte (Grande)', chain: 'Starbucks', category: 'drink', calories: 390, protein: 14, carbs: 52, fat: 14, fiber: 0, sodium: 240, sugar: 50, serving: '1 grande', servingSize: 473, servingUnit: 'g', popular: true },
  { id: 'starbucks_vanilla_latte_grande', name: 'Vanilla Latte (Grande)', chain: 'Starbucks', category: 'drink', calories: 250, protein: 12, carbs: 37, fat: 6, fiber: 0, sodium: 150, sugar: 35, serving: '1 grande', servingSize: 473, servingUnit: 'g', popular: true },
  { id: 'starbucks_caffe_latte_grande', name: 'Caffe Latte (Grande)', chain: 'Starbucks', category: 'drink', calories: 190, protein: 13, carbs: 19, fat: 7, fiber: 0, sodium: 170, sugar: 17, serving: '1 grande', servingSize: 473, servingUnit: 'g', popular: true },
  { id: 'starbucks_mocha_frappuccino_grande', name: 'Mocha Frappuccino (Grande)', chain: 'Starbucks', category: 'drink', calories: 370, protein: 6, carbs: 55, fat: 15, fiber: 2, sodium: 230, sugar: 51, serving: '1 grande', servingSize: 473, servingUnit: 'g' },
  { id: 'starbucks_iced_caramel_macchiato_grande', name: 'Iced Caramel Macchiato (Grande)', chain: 'Starbucks', category: 'drink', calories: 250, protein: 10, carbs: 34, fat: 7, fiber: 0, sodium: 150, sugar: 33, serving: '1 grande', servingSize: 473, servingUnit: 'g', popular: true },
  { id: 'starbucks_cold_brew_grande', name: 'Cold Brew (Grande, black)', chain: 'Starbucks', category: 'drink', calories: 5, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 15, sugar: 0, serving: '1 grande', servingSize: 473, servingUnit: 'g' },
  { id: 'starbucks_pink_drink_grande', name: 'Pink Drink (Grande)', chain: 'Starbucks', category: 'drink', calories: 140, protein: 1, carbs: 27, fat: 3, fiber: 1, sodium: 85, sugar: 25, serving: '1 grande', servingSize: 473, servingUnit: 'g' },
  { id: 'starbucks_chai_tea_latte_grande', name: 'Chai Tea Latte (Grande)', chain: 'Starbucks', category: 'drink', calories: 240, protein: 8, carbs: 42, fat: 4, fiber: 0, sodium: 115, sugar: 42, serving: '1 grande', servingSize: 473, servingUnit: 'g' },
  { id: 'starbucks_white_mocha_grande', name: 'White Chocolate Mocha (Grande)', chain: 'Starbucks', category: 'drink', calories: 430, protein: 13, carbs: 54, fat: 18, fiber: 0, sodium: 250, sugar: 53, serving: '1 grande', servingSize: 473, servingUnit: 'g' },
  { id: 'starbucks_bacon_gouda_sandwich', name: 'Bacon, Gouda & Egg Sandwich', chain: 'Starbucks', category: 'breakfast', calories: 370, protein: 19, carbs: 32, fat: 19, fiber: 1, sodium: 820, sugar: 3, serving: '1 sandwich', servingSize: 120, servingUnit: 'g' },
  { id: 'starbucks_sausage_cheddar_sandwich', name: 'Sausage, Cheddar & Egg Sandwich', chain: 'Starbucks', category: 'breakfast', calories: 480, protein: 15, carbs: 34, fat: 31, fiber: 2, sodium: 840, sugar: 4, serving: '1 sandwich', servingSize: 129, servingUnit: 'g' },
  { id: 'starbucks_egg_bites_bacon_gruyere', name: 'Bacon & Gruyere Egg Bites (2 pack)', chain: 'Starbucks', category: 'breakfast', calories: 300, protein: 19, carbs: 9, fat: 20, fiber: 0, sodium: 600, sugar: 2, serving: '2 pieces', servingSize: 128, servingUnit: 'g' },
  { id: 'starbucks_chocolate_croissant', name: 'Chocolate Croissant', chain: 'Starbucks', category: 'dessert', calories: 340, protein: 5, carbs: 37, fat: 19, fiber: 2, sodium: 280, sugar: 15, serving: '1 pastry', servingSize: 79, servingUnit: 'g' },
  { id: 'starbucks_cake_pop_birthday', name: 'Birthday Cake Pop', chain: 'Starbucks', category: 'dessert', calories: 180, protein: 2, carbs: 22, fat: 9, fiber: 0, sodium: 110, sugar: 17, serving: '1 pop', servingSize: 45, servingUnit: 'g' },
  { id: 'starbucks_impossible_sandwich', name: 'Impossible Breakfast Sandwich', chain: 'Starbucks', category: 'breakfast', calories: 420, protein: 22, carbs: 34, fat: 22, fiber: 3, sodium: 820, sugar: 4, serving: '1 sandwich', servingSize: 137, servingUnit: 'g' },

  // ─── Dunkin' ───
  { id: 'dunkin_glazed_donut', name: 'Glazed Donut', chain: "Dunkin'", category: 'dessert', calories: 240, protein: 3, carbs: 31, fat: 11, fiber: 1, sodium: 340, sugar: 12, serving: '1 donut', servingSize: 67, servingUnit: 'g', popular: true },
  { id: 'dunkin_boston_kreme', name: 'Boston Kreme Donut', chain: "Dunkin'", category: 'dessert', calories: 280, protein: 3, carbs: 38, fat: 13, fiber: 1, sodium: 350, sugar: 17, serving: '1 donut', servingSize: 85, servingUnit: 'g', popular: true },
  { id: 'dunkin_chocolate_frosted', name: 'Chocolate Frosted Donut', chain: "Dunkin'", category: 'dessert', calories: 270, protein: 3, carbs: 32, fat: 15, fiber: 1, sodium: 340, sugar: 16, serving: '1 donut', servingSize: 74, servingUnit: 'g' },
  { id: 'dunkin_jelly_donut', name: 'Jelly Donut', chain: "Dunkin'", category: 'dessert', calories: 270, protein: 4, carbs: 36, fat: 12, fiber: 1, sodium: 340, sugar: 14, serving: '1 donut', servingSize: 85, servingUnit: 'g' },
  { id: 'dunkin_iced_latte_medium', name: 'Iced Latte (Medium)', chain: "Dunkin'", category: 'drink', calories: 120, protein: 7, carbs: 11, fat: 6, fiber: 0, sodium: 105, sugar: 11, serving: '1 medium', servingSize: 680, servingUnit: 'g', popular: true },
  { id: 'dunkin_caramel_swirl_iced_coffee_medium', name: 'Iced Coffee with Caramel Swirl (Medium)', chain: "Dunkin'", category: 'drink', calories: 230, protein: 3, carbs: 37, fat: 8, fiber: 0, sodium: 95, sugar: 36, serving: '1 medium', servingSize: 680, servingUnit: 'g', popular: true },
  { id: 'dunkin_frozen_chocolate_medium', name: 'Frozen Chocolate (Medium)', chain: "Dunkin'", category: 'drink', calories: 600, protein: 10, carbs: 96, fat: 19, fiber: 2, sodium: 350, sugar: 83, serving: '1 medium', servingSize: 680, servingUnit: 'g' },
  { id: 'dunkin_original_blend_medium', name: 'Original Blend Iced Coffee (Medium)', chain: "Dunkin'", category: 'drink', calories: 10, protein: 0, carbs: 2, fat: 0, fiber: 0, sodium: 15, sugar: 0, serving: '1 medium', servingSize: 680, servingUnit: 'g' },
  { id: 'dunkin_cold_brew_medium', name: 'Cold Brew (Medium)', chain: "Dunkin'", category: 'drink', calories: 5, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 10, sugar: 0, serving: '1 medium', servingSize: 680, servingUnit: 'g', popular: true },
  { id: 'dunkin_bacon_egg_cheese_croissant', name: 'Bacon, Egg & Cheese on Croissant', chain: "Dunkin'", category: 'breakfast', calories: 510, protein: 19, carbs: 36, fat: 32, fiber: 0, sodium: 920, sugar: 6, serving: '1 sandwich', servingSize: 156, servingUnit: 'g' },
  { id: 'dunkin_sausage_egg_cheese_croissant', name: 'Sausage, Egg & Cheese on Croissant', chain: "Dunkin'", category: 'breakfast', calories: 650, protein: 24, carbs: 36, fat: 45, fiber: 0, sodium: 1080, sugar: 6, serving: '1 sandwich', servingSize: 185, servingUnit: 'g' },
  { id: 'dunkin_bacon_egg_cheese_bagel', name: 'Bacon, Egg & Cheese on Bagel', chain: "Dunkin'", category: 'breakfast', calories: 520, protein: 22, carbs: 55, fat: 23, fiber: 2, sodium: 1030, sugar: 7, serving: '1 sandwich', servingSize: 190, servingUnit: 'g' },
  { id: 'dunkin_hash_browns_6pc', name: 'Hash Browns (6 Piece)', chain: "Dunkin'", category: 'side', calories: 360, protein: 3, carbs: 33, fat: 24, fiber: 3, sodium: 670, sugar: 0, serving: '6 pieces', servingSize: 108, servingUnit: 'g' },
  { id: 'dunkin_wake_up_wrap_bacon', name: 'Bacon, Egg & Cheese Wake-Up Wrap', chain: "Dunkin'", category: 'breakfast', calories: 200, protein: 10, carbs: 14, fat: 12, fiber: 0, sodium: 530, sugar: 1, serving: '1 wrap', servingSize: 72, servingUnit: 'g' },
  { id: 'dunkin_blueberry_muffin', name: 'Blueberry Muffin', chain: "Dunkin'", category: 'dessert', calories: 460, protein: 6, carbs: 68, fat: 18, fiber: 1, sodium: 490, sugar: 37, serving: '1 muffin', servingSize: 142, servingUnit: 'g' },
  { id: 'dunkin_chocolate_munchkins_5', name: 'Chocolate Glazed Munchkins (5 Pack)', chain: "Dunkin'", category: 'dessert', calories: 260, protein: 3, carbs: 31, fat: 14, fiber: 1, sodium: 300, sugar: 14, serving: '5 pieces', servingSize: 73, servingUnit: 'g' },

  // ─── Panera Bread ───
  { id: 'panera_broccoli_cheddar_bread_bowl', name: 'Broccoli Cheddar Soup (Bread Bowl)', chain: 'Panera Bread', category: 'bowl', calories: 870, protein: 33, carbs: 114, fat: 31, fiber: 7, sodium: 2340, sugar: 11, serving: '1 bread bowl', servingSize: 567, servingUnit: 'g', popular: true },
  { id: 'panera_broccoli_cheddar_cup', name: 'Broccoli Cheddar Soup (Cup)', chain: 'Panera Bread', category: 'bowl', calories: 230, protein: 10, carbs: 17, fat: 14, fiber: 2, sodium: 900, sugar: 4, serving: '1 cup', servingSize: 227, servingUnit: 'g', popular: true },
  { id: 'panera_mac_cheese', name: 'Mac & Cheese (whole)', chain: 'Panera Bread', category: 'side', calories: 980, protein: 34, carbs: 101, fat: 49, fiber: 5, sodium: 2100, sugar: 10, serving: '1 entree', servingSize: 397, servingUnit: 'g', popular: true },
  { id: 'panera_bacon_turkey_bravo', name: 'Bacon Turkey Bravo Sandwich', chain: 'Panera Bread', category: 'sandwich', calories: 620, protein: 35, carbs: 63, fat: 25, fiber: 3, sodium: 1770, sugar: 9, serving: '1 sandwich', servingSize: 326, servingUnit: 'g', popular: true },
  { id: 'panera_frontega_chicken_panini', name: 'Frontega Chicken Panini', chain: 'Panera Bread', category: 'sandwich', calories: 700, protein: 38, carbs: 58, fat: 33, fiber: 3, sodium: 1630, sugar: 4, serving: '1 sandwich', servingSize: 311, servingUnit: 'g' },
  { id: 'panera_fuji_apple_chicken_salad', name: 'Fuji Apple Chicken Salad (Whole)', chain: 'Panera Bread', category: 'salad', calories: 570, protein: 30, carbs: 44, fat: 31, fiber: 6, sodium: 1020, sugar: 23, serving: '1 salad', servingSize: 385, servingUnit: 'g', popular: true },
  { id: 'panera_green_goddess_cobb', name: 'Green Goddess Cobb Salad with Chicken (Whole)', chain: 'Panera Bread', category: 'salad', calories: 530, protein: 39, carbs: 18, fat: 35, fiber: 5, sodium: 1210, sugar: 5, serving: '1 salad', servingSize: 368, servingUnit: 'g' },
  { id: 'panera_chipotle_chicken_avocado_melt', name: 'Chipotle Chicken Avocado Melt', chain: 'Panera Bread', category: 'sandwich', calories: 730, protein: 42, carbs: 58, fat: 36, fiber: 6, sodium: 1600, sugar: 5, serving: '1 sandwich', servingSize: 340, servingUnit: 'g' },
  { id: 'panera_you_pick_two_soup_sandwich', name: 'You Pick Two: Cup Soup + Half Sandwich', chain: 'Panera Bread', category: 'sandwich', calories: 500, protein: 22, carbs: 50, fat: 22, fiber: 3, sodium: 1400, sugar: 6, serving: '1 combo', servingSize: 350, servingUnit: 'g' },
  { id: 'panera_cream_cheese_bagel', name: 'Everything Bagel with Plain Cream Cheese', chain: 'Panera Bread', category: 'breakfast', calories: 430, protein: 14, carbs: 60, fat: 15, fiber: 2, sodium: 710, sugar: 5, serving: '1 bagel', servingSize: 156, servingUnit: 'g' },
  { id: 'panera_chocolate_chip_cookie', name: 'Chocolate Chipper Cookie', chain: 'Panera Bread', category: 'dessert', calories: 370, protein: 4, carbs: 50, fat: 18, fiber: 2, sodium: 310, sugar: 27, serving: '1 cookie', servingSize: 85, servingUnit: 'g' },
  { id: 'panera_baguette', name: 'French Baguette', chain: 'Panera Bread', category: 'side', calories: 350, protein: 14, carbs: 69, fat: 2, fiber: 3, sodium: 740, sugar: 3, serving: '1 baguette', servingSize: 142, servingUnit: 'g' },
  { id: 'panera_chicken_tortilla_soup', name: 'Chicken Tortilla Soup (Cup)', chain: 'Panera Bread', category: 'bowl', calories: 170, protein: 10, carbs: 17, fat: 7, fiber: 2, sodium: 860, sugar: 5, serving: '1 cup', servingSize: 227, servingUnit: 'g' },
  { id: 'panera_ten_veg_soup', name: 'Ten Vegetable Soup (Cup)', chain: 'Panera Bread', category: 'bowl', calories: 100, protein: 3, carbs: 18, fat: 2, fiber: 5, sodium: 730, sugar: 5, serving: '1 cup', servingSize: 227, servingUnit: 'g' },
  { id: 'panera_grilled_cheese', name: 'Classic Grilled Cheese', chain: 'Panera Bread', category: 'sandwich', calories: 740, protein: 27, carbs: 60, fat: 42, fiber: 3, sodium: 1580, sugar: 5, serving: '1 sandwich', servingSize: 218, servingUnit: 'g' },

  // ─── Panda Express ───
  { id: 'panda_orange_chicken', name: 'Orange Chicken', chain: 'Panda Express', category: 'chicken', calories: 490, protein: 25, carbs: 51, fat: 23, fiber: 0, sodium: 820, sugar: 19, serving: '1 entree', servingSize: 162, servingUnit: 'g', popular: true },
  { id: 'panda_beijing_beef', name: 'Beijing Beef', chain: 'Panda Express', category: 'side', calories: 470, protein: 14, carbs: 56, fat: 22, fiber: 2, sodium: 660, sugar: 24, serving: '1 entree', servingSize: 162, servingUnit: 'g', popular: true },
  { id: 'panda_broccoli_beef', name: 'Broccoli Beef', chain: 'Panda Express', category: 'side', calories: 150, protein: 9, carbs: 13, fat: 7, fiber: 2, sodium: 520, sugar: 7, serving: '1 entree', servingSize: 136, servingUnit: 'g' },
  { id: 'panda_kung_pao_chicken', name: 'Kung Pao Chicken', chain: 'Panda Express', category: 'chicken', calories: 290, protein: 16, carbs: 14, fat: 19, fiber: 2, sodium: 900, sugar: 6, serving: '1 entree', servingSize: 162, servingUnit: 'g', popular: true },
  { id: 'panda_grilled_teriyaki_chicken', name: 'Grilled Teriyaki Chicken', chain: 'Panda Express', category: 'chicken', calories: 300, protein: 36, carbs: 8, fat: 13, fiber: 0, sodium: 530, sugar: 8, serving: '1 entree', servingSize: 162, servingUnit: 'g', popular: true },
  { id: 'panda_honey_walnut_shrimp', name: 'Honey Walnut Shrimp', chain: 'Panda Express', category: 'side', calories: 360, protein: 14, carbs: 35, fat: 23, fiber: 2, sodium: 440, sugar: 9, serving: '1 entree', servingSize: 147, servingUnit: 'g', popular: true },
  { id: 'panda_sweetfire_chicken', name: 'SweetFire Chicken Breast', chain: 'Panda Express', category: 'chicken', calories: 380, protein: 17, carbs: 47, fat: 15, fiber: 1, sodium: 370, sugar: 27, serving: '1 entree', servingSize: 162, servingUnit: 'g' },
  { id: 'panda_string_bean_chicken', name: 'String Bean Chicken Breast', chain: 'Panda Express', category: 'chicken', calories: 190, protein: 14, carbs: 13, fat: 9, fiber: 2, sodium: 740, sugar: 5, serving: '1 entree', servingSize: 162, servingUnit: 'g' },
  { id: 'panda_mushroom_chicken', name: 'Mushroom Chicken', chain: 'Panda Express', category: 'chicken', calories: 220, protein: 15, carbs: 12, fat: 13, fiber: 1, sodium: 760, sugar: 5, serving: '1 entree', servingSize: 162, servingUnit: 'g' },
  { id: 'panda_black_pepper_chicken', name: 'Black Pepper Chicken', chain: 'Panda Express', category: 'chicken', calories: 280, protein: 14, carbs: 15, fat: 19, fiber: 2, sodium: 800, sugar: 6, serving: '1 entree', servingSize: 162, servingUnit: 'g' },
  { id: 'panda_fried_rice', name: 'Fried Rice', chain: 'Panda Express', category: 'side', calories: 520, protein: 12, carbs: 85, fat: 16, fiber: 1, sodium: 820, sugar: 3, serving: '1 side', servingSize: 303, servingUnit: 'g' },
  { id: 'panda_chow_mein', name: 'Chow Mein', chain: 'Panda Express', category: 'side', calories: 510, protein: 13, carbs: 80, fat: 22, fiber: 6, sodium: 860, sugar: 9, serving: '1 side', servingSize: 303, servingUnit: 'g' },
  { id: 'panda_white_steamed_rice', name: 'White Steamed Rice', chain: 'Panda Express', category: 'side', calories: 380, protein: 7, carbs: 87, fat: 0, fiber: 0, sodium: 0, sugar: 0, serving: '1 side', servingSize: 303, servingUnit: 'g' },
  { id: 'panda_super_greens', name: 'Super Greens', chain: 'Panda Express', category: 'side', calories: 90, protein: 6, carbs: 10, fat: 4, fiber: 5, sodium: 260, sugar: 3, serving: '1 side', servingSize: 198, servingUnit: 'g' },
  { id: 'panda_cream_cheese_rangoon', name: 'Cream Cheese Rangoon (3 pc)', chain: 'Panda Express', category: 'side', calories: 190, protein: 5, carbs: 24, fat: 8, fiber: 1, sodium: 180, sugar: 1, serving: '3 pieces', servingSize: 64, servingUnit: 'g' },
  { id: 'panda_egg_roll', name: 'Chicken Egg Roll (1 pc)', chain: 'Panda Express', category: 'side', calories: 200, protein: 8, carbs: 20, fat: 10, fiber: 2, sodium: 390, sugar: 2, serving: '1 roll', servingSize: 79, servingUnit: 'g' },

  // ─── Five Guys ───
  { id: 'fiveguys_cheeseburger', name: 'Cheeseburger', chain: 'Five Guys', category: 'burger', calories: 840, protein: 47, carbs: 40, fat: 55, fiber: 2, sodium: 1050, sugar: 8, serving: '1 sandwich', servingSize: 303, servingUnit: 'g', popular: true },
  { id: 'fiveguys_little_cheeseburger', name: 'Little Cheeseburger', chain: 'Five Guys', category: 'burger', calories: 550, protein: 27, carbs: 40, fat: 32, fiber: 2, sodium: 690, sugar: 8, serving: '1 sandwich', servingSize: 195, servingUnit: 'g', popular: true },
  { id: 'fiveguys_hamburger', name: 'Hamburger', chain: 'Five Guys', category: 'burger', calories: 700, protein: 39, carbs: 39, fat: 43, fiber: 2, sodium: 430, sugar: 8, serving: '1 sandwich', servingSize: 272, servingUnit: 'g' },
  { id: 'fiveguys_little_hamburger', name: 'Little Hamburger', chain: 'Five Guys', category: 'burger', calories: 480, protein: 23, carbs: 39, fat: 26, fiber: 2, sodium: 380, sugar: 8, serving: '1 sandwich', servingSize: 195, servingUnit: 'g' },
  { id: 'fiveguys_bacon_cheeseburger', name: 'Bacon Cheeseburger', chain: 'Five Guys', category: 'burger', calories: 920, protein: 51, carbs: 40, fat: 62, fiber: 2, sodium: 1310, sugar: 8, serving: '1 sandwich', servingSize: 317, servingUnit: 'g', popular: true },
  { id: 'fiveguys_bacon_burger', name: 'Bacon Burger', chain: 'Five Guys', category: 'burger', calories: 780, protein: 43, carbs: 39, fat: 50, fiber: 2, sodium: 690, sugar: 8, serving: '1 sandwich', servingSize: 286, servingUnit: 'g' },
  { id: 'fiveguys_hot_dog', name: 'Hot Dog', chain: 'Five Guys', category: 'sandwich', calories: 545, protein: 18, carbs: 40, fat: 35, fiber: 2, sodium: 1130, sugar: 8, serving: '1 hot dog', servingSize: 177, servingUnit: 'g' },
  { id: 'fiveguys_cheese_dog', name: 'Cheese Dog', chain: 'Five Guys', category: 'sandwich', calories: 615, protein: 22, carbs: 41, fat: 41, fiber: 2, sodium: 1440, sugar: 8, serving: '1 hot dog', servingSize: 196, servingUnit: 'g' },
  { id: 'fiveguys_regular_fries', name: 'Regular Fries', chain: 'Five Guys', category: 'side', calories: 530, protein: 8, carbs: 63, fat: 27, fiber: 7, sodium: 530, sugar: 2, serving: '1 regular', servingSize: 227, servingUnit: 'g', popular: true },
  { id: 'fiveguys_large_fries', name: 'Large Fries', chain: 'Five Guys', category: 'side', calories: 950, protein: 14, carbs: 113, fat: 48, fiber: 12, sodium: 950, sugar: 3, serving: '1 large', servingSize: 411, servingUnit: 'g' },
  { id: 'fiveguys_cajun_fries', name: 'Cajun Fries (Regular)', chain: 'Five Guys', category: 'side', calories: 530, protein: 8, carbs: 63, fat: 27, fiber: 7, sodium: 750, sugar: 2, serving: '1 regular', servingSize: 227, servingUnit: 'g', popular: true },
  { id: 'fiveguys_grilled_cheese', name: 'Grilled Cheese', chain: 'Five Guys', category: 'sandwich', calories: 470, protein: 16, carbs: 41, fat: 26, fiber: 2, sodium: 715, sugar: 8, serving: '1 sandwich', servingSize: 155, servingUnit: 'g' },
  { id: 'fiveguys_veggie_sandwich', name: 'Veggie Sandwich', chain: 'Five Guys', category: 'sandwich', calories: 440, protein: 16, carbs: 60, fat: 15, fiber: 4, sodium: 1040, sugar: 11, serving: '1 sandwich', servingSize: 290, servingUnit: 'g' },
  { id: 'fiveguys_blt', name: 'BLT', chain: 'Five Guys', category: 'sandwich', calories: 510, protein: 17, carbs: 39, fat: 33, fiber: 2, sodium: 870, sugar: 8, serving: '1 sandwich', servingSize: 186, servingUnit: 'g' },
  { id: 'fiveguys_vanilla_milkshake', name: 'Vanilla Milkshake (Regular)', chain: 'Five Guys', category: 'drink', calories: 560, protein: 14, carbs: 70, fat: 26, fiber: 0, sodium: 280, sugar: 67, serving: '1 regular', servingSize: 454, servingUnit: 'g' },

  // ─── In-N-Out ───
  { id: 'innout_double_double', name: 'Double-Double', chain: 'In-N-Out', category: 'burger', calories: 670, protein: 37, carbs: 39, fat: 41, fiber: 3, sodium: 1440, sugar: 10, serving: '1 sandwich', servingSize: 328, servingUnit: 'g', popular: true },
  { id: 'innout_cheeseburger', name: 'Cheeseburger', chain: 'In-N-Out', category: 'burger', calories: 480, protein: 22, carbs: 39, fat: 27, fiber: 3, sodium: 1000, sugar: 10, serving: '1 sandwich', servingSize: 268, servingUnit: 'g', popular: true },
  { id: 'innout_hamburger', name: 'Hamburger', chain: 'In-N-Out', category: 'burger', calories: 390, protein: 16, carbs: 39, fat: 19, fiber: 3, sodium: 650, sugar: 10, serving: '1 sandwich', servingSize: 243, servingUnit: 'g', popular: true },
  { id: 'innout_protein_style_double_double', name: 'Double-Double Protein Style (Lettuce Wrap)', chain: 'In-N-Out', category: 'burger', calories: 520, protein: 33, carbs: 11, fat: 39, fiber: 3, sodium: 1160, sugar: 7, serving: '1 sandwich', servingSize: 330, servingUnit: 'g', popular: true },
  { id: 'innout_animal_style_double_double', name: 'Double-Double Animal Style', chain: 'In-N-Out', category: 'burger', calories: 770, protein: 38, carbs: 42, fat: 50, fiber: 3, sodium: 1520, sugar: 10, serving: '1 sandwich', servingSize: 362, servingUnit: 'g', popular: true },
  { id: 'innout_3x3', name: '3x3 (Triple Meat, Triple Cheese)', chain: 'In-N-Out', category: 'burger', calories: 860, protein: 52, carbs: 39, fat: 55, fiber: 3, sodium: 1880, sugar: 10, serving: '1 sandwich', servingSize: 388, servingUnit: 'g' },
  { id: 'innout_4x4', name: '4x4 (Quad Meat, Quad Cheese)', chain: 'In-N-Out', category: 'burger', calories: 1050, protein: 67, carbs: 39, fat: 69, fiber: 3, sodium: 2320, sugar: 10, serving: '1 sandwich', servingSize: 448, servingUnit: 'g' },
  { id: 'innout_fries', name: 'French Fries', chain: 'In-N-Out', category: 'side', calories: 395, protein: 7, carbs: 54, fat: 18, fiber: 2, sodium: 245, sugar: 0, serving: '1 order', servingSize: 198, servingUnit: 'g' },
  { id: 'innout_animal_fries', name: 'Animal Style Fries', chain: 'In-N-Out', category: 'side', calories: 750, protein: 19, carbs: 60, fat: 50, fiber: 2, sodium: 1050, sugar: 3, serving: '1 order', servingSize: 340, servingUnit: 'g' },
  { id: 'innout_chocolate_shake', name: 'Chocolate Shake', chain: 'In-N-Out', category: 'drink', calories: 590, protein: 9, carbs: 79, fat: 29, fiber: 1, sodium: 350, sugar: 72, serving: '1 shake', servingSize: 425, servingUnit: 'g' },
  { id: 'innout_vanilla_shake', name: 'Vanilla Shake', chain: 'In-N-Out', category: 'drink', calories: 580, protein: 9, carbs: 78, fat: 29, fiber: 0, sodium: 350, sugar: 57, serving: '1 shake', servingSize: 425, servingUnit: 'g' },
  { id: 'innout_strawberry_shake', name: 'Strawberry Shake', chain: 'In-N-Out', category: 'drink', calories: 590, protein: 9, carbs: 81, fat: 27, fiber: 0, sodium: 280, sugar: 73, serving: '1 shake', servingSize: 425, servingUnit: 'g' },
  { id: 'innout_grilled_cheese', name: 'Grilled Cheese', chain: 'In-N-Out', category: 'sandwich', calories: 380, protein: 16, carbs: 39, fat: 18, fiber: 3, sodium: 1080, sugar: 10, serving: '1 sandwich', servingSize: 191, servingUnit: 'g' },
  { id: 'innout_medium_drink', name: 'Soft Drink (Medium)', chain: 'In-N-Out', category: 'drink', calories: 180, protein: 0, carbs: 49, fat: 0, fiber: 0, sodium: 10, sugar: 49, serving: '1 medium', servingSize: 510, servingUnit: 'g' },
  { id: 'innout_lemonade', name: 'Lemonade', chain: 'In-N-Out', category: 'drink', calories: 180, protein: 0, carbs: 40, fat: 0, fiber: 0, sodium: 110, sugar: 37, serving: '1 cup', servingSize: 473, servingUnit: 'g' },

  // ─── Popeyes ───
  { id: 'popeyes_chicken_sandwich', name: 'Classic Chicken Sandwich', chain: 'Popeyes', category: 'chicken', calories: 700, protein: 28, carbs: 50, fat: 42, fiber: 2, sodium: 1440, sugar: 5, serving: '1 sandwich', servingSize: 231, servingUnit: 'g', popular: true },
  { id: 'popeyes_spicy_chicken_sandwich', name: 'Spicy Chicken Sandwich', chain: 'Popeyes', category: 'chicken', calories: 700, protein: 28, carbs: 50, fat: 42, fiber: 2, sodium: 1710, sugar: 5, serving: '1 sandwich', servingSize: 231, servingUnit: 'g', popular: true },
  { id: 'popeyes_3pc_tenders', name: 'Chicken Tenders (3 Piece)', chain: 'Popeyes', category: 'chicken', calories: 410, protein: 26, carbs: 28, fat: 22, fiber: 1, sodium: 1230, sugar: 0, serving: '3 pieces', servingSize: 135, servingUnit: 'g', popular: true },
  { id: 'popeyes_5pc_tenders', name: 'Chicken Tenders (5 Piece)', chain: 'Popeyes', category: 'chicken', calories: 680, protein: 43, carbs: 47, fat: 36, fiber: 2, sodium: 2050, sugar: 0, serving: '5 pieces', servingSize: 224, servingUnit: 'g' },
  { id: 'popeyes_2pc_breast_thigh', name: 'Signature Chicken (2 Piece: Breast & Thigh)', chain: 'Popeyes', category: 'chicken', calories: 700, protein: 47, carbs: 23, fat: 47, fiber: 2, sodium: 1720, sugar: 0, serving: '2 pieces', servingSize: 245, servingUnit: 'g', popular: true },
  { id: 'popeyes_2pc_leg_thigh', name: 'Signature Chicken (2 Piece: Leg & Thigh)', chain: 'Popeyes', category: 'chicken', calories: 520, protein: 30, carbs: 14, fat: 38, fiber: 1, sodium: 1090, sugar: 0, serving: '2 pieces', servingSize: 170, servingUnit: 'g' },
  { id: 'popeyes_mashed_potatoes_gravy_regular', name: 'Mashed Potatoes with Cajun Gravy (Regular)', chain: 'Popeyes', category: 'side', calories: 110, protein: 1, carbs: 14, fat: 5, fiber: 1, sodium: 520, sugar: 0, serving: '1 regular', servingSize: 113, servingUnit: 'g' },
  { id: 'popeyes_cajun_fries_regular', name: 'Cajun Fries (Regular)', chain: 'Popeyes', category: 'side', calories: 260, protein: 3, carbs: 34, fat: 14, fiber: 3, sodium: 690, sugar: 0, serving: '1 regular', servingSize: 85, servingUnit: 'g', popular: true },
  { id: 'popeyes_red_beans_rice_regular', name: 'Red Beans and Rice (Regular)', chain: 'Popeyes', category: 'side', calories: 230, protein: 7, carbs: 30, fat: 10, fiber: 3, sodium: 680, sugar: 1, serving: '1 regular', servingSize: 142, servingUnit: 'g' },
  { id: 'popeyes_biscuit', name: 'Buttermilk Biscuit', chain: 'Popeyes', category: 'side', calories: 200, protein: 3, carbs: 26, fat: 9, fiber: 1, sodium: 510, sugar: 1, serving: '1 biscuit', servingSize: 60, servingUnit: 'g' },
  { id: 'popeyes_coleslaw_regular', name: 'Coleslaw (Regular)', chain: 'Popeyes', category: 'side', calories: 170, protein: 1, carbs: 14, fat: 13, fiber: 2, sodium: 260, sugar: 11, serving: '1 regular', servingSize: 113, servingUnit: 'g' },
  { id: 'popeyes_mac_cheese_regular', name: 'Mac & Cheese (Regular)', chain: 'Popeyes', category: 'side', calories: 220, protein: 8, carbs: 24, fat: 11, fiber: 1, sodium: 580, sugar: 4, serving: '1 regular', servingSize: 142, servingUnit: 'g' },
  { id: 'popeyes_cajun_rice_regular', name: 'Cajun Rice (Regular)', chain: 'Popeyes', category: 'side', calories: 180, protein: 7, carbs: 22, fat: 7, fiber: 1, sodium: 520, sugar: 0, serving: '1 regular', servingSize: 130, servingUnit: 'g' },
  { id: 'popeyes_3pc_shrimp', name: 'Popcorn Shrimp (Regular)', chain: 'Popeyes', category: 'side', calories: 330, protein: 10, carbs: 31, fat: 19, fiber: 1, sodium: 1050, sugar: 0, serving: '1 regular', servingSize: 100, servingUnit: 'g' },
  { id: 'popeyes_apple_pie', name: 'Cinnamon Apple Pie', chain: 'Popeyes', category: 'dessert', calories: 230, protein: 2, carbs: 30, fat: 11, fiber: 1, sodium: 170, sugar: 13, serving: '1 pie', servingSize: 88, servingUnit: 'g' },

  // ─── KFC ───
  { id: 'kfc_original_recipe_breast', name: 'Original Recipe Chicken Breast', chain: 'KFC', category: 'chicken', calories: 390, protein: 39, carbs: 11, fat: 21, fiber: 0, sodium: 1190, sugar: 0, serving: '1 breast', servingSize: 163, servingUnit: 'g', popular: true },
  { id: 'kfc_original_recipe_thigh', name: 'Original Recipe Chicken Thigh', chain: 'KFC', category: 'chicken', calories: 280, protein: 19, carbs: 9, fat: 19, fiber: 0, sodium: 750, sugar: 0, serving: '1 thigh', servingSize: 108, servingUnit: 'g', popular: true },
  { id: 'kfc_original_recipe_drumstick', name: 'Original Recipe Chicken Drumstick', chain: 'KFC', category: 'chicken', calories: 170, protein: 14, carbs: 5, fat: 10, fiber: 0, sodium: 440, sugar: 0, serving: '1 drumstick', servingSize: 69, servingUnit: 'g' },
  { id: 'kfc_original_recipe_wing', name: 'Original Recipe Chicken Wing', chain: 'KFC', category: 'chicken', calories: 130, protein: 10, carbs: 4, fat: 8, fiber: 0, sodium: 370, sugar: 0, serving: '1 wing', servingSize: 50, servingUnit: 'g' },
  { id: 'kfc_extra_crispy_breast', name: 'Extra Crispy Chicken Breast', chain: 'KFC', category: 'chicken', calories: 530, protein: 34, carbs: 19, fat: 35, fiber: 1, sodium: 1150, sugar: 0, serving: '1 breast', servingSize: 176, servingUnit: 'g', popular: true },
  { id: 'kfc_chicken_sandwich', name: 'KFC Chicken Sandwich', chain: 'KFC', category: 'chicken', calories: 650, protein: 28, carbs: 49, fat: 38, fiber: 2, sodium: 1580, sugar: 5, serving: '1 sandwich', servingSize: 220, servingUnit: 'g', popular: true },
  { id: 'kfc_famous_bowl', name: 'Famous Bowl', chain: 'KFC', category: 'bowl', calories: 740, protein: 26, carbs: 80, fat: 34, fiber: 5, sodium: 2350, sugar: 3, serving: '1 bowl', servingSize: 397, servingUnit: 'g', popular: true },
  { id: 'kfc_3pc_tenders', name: 'Chicken Tenders (3 Piece)', chain: 'KFC', category: 'chicken', calories: 310, protein: 23, carbs: 14, fat: 18, fiber: 0, sodium: 870, sugar: 0, serving: '3 pieces', servingSize: 107, servingUnit: 'g' },
  { id: 'kfc_popcorn_chicken_large', name: 'Popcorn Chicken (Large)', chain: 'KFC', category: 'chicken', calories: 620, protein: 32, carbs: 38, fat: 36, fiber: 2, sodium: 2060, sugar: 0, serving: '1 large', servingSize: 192, servingUnit: 'g' },
  { id: 'kfc_mashed_potatoes_gravy', name: 'Mashed Potatoes with Gravy', chain: 'KFC', category: 'side', calories: 130, protein: 2, carbs: 19, fat: 5, fiber: 1, sodium: 530, sugar: 0, serving: '1 individual', servingSize: 136, servingUnit: 'g' },
  { id: 'kfc_coleslaw', name: 'Coleslaw', chain: 'KFC', category: 'side', calories: 170, protein: 1, carbs: 16, fat: 12, fiber: 2, sodium: 180, sugar: 12, serving: '1 individual', servingSize: 130, servingUnit: 'g' },
  { id: 'kfc_mac_cheese', name: 'Mac & Cheese', chain: 'KFC', category: 'side', calories: 170, protein: 6, carbs: 18, fat: 8, fiber: 1, sodium: 710, sugar: 3, serving: '1 individual', servingSize: 136, servingUnit: 'g' },
  { id: 'kfc_biscuit', name: 'Biscuit', chain: 'KFC', category: 'side', calories: 180, protein: 3, carbs: 22, fat: 8, fiber: 0, sodium: 530, sugar: 2, serving: '1 biscuit', servingSize: 55, servingUnit: 'g' },
  { id: 'kfc_corn_on_cob', name: 'Corn on the Cob', chain: 'KFC', category: 'side', calories: 70, protein: 2, carbs: 13, fat: 2, fiber: 2, sodium: 0, sugar: 3, serving: '1 ear', servingSize: 93, servingUnit: 'g' },
  { id: 'kfc_pot_pie', name: 'Chicken Pot Pie', chain: 'KFC', category: 'chicken', calories: 720, protein: 26, carbs: 60, fat: 41, fiber: 3, sodium: 1750, sugar: 4, serving: '1 pie', servingSize: 281, servingUnit: 'g' },
  { id: 'kfc_secret_recipe_fries', name: 'Secret Recipe Fries', chain: 'KFC', category: 'side', calories: 320, protein: 4, carbs: 42, fat: 15, fiber: 4, sodium: 870, sugar: 0, serving: '1 individual', servingSize: 113, servingUnit: 'g' },

  // ─── Arby's ───
  { id: 'arbys_classic_roast_beef', name: 'Classic Roast Beef', chain: "Arby's", category: 'sandwich', calories: 360, protein: 23, carbs: 37, fat: 14, fiber: 2, sodium: 970, sugar: 5, serving: '1 sandwich', servingSize: 154, servingUnit: 'g', popular: true },
  { id: 'arbys_beef_n_cheddar_classic', name: "Beef 'n Cheddar (Classic)", chain: "Arby's", category: 'sandwich', calories: 450, protein: 23, carbs: 44, fat: 20, fiber: 2, sodium: 1280, sugar: 9, serving: '1 sandwich', servingSize: 185, servingUnit: 'g', popular: true },
  { id: 'arbys_half_pound_roast_beef', name: 'Half Pound Roast Beef', chain: "Arby's", category: 'sandwich', calories: 610, protein: 44, carbs: 41, fat: 30, fiber: 2, sodium: 1740, sugar: 6, serving: '1 sandwich', servingSize: 269, servingUnit: 'g' },
  { id: 'arbys_smokehouse_brisket', name: 'Smokehouse Brisket', chain: "Arby's", category: 'sandwich', calories: 600, protein: 30, carbs: 48, fat: 33, fiber: 2, sodium: 1660, sugar: 13, serving: '1 sandwich', servingSize: 240, servingUnit: 'g', popular: true },
  { id: 'arbys_crispy_chicken_sandwich', name: 'Crispy Chicken Sandwich', chain: "Arby's", category: 'chicken', calories: 510, protein: 23, carbs: 47, fat: 25, fiber: 2, sodium: 1140, sugar: 5, serving: '1 sandwich', servingSize: 195, servingUnit: 'g' },
  { id: 'arbys_buffalo_chicken_sandwich', name: 'Buffalo Chicken Sandwich', chain: "Arby's", category: 'chicken', calories: 490, protein: 23, carbs: 47, fat: 23, fiber: 2, sodium: 1570, sugar: 5, serving: '1 sandwich', servingSize: 200, servingUnit: 'g' },
  { id: 'arbys_chicken_tenders_3pc', name: 'Chicken Tenders (3 Piece)', chain: "Arby's", category: 'chicken', calories: 360, protein: 27, carbs: 20, fat: 19, fiber: 1, sodium: 870, sugar: 0, serving: '3 pieces', servingSize: 120, servingUnit: 'g' },
  { id: 'arbys_curly_fries_medium', name: 'Curly Fries (Medium)', chain: "Arby's", category: 'side', calories: 410, protein: 5, carbs: 49, fat: 22, fiber: 4, sodium: 1030, sugar: 0, serving: '1 medium', servingSize: 128, servingUnit: 'g', popular: true },
  { id: 'arbys_curly_fries_small', name: 'Curly Fries (Small)', chain: "Arby's", category: 'side', calories: 250, protein: 3, carbs: 29, fat: 13, fiber: 3, sodium: 620, sugar: 0, serving: '1 small', servingSize: 77, servingUnit: 'g' },
  { id: 'arbys_mozzarella_sticks_4pc', name: 'Mozzarella Sticks (4 Piece)', chain: "Arby's", category: 'side', calories: 440, protein: 18, carbs: 38, fat: 24, fiber: 2, sodium: 1370, sugar: 3, serving: '4 pieces', servingSize: 112, servingUnit: 'g' },
  { id: 'arbys_jalapeno_bites_5pc', name: 'Jalapeno Bites (5 Piece)', chain: "Arby's", category: 'side', calories: 290, protein: 7, carbs: 29, fat: 16, fiber: 2, sodium: 570, sugar: 3, serving: '5 pieces', servingSize: 86, servingUnit: 'g' },
  { id: 'arbys_french_dip_swiss', name: 'French Dip & Swiss', chain: "Arby's", category: 'sandwich', calories: 520, protein: 30, carbs: 49, fat: 22, fiber: 2, sodium: 2010, sugar: 5, serving: '1 sandwich', servingSize: 233, servingUnit: 'g', popular: true },
  { id: 'arbys_gyro_roast_beef', name: 'Roast Beef Gyro', chain: "Arby's", category: 'sandwich', calories: 450, protein: 24, carbs: 43, fat: 20, fiber: 2, sodium: 1310, sugar: 5, serving: '1 gyro', servingSize: 223, servingUnit: 'g' },
  { id: 'arbys_turnovers_apple', name: 'Apple Turnover', chain: "Arby's", category: 'dessert', calories: 330, protein: 3, carbs: 44, fat: 16, fiber: 1, sodium: 200, sugar: 15, serving: '1 turnover', servingSize: 99, servingUnit: 'g' },
  { id: 'arbys_shake_chocolate', name: 'Chocolate Shake (Small)', chain: "Arby's", category: 'drink', calories: 500, protein: 13, carbs: 76, fat: 17, fiber: 1, sodium: 350, sugar: 68, serving: '1 small', servingSize: 397, servingUnit: 'g' },
  { id: 'arbys_loaded_italian', name: 'Loaded Italian', chain: "Arby's", category: 'sandwich', calories: 610, protein: 28, carbs: 46, fat: 35, fiber: 2, sodium: 2280, sugar: 4, serving: '1 sandwich', servingSize: 244, servingUnit: 'g' },

  // ─── Sonic ───
  { id: 'sonic_cheeseburger', name: 'Sonic Cheeseburger', chain: 'Sonic', category: 'burger', calories: 620, protein: 27, carbs: 56, fat: 31, fiber: 3, sodium: 1120, sugar: 12, serving: '1 sandwich', servingSize: 233, servingUnit: 'g', popular: true },
  { id: 'sonic_double_cheeseburger', name: 'Sonic Double Cheeseburger', chain: 'Sonic', category: 'burger', calories: 860, protein: 46, carbs: 56, fat: 49, fiber: 3, sodium: 1400, sugar: 12, serving: '1 sandwich', servingSize: 323, servingUnit: 'g' },
  { id: 'sonic_supersonic_double_cheeseburger', name: 'SuperSONIC Double Cheeseburger', chain: 'Sonic', category: 'burger', calories: 1080, protein: 50, carbs: 59, fat: 70, fiber: 4, sodium: 1700, sugar: 13, serving: '1 sandwich', servingSize: 390, servingUnit: 'g', popular: true },
  { id: 'sonic_classic_chicken_sandwich', name: 'Classic Crispy Chicken Sandwich', chain: 'Sonic', category: 'chicken', calories: 540, protein: 22, carbs: 52, fat: 27, fiber: 3, sodium: 1190, sugar: 9, serving: '1 sandwich', servingSize: 213, servingUnit: 'g' },
  { id: 'sonic_jumbo_popcorn_chicken', name: 'Jumbo Popcorn Chicken', chain: 'Sonic', category: 'chicken', calories: 450, protein: 22, carbs: 28, fat: 28, fiber: 1, sodium: 1260, sugar: 0, serving: '1 order', servingSize: 170, servingUnit: 'g', popular: true },
  { id: 'sonic_footlong_chili_cheese_coney', name: 'Footlong Chili Cheese Coney', chain: 'Sonic', category: 'sandwich', calories: 650, protein: 24, carbs: 47, fat: 41, fiber: 3, sodium: 1660, sugar: 7, serving: '1 hot dog', servingSize: 280, servingUnit: 'g' },
  { id: 'sonic_regular_coney', name: 'All-American Dog', chain: 'Sonic', category: 'sandwich', calories: 330, protein: 12, carbs: 28, fat: 19, fiber: 1, sodium: 820, sugar: 4, serving: '1 hot dog', servingSize: 140, servingUnit: 'g' },
  { id: 'sonic_medium_tots', name: 'Medium Tots', chain: 'Sonic', category: 'side', calories: 360, protein: 3, carbs: 42, fat: 21, fiber: 3, sodium: 620, sugar: 0, serving: '1 medium', servingSize: 128, servingUnit: 'g', popular: true },
  { id: 'sonic_medium_fries', name: 'Medium French Fries', chain: 'Sonic', category: 'side', calories: 330, protein: 4, carbs: 41, fat: 17, fiber: 4, sodium: 470, sugar: 0, serving: '1 medium', servingSize: 113, servingUnit: 'g' },
  { id: 'sonic_mozzarella_sticks', name: 'Mozzarella Sticks', chain: 'Sonic', category: 'side', calories: 440, protein: 16, carbs: 40, fat: 24, fiber: 2, sodium: 1160, sugar: 3, serving: '1 order', servingSize: 142, servingUnit: 'g' },
  { id: 'sonic_onion_rings_medium', name: 'Onion Rings (Medium)', chain: 'Sonic', category: 'side', calories: 480, protein: 6, carbs: 55, fat: 26, fiber: 3, sodium: 510, sugar: 6, serving: '1 medium', servingSize: 142, servingUnit: 'g' },
  { id: 'sonic_cherry_limeade_medium', name: 'Cherry Limeade (Medium)', chain: 'Sonic', category: 'drink', calories: 170, protein: 0, carbs: 47, fat: 0, fiber: 0, sodium: 40, sugar: 46, serving: '1 medium', servingSize: 590, servingUnit: 'g', popular: true },
  { id: 'sonic_ocean_water_medium', name: 'Ocean Water (Medium)', chain: 'Sonic', category: 'drink', calories: 180, protein: 0, carbs: 49, fat: 0, fiber: 0, sodium: 50, sugar: 48, serving: '1 medium', servingSize: 590, servingUnit: 'g' },
  { id: 'sonic_oreo_blast_medium', name: 'OREO Blast (Medium)', chain: 'Sonic', category: 'dessert', calories: 710, protein: 13, carbs: 97, fat: 31, fiber: 2, sodium: 420, sugar: 73, serving: '1 medium', servingSize: 425, servingUnit: 'g' },
  { id: 'sonic_vanilla_shake_medium', name: 'Vanilla Shake (Medium)', chain: 'Sonic', category: 'drink', calories: 540, protein: 10, carbs: 75, fat: 22, fiber: 0, sodium: 310, sugar: 63, serving: '1 medium', servingSize: 397, servingUnit: 'g' },
  { id: 'sonic_breakfast_burrito', name: 'SuperSONIC Breakfast Burrito', chain: 'Sonic', category: 'breakfast', calories: 570, protein: 22, carbs: 39, fat: 36, fiber: 2, sodium: 1370, sugar: 3, serving: '1 burrito', servingSize: 246, servingUnit: 'g' },
];

export const RESTAURANT_FOODS: RestaurantFoodItem[] = [
  ...PART_1,
  ...RESTAURANT_FOODS_PART2A,
  ...RESTAURANT_FOODS_PART2B,
  ...RESTAURANT_FOODS_PART3,
];

export const RESTAURANT_CHAINS: string[] = [
  ...new Set(RESTAURANT_FOODS.map((f) => f.chain)),
].sort();

/**
 * Search restaurant foods by name, chain, or category.
 * Returns results sorted by: exact match first, popular items first, then alphabetical.
 */
export function searchRestaurantFoods(query: string): RestaurantFoodItem[] {
  if (!query || query.trim().length < 2) return [];

  const terms = query.toLowerCase().trim().split(/\s+/);

  const results = RESTAURANT_FOODS.filter((item) => {
    const haystack = `${item.name} ${item.chain} ${item.category}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });

  // Sort: exact name match first, then popular, then alphabetical
  const lowerQuery = query.toLowerCase().trim();
  results.sort((a, b) => {
    const aExact = a.name.toLowerCase() === lowerQuery ? 1 : 0;
    const bExact = b.name.toLowerCase() === lowerQuery ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;

    const aPop = a.popular ? 1 : 0;
    const bPop = b.popular ? 1 : 0;
    if (aPop !== bPop) return bPop - aPop;

    return a.name.localeCompare(b.name);
  });

  return results;
}
