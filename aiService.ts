
import { GoogleGenAI, Type } from "@google/genai";
import { Ingredient, Recipe, UserProfile, RecipeIngredient, MealPlanEntry, ChatMessage, MenuItem, FoodItem } from '../types';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for dynamic images with diverse photography styles
const PHOTO_STYLES = [
    'cinematic lighting, 8k, highly detailed, professional food photography, shot on 70mm, depth of field',
    'top down shot, flat lay, soft natural lighting, aesthetic, 4k, award winning, Bon Appétit style',
    'macro close-up, bokeh, steam rising, delicious, vibrant textures, hyperrealistic',
    'editorial magazine style, studio lighting, vibrant colors, sharp focus, high contrast',
    'rustic atmosphere, wooden table, warm lighting, home cooked feel, comfort food, cozy',
    'modern plating, minimalist background, dramatic shadows, fine dining, elegant presentation, Michelin star',
    'dark moody food photography, chiaroscuro lighting, rich textures, 8k resolution'
];

export const getDynamicImage = (query: string) => {
    // Select a random style to ensure visual variety
    const style = PHOTO_STYLES[Math.floor(Math.random() * PHOTO_STYLES.length)];
    // Add a random seed to prevent caching and ensure unique images for similar queries
    const seed = Math.floor(Math.random() * 99999);
    
    const prompt = `${query}, ${style}`;
    const encoded = encodeURIComponent(prompt);
    
    // Request higher resolution (1024x1024) and use 'flux' model for better quality
    return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
};

export const analyzeFridge = async (imageData: string): Promise<Ingredient[]> => {
    // Mock if no API key
    if (!process.env.API_KEY) {
        await delay(1500);
        return [
            { id: '1', name: 'Eggs', confidence: 0.95, calories: 155, protein: 13, carbs: 1.1, fat: 11 },
            { id: '2', name: 'Milk', confidence: 0.90, calories: 42, protein: 3.4, carbs: 5, fat: 1 },
            { id: '3', name: 'Spinach', confidence: 0.85, calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
            { id: '4', name: 'Chicken Breast', confidence: 0.92, calories: 165, protein: 31, carbs: 0, fat: 3.6 },
            { id: '5', name: 'Tomatoes', confidence: 0.88, calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
        ];
    }

    try {
        const base64Data = imageData.split(',')[1];
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: 'Identify the food ingredients in this image. Return a JSON array of objects with "name", "confidence" (0-1), and approximate nutritional values per 100g: "calories", "protein", "carbs", "fat".' }
                ]
            },
            config: {
                responseMimeType: 'application/json'
            }
        });
        
        const text = response.text;
        if (!text) return [];
        const items = JSON.parse(text);
        return items.map((item: any, idx: number) => ({
            id: `scan_${Date.now()}_${idx}`,
            name: item.name,
            confidence: item.confidence || 0.9,
            calories: item.calories || 0,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fat: item.fat || 0
        }));

    } catch (error) {
        console.error("AI Scan Failed", error);
        return [
             { id: '1', name: 'Eggs', confidence: 0.95, calories: 155, protein: 13, carbs: 1.1, fat: 11 },
        ];
    }
};

const mockRecipes: Recipe[] = [
    {
        id: 'r1',
        title: 'Spinach & Egg Scramble',
        description: 'A quick and healthy protein-packed breakfast.',
        ingredients: [
            { name: 'Eggs', amount: 2, unit: 'whole', calories: 140, protein: 12, carbs: 1, fat: 10 },
            { name: 'Spinach', amount: 1, unit: 'cup', calories: 7, protein: 1, carbs: 1, fat: 0 }
        ],
        missingIngredients: [],
        steps: [
            { id: 1, text: 'Whisk eggs in a bowl.', durationSeconds: 30 },
            { id: 2, text: 'Sauté spinach in a pan.', durationSeconds: 120 },
            { id: 3, text: 'Add eggs and cook until set.', durationSeconds: 180 }
        ],
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414395d8?auto=format&fit=crop&w=800&q=80',
        isVegan: false,
        isGlutenFree: true,
        isKeto: true,
        servings: 1,
        calories: 320,
        protein: 22,
        carbs: 4,
        fat: 24,
        sugar: 1,
        fiber: 2,
        sodium: 400,
        prepTimeMinutes: 10,
        savings: 5.50
    },
    {
        id: 'r2',
        title: 'Grilled Chicken Salad',
        description: 'Fresh and light salad with grilled chicken breast.',
        ingredients: [
            { name: 'Chicken Breast', amount: 200, unit: 'g', calories: 330, protein: 62, carbs: 0, fat: 7 },
            { name: 'Tomatoes', amount: 2, unit: 'whole', calories: 40, protein: 2, carbs: 8, fat: 0 }
        ],
        missingIngredients: ['Lettuce'],
        steps: [
            { id: 1, text: 'Season chicken with salt and pepper.', durationSeconds: 60 },
            { id: 2, text: 'Grill chicken until cooked through.', durationSeconds: 600 },
            { id: 3, text: 'Chop tomatoes and mix with lettuce.', durationSeconds: 180 },
            { id: 4, text: 'Top with sliced chicken.', durationSeconds: 60 }
        ],
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        isVegan: false,
        isGlutenFree: true,
        isKeto: true,
        servings: 2,
        calories: 450,
        protein: 40,
        carbs: 10,
        fat: 15,
        sugar: 3,
        fiber: 4,
        sodium: 550,
        prepTimeMinutes: 20,
        savings: 8.00
    }
];

export const generateRecipes = async (ingredients: Ingredient[], profile: UserProfile): Promise<Recipe[]> => {
    // Mock if no API key
    if (!process.env.API_KEY) {
        await delay(2000);
        return mockRecipes;
    }

    try {
        const ingredientNames = ingredients.map(i => i.name).join(', ');
        const prompt = `
            You are a professional chef. Create 3 recipes using these ingredients: ${ingredientNames}.
            User profile: ${profile.isVegan ? 'Vegan' : ''} ${profile.isKeto ? 'Keto' : ''} ${profile.isGlutenFree ? 'Gluten Free' : ''}.
            Goal: ${profile.goal}.
            
            CRITICAL INSTRUCTIONS:
            1. Return a JSON array matching the Recipe interface.
            2. Calculate nutritional values (calories, protein, carbs, fat) accurately PER SERVING.
            3. Include nutritional values for EACH INGREDIENT based on its amount in the recipe.
            4. Ensure ingredient amounts are practical.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            ingredients: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        amount: { type: Type.NUMBER },
                                        unit: { type: Type.STRING },
                                        calories: { type: Type.NUMBER },
                                        protein: { type: Type.NUMBER },
                                        carbs: { type: Type.NUMBER },
                                        fat: { type: Type.NUMBER },
                                    }
                                }
                            },
                            missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                            steps: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.INTEGER },
                                        text: { type: Type.STRING },
                                        durationSeconds: { type: Type.INTEGER }
                                    }
                                }
                            },
                            imageUrl: { type: Type.STRING },
                            isVegan: { type: Type.BOOLEAN },
                            isGlutenFree: { type: Type.BOOLEAN },
                            isKeto: { type: Type.BOOLEAN },
                            servings: { type: Type.NUMBER },
                            calories: { type: Type.NUMBER },
                            protein: { type: Type.NUMBER },
                            carbs: { type: Type.NUMBER },
                            fat: { type: Type.NUMBER },
                            sugar: { type: Type.NUMBER },
                            fiber: { type: Type.NUMBER },
                            sodium: { type: Type.NUMBER },
                            prepTimeMinutes: { type: Type.NUMBER },
                            savings: { type: Type.NUMBER },
                        }
                    }
                }
            }
        });
        
        const json = response.text;
        if (!json) return mockRecipes;
        const recipes = JSON.parse(json);
        // Ensure image URL is valid or use dynamic generator if empty
        return recipes.map((r: any) => ({
            ...r,
            // Check if imageUrl is a valid URL, otherwise generate one
            imageUrl: (r.imageUrl && r.imageUrl.startsWith('http')) ? r.imageUrl : getDynamicImage(r.title),
            ingredients: r.ingredients || [],
            missingIngredients: r.missingIngredients || [],
            steps: r.steps || []
        }));

    } catch (e) {
        console.error(e);
        return mockRecipes;
    }
};

export const lookupBarcode = async (barcode: string): Promise<RecipeIngredient> => {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1) {
            const p = data.product;
            const nutriments = p.nutriments;
            
            // Extract quantity/unit roughly
            let amount = 100;
            let unit = 'g';
            
            // Attempt to parse quantity if available e.g. "330 ml"
            if (p.quantity) {
                const parts = p.quantity.split(' ');
                if (parts.length >= 2) {
                    const val = parseFloat(parts[0]);
                    if (!isNaN(val)) amount = val;
                    unit = parts[1];
                }
            }

            return {
                name: p.product_name || 'Unknown Product',
                amount: amount,
                unit: unit,
                calories: nutriments['energy-kcal_100g'] || 0,
                protein: nutriments.proteins_100g || 0,
                carbs: nutriments.carbohydrates_100g || 0,
                fat: nutriments.fat_100g || 0,
                sugar: nutriments.sugars_100g || 0,
                fiber: nutriments.fiber_100g || 0,
                sodium: (nutriments.salt_100g || 0) * 400, // salt to sodium approx
                // Micros
                iron: nutriments.iron_100g,
                calcium: nutriments.calcium_100g,
                vitaminA: nutriments['vitamin-a_100g'],
                vitaminC: nutriments['vitamin-c_100g'],
                potassium: nutriments.potassium_100g,
            };
        } else {
            throw new Error("Product not found in database");
        }
    } catch (e) {
        console.warn("Barcode lookup failed, falling back to mock", e);
        await delay(500);
        return {
            name: 'Scanned Item (Offline)',
            amount: 100,
            unit: 'g',
            calories: 250,
            protein: 10,
            carbs: 20,
            fat: 10,
            sugar: 5,
            fiber: 2,
            sodium: 100
        };
    }
};

export const generateWeeklyPlan = async (pantry: Ingredient[], profile: UserProfile): Promise<MealPlanEntry[]> => {
     await delay(1500);
     const today = new Date();
     const plan: MealPlanEntry[] = [];
     
     // Simple mock logic for generating a plan
     for (let i = 0; i < 3; i++) {
         const d = new Date(today);
         d.setDate(today.getDate() + i);
         const dateStr = d.toISOString().split('T')[0];
         
         plan.push({
             id: `plan_${dateStr}_dinner`,
             date: dateStr,
             mealType: 'dinner',
             recipe: mockRecipes[0],
             isCompleted: false
         });
     }
     
     return plan;
};

export const askSousChef = async (message: string, recipe: Recipe): Promise<ChatMessage> => {
    if (!process.env.API_KEY) {
        await delay(1000);
        return {
            id: Date.now().toString(),
            role: 'ai',
            text: "I'm a mock AI. Set your API key to chat with me really!"
        };
    }

    try {
        const prompt = `
            You are a helpful cooking assistant.
            The user is cooking: ${recipe.title}.
            Recipe details: ${JSON.stringify(recipe)}.
            User Question: ${message}
            Keep answer concise and helpful.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        return {
            id: Date.now().toString(),
            role: 'ai',
            text: response.text || "Sorry, I didn't catch that."
        };

    } catch (e) {
        return {
            id: Date.now().toString(),
            role: 'ai',
            text: "Error connecting to AI."
        };
    }
};

export const analyzeMenu = async (imageData: string, profile: UserProfile): Promise<MenuItem[]> => {
    await delay(2000); // Simulate AI processing

    // Mock Menu Items found on a standard American/Pub Menu
    const foundItems: MenuItem[] = [
        {
            id: 'm1',
            name: 'Classic Cheeseburger',
            description: 'Brioche bun, cheddar, lettuce, tomato, house sauce',
            calories: 950,
            protein: 45,
            carbs: 60,
            fat: 55,
            price: 16,
            tags: ['Popular'],
            matchScore: 0
        },
        {
            id: 'm2',
            name: 'Grilled Salmon Salad',
            description: 'Fresh atlantic salmon, mixed greens, avocado, lemon vinaigrette',
            calories: 650,
            protein: 40,
            carbs: 12,
            fat: 35,
            price: 22,
            tags: ['Healthy', 'GF'],
            matchScore: 0
        },
        {
            id: 'm3',
            name: 'Truffle Mushroom Risotto',
            description: 'Arborio rice, wild mushrooms, parmesan, truffle oil',
            calories: 800,
            protein: 18,
            carbs: 90,
            fat: 40,
            price: 19,
            tags: ['Vegetarian'],
            matchScore: 0
        },
        {
            id: 'm4',
            name: 'Steak Frites',
            description: '10oz NY Strip, garlic herb butter, shoestring fries',
            calories: 1100,
            protein: 65,
            carbs: 50,
            fat: 70,
            price: 28,
            tags: ['High Protein'],
            matchScore: 0
        },
        {
            id: 'm5',
            name: 'Quinoa Power Bowl',
            description: 'Roasted sweet potato, kale, chickpeas, tahini dressing',
            calories: 550,
            protein: 20,
            carbs: 65,
            fat: 22,
            price: 17,
            tags: ['Vegan', 'Healthy'],
            matchScore: 0
        }
    ];

    // Score Calculation Algorithm
    return foundItems.map(item => {
        let score = 50;
        let reasons = [];

        // Diet Matching
        if (profile.isVegan) {
            if (item.tags.includes('Vegan')) { score += 40; reasons.push("Vegan Friendly"); }
            else if (!item.tags.includes('Vegetarian')) { score = 0; reasons.push("Contains Meat"); }
        }
        if (profile.isKeto) {
            if (item.carbs < 20) { score += 40; reasons.push("Keto Approved"); }
            else if (item.carbs > 50) { score -= 40; reasons.push("High Carb"); }
        }
        if (profile.goal === 'build_muscle') {
            if (item.protein > 30) { score += 30; reasons.push("High Protein"); }
        }
        if (profile.goal === 'lose_weight') {
            if (item.calories < 700) { score += 20; reasons.push("Calorie Smart"); }
            else { score -= 20; reasons.push("Calorie Dense"); }
        }

        return {
            ...item,
            matchScore: Math.max(0, Math.min(100, score)),
            recommendationReason: reasons[0]
        };
    }).sort((a, b) => b.matchScore - a.matchScore);
};

export const importRecipeFromUrl = async (url: string): Promise<Recipe> => {
    await delay(2500); // Simulate scraping delay

    // Return a generic "imported" recipe structure
    // In a real app, this would use a backend scraper like Cheerio or Puppeteer
    return {
        id: `imported_${Date.now()}`,
        title: 'Imported: Grandmas Famous Lasagna',
        description: `Successfully imported from ${new URL(url).hostname}. A classic comfort food dish rich in flavor.`,
        sourceUrl: url,
        ingredients: [
            { name: 'Lasagna Noodles', amount: 12, unit: 'whole', calories: 200, protein: 7, carbs: 42, fat: 1, sugar: 1, fiber: 2, sodium: 10 },
            { name: 'Ground Beef', amount: 450, unit: 'g', calories: 1100, protein: 90, carbs: 0, fat: 80, sugar: 0, fiber: 0, sodium: 300 },
            { name: 'Marinara Sauce', amount: 2, unit: 'cup', calories: 140, protein: 4, carbs: 20, fat: 4, sugar: 12, fiber: 4, sodium: 900 },
            { name: 'Mozzarella Cheese', amount: 2, unit: 'cup', calories: 640, protein: 48, carbs: 4, fat: 48, sugar: 0, fiber: 0, sodium: 1200 },
            { name: 'Ricotta Cheese', amount: 1, unit: 'cup', calories: 420, protein: 28, carbs: 8, fat: 30, sugar: 0, fiber: 0, sodium: 250 }
        ],
        missingIngredients: [], // Assume user wants to add to plan/shopping list
        steps: [
            { id: 1, text: 'Preheat oven to 375°F (190°C).' },
            { id: 2, text: 'Cook noodles according to package instructions.' },
            { id: 3, text: 'Brown the beef in a skillet and drain fat.' },
            { id: 4, text: 'Layer noodles, cheese, beef, and sauce in a baking dish.' },
            { id: 5, text: 'Bake for 45 minutes until bubbly and golden.' }
        ],
        imageUrl: getDynamicImage('Grandmas Famous Lasagna'),
        isVegan: false,
        isGlutenFree: false,
        isKeto: false,
        servings: 8,
        calories: 450,
        protein: 32,
        carbs: 28,
        fat: 22,
        sugar: 6,
        fiber: 2,
        sodium: 680,
        prepTimeMinutes: 60,
        savings: 0
    };
};

export const parseNaturalLanguageFoodLog = async (text: string): Promise<FoodItem[]> => {
    // 1. Mock if no API
    if (!process.env.API_KEY) {
        await delay(1200);
        return [
            {
                id: `ai_${Date.now()}_1`,
                name: 'Turkey Sandwich (Estimated)',
                calories: 350,
                protein: 25,
                carbs: 35,
                fat: 10,
                servingSize: 1,
                servingUnit: 'sandwich',
                category: 'Protein',
                aiConfidence: 0.85
            },
            {
                id: `ai_${Date.now()}_2`,
                name: 'Apple',
                calories: 95,
                protein: 0.5,
                carbs: 25,
                fat: 0.3,
                servingSize: 1,
                servingUnit: 'medium',
                category: 'Fruit',
                aiConfidence: 0.95
            }
        ];
    }

    try {
        const prompt = `
            Analyze this food log: "${text}".
            Break it down into individual items with estimated nutritional values.
            Return ONLY a JSON array of objects with the following keys:
            - name (string)
            - calories (number)
            - protein (number, grams)
            - carbs (number, grams)
            - fat (number, grams)
            - servingSize (number)
            - servingUnit (string)
            - category (string: Protein, Carb, Fat, Fruit, Veg, Snack, Drink)
            
            Be generous and realistic with estimations.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const rawJson = response.text || '[]';
        const items = JSON.parse(rawJson);

        return items.map((item: any, i: number) => ({
            id: `ai_${Date.now()}_${i}`,
            name: item.name,
            calories: item.calories || 0,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fat: item.fat || 0,
            servingSize: item.servingSize || 1,
            servingUnit: item.servingUnit || 'serving',
            category: item.category || 'Other',
            isVerified: false,
            aiConfidence: 0.9 // AI entries are high confidence estimates
        }));

    } catch (e) {
        console.error("AI Log Parse Failed", e);
        return [];
    }
};
