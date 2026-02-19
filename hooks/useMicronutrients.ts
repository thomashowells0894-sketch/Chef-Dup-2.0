import { useMemo } from 'react';
import { MICRONUTRIENTS, getRDA, getDeficiencyAlerts } from '../data/micronutrients';
import type { Micronutrient } from '../data/micronutrients';

export interface NutrientStatus {
  id: string;
  name: string;
  unit: string;
  emoji: string;
  category: 'vitamin' | 'mineral' | 'other';
  current: number;
  rda: number;
  percent: number;
  status: 'excellent' | 'good' | 'low' | 'warning' | 'critical';
  description: string;
  topSources: string[];
  deficiencyRisk: string;
  upperLimit: number | null;
}

function getStatus(percent: number): 'excellent' | 'good' | 'low' | 'warning' | 'critical' {
  if (percent >= 90) return 'excellent';
  if (percent >= 75) return 'good';
  if (percent >= 50) return 'low';
  if (percent >= 25) return 'warning';
  return 'critical';
}

function getGrade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D+';
  if (score >= 45) return 'D';
  if (score >= 40) return 'D-';
  return 'F';
}

export function useMicronutrients(dailyIntake: Record<string, number>, gender: 'male' | 'female') {
  const nutrients = useMemo<NutrientStatus[]>(() => {
    return MICRONUTRIENTS.map((n) => {
      const rda = getRDA(n.id, gender);
      const current = dailyIntake[n.id] || 0;
      const percent = rda > 0 ? Math.round((current / rda) * 100) : 100;
      return {
        id: n.id,
        name: n.name,
        unit: n.unit,
        emoji: n.emoji,
        category: n.category,
        current,
        rda,
        percent,
        status: getStatus(percent),
        description: n.description,
        topSources: n.topSources,
        deficiencyRisk: n.deficiencyRisk,
        upperLimit: n.upperLimit,
      };
    });
  }, [dailyIntake, gender]);

  const deficiencyAlerts = useMemo(() => {
    return getDeficiencyAlerts(dailyIntake, gender);
  }, [dailyIntake, gender]);

  const overallScore = useMemo(() => {
    if (nutrients.length === 0) return 0;
    const total = nutrients.reduce((sum, n) => sum + Math.min(n.percent, 100), 0);
    return Math.round(total / nutrients.length);
  }, [nutrients]);

  const grade = useMemo(() => getGrade(overallScore), [overallScore]);

  const vitaminScore = useMemo(() => {
    const vitamins = nutrients.filter((n) => n.category === 'vitamin');
    if (vitamins.length === 0) return 0;
    const total = vitamins.reduce((sum, n) => sum + Math.min(n.percent, 100), 0);
    return Math.round(total / vitamins.length);
  }, [nutrients]);

  const mineralScore = useMemo(() => {
    const minerals = nutrients.filter((n) => n.category === 'mineral');
    if (minerals.length === 0) return 0;
    const total = minerals.reduce((sum, n) => sum + Math.min(n.percent, 100), 0);
    return Math.round(total / minerals.length);
  }, [nutrients]);

  const topDeficiencies = useMemo(() => {
    return [...nutrients].sort((a, b) => a.percent - b.percent).slice(0, 3);
  }, [nutrients]);

  const topStrengths = useMemo(() => {
    return [...nutrients].sort((a, b) => b.percent - a.percent).slice(0, 3);
  }, [nutrients]);

  return {
    nutrients,
    deficiencyAlerts,
    overallScore,
    grade,
    vitaminScore,
    mineralScore,
    topDeficiencies,
    topStrengths,
  };
}
