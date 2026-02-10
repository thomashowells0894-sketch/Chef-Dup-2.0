/**
 * Exercise database with MET (Metabolic Equivalent of Task) values
 * MET represents the energy cost of physical activities
 * 1 MET = energy expended at rest (approximately 1 kcal/kg/hour)
 *
 * Formula for calories burned:
 * Calories = (MET * 3.5 * weightInKg) / 200 * durationInMinutes
 */

export const EXERCISES = [
  // Cardio - Running
  {
    id: 'running_6mph',
    name: 'Running (6 mph)',
    category: 'Cardio',
    met: 9.8,
    icon: 'run',
  },
  {
    id: 'running_8mph',
    name: 'Running (8 mph)',
    category: 'Cardio',
    met: 11.8,
    icon: 'run',
  },
  {
    id: 'jogging',
    name: 'Jogging (5 mph)',
    category: 'Cardio',
    met: 7.0,
    icon: 'run',
  },
  {
    id: 'walking_brisk',
    name: 'Walking (brisk)',
    category: 'Cardio',
    met: 4.3,
    icon: 'walk',
  },
  {
    id: 'walking_moderate',
    name: 'Walking (moderate)',
    category: 'Cardio',
    met: 3.5,
    icon: 'walk',
  },

  // Cardio - Cycling
  {
    id: 'cycling_moderate',
    name: 'Cycling (moderate)',
    category: 'Cardio',
    met: 6.8,
    icon: 'bike',
  },
  {
    id: 'cycling_vigorous',
    name: 'Cycling (vigorous)',
    category: 'Cardio',
    met: 10.0,
    icon: 'bike',
  },
  {
    id: 'spinning',
    name: 'Spinning Class',
    category: 'Cardio',
    met: 8.5,
    icon: 'bike',
  },

  // Cardio - Other
  {
    id: 'swimming',
    name: 'Swimming (laps)',
    category: 'Cardio',
    met: 8.0,
    icon: 'swim',
  },
  {
    id: 'jump_rope',
    name: 'Jump Rope',
    category: 'Cardio',
    met: 11.0,
    icon: 'jump',
  },
  {
    id: 'elliptical',
    name: 'Elliptical Trainer',
    category: 'Cardio',
    met: 5.0,
    icon: 'cardio',
  },
  {
    id: 'rowing',
    name: 'Rowing Machine',
    category: 'Cardio',
    met: 7.0,
    icon: 'cardio',
  },
  {
    id: 'stair_climbing',
    name: 'Stair Climbing',
    category: 'Cardio',
    met: 9.0,
    icon: 'stairs',
  },

  // Strength Training
  {
    id: 'weight_lifting',
    name: 'Weight Lifting',
    category: 'Strength',
    met: 3.5,
    icon: 'dumbbell',
  },
  {
    id: 'weight_lifting_vigorous',
    name: 'Weight Lifting (vigorous)',
    category: 'Strength',
    met: 6.0,
    icon: 'dumbbell',
  },
  {
    id: 'bodyweight_exercises',
    name: 'Bodyweight Exercises',
    category: 'Strength',
    met: 3.8,
    icon: 'dumbbell',
  },
  {
    id: 'hiit',
    name: 'HIIT Training',
    category: 'Strength',
    met: 8.0,
    icon: 'fire',
  },

  // Flexibility & Mind-Body
  {
    id: 'yoga',
    name: 'Yoga',
    category: 'Flexibility',
    met: 2.5,
    icon: 'yoga',
  },
  {
    id: 'pilates',
    name: 'Pilates',
    category: 'Flexibility',
    met: 3.0,
    icon: 'yoga',
  },
  {
    id: 'stretching',
    name: 'Stretching',
    category: 'Flexibility',
    met: 2.3,
    icon: 'stretch',
  },
];

// Get exercises grouped by category
export function getExercisesByCategory() {
  const categories = {};
  EXERCISES.forEach((exercise) => {
    if (!categories[exercise.category]) {
      categories[exercise.category] = [];
    }
    categories[exercise.category].push(exercise);
  });
  return categories;
}

// Search exercises by name
export function searchExercises(query) {
  if (!query || query.trim() === '') {
    return EXERCISES;
  }
  const lowerQuery = query.toLowerCase().trim();
  return EXERCISES.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(lowerQuery) ||
      exercise.category.toLowerCase().includes(lowerQuery)
  );
}

// Calculate calories burned
// Formula: (MET * 3.5 * weightInKg) / 200 * durationInMinutes
export function calculateCaloriesBurned(met, weightLbs, durationMinutes) {
  const weightKg = weightLbs * 0.453592;
  const caloriesPerMinute = (met * 3.5 * weightKg) / 200;
  return Math.round(caloriesPerMinute * durationMinutes);
}

// Get exercise by ID
export function getExerciseById(id) {
  return EXERCISES.find((e) => e.id === id);
}
