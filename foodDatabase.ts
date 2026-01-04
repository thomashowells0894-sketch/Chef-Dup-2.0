
import { FoodItem } from '../types';

// --- DATABASE GENERATOR ENGINE ---

interface BaseFoodDef {
    name: string;
    cals: number;
    pro: number;
    carbs: number;
    fat: number;
    category: 'Protein' | 'Carb' | 'Fat' | 'Fruit' | 'Veg' | 'Dairy' | 'Snack' | 'Drink';
    variations?: boolean; // If true, generates Cooked, Fried, Grilled versions
    portion?: number;
    unit?: string;
}

const RAW_DB: BaseFoodDef[] = [
    // --- MEATS & POULTRY (Generates: Raw, Grilled, Fried, Roasted, Boiled) ---
    { name: 'Chicken Breast', cals: 165, pro: 31, carbs: 0, fat: 3.6, category: 'Protein', variations: true },
    { name: 'Chicken Thigh', cals: 209, pro: 26, carbs: 0, fat: 10.9, category: 'Protein', variations: true },
    { name: 'Chicken Wing', cals: 203, pro: 20, carbs: 0, fat: 13, category: 'Protein', variations: true, unit: 'wing', portion: 40 },
    { name: 'Chicken Drumstick', cals: 160, pro: 18, carbs: 0, fat: 9, category: 'Protein', variations: true, unit: 'drumstick', portion: 80 },
    { name: 'Ground Chicken', cals: 180, pro: 25, carbs: 0, fat: 9, category: 'Protein', variations: true },
    { name: 'Turkey Breast', cals: 135, pro: 30, carbs: 0, fat: 1, category: 'Protein', variations: true },
    { name: 'Ground Turkey', cals: 150, pro: 22, carbs: 0, fat: 8, category: 'Protein', variations: true },
    { name: 'Beef Steak (Sirloin)', cals: 250, pro: 26, carbs: 0, fat: 15, category: 'Protein', variations: true },
    { name: 'Beef Steak (Ribeye)', cals: 290, pro: 24, carbs: 0, fat: 22, category: 'Protein', variations: true },
    { name: 'Ground Beef (80/20)', cals: 254, pro: 17, carbs: 0, fat: 20, category: 'Protein', variations: true },
    { name: 'Ground Beef (90/10)', cals: 176, pro: 20, carbs: 0, fat: 10, category: 'Protein', variations: true },
    { name: 'Pork Chop', cals: 231, pro: 24, carbs: 0, fat: 14, category: 'Protein', variations: true },
    { name: 'Pork Loin', cals: 242, pro: 27, carbs: 0, fat: 14, category: 'Protein', variations: true },
    { name: 'Bacon', cals: 541, pro: 37, carbs: 1.4, fat: 42, category: 'Protein', unit: 'slice', portion: 15 },
    { name: 'Lamb Chop', cals: 294, pro: 25, carbs: 0, fat: 21, category: 'Protein', variations: true },
    { name: 'Duck Breast', cals: 337, pro: 19, carbs: 0, fat: 28, category: 'Protein', variations: true },
    { name: 'Venison', cals: 158, pro: 30, carbs: 0, fat: 3, category: 'Protein', variations: true },
    
    // --- SEAFOOD (Generates: Raw, Grilled, Fried, Steamed, Baked) ---
    { name: 'Salmon', cals: 208, pro: 20, carbs: 0, fat: 13, category: 'Protein', variations: true },
    { name: 'Tuna Steak', cals: 130, pro: 28, carbs: 0, fat: 1, category: 'Protein', variations: true },
    { name: 'Cod', cals: 82, pro: 18, carbs: 0, fat: 0.7, category: 'Protein', variations: true },
    { name: 'Tilapia', cals: 96, pro: 20, carbs: 0, fat: 1.7, category: 'Protein', variations: true },
    { name: 'Shrimp', cals: 99, pro: 24, carbs: 0.2, fat: 0.3, category: 'Protein', variations: true },
    { name: 'Lobster', cals: 89, pro: 19, carbs: 0, fat: 0.9, category: 'Protein', variations: true },
    { name: 'Crab', cals: 83, pro: 18, carbs: 0, fat: 0.7, category: 'Protein', variations: true },
    { name: 'Scallops', cals: 111, pro: 20, carbs: 5, fat: 0.8, category: 'Protein', variations: true },
    { name: 'Sardines', cals: 208, pro: 25, carbs: 0, fat: 11, category: 'Protein' },
    { name: 'Canned Tuna (Water)', cals: 116, pro: 26, carbs: 0, fat: 1, category: 'Protein', unit: 'can', portion: 165 },

    // --- EGGS & DAIRY ---
    { name: 'Egg (Whole)', cals: 143, pro: 13, carbs: 0.7, fat: 9.5, category: 'Protein', variations: true, unit: 'egg', portion: 50 },
    { name: 'Egg White', cals: 52, pro: 11, carbs: 0.7, fat: 0.2, category: 'Protein', unit: 'white', portion: 33 },
    { name: 'Egg Yolk', cals: 322, pro: 16, carbs: 3.6, fat: 26, category: 'Fat', unit: 'yolk', portion: 17 },
    { name: 'Milk (Whole)', cals: 60, pro: 3.2, carbs: 4.8, fat: 3.3, category: 'Dairy', unit: 'cup', portion: 244 },
    { name: 'Milk (2%)', cals: 50, pro: 3.3, carbs: 4.8, fat: 2, category: 'Dairy', unit: 'cup', portion: 244 },
    { name: 'Milk (Skim)', cals: 34, pro: 3.4, carbs: 5, fat: 0.1, category: 'Dairy', unit: 'cup', portion: 244 },
    { name: 'Almond Milk (Unsweetened)', cals: 13, pro: 0.4, carbs: 0.6, fat: 1.1, category: 'Dairy', unit: 'cup', portion: 244 },
    { name: 'Oat Milk', cals: 50, pro: 1, carbs: 8, fat: 2, category: 'Dairy', unit: 'cup', portion: 244 },
    { name: 'Soy Milk', cals: 54, pro: 3.3, carbs: 6, fat: 1.8, category: 'Dairy', unit: 'cup', portion: 244 },
    { name: 'Greek Yogurt (Plain)', cals: 59, pro: 10, carbs: 3.6, fat: 0.4, category: 'Dairy', unit: 'cup', portion: 170 },
    { name: 'Cottage Cheese', cals: 98, pro: 11, carbs: 3.4, fat: 4.3, category: 'Dairy', unit: 'cup', portion: 226 },
    { name: 'Cheddar Cheese', cals: 403, pro: 25, carbs: 1.3, fat: 33, category: 'Fat', unit: 'slice', portion: 28 },
    { name: 'Mozzarella', cals: 300, pro: 22, carbs: 2.2, fat: 22, category: 'Fat', unit: 'oz', portion: 28 },
    { name: 'Parmesan', cals: 431, pro: 38, carbs: 4.1, fat: 29, category: 'Fat', unit: 'tbsp', portion: 5 },
    { name: 'Feta', cals: 264, pro: 14, carbs: 4, fat: 21, category: 'Fat', unit: 'oz', portion: 28 },
    { name: 'Butter', cals: 717, pro: 0.9, carbs: 0.1, fat: 81, category: 'Fat', unit: 'tbsp', portion: 14 },
    { name: 'Heavy Cream', cals: 340, pro: 2.8, carbs: 2.7, fat: 36, category: 'Fat', unit: 'tbsp', portion: 15 },

    // --- PLANT PROTEIN ---
    { name: 'Tofu (Firm)', cals: 144, pro: 17, carbs: 3, fat: 9, category: 'Protein', variations: true },
    { name: 'Tofu (Silken)', cals: 62, pro: 7, carbs: 2, fat: 3, category: 'Protein' },
    { name: 'Tempeh', cals: 192, pro: 20, carbs: 8, fat: 11, category: 'Protein', variations: true },
    { name: 'Seitan', cals: 370, pro: 75, carbs: 14, fat: 2, category: 'Protein', variations: true },
    { name: 'Edamame', cals: 121, pro: 12, carbs: 9, fat: 5, category: 'Protein' },
    { name: 'Black Beans', cals: 132, pro: 9, carbs: 24, fat: 0.5, category: 'Carb', unit: 'cup', portion: 172 },
    { name: 'Kidney Beans', cals: 127, pro: 9, carbs: 23, fat: 0.5, category: 'Carb', unit: 'cup', portion: 177 },
    { name: 'Chickpeas', cals: 164, pro: 9, carbs: 27, fat: 2.6, category: 'Carb', unit: 'cup', portion: 164 },
    { name: 'Lentils', cals: 116, pro: 9, carbs: 20, fat: 0.4, category: 'Carb', unit: 'cup', portion: 198 },
    { name: 'Hummus', cals: 166, pro: 8, carbs: 14, fat: 10, category: 'Fat', unit: 'tbsp', portion: 15 },

    // --- VEGETABLES (Generates: Raw, Steamed, Roasted, Sautéed) ---
    { name: 'Broccoli', cals: 34, pro: 2.8, carbs: 7, fat: 0.4, category: 'Veg', variations: true },
    { name: 'Cauliflower', cals: 25, pro: 1.9, carbs: 5, fat: 0.3, category: 'Veg', variations: true },
    { name: 'Spinach', cals: 23, pro: 2.9, carbs: 3.6, fat: 0.4, category: 'Veg', variations: true },
    { name: 'Kale', cals: 49, pro: 4.3, carbs: 8.8, fat: 0.9, category: 'Veg', variations: true },
    { name: 'Asparagus', cals: 20, pro: 2.2, carbs: 3.9, fat: 0.1, category: 'Veg', variations: true },
    { name: 'Green Beans', cals: 31, pro: 1.8, carbs: 7, fat: 0.2, category: 'Veg', variations: true },
    { name: 'Brussels Sprouts', cals: 43, pro: 3.4, carbs: 9, fat: 0.3, category: 'Veg', variations: true },
    { name: 'Carrot', cals: 41, pro: 0.9, carbs: 10, fat: 0.2, category: 'Veg', variations: true },
    { name: 'Bell Pepper', cals: 26, pro: 1, carbs: 6, fat: 0.3, category: 'Veg', variations: true },
    { name: 'Cucumber', cals: 15, pro: 0.7, carbs: 3.6, fat: 0.1, category: 'Veg' },
    { name: 'Tomato', cals: 18, pro: 0.9, carbs: 3.9, fat: 0.2, category: 'Veg' },
    { name: 'Zucchini', cals: 17, pro: 1.2, carbs: 3.1, fat: 0.3, category: 'Veg', variations: true },
    { name: 'Eggplant', cals: 25, pro: 1, carbs: 6, fat: 0.2, category: 'Veg', variations: true },
    { name: 'Onion', cals: 40, pro: 1.1, carbs: 9, fat: 0.1, category: 'Veg', variations: true },
    { name: 'Garlic', cals: 149, pro: 6.4, carbs: 33, fat: 0.5, category: 'Veg', unit: 'clove', portion: 3 },
    { name: 'Mushroom', cals: 22, pro: 3.1, carbs: 3.3, fat: 0.3, category: 'Veg', variations: true },
    { name: 'Corn', cals: 86, pro: 3.2, carbs: 19, fat: 1.2, category: 'Carb', variations: true },
    { name: 'Potato (White)', cals: 77, pro: 2, carbs: 17, fat: 0.1, category: 'Carb', variations: true },
    { name: 'Sweet Potato', cals: 86, pro: 1.6, carbs: 20, fat: 0.1, category: 'Carb', variations: true },
    { name: 'Avocado', cals: 160, pro: 2, carbs: 8.5, fat: 15, category: 'Fat', unit: 'fruit', portion: 200 },

    // --- FRUITS ---
    { name: 'Apple', cals: 52, pro: 0.3, carbs: 14, fat: 0.2, category: 'Fruit', unit: 'medium', portion: 182 },
    { name: 'Banana', cals: 89, pro: 1.1, carbs: 23, fat: 0.3, category: 'Fruit', unit: 'medium', portion: 118 },
    { name: 'Orange', cals: 47, pro: 0.9, carbs: 12, fat: 0.1, category: 'Fruit', unit: 'medium', portion: 131 },
    { name: 'Strawberry', cals: 32, pro: 0.7, carbs: 7.7, fat: 0.3, category: 'Fruit', unit: 'cup', portion: 152 },
    { name: 'Blueberry', cals: 57, pro: 0.7, carbs: 14, fat: 0.3, category: 'Fruit', unit: 'cup', portion: 148 },
    { name: 'Raspberry', cals: 52, pro: 1.2, carbs: 12, fat: 0.7, category: 'Fruit', unit: 'cup', portion: 123 },
    { name: 'Blackberry', cals: 43, pro: 1.4, carbs: 10, fat: 0.5, category: 'Fruit', unit: 'cup', portion: 144 },
    { name: 'Watermelon', cals: 30, pro: 0.6, carbs: 8, fat: 0.2, category: 'Fruit', unit: 'cup', portion: 152 },
    { name: 'Pineapple', cals: 50, pro: 0.5, carbs: 13, fat: 0.1, category: 'Fruit', unit: 'cup', portion: 165 },
    { name: 'Mango', cals: 60, pro: 0.8, carbs: 15, fat: 0.4, category: 'Fruit', unit: 'fruit', portion: 336 },
    { name: 'Peach', cals: 39, pro: 0.9, carbs: 10, fat: 0.3, category: 'Fruit', unit: 'medium', portion: 150 },
    { name: 'Pear', cals: 57, pro: 0.4, carbs: 15, fat: 0.1, category: 'Fruit', unit: 'medium', portion: 178 },
    { name: 'Grapes', cals: 69, pro: 0.7, carbs: 18, fat: 0.2, category: 'Fruit', unit: 'cup', portion: 151 },
    { name: 'Kiwi', cals: 61, pro: 1.1, carbs: 15, fat: 0.5, category: 'Fruit', unit: 'fruit', portion: 69 },
    { name: 'Lemon', cals: 29, pro: 1.1, carbs: 9, fat: 0.3, category: 'Fruit', unit: 'fruit', portion: 58 },
    
    // --- GRAINS & PASTA (Generates: Cooked, Dry) ---
    { name: 'White Rice', cals: 130, pro: 2.7, carbs: 28, fat: 0.3, category: 'Carb', unit: 'cup', portion: 158 },
    { name: 'Brown Rice', cals: 111, pro: 2.6, carbs: 23, fat: 0.9, category: 'Carb', unit: 'cup', portion: 195 },
    { name: 'Jasmine Rice', cals: 129, pro: 2.5, carbs: 28, fat: 0.2, category: 'Carb', unit: 'cup', portion: 158 },
    { name: 'Basmati Rice', cals: 121, pro: 3.5, carbs: 25, fat: 0.4, category: 'Carb', unit: 'cup', portion: 163 },
    { name: 'Quinoa', cals: 120, pro: 4.4, carbs: 21, fat: 1.9, category: 'Carb', unit: 'cup', portion: 185 },
    { name: 'Oats (Rolled)', cals: 379, pro: 13, carbs: 68, fat: 6.5, category: 'Carb', unit: 'cup', portion: 81 },
    { name: 'Pasta (Spaghetti)', cals: 158, pro: 6, carbs: 31, fat: 0.9, category: 'Carb', unit: 'cup', portion: 140 },
    { name: 'Pasta (Penne)', cals: 157, pro: 5.8, carbs: 31, fat: 0.9, category: 'Carb', unit: 'cup', portion: 140 },
    { name: 'Bread (White)', cals: 265, pro: 9, carbs: 49, fat: 3.2, category: 'Carb', unit: 'slice', portion: 30 },
    { name: 'Bread (Whole Wheat)', cals: 247, pro: 13, carbs: 41, fat: 3.4, category: 'Carb', unit: 'slice', portion: 30 },
    { name: 'Sourdough Bread', cals: 289, pro: 10, carbs: 56, fat: 2, category: 'Carb', unit: 'slice', portion: 60 },
    { name: 'Bagel', cals: 250, pro: 10, carbs: 49, fat: 1.5, category: 'Carb', unit: 'bagel', portion: 100 },
    { name: 'Tortilla (Flour)', cals: 300, pro: 8, carbs: 50, fat: 7, category: 'Carb', unit: 'piece', portion: 50 },
    { name: 'Tortilla (Corn)', cals: 218, pro: 6, carbs: 45, fat: 3, category: 'Carb', unit: 'piece', portion: 28 },
    { name: 'Couscous', cals: 112, pro: 3.8, carbs: 23, fat: 0.2, category: 'Carb', unit: 'cup', portion: 157 },

    // --- NUTS, SEEDS & SNACKS ---
    { name: 'Almonds', cals: 579, pro: 21, carbs: 22, fat: 50, category: 'Snack', unit: 'oz', portion: 28 },
    { name: 'Walnuts', cals: 654, pro: 15, carbs: 14, fat: 65, category: 'Snack', unit: 'oz', portion: 28 },
    { name: 'Peanuts', cals: 567, pro: 26, carbs: 16, fat: 49, category: 'Snack', unit: 'oz', portion: 28 },
    { name: 'Cashews', cals: 553, pro: 18, carbs: 30, fat: 44, category: 'Snack', unit: 'oz', portion: 28 },
    { name: 'Peanut Butter', cals: 588, pro: 25, carbs: 20, fat: 50, category: 'Fat', unit: 'tbsp', portion: 16 },
    { name: 'Chia Seeds', cals: 486, pro: 17, carbs: 42, fat: 31, category: 'Snack', unit: 'tbsp', portion: 12 },
    { name: 'Flax Seeds', cals: 534, pro: 18, carbs: 29, fat: 42, category: 'Snack', unit: 'tbsp', portion: 10 },
    { name: 'Popcorn (Air Popped)', cals: 387, pro: 13, carbs: 78, fat: 4.5, category: 'Snack', unit: 'cup', portion: 8 },
    { name: 'Potato Chips', cals: 536, pro: 7, carbs: 53, fat: 35, category: 'Snack', unit: 'oz', portion: 28 },
    { name: 'Dark Chocolate (70%)', cals: 598, pro: 8, carbs: 46, fat: 43, category: 'Snack', unit: 'oz', portion: 28 },
    
    // --- OILS & CONDIMENTS ---
    { name: 'Olive Oil', cals: 884, pro: 0, carbs: 0, fat: 100, category: 'Fat', unit: 'tbsp', portion: 14 },
    { name: 'Coconut Oil', cals: 862, pro: 0, carbs: 0, fat: 100, category: 'Fat', unit: 'tbsp', portion: 14 },
    { name: 'Mayonnaise', cals: 680, pro: 1, carbs: 1, fat: 75, category: 'Fat', unit: 'tbsp', portion: 14 },
    { name: 'Ketchup', cals: 100, pro: 1, carbs: 26, fat: 0, category: 'Carb', unit: 'tbsp', portion: 17 },
    { name: 'Mustard', cals: 66, pro: 4, carbs: 5, fat: 3, category: 'Snack', unit: 'tsp', portion: 5 },
    { name: 'Soy Sauce', cals: 53, pro: 8, carbs: 5, fat: 0, category: 'Snack', unit: 'tbsp', portion: 16 },
    { name: 'Honey', cals: 304, pro: 0.3, carbs: 82, fat: 0, category: 'Carb', unit: 'tbsp', portion: 21 },
    { name: 'Maple Syrup', cals: 260, pro: 0, carbs: 67, fat: 0, category: 'Carb', unit: 'tbsp', portion: 20 },

    // --- BEVERAGES ---
    { name: 'Coffee (Black)', cals: 1, pro: 0.1, carbs: 0, fat: 0, category: 'Drink', unit: 'cup', portion: 237 },
    { name: 'Tea (Black)', cals: 1, pro: 0, carbs: 0.3, fat: 0, category: 'Drink', unit: 'cup', portion: 237 },
    { name: 'Orange Juice', cals: 45, pro: 0.7, carbs: 10, fat: 0.2, category: 'Drink', unit: 'cup', portion: 248 },
    { name: 'Apple Juice', cals: 46, pro: 0.1, carbs: 11, fat: 0.1, category: 'Drink', unit: 'cup', portion: 248 },
    { name: 'Cola', cals: 42, pro: 0, carbs: 11, fat: 0, category: 'Drink', unit: 'can', portion: 330 },
    { name: 'Beer', cals: 43, pro: 0.5, carbs: 3.6, fat: 0, category: 'Drink', unit: 'can', portion: 355 },
    { name: 'Red Wine', cals: 85, pro: 0.1, carbs: 2.6, fat: 0, category: 'Drink', unit: 'glass', portion: 147 },
];

/**
 * Generator Function that multiplies the base DB by adding cooked variations.
 * Returns a massive array of FoodItems.
 */
const generateFoodDatabase = (): FoodItem[] => {
    const foods: FoodItem[] = [];
    
    // Process Modifiers
    // [Name Suffix, Cal Multiplier, Pro Mult, Carb Mult, Fat Add (g/100g)]
    const METHODS: [string, number, number, number, number][] = [
        ['Grilled', 1.0, 1.0, 1.0, 0],
        ['Fried', 1.4, 1.0, 1.1, 12], // Adds batter carbs + oil fat
        ['Breaded', 1.5, 1.0, 1.3, 10],
        ['Roasted', 1.1, 1.0, 1.0, 3], // Usually some oil
        ['Boiled', 0.9, 0.95, 0.95, 0], // Water absorption
        ['Steamed', 0.95, 1.0, 1.0, 0],
        ['Sautéed', 1.15, 1.0, 1.0, 5], // Oil
        ['Baked', 1.0, 1.0, 1.0, 0],
        ['Raw', 1.0, 1.0, 1.0, 0]
    ];

    let idCounter = 0;

    RAW_DB.forEach(base => {
        const defaultPortion = base.portion || 100;
        const defaultUnit = base.unit || 'g';

        // 1. Add Base Item
        foods.push({
            id: `f_${idCounter++}`,
            name: base.name,
            calories: Math.round(base.cals * (defaultPortion / 100)),
            protein: parseFloat((base.pro * (defaultPortion / 100)).toFixed(1)),
            carbs: parseFloat((base.carbs * (defaultPortion / 100)).toFixed(1)),
            fat: parseFloat((base.fat * (defaultPortion / 100)).toFixed(1)),
            servingSize: defaultPortion,
            servingUnit: defaultUnit,
            category: base.category,
            isVerified: true
        });

        // 2. Add Variations if applicable
        if (base.variations) {
            METHODS.forEach(([method, calMult, proMult, carbMult, fatAdd]) => {
                // Filter nonsense variations (e.g., Boiled Steak isn't common, but kept for scale if needed)
                // For "Every possible iteration", we include common cooking methods.
                
                // Exclude 'Raw' if base name implies it or it's dangerous (Chicken)
                if (method === 'Raw' && ['Chicken', 'Turkey', 'Pork'].some(m => base.name.includes(m))) return;

                const finalPortion = defaultPortion; // Simplify: keep portion constant, adjust density
                
                // Calculate modified values per 100g, then scale to portion
                const modCals100g = (base.cals * calMult) + (fatAdd * 9); 
                const modFat100g = (base.fat) + fatAdd;
                const modPro100g = base.pro * proMult;
                const modCarb100g = base.carbs * carbMult;

                foods.push({
                    id: `f_${idCounter++}`,
                    name: `${base.name} (${method})`,
                    calories: Math.round(modCals100g * (finalPortion / 100)),
                    protein: parseFloat((modPro100g * (finalPortion / 100)).toFixed(1)),
                    carbs: parseFloat((modCarb100g * (finalPortion / 100)).toFixed(1)),
                    fat: parseFloat((modFat100g * (finalPortion / 100)).toFixed(1)),
                    servingSize: finalPortion,
                    servingUnit: defaultUnit,
                    category: base.category,
                    isVerified: true
                });
            });
        }
    });

    return foods;
};

// Initialize the massive list once
export const COMMON_FOODS: FoodItem[] = generateFoodDatabase();

// --- SEARCH ENGINE ---

function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}

export const searchFoods = (query: string): FoodItem[] => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matches = COMMON_FOODS.map(food => {
        const name = food.name.toLowerCase();
        let score = 0;

        if (name === q) score = 100;
        else if (name.startsWith(q)) score = 80;
        else if (name.includes(q)) score = 60;
        else {
            if (q.length >= 3) {
                const distance = levenshteinDistance(q, name);
                const allowedErrors = Math.floor(name.length / 3) + 1; 
                if (distance <= allowedErrors) score = 50 - (distance * 10);
            }
        }
        return { food, score };
    }).filter(item => item.score > 0);

    return matches.sort((a, b) => b.score - a.score).map(item => item.food).slice(0, 50); // Limit results for UI perf
};

export const getFoodById = (id: string): FoodItem | undefined => {
    return COMMON_FOODS.find(f => f.id === id);
};
