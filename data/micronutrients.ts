export interface Micronutrient {
  id: string;
  name: string;
  unit: string;
  rdaMale: number; // RDA for adult male (19-50)
  rdaFemale: number; // RDA for adult female (19-50)
  upperLimit: number | null; // Tolerable Upper Intake Level
  category: 'vitamin' | 'mineral' | 'other';
  emoji: string;
  description: string;
  topSources: string[]; // Top 3 food sources
  deficiencyRisk: string; // What happens if deficient
}

export const MICRONUTRIENTS: Micronutrient[] = [
  // VITAMINS
  { id: 'vitA', name: 'Vitamin A', unit: 'mcg', rdaMale: 900, rdaFemale: 700, upperLimit: 3000, category: 'vitamin', emoji: '\u{1F955}', description: 'Vision, immune function, skin health', topSources: ['Sweet potato', 'Carrots', 'Spinach'], deficiencyRisk: 'Night blindness, weakened immunity' },
  { id: 'vitC', name: 'Vitamin C', unit: 'mg', rdaMale: 90, rdaFemale: 75, upperLimit: 2000, category: 'vitamin', emoji: '\u{1F34A}', description: 'Antioxidant, collagen synthesis, immune support', topSources: ['Bell peppers', 'Oranges', 'Strawberries'], deficiencyRisk: 'Scurvy, poor wound healing' },
  { id: 'vitD', name: 'Vitamin D', unit: 'mcg', rdaMale: 15, rdaFemale: 15, upperLimit: 100, category: 'vitamin', emoji: '\u2600\uFE0F', description: 'Bone health, calcium absorption, mood', topSources: ['Salmon', 'Fortified milk', 'Egg yolks'], deficiencyRisk: 'Bone loss, depression, fatigue' },
  { id: 'vitE', name: 'Vitamin E', unit: 'mg', rdaMale: 15, rdaFemale: 15, upperLimit: 1000, category: 'vitamin', emoji: '\u{1F95C}', description: 'Antioxidant, skin health, cell protection', topSources: ['Almonds', 'Sunflower seeds', 'Avocado'], deficiencyRisk: 'Nerve damage, muscle weakness' },
  { id: 'vitK', name: 'Vitamin K', unit: 'mcg', rdaMale: 120, rdaFemale: 90, upperLimit: null, category: 'vitamin', emoji: '\u{1F96C}', description: 'Blood clotting, bone metabolism', topSources: ['Kale', 'Spinach', 'Broccoli'], deficiencyRisk: 'Excessive bleeding, bone weakness' },
  { id: 'vitB1', name: 'Thiamin (B1)', unit: 'mg', rdaMale: 1.2, rdaFemale: 1.1, upperLimit: null, category: 'vitamin', emoji: '\u{1F33E}', description: 'Energy metabolism, nerve function', topSources: ['Pork', 'Brown rice', 'Lentils'], deficiencyRisk: 'Beriberi, fatigue, irritability' },
  { id: 'vitB2', name: 'Riboflavin (B2)', unit: 'mg', rdaMale: 1.3, rdaFemale: 1.1, upperLimit: null, category: 'vitamin', emoji: '\u{1F95B}', description: 'Energy production, cell function', topSources: ['Dairy', 'Eggs', 'Lean meats'], deficiencyRisk: 'Cracked lips, sore throat' },
  { id: 'vitB3', name: 'Niacin (B3)', unit: 'mg', rdaMale: 16, rdaFemale: 14, upperLimit: 35, category: 'vitamin', emoji: '\u{1F357}', description: 'Energy metabolism, DNA repair', topSources: ['Chicken', 'Tuna', 'Peanuts'], deficiencyRisk: 'Pellagra, skin issues' },
  { id: 'vitB6', name: 'Vitamin B6', unit: 'mg', rdaMale: 1.3, rdaFemale: 1.3, upperLimit: 100, category: 'vitamin', emoji: '\u{1F34C}', description: 'Protein metabolism, brain function', topSources: ['Chickpeas', 'Bananas', 'Potatoes'], deficiencyRisk: 'Anemia, confusion, depression' },
  { id: 'vitB12', name: 'Vitamin B12', unit: 'mcg', rdaMale: 2.4, rdaFemale: 2.4, upperLimit: null, category: 'vitamin', emoji: '\u{1F969}', description: 'Nerve function, red blood cells, DNA', topSources: ['Beef liver', 'Clams', 'Fish'], deficiencyRisk: 'Anemia, nerve damage, fatigue' },
  { id: 'folate', name: 'Folate', unit: 'mcg', rdaMale: 400, rdaFemale: 400, upperLimit: 1000, category: 'vitamin', emoji: '\u{1F966}', description: 'Cell division, DNA synthesis', topSources: ['Spinach', 'Black-eyed peas', 'Asparagus'], deficiencyRisk: 'Anemia, birth defects' },
  // MINERALS
  { id: 'calcium', name: 'Calcium', unit: 'mg', rdaMale: 1000, rdaFemale: 1000, upperLimit: 2500, category: 'mineral', emoji: '\u{1F9B4}', description: 'Bone health, muscle contraction, nerve signaling', topSources: ['Yogurt', 'Sardines', 'Kale'], deficiencyRisk: 'Osteoporosis, muscle cramps' },
  { id: 'iron', name: 'Iron', unit: 'mg', rdaMale: 8, rdaFemale: 18, upperLimit: 45, category: 'mineral', emoji: '\u{1FA78}', description: 'Oxygen transport, energy production', topSources: ['Red meat', 'Lentils', 'Spinach'], deficiencyRisk: 'Anemia, fatigue, weakness' },
  { id: 'magnesium', name: 'Magnesium', unit: 'mg', rdaMale: 420, rdaFemale: 320, upperLimit: 350, category: 'mineral', emoji: '\u{1F330}', description: 'Muscle/nerve function, blood sugar control', topSources: ['Pumpkin seeds', 'Almonds', 'Dark chocolate'], deficiencyRisk: 'Muscle cramps, anxiety, insomnia' },
  { id: 'zinc', name: 'Zinc', unit: 'mg', rdaMale: 11, rdaFemale: 8, upperLimit: 40, category: 'mineral', emoji: '\u{1F9AA}', description: 'Immune function, wound healing, taste', topSources: ['Oysters', 'Beef', 'Pumpkin seeds'], deficiencyRisk: 'Weakened immunity, hair loss' },
  { id: 'potassium', name: 'Potassium', unit: 'mg', rdaMale: 3400, rdaFemale: 2600, upperLimit: null, category: 'mineral', emoji: '\u{1F34C}', description: 'Blood pressure, fluid balance, nerve signals', topSources: ['Bananas', 'Sweet potatoes', 'Avocado'], deficiencyRisk: 'Muscle weakness, irregular heartbeat' },
  { id: 'sodium', name: 'Sodium', unit: 'mg', rdaMale: 1500, rdaFemale: 1500, upperLimit: 2300, category: 'mineral', emoji: '\u{1F9C2}', description: 'Fluid balance, nerve function', topSources: ['Table salt', 'Processed foods', 'Bread'], deficiencyRisk: 'Low sodium rare; excess causes hypertension' },
  { id: 'phosphorus', name: 'Phosphorus', unit: 'mg', rdaMale: 700, rdaFemale: 700, upperLimit: 4000, category: 'mineral', emoji: '\u{1F41F}', description: 'Bone formation, energy storage', topSources: ['Dairy', 'Meat', 'Fish'], deficiencyRisk: 'Bone pain, weakness' },
  { id: 'selenium', name: 'Selenium', unit: 'mcg', rdaMale: 55, rdaFemale: 55, upperLimit: 400, category: 'mineral', emoji: '\u{1F33B}', description: 'Antioxidant, thyroid function', topSources: ['Brazil nuts', 'Tuna', 'Eggs'], deficiencyRisk: 'Thyroid issues, weakened immunity' },
  { id: 'copper', name: 'Copper', unit: 'mg', rdaMale: 0.9, rdaFemale: 0.9, upperLimit: 10, category: 'mineral', emoji: '\u{1FAD8}', description: 'Iron metabolism, connective tissue', topSources: ['Liver', 'Cashews', 'Lentils'], deficiencyRisk: 'Anemia, bone issues' },
  // OTHER
  { id: 'fiber', name: 'Fiber', unit: 'g', rdaMale: 38, rdaFemale: 25, upperLimit: null, category: 'other', emoji: '\u{1F33E}', description: 'Digestive health, cholesterol reduction', topSources: ['Beans', 'Oats', 'Berries'], deficiencyRisk: 'Constipation, high cholesterol' },
  { id: 'omega3', name: 'Omega-3 (ALA)', unit: 'g', rdaMale: 1.6, rdaFemale: 1.1, upperLimit: null, category: 'other', emoji: '\u{1F420}', description: 'Heart health, brain function, inflammation', topSources: ['Salmon', 'Walnuts', 'Flaxseed'], deficiencyRisk: 'Inflammation, cognitive decline' },
  { id: 'cholesterol', name: 'Cholesterol', unit: 'mg', rdaMale: 300, rdaFemale: 300, upperLimit: 300, category: 'other', emoji: '\u{1F95A}', description: 'Cell membranes, hormone production', topSources: ['Eggs', 'Shrimp', 'Organ meats'], deficiencyRisk: 'No deficiency risk; excess raises heart disease risk' },
];

export function getRDA(nutrientId: string, gender: 'male' | 'female'): number {
  const nutrient = MICRONUTRIENTS.find(n => n.id === nutrientId);
  if (!nutrient) return 0;
  return gender === 'male' ? nutrient.rdaMale : nutrient.rdaFemale;
}

export function getDeficiencyAlerts(intake: Record<string, number>, gender: 'male' | 'female'): { nutrient: Micronutrient; percent: number; severity: 'low' | 'warning' | 'critical' }[] {
  const alerts: { nutrient: Micronutrient; percent: number; severity: 'low' | 'warning' | 'critical' }[] = [];
  for (const n of MICRONUTRIENTS) {
    const rda = gender === 'male' ? n.rdaMale : n.rdaFemale;
    const current = intake[n.id] || 0;
    const percent = rda > 0 ? (current / rda) * 100 : 100;
    if (percent < 25) alerts.push({ nutrient: n, percent, severity: 'critical' });
    else if (percent < 50) alerts.push({ nutrient: n, percent, severity: 'warning' });
    else if (percent < 75) alerts.push({ nutrient: n, percent, severity: 'low' });
  }
  return alerts.sort((a, b) => a.percent - b.percent);
}
