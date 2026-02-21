/**
 * Pre-built multi-week structured workout programs for FuelIQ.
 * Each program contains weeks -> days -> exercises with progressive overload.
 */

interface ProgramExercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
}

interface ProgramDay {
  day: number;
  name: string;
  exercises: ProgramExercise[];
}

interface ProgramWeek {
  week: number;
  theme: string;
  days: ProgramDay[];
}

type ProgramLevel = 'beginner' | 'intermediate' | 'advanced';
type ProgramGoal = 'general_fitness' | 'muscle_building' | 'fat_loss' | 'strength' | 'flexibility' | 'hypertrophy' | 'endurance' | 'progressive_calisthenics';

interface WorkoutProgram {
  id: string;
  name: string;
  emoji: string;
  description: string;
  level: ProgramLevel;
  durationWeeks: number;
  daysPerWeek: number;
  goal: ProgramGoal;
  color: string;
  weeks: ProgramWeek[];
}

export const WORKOUT_PROGRAMS: WorkoutProgram[] = [
  {
    id: 'beginner_full_body',
    name: 'Beginner Full Body',
    emoji: '\u{1F31F}',
    description: 'Perfect for fitness beginners. 3 days/week full body workouts with progressive overload each week.',
    level: 'beginner',
    durationWeeks: 4,
    daysPerWeek: 3,
    goal: 'general_fitness',
    color: '#00E676',
    weeks: [
      {
        week: 1,
        theme: 'Foundation',
        days: [
          {
            day: 1,
            name: 'Full Body A',
            exercises: [
              { name: 'Bodyweight Squat', sets: 3, reps: '12', rest: 60 },
              { name: 'Push-Up (or Knee Push-Up)', sets: 3, reps: '8-10', rest: 60 },
              { name: 'Dumbbell Row', sets: 3, reps: '10', rest: 60 },
              { name: 'Plank', sets: 3, reps: '30s', rest: 45 },
              { name: 'Glute Bridge', sets: 3, reps: '12', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Full Body B',
            exercises: [
              { name: 'Goblet Squat', sets: 3, reps: '10', rest: 60 },
              { name: 'Dumbbell Chest Press', sets: 3, reps: '10', rest: 60 },
              { name: 'Lat Pulldown', sets: 3, reps: '10', rest: 60 },
              { name: 'Dead Bug', sets: 3, reps: '10 each', rest: 45 },
              { name: 'Calf Raises', sets: 3, reps: '15', rest: 30 },
            ],
          },
          {
            day: 3,
            name: 'Full Body C',
            exercises: [
              { name: 'Lunges', sets: 3, reps: '10 each', rest: 60 },
              { name: 'Incline Push-Up', sets: 3, reps: '10', rest: 60 },
              { name: 'Cable Face Pull', sets: 3, reps: '12', rest: 45 },
              { name: 'Russian Twist', sets: 3, reps: '15 each', rest: 45 },
              { name: 'Superman Hold', sets: 3, reps: '30s', rest: 45 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: 'Building Volume',
        days: [
          {
            day: 1,
            name: 'Full Body A',
            exercises: [
              { name: 'Bodyweight Squat', sets: 3, reps: '15', rest: 60 },
              { name: 'Push-Up (or Knee Push-Up)', sets: 3, reps: '10-12', rest: 60 },
              { name: 'Dumbbell Row', sets: 3, reps: '12', rest: 60 },
              { name: 'Plank', sets: 3, reps: '40s', rest: 45 },
              { name: 'Glute Bridge', sets: 3, reps: '15', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Full Body B',
            exercises: [
              { name: 'Goblet Squat', sets: 3, reps: '12', rest: 60 },
              { name: 'Dumbbell Chest Press', sets: 3, reps: '12', rest: 60 },
              { name: 'Lat Pulldown', sets: 3, reps: '12', rest: 60 },
              { name: 'Dead Bug', sets: 3, reps: '12 each', rest: 45 },
              { name: 'Calf Raises', sets: 3, reps: '18', rest: 30 },
            ],
          },
          {
            day: 3,
            name: 'Full Body C',
            exercises: [
              { name: 'Lunges', sets: 3, reps: '12 each', rest: 60 },
              { name: 'Incline Push-Up', sets: 3, reps: '12', rest: 60 },
              { name: 'Cable Face Pull', sets: 3, reps: '15', rest: 45 },
              { name: 'Russian Twist', sets: 3, reps: '18 each', rest: 45 },
              { name: 'Superman Hold', sets: 3, reps: '40s', rest: 45 },
            ],
          },
        ],
      },
      {
        week: 3,
        theme: 'Adding Sets',
        days: [
          {
            day: 1,
            name: 'Full Body A',
            exercises: [
              { name: 'Bodyweight Squat', sets: 4, reps: '15', rest: 60 },
              { name: 'Push-Up', sets: 4, reps: '10-12', rest: 60 },
              { name: 'Dumbbell Row', sets: 4, reps: '12', rest: 60 },
              { name: 'Plank', sets: 3, reps: '45s', rest: 45 },
              { name: 'Glute Bridge', sets: 4, reps: '15', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Full Body B',
            exercises: [
              { name: 'Goblet Squat', sets: 4, reps: '12', rest: 60 },
              { name: 'Dumbbell Chest Press', sets: 4, reps: '12', rest: 60 },
              { name: 'Lat Pulldown', sets: 4, reps: '12', rest: 60 },
              { name: 'Dead Bug', sets: 4, reps: '12 each', rest: 45 },
              { name: 'Calf Raises', sets: 4, reps: '18', rest: 30 },
            ],
          },
          {
            day: 3,
            name: 'Full Body C',
            exercises: [
              { name: 'Lunges', sets: 4, reps: '12 each', rest: 60 },
              { name: 'Push-Up', sets: 4, reps: '12', rest: 60 },
              { name: 'Cable Face Pull', sets: 4, reps: '15', rest: 45 },
              { name: 'Russian Twist', sets: 4, reps: '18 each', rest: 45 },
              { name: 'Superman Hold', sets: 3, reps: '45s', rest: 45 },
            ],
          },
        ],
      },
      {
        week: 4,
        theme: 'Peak Performance',
        days: [
          {
            day: 1,
            name: 'Full Body A',
            exercises: [
              { name: 'Bodyweight Squat', sets: 4, reps: '18', rest: 60 },
              { name: 'Push-Up', sets: 4, reps: '12-15', rest: 60 },
              { name: 'Dumbbell Row', sets: 4, reps: '14', rest: 60 },
              { name: 'Plank', sets: 3, reps: '60s', rest: 45 },
              { name: 'Single-Leg Glute Bridge', sets: 4, reps: '10 each', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Full Body B',
            exercises: [
              { name: 'Goblet Squat', sets: 4, reps: '14', rest: 60 },
              { name: 'Dumbbell Chest Press', sets: 4, reps: '14', rest: 60 },
              { name: 'Lat Pulldown', sets: 4, reps: '14', rest: 60 },
              { name: 'Dead Bug', sets: 4, reps: '14 each', rest: 45 },
              { name: 'Single-Leg Calf Raises', sets: 4, reps: '12 each', rest: 30 },
            ],
          },
          {
            day: 3,
            name: 'Full Body C',
            exercises: [
              { name: 'Bulgarian Split Squat', sets: 4, reps: '10 each', rest: 60 },
              { name: 'Diamond Push-Up', sets: 4, reps: '10', rest: 60 },
              { name: 'Cable Face Pull', sets: 4, reps: '18', rest: 45 },
              { name: 'Bicycle Crunch', sets: 4, reps: '20 each', rest: 45 },
              { name: 'Superman Hold', sets: 3, reps: '60s', rest: 45 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ppl_intermediate',
    name: 'Push Pull Legs',
    emoji: '\u{1F4AA}',
    description: 'Classic PPL split for intermediate lifters. 6 days/week to maximize muscle growth.',
    level: 'intermediate',
    durationWeeks: 6,
    daysPerWeek: 6,
    goal: 'muscle_building',
    color: '#FF6B35',
    weeks: [
      {
        week: 1,
        theme: 'Base Volume',
        days: [
          {
            day: 1,
            name: 'Push A',
            exercises: [
              { name: 'Barbell Bench Press', sets: 4, reps: '8', rest: 120 },
              { name: 'Overhead Press', sets: 3, reps: '10', rest: 90 },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10', rest: 90 },
              { name: 'Lateral Raise', sets: 3, reps: '15', rest: 60 },
              { name: 'Tricep Pushdown', sets: 3, reps: '12', rest: 60 },
              { name: 'Overhead Tricep Extension', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Pull A',
            exercises: [
              { name: 'Barbell Deadlift', sets: 4, reps: '6', rest: 150 },
              { name: 'Pull-Up (or Lat Pulldown)', sets: 4, reps: '8', rest: 90 },
              { name: 'Barbell Row', sets: 3, reps: '10', rest: 90 },
              { name: 'Cable Face Pull', sets: 3, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: 60 },
              { name: 'Hammer Curl', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Legs A',
            exercises: [
              { name: 'Barbell Back Squat', sets: 4, reps: '8', rest: 150 },
              { name: 'Romanian Deadlift', sets: 3, reps: '10', rest: 90 },
              { name: 'Leg Press', sets: 3, reps: '12', rest: 90 },
              { name: 'Leg Curl', sets: 3, reps: '12', rest: 60 },
              { name: 'Calf Raises', sets: 4, reps: '15', rest: 45 },
              { name: 'Plank', sets: 3, reps: '45s', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Push B',
            exercises: [
              { name: 'Dumbbell Bench Press', sets: 4, reps: '10', rest: 90 },
              { name: 'Seated Dumbbell Press', sets: 3, reps: '10', rest: 90 },
              { name: 'Cable Flye', sets: 3, reps: '12', rest: 60 },
              { name: 'Cable Lateral Raise', sets: 3, reps: '15', rest: 60 },
              { name: 'Dips', sets: 3, reps: '10', rest: 90 },
              { name: 'Skull Crusher', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 5,
            name: 'Pull B',
            exercises: [
              { name: 'Chest-Supported Row', sets: 4, reps: '10', rest: 90 },
              { name: 'Lat Pulldown (wide grip)', sets: 3, reps: '10', rest: 90 },
              { name: 'Cable Row', sets: 3, reps: '12', rest: 60 },
              { name: 'Reverse Flye', sets: 3, reps: '15', rest: 60 },
              { name: 'Incline Dumbbell Curl', sets: 3, reps: '10', rest: 60 },
              { name: 'Cable Curl', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 6,
            name: 'Legs B',
            exercises: [
              { name: 'Front Squat', sets: 4, reps: '8', rest: 120 },
              { name: 'Hip Thrust', sets: 3, reps: '12', rest: 90 },
              { name: 'Walking Lunge', sets: 3, reps: '12 each', rest: 90 },
              { name: 'Leg Extension', sets: 3, reps: '15', rest: 60 },
              { name: 'Seated Calf Raise', sets: 4, reps: '15', rest: 45 },
              { name: 'Hanging Leg Raise', sets: 3, reps: '12', rest: 60 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: 'Intensity Ramp',
        days: [
          {
            day: 1,
            name: 'Push A',
            exercises: [
              { name: 'Barbell Bench Press', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Overhead Press', sets: 4, reps: '8', rest: 90 },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10', rest: 90 },
              { name: 'Lateral Raise', sets: 4, reps: '15', rest: 60 },
              { name: 'Tricep Pushdown', sets: 3, reps: '12', rest: 60 },
              { name: 'Overhead Tricep Extension', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Pull A',
            exercises: [
              { name: 'Barbell Deadlift', sets: 4, reps: '5', rest: 180 },
              { name: 'Weighted Pull-Up', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Barbell Row', sets: 4, reps: '8', rest: 90 },
              { name: 'Cable Face Pull', sets: 4, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: 60 },
              { name: 'Hammer Curl', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Legs A',
            exercises: [
              { name: 'Barbell Back Squat', sets: 4, reps: '6-8', rest: 150 },
              { name: 'Romanian Deadlift', sets: 4, reps: '8', rest: 90 },
              { name: 'Leg Press', sets: 3, reps: '12', rest: 90 },
              { name: 'Leg Curl', sets: 4, reps: '10', rest: 60 },
              { name: 'Calf Raises', sets: 4, reps: '15', rest: 45 },
              { name: 'Ab Wheel Rollout', sets: 3, reps: '10', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'Push B',
            exercises: [
              { name: 'Dumbbell Bench Press', sets: 4, reps: '10', rest: 90 },
              { name: 'Seated Dumbbell Press', sets: 4, reps: '8', rest: 90 },
              { name: 'Cable Flye', sets: 3, reps: '12', rest: 60 },
              { name: 'Cable Lateral Raise', sets: 4, reps: '15', rest: 60 },
              { name: 'Dips', sets: 3, reps: '12', rest: 90 },
              { name: 'Skull Crusher', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 5,
            name: 'Pull B',
            exercises: [
              { name: 'Chest-Supported Row', sets: 4, reps: '10', rest: 90 },
              { name: 'Lat Pulldown (wide grip)', sets: 4, reps: '10', rest: 90 },
              { name: 'Cable Row', sets: 3, reps: '12', rest: 60 },
              { name: 'Reverse Flye', sets: 4, reps: '15', rest: 60 },
              { name: 'Incline Dumbbell Curl', sets: 3, reps: '10', rest: 60 },
              { name: 'Cable Curl', sets: 3, reps: '15', rest: 60 },
            ],
          },
          {
            day: 6,
            name: 'Legs B',
            exercises: [
              { name: 'Front Squat', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Hip Thrust', sets: 4, reps: '10', rest: 90 },
              { name: 'Walking Lunge', sets: 3, reps: '14 each', rest: 90 },
              { name: 'Leg Extension', sets: 3, reps: '15', rest: 60 },
              { name: 'Seated Calf Raise', sets: 4, reps: '18', rest: 45 },
              { name: 'Hanging Leg Raise', sets: 3, reps: '14', rest: 60 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'hiit_fat_loss',
    name: 'HIIT Fat Burner',
    emoji: '\u{1F525}',
    description: 'High-intensity intervals for maximum fat loss. 4 days/week with circuits and supersets.',
    level: 'intermediate',
    durationWeeks: 4,
    daysPerWeek: 4,
    goal: 'fat_loss',
    color: '#FF5252',
    weeks: [
      {
        week: 1,
        theme: 'Ignition Phase',
        days: [
          {
            day: 1,
            name: 'Upper Body HIIT',
            exercises: [
              { name: 'Burpees', sets: 4, reps: '30s work / 30s rest', rest: 30 },
              { name: 'Push-Up to Renegade Row', sets: 4, reps: '30s work / 30s rest', rest: 30 },
              { name: 'Mountain Climbers', sets: 4, reps: '30s work / 30s rest', rest: 30 },
              { name: 'Dumbbell Thrusters', sets: 4, reps: '30s work / 30s rest', rest: 30 },
              { name: 'Plank Shoulder Taps', sets: 4, reps: '30s work / 30s rest', rest: 30 },
            ],
          },
          {
            day: 2,
            name: 'Lower Body HIIT',
            exercises: [
              { name: 'Jump Squats', sets: 4, reps: '30s work / 30s rest', rest: 30 },
              { name: 'Alternating Lunges', sets: 4, reps: '30s work / 30s rest', rest: 30 },
              { name: 'High Knees', sets: 4, reps: '30s work / 30s rest', rest: 30 },
              { name: 'Kettlebell Swings', sets: 4, reps: '30s work / 30s rest', rest: 30 },
              { name: 'Box Jumps', sets: 4, reps: '30s work / 30s rest', rest: 30 },
            ],
          },
          {
            day: 3,
            name: 'Full Body Circuit',
            exercises: [
              { name: 'Battle Ropes', sets: 3, reps: '40s work / 20s rest', rest: 20 },
              { name: 'Squat to Press', sets: 3, reps: '40s work / 20s rest', rest: 20 },
              { name: 'Rowing Machine Sprint', sets: 3, reps: '40s work / 20s rest', rest: 20 },
              { name: 'Plank Jacks', sets: 3, reps: '40s work / 20s rest', rest: 20 },
              { name: 'Dumbbell Clean & Press', sets: 3, reps: '40s work / 20s rest', rest: 20 },
            ],
          },
          {
            day: 4,
            name: 'Tabata Finisher',
            exercises: [
              { name: 'Sprints (treadmill or outdoor)', sets: 8, reps: '20s sprint / 10s rest', rest: 10 },
              { name: 'Burpee Broad Jumps', sets: 4, reps: '20s work / 10s rest', rest: 10 },
              { name: 'Skater Hops', sets: 4, reps: '20s work / 10s rest', rest: 10 },
              { name: 'V-Ups', sets: 4, reps: '20s work / 10s rest', rest: 10 },
              { name: 'Jump Rope', sets: 4, reps: '20s work / 10s rest', rest: 10 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: 'Metabolic Overdrive',
        days: [
          {
            day: 1,
            name: 'Upper Body HIIT',
            exercises: [
              { name: 'Burpees', sets: 5, reps: '35s work / 25s rest', rest: 25 },
              { name: 'Push-Up to Renegade Row', sets: 5, reps: '35s work / 25s rest', rest: 25 },
              { name: 'Mountain Climbers', sets: 5, reps: '35s work / 25s rest', rest: 25 },
              { name: 'Dumbbell Thrusters', sets: 5, reps: '35s work / 25s rest', rest: 25 },
              { name: 'Plank Shoulder Taps', sets: 5, reps: '35s work / 25s rest', rest: 25 },
            ],
          },
          {
            day: 2,
            name: 'Lower Body HIIT',
            exercises: [
              { name: 'Jump Squats', sets: 5, reps: '35s work / 25s rest', rest: 25 },
              { name: 'Alternating Lunges', sets: 5, reps: '35s work / 25s rest', rest: 25 },
              { name: 'High Knees', sets: 5, reps: '35s work / 25s rest', rest: 25 },
              { name: 'Kettlebell Swings', sets: 5, reps: '35s work / 25s rest', rest: 25 },
              { name: 'Tuck Jumps', sets: 5, reps: '35s work / 25s rest', rest: 25 },
            ],
          },
          {
            day: 3,
            name: 'Full Body Circuit',
            exercises: [
              { name: 'Battle Ropes', sets: 4, reps: '40s work / 20s rest', rest: 20 },
              { name: 'Squat to Press', sets: 4, reps: '40s work / 20s rest', rest: 20 },
              { name: 'Rowing Machine Sprint', sets: 4, reps: '40s work / 20s rest', rest: 20 },
              { name: 'Plank Jacks', sets: 4, reps: '40s work / 20s rest', rest: 20 },
              { name: 'Dumbbell Clean & Press', sets: 4, reps: '40s work / 20s rest', rest: 20 },
            ],
          },
          {
            day: 4,
            name: 'Tabata Finisher',
            exercises: [
              { name: 'Sprints (treadmill or outdoor)', sets: 8, reps: '20s sprint / 10s rest', rest: 10 },
              { name: 'Burpee Broad Jumps', sets: 6, reps: '20s work / 10s rest', rest: 10 },
              { name: 'Skater Hops', sets: 6, reps: '20s work / 10s rest', rest: 10 },
              { name: 'V-Ups', sets: 6, reps: '20s work / 10s rest', rest: 10 },
              { name: 'Jump Rope', sets: 6, reps: '20s work / 10s rest', rest: 10 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'strength_5x5',
    name: 'Strength 5x5',
    emoji: '\u{1F3CB}\u{FE0F}',
    description: 'Build raw strength with compound movements. 3 days/week with simple progressive overload.',
    level: 'intermediate',
    durationWeeks: 8,
    daysPerWeek: 3,
    goal: 'strength',
    color: '#00D4FF',
    weeks: [
      {
        week: 1,
        theme: 'Starting Weights',
        days: [
          {
            day: 1,
            name: 'Workout A',
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '5', rest: 180 },
              { name: 'Barbell Bench Press', sets: 5, reps: '5', rest: 180 },
              { name: 'Barbell Row', sets: 5, reps: '5', rest: 180 },
            ],
          },
          {
            day: 2,
            name: 'Workout B',
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '5', rest: 180 },
              { name: 'Overhead Press', sets: 5, reps: '5', rest: 180 },
              { name: 'Barbell Deadlift', sets: 1, reps: '5', rest: 180 },
            ],
          },
          {
            day: 3,
            name: 'Workout A',
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '5', rest: 180 },
              { name: 'Barbell Bench Press', sets: 5, reps: '5', rest: 180 },
              { name: 'Barbell Row', sets: 5, reps: '5', rest: 180 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: 'First Increase (+5 lbs)',
        days: [
          {
            day: 1,
            name: 'Workout B',
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '5', rest: 180 },
              { name: 'Overhead Press', sets: 5, reps: '5', rest: 180 },
              { name: 'Barbell Deadlift', sets: 1, reps: '5', rest: 180 },
            ],
          },
          {
            day: 2,
            name: 'Workout A',
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '5', rest: 180 },
              { name: 'Barbell Bench Press', sets: 5, reps: '5', rest: 180 },
              { name: 'Barbell Row', sets: 5, reps: '5', rest: 180 },
            ],
          },
          {
            day: 3,
            name: 'Workout B',
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '5', rest: 180 },
              { name: 'Overhead Press', sets: 5, reps: '5', rest: 180 },
              { name: 'Barbell Deadlift', sets: 1, reps: '5', rest: 180 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'yoga_flexibility',
    name: 'Yoga & Flexibility',
    emoji: '\u{1F9D8}',
    description: 'Improve flexibility and mindfulness. 5 days/week, 20 min sessions for all levels.',
    level: 'beginner',
    durationWeeks: 4,
    daysPerWeek: 5,
    goal: 'flexibility',
    color: '#A78BFA',
    weeks: [
      {
        week: 1,
        theme: 'Gentle Awakening',
        days: [
          {
            day: 1,
            name: 'Morning Flow',
            exercises: [
              { name: 'Cat-Cow Stretch', sets: 1, reps: '10 breaths', rest: 0 },
              { name: 'Downward Dog', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Low Lunge (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Standing Forward Fold', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Child\'s Pose', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
          {
            day: 2,
            name: 'Hip Opener',
            exercises: [
              { name: 'Butterfly Stretch', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Pigeon Pose (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Lizard Pose (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Happy Baby', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Supine Twist (each side)', sets: 1, reps: '45s hold', rest: 0 },
            ],
          },
          {
            day: 3,
            name: 'Spine & Shoulders',
            exercises: [
              { name: 'Thread the Needle (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Eagle Arms (each side)', sets: 1, reps: '30s hold', rest: 0 },
              { name: 'Seated Twist (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Bridge Pose', sets: 3, reps: '30s hold', rest: 15 },
              { name: 'Corpse Pose (Savasana)', sets: 1, reps: '3 min', rest: 0 },
            ],
          },
          {
            day: 4,
            name: 'Hamstring Focus',
            exercises: [
              { name: 'Standing Forward Fold', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Seated Forward Fold', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Pyramid Pose (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Supine Hamstring Stretch (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Wide-Leg Forward Fold', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
          {
            day: 5,
            name: 'Restorative',
            exercises: [
              { name: 'Supported Child\'s Pose', sets: 1, reps: '3 min', rest: 0 },
              { name: 'Legs Up The Wall', sets: 1, reps: '5 min', rest: 0 },
              { name: 'Reclined Butterfly', sets: 1, reps: '3 min', rest: 0 },
              { name: 'Supported Fish Pose', sets: 1, reps: '3 min', rest: 0 },
              { name: 'Savasana with Breath Focus', sets: 1, reps: '5 min', rest: 0 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: 'Deepening Practice',
        days: [
          {
            day: 1,
            name: 'Sun Salutation Flow',
            exercises: [
              { name: 'Sun Salutation A', sets: 5, reps: '1 round', rest: 0 },
              { name: 'Sun Salutation B', sets: 3, reps: '1 round', rest: 0 },
              { name: 'Warrior I (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Warrior II (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Standing Forward Fold', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
          {
            day: 2,
            name: 'Deep Hip Opener',
            exercises: [
              { name: 'Pigeon Pose (each side)', sets: 1, reps: '90s hold', rest: 0 },
              { name: 'Frog Pose', sets: 1, reps: '90s hold', rest: 0 },
              { name: 'Lizard Pose (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Fire Log Pose (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Supine Twist (each side)', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
          {
            day: 3,
            name: 'Balance & Core',
            exercises: [
              { name: 'Tree Pose (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Warrior III (each side)', sets: 1, reps: '30s hold', rest: 0 },
              { name: 'Boat Pose', sets: 3, reps: '30s hold', rest: 15 },
              { name: 'Side Plank (each side)', sets: 1, reps: '30s hold', rest: 0 },
              { name: 'Crow Pose (attempts)', sets: 3, reps: '15s hold', rest: 15 },
            ],
          },
          {
            day: 4,
            name: 'Backbend Flow',
            exercises: [
              { name: 'Cobra Pose', sets: 3, reps: '30s hold', rest: 10 },
              { name: 'Upward Dog', sets: 3, reps: '20s hold', rest: 10 },
              { name: 'Camel Pose', sets: 2, reps: '30s hold', rest: 15 },
              { name: 'Bridge Pose', sets: 3, reps: '45s hold', rest: 15 },
              { name: 'Child\'s Pose (counter stretch)', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
          {
            day: 5,
            name: 'Yin Restorative',
            exercises: [
              { name: 'Supported Child\'s Pose', sets: 1, reps: '4 min', rest: 0 },
              { name: 'Legs Up The Wall', sets: 1, reps: '5 min', rest: 0 },
              { name: 'Reclined Butterfly', sets: 1, reps: '4 min', rest: 0 },
              { name: 'Supported Fish Pose', sets: 1, reps: '4 min', rest: 0 },
              { name: 'Savasana with Body Scan', sets: 1, reps: '5 min', rest: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ppl_hypertrophy',
    name: 'Push/Pull/Legs (PPL)',
    emoji: '\u{1F4AA}',
    description: 'Classic 6-day hypertrophy split with progressive overload. Foundation phase builds to high-volume intensity work over 6 weeks.',
    level: 'intermediate',
    durationWeeks: 6,
    daysPerWeek: 6,
    goal: 'hypertrophy',
    color: '#FF6B6B',
    weeks: [
      {
        week: 1,
        theme: 'Foundation (3 sets)',
        days: [
          {
            day: 1,
            name: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 3, reps: '8-10', rest: 120 },
              { name: 'Overhead Press', sets: 3, reps: '8-10', rest: 90 },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: 90 },
              { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: 60 },
              { name: 'Tricep Pushdown', sets: 3, reps: '12', rest: 60 },
              { name: 'Overhead Extension', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 3, reps: '5-6', rest: 150 },
              { name: 'Barbell Row', sets: 3, reps: '8-10', rest: 90 },
              { name: 'Pull-Ups', sets: 3, reps: '8-10', rest: 90 },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: 60 },
              { name: 'Hammer Curl', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Legs',
            exercises: [
              { name: 'Squat', sets: 3, reps: '8-10', rest: 150 },
              { name: 'Romanian Deadlift', sets: 3, reps: '10', rest: 90 },
              { name: 'Leg Press', sets: 3, reps: '12', rest: 90 },
              { name: 'Leg Curl', sets: 3, reps: '12', rest: 60 },
              { name: 'Leg Extension', sets: 3, reps: '12', rest: 60 },
              { name: 'Calf Raises', sets: 3, reps: '15', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 3, reps: '8-10', rest: 120 },
              { name: 'Overhead Press', sets: 3, reps: '8-10', rest: 90 },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: 90 },
              { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: 60 },
              { name: 'Tricep Pushdown', sets: 3, reps: '12', rest: 60 },
              { name: 'Overhead Extension', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 5,
            name: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 3, reps: '5-6', rest: 150 },
              { name: 'Barbell Row', sets: 3, reps: '8-10', rest: 90 },
              { name: 'Pull-Ups', sets: 3, reps: '8-10', rest: 90 },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: 60 },
              { name: 'Hammer Curl', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 6,
            name: 'Legs',
            exercises: [
              { name: 'Squat', sets: 3, reps: '8-10', rest: 150 },
              { name: 'Romanian Deadlift', sets: 3, reps: '10', rest: 90 },
              { name: 'Leg Press', sets: 3, reps: '12', rest: 90 },
              { name: 'Leg Curl', sets: 3, reps: '12', rest: 60 },
              { name: 'Leg Extension', sets: 3, reps: '12', rest: 60 },
              { name: 'Calf Raises', sets: 3, reps: '15', rest: 45 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: 'Foundation (3 sets, progressive)',
        days: [
          {
            day: 1,
            name: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 3, reps: '10', rest: 120 },
              { name: 'Overhead Press', sets: 3, reps: '10', rest: 90 },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '12', rest: 90 },
              { name: 'Lateral Raises', sets: 3, reps: '15', rest: 60 },
              { name: 'Tricep Pushdown', sets: 3, reps: '14', rest: 60 },
              { name: 'Overhead Extension', sets: 3, reps: '14', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 3, reps: '6', rest: 150 },
              { name: 'Barbell Row', sets: 3, reps: '10', rest: 90 },
              { name: 'Pull-Ups', sets: 3, reps: '10', rest: 90 },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 3, reps: '12', rest: 60 },
              { name: 'Hammer Curl', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Legs',
            exercises: [
              { name: 'Squat', sets: 3, reps: '10', rest: 150 },
              { name: 'Romanian Deadlift', sets: 3, reps: '12', rest: 90 },
              { name: 'Leg Press', sets: 3, reps: '14', rest: 90 },
              { name: 'Leg Curl', sets: 3, reps: '14', rest: 60 },
              { name: 'Leg Extension', sets: 3, reps: '14', rest: 60 },
              { name: 'Calf Raises', sets: 3, reps: '18', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 3, reps: '10', rest: 120 },
              { name: 'Overhead Press', sets: 3, reps: '10', rest: 90 },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '12', rest: 90 },
              { name: 'Lateral Raises', sets: 3, reps: '15', rest: 60 },
              { name: 'Tricep Pushdown', sets: 3, reps: '14', rest: 60 },
              { name: 'Overhead Extension', sets: 3, reps: '14', rest: 60 },
            ],
          },
          {
            day: 5,
            name: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 3, reps: '6', rest: 150 },
              { name: 'Barbell Row', sets: 3, reps: '10', rest: 90 },
              { name: 'Pull-Ups', sets: 3, reps: '10', rest: 90 },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 3, reps: '12', rest: 60 },
              { name: 'Hammer Curl', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 6,
            name: 'Legs',
            exercises: [
              { name: 'Squat', sets: 3, reps: '10', rest: 150 },
              { name: 'Romanian Deadlift', sets: 3, reps: '12', rest: 90 },
              { name: 'Leg Press', sets: 3, reps: '14', rest: 90 },
              { name: 'Leg Curl', sets: 3, reps: '14', rest: 60 },
              { name: 'Leg Extension', sets: 3, reps: '14', rest: 60 },
              { name: 'Calf Raises', sets: 3, reps: '18', rest: 45 },
            ],
          },
        ],
      },
      {
        week: 3,
        theme: 'Volume Phase (4 sets)',
        days: [
          {
            day: 1,
            name: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '8-10', rest: 120 },
              { name: 'Overhead Press', sets: 4, reps: '8-10', rest: 90 },
              { name: 'Incline Dumbbell Press', sets: 4, reps: '10-12', rest: 90 },
              { name: 'Lateral Raises', sets: 4, reps: '12-15', rest: 60 },
              { name: 'Tricep Pushdown', sets: 4, reps: '12', rest: 60 },
              { name: 'Overhead Extension', sets: 4, reps: '12', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 4, reps: '5', rest: 150 },
              { name: 'Barbell Row', sets: 4, reps: '8-10', rest: 90 },
              { name: 'Pull-Ups', sets: 4, reps: '8-10', rest: 90 },
              { name: 'Face Pulls', sets: 4, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 4, reps: '10', rest: 60 },
              { name: 'Hammer Curl', sets: 4, reps: '12', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Legs',
            exercises: [
              { name: 'Squat', sets: 4, reps: '8-10', rest: 150 },
              { name: 'Romanian Deadlift', sets: 4, reps: '10', rest: 90 },
              { name: 'Leg Press', sets: 4, reps: '12', rest: 90 },
              { name: 'Leg Curl', sets: 4, reps: '12', rest: 60 },
              { name: 'Leg Extension', sets: 4, reps: '12', rest: 60 },
              { name: 'Calf Raises', sets: 4, reps: '15', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '8-10', rest: 120 },
              { name: 'Overhead Press', sets: 4, reps: '8-10', rest: 90 },
              { name: 'Incline Dumbbell Press', sets: 4, reps: '10-12', rest: 90 },
              { name: 'Lateral Raises', sets: 4, reps: '12-15', rest: 60 },
              { name: 'Tricep Pushdown', sets: 4, reps: '12', rest: 60 },
              { name: 'Overhead Extension', sets: 4, reps: '12', rest: 60 },
            ],
          },
          {
            day: 5,
            name: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 4, reps: '5', rest: 150 },
              { name: 'Barbell Row', sets: 4, reps: '8-10', rest: 90 },
              { name: 'Pull-Ups', sets: 4, reps: '8-10', rest: 90 },
              { name: 'Face Pulls', sets: 4, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 4, reps: '10', rest: 60 },
              { name: 'Hammer Curl', sets: 4, reps: '12', rest: 60 },
            ],
          },
          {
            day: 6,
            name: 'Legs',
            exercises: [
              { name: 'Squat', sets: 4, reps: '8-10', rest: 150 },
              { name: 'Romanian Deadlift', sets: 4, reps: '10', rest: 90 },
              { name: 'Leg Press', sets: 4, reps: '12', rest: 90 },
              { name: 'Leg Curl', sets: 4, reps: '12', rest: 60 },
              { name: 'Leg Extension', sets: 4, reps: '12', rest: 60 },
              { name: 'Calf Raises', sets: 4, reps: '15', rest: 45 },
            ],
          },
        ],
      },
      {
        week: 4,
        theme: 'Volume Phase (4 sets, progressive)',
        days: [
          {
            day: 1,
            name: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '10', rest: 120 },
              { name: 'Overhead Press', sets: 4, reps: '10', rest: 90 },
              { name: 'Incline Dumbbell Press', sets: 4, reps: '12', rest: 90 },
              { name: 'Lateral Raises', sets: 4, reps: '15', rest: 60 },
              { name: 'Tricep Pushdown', sets: 4, reps: '14', rest: 60 },
              { name: 'Overhead Extension', sets: 4, reps: '14', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 4, reps: '5', rest: 150 },
              { name: 'Barbell Row', sets: 4, reps: '10', rest: 90 },
              { name: 'Pull-Ups', sets: 4, reps: '10', rest: 90 },
              { name: 'Face Pulls', sets: 4, reps: '18', rest: 60 },
              { name: 'Barbell Curl', sets: 4, reps: '12', rest: 60 },
              { name: 'Hammer Curl', sets: 4, reps: '14', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Legs',
            exercises: [
              { name: 'Squat', sets: 4, reps: '10', rest: 150 },
              { name: 'Romanian Deadlift', sets: 4, reps: '12', rest: 90 },
              { name: 'Leg Press', sets: 4, reps: '14', rest: 90 },
              { name: 'Leg Curl', sets: 4, reps: '14', rest: 60 },
              { name: 'Leg Extension', sets: 4, reps: '14', rest: 60 },
              { name: 'Calf Raises', sets: 4, reps: '18', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '10', rest: 120 },
              { name: 'Overhead Press', sets: 4, reps: '10', rest: 90 },
              { name: 'Incline Dumbbell Press', sets: 4, reps: '12', rest: 90 },
              { name: 'Lateral Raises', sets: 4, reps: '15', rest: 60 },
              { name: 'Tricep Pushdown', sets: 4, reps: '14', rest: 60 },
              { name: 'Overhead Extension', sets: 4, reps: '14', rest: 60 },
            ],
          },
          {
            day: 5,
            name: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 4, reps: '5', rest: 150 },
              { name: 'Barbell Row', sets: 4, reps: '10', rest: 90 },
              { name: 'Pull-Ups', sets: 4, reps: '10', rest: 90 },
              { name: 'Face Pulls', sets: 4, reps: '18', rest: 60 },
              { name: 'Barbell Curl', sets: 4, reps: '12', rest: 60 },
              { name: 'Hammer Curl', sets: 4, reps: '14', rest: 60 },
            ],
          },
          {
            day: 6,
            name: 'Legs',
            exercises: [
              { name: 'Squat', sets: 4, reps: '10', rest: 150 },
              { name: 'Romanian Deadlift', sets: 4, reps: '12', rest: 90 },
              { name: 'Leg Press', sets: 4, reps: '14', rest: 90 },
              { name: 'Leg Curl', sets: 4, reps: '14', rest: 60 },
              { name: 'Leg Extension', sets: 4, reps: '14', rest: 60 },
              { name: 'Calf Raises', sets: 4, reps: '18', rest: 45 },
            ],
          },
        ],
      },
      {
        week: 5,
        theme: 'Intensity Phase (4 sets, heavier)',
        days: [
          {
            day: 1,
            name: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '6-8', rest: 150 },
              { name: 'Overhead Press', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Incline Dumbbell Press', sets: 4, reps: '8-10', rest: 90 },
              { name: 'Lateral Raises', sets: 4, reps: '12', rest: 60 },
              { name: 'Tricep Pushdown', sets: 4, reps: '10', rest: 60 },
              { name: 'Overhead Extension', sets: 4, reps: '10', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 4, reps: '4-5', rest: 180 },
              { name: 'Barbell Row', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Pull-Ups', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Face Pulls', sets: 4, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 4, reps: '8', rest: 60 },
              { name: 'Hammer Curl', sets: 4, reps: '10', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Legs',
            exercises: [
              { name: 'Squat', sets: 4, reps: '6-8', rest: 180 },
              { name: 'Romanian Deadlift', sets: 4, reps: '8', rest: 120 },
              { name: 'Leg Press', sets: 4, reps: '10', rest: 90 },
              { name: 'Leg Curl', sets: 4, reps: '10', rest: 60 },
              { name: 'Leg Extension', sets: 4, reps: '10', rest: 60 },
              { name: 'Calf Raises', sets: 4, reps: '12', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '6-8', rest: 150 },
              { name: 'Overhead Press', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Incline Dumbbell Press', sets: 4, reps: '8-10', rest: 90 },
              { name: 'Lateral Raises', sets: 4, reps: '12', rest: 60 },
              { name: 'Tricep Pushdown', sets: 4, reps: '10', rest: 60 },
              { name: 'Overhead Extension', sets: 4, reps: '10', rest: 60 },
            ],
          },
          {
            day: 5,
            name: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 4, reps: '4-5', rest: 180 },
              { name: 'Barbell Row', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Pull-Ups', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Face Pulls', sets: 4, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 4, reps: '8', rest: 60 },
              { name: 'Hammer Curl', sets: 4, reps: '10', rest: 60 },
            ],
          },
          {
            day: 6,
            name: 'Legs',
            exercises: [
              { name: 'Squat', sets: 4, reps: '6-8', rest: 180 },
              { name: 'Romanian Deadlift', sets: 4, reps: '8', rest: 120 },
              { name: 'Leg Press', sets: 4, reps: '10', rest: 90 },
              { name: 'Leg Curl', sets: 4, reps: '10', rest: 60 },
              { name: 'Leg Extension', sets: 4, reps: '10', rest: 60 },
              { name: 'Calf Raises', sets: 4, reps: '12', rest: 45 },
            ],
          },
        ],
      },
      {
        week: 6,
        theme: 'Intensity Phase (peak)',
        days: [
          {
            day: 1,
            name: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '5-6', rest: 180 },
              { name: 'Overhead Press', sets: 4, reps: '5-6', rest: 120 },
              { name: 'Incline Dumbbell Press', sets: 4, reps: '8', rest: 90 },
              { name: 'Lateral Raises', sets: 4, reps: '12', rest: 60 },
              { name: 'Tricep Pushdown', sets: 4, reps: '10', rest: 60 },
              { name: 'Overhead Extension', sets: 4, reps: '10', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 4, reps: '3-4', rest: 180 },
              { name: 'Barbell Row', sets: 4, reps: '6', rest: 120 },
              { name: 'Pull-Ups', sets: 4, reps: '6', rest: 120 },
              { name: 'Face Pulls', sets: 4, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 4, reps: '8', rest: 60 },
              { name: 'Hammer Curl', sets: 4, reps: '10', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Legs',
            exercises: [
              { name: 'Squat', sets: 4, reps: '5-6', rest: 180 },
              { name: 'Romanian Deadlift', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Leg Press', sets: 4, reps: '8', rest: 90 },
              { name: 'Leg Curl', sets: 4, reps: '10', rest: 60 },
              { name: 'Leg Extension', sets: 4, reps: '10', rest: 60 },
              { name: 'Calf Raises', sets: 4, reps: '12', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Push',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '5-6', rest: 180 },
              { name: 'Overhead Press', sets: 4, reps: '5-6', rest: 120 },
              { name: 'Incline Dumbbell Press', sets: 4, reps: '8', rest: 90 },
              { name: 'Lateral Raises', sets: 4, reps: '12', rest: 60 },
              { name: 'Tricep Pushdown', sets: 4, reps: '10', rest: 60 },
              { name: 'Overhead Extension', sets: 4, reps: '10', rest: 60 },
            ],
          },
          {
            day: 5,
            name: 'Pull',
            exercises: [
              { name: 'Deadlift', sets: 4, reps: '3-4', rest: 180 },
              { name: 'Barbell Row', sets: 4, reps: '6', rest: 120 },
              { name: 'Pull-Ups', sets: 4, reps: '6', rest: 120 },
              { name: 'Face Pulls', sets: 4, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 4, reps: '8', rest: 60 },
              { name: 'Hammer Curl', sets: 4, reps: '10', rest: 60 },
            ],
          },
          {
            day: 6,
            name: 'Legs',
            exercises: [
              { name: 'Squat', sets: 4, reps: '5-6', rest: 180 },
              { name: 'Romanian Deadlift', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Leg Press', sets: 4, reps: '8', rest: 90 },
              { name: 'Leg Curl', sets: 4, reps: '10', rest: 60 },
              { name: 'Leg Extension', sets: 4, reps: '10', rest: 60 },
              { name: 'Calf Raises', sets: 4, reps: '12', rest: 45 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'upper_lower_split',
    name: 'Upper/Lower Split',
    emoji: '\u{2195}\u{FE0F}',
    description: 'Balanced 4-day upper/lower split for intermediate lifters focused on building strength with two distinct workout variations.',
    level: 'intermediate',
    durationWeeks: 4,
    daysPerWeek: 4,
    goal: 'strength',
    color: '#4FC3F7',
    weeks: [
      {
        week: 1,
        theme: 'Base Strength',
        days: [
          {
            day: 1,
            name: 'Upper A',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Barbell Row', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Overhead Press', sets: 3, reps: '8-10', rest: 90 },
              { name: 'Pull-Ups', sets: 3, reps: '8-10', rest: 90 },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: 60 },
              { name: 'Tricep Dips', sets: 3, reps: '10', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Lower A',
            exercises: [
              { name: 'Barbell Back Squat', sets: 4, reps: '6-8', rest: 150 },
              { name: 'Romanian Deadlift', sets: 4, reps: '8-10', rest: 120 },
              { name: 'Leg Press', sets: 3, reps: '10-12', rest: 90 },
              { name: 'Calf Raises', sets: 4, reps: '15', rest: 45 },
              { name: 'Plank', sets: 3, reps: '45s', rest: 45 },
            ],
          },
          {
            day: 3,
            name: 'Upper B',
            exercises: [
              { name: 'Incline Dumbbell Press', sets: 4, reps: '8-10', rest: 90 },
              { name: 'Cable Row', sets: 4, reps: '10', rest: 90 },
              { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: 60 },
              { name: 'Chin-Ups', sets: 3, reps: '8-10', rest: 90 },
              { name: 'Skull Crushers', sets: 3, reps: '10-12', rest: 60 },
              { name: 'Hammer Curls', sets: 3, reps: '10-12', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'Lower B',
            exercises: [
              { name: 'Front Squat', sets: 4, reps: '6-8', rest: 150 },
              { name: 'Hip Thrust', sets: 4, reps: '10-12', rest: 90 },
              { name: 'Walking Lunges', sets: 3, reps: '10 each', rest: 90 },
              { name: 'Leg Curl', sets: 3, reps: '12', rest: 60 },
              { name: 'Hanging Leg Raise', sets: 3, reps: '12', rest: 60 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: 'Progressive Overload',
        days: [
          {
            day: 1,
            name: 'Upper A',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '8', rest: 120 },
              { name: 'Barbell Row', sets: 4, reps: '8', rest: 120 },
              { name: 'Overhead Press', sets: 4, reps: '8', rest: 90 },
              { name: 'Pull-Ups', sets: 4, reps: '8', rest: 90 },
              { name: 'Barbell Curl', sets: 3, reps: '12', rest: 60 },
              { name: 'Tricep Dips', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Lower A',
            exercises: [
              { name: 'Barbell Back Squat', sets: 4, reps: '8', rest: 150 },
              { name: 'Romanian Deadlift', sets: 4, reps: '10', rest: 120 },
              { name: 'Leg Press', sets: 4, reps: '10', rest: 90 },
              { name: 'Calf Raises', sets: 4, reps: '18', rest: 45 },
              { name: 'Ab Wheel Rollout', sets: 3, reps: '10', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Upper B',
            exercises: [
              { name: 'Incline Dumbbell Press', sets: 4, reps: '10', rest: 90 },
              { name: 'Cable Row', sets: 4, reps: '12', rest: 90 },
              { name: 'Lateral Raises', sets: 4, reps: '15', rest: 60 },
              { name: 'Chin-Ups', sets: 4, reps: '8', rest: 90 },
              { name: 'Skull Crushers', sets: 3, reps: '12', rest: 60 },
              { name: 'Hammer Curls', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'Lower B',
            exercises: [
              { name: 'Front Squat', sets: 4, reps: '8', rest: 150 },
              { name: 'Hip Thrust', sets: 4, reps: '12', rest: 90 },
              { name: 'Walking Lunges', sets: 3, reps: '12 each', rest: 90 },
              { name: 'Leg Curl', sets: 4, reps: '12', rest: 60 },
              { name: 'Hanging Leg Raise', sets: 3, reps: '14', rest: 60 },
            ],
          },
        ],
      },
      {
        week: 3,
        theme: 'Intensity Increase',
        days: [
          {
            day: 1,
            name: 'Upper A',
            exercises: [
              { name: 'Bench Press', sets: 5, reps: '5', rest: 150 },
              { name: 'Barbell Row', sets: 5, reps: '5', rest: 150 },
              { name: 'Overhead Press', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Weighted Pull-Ups', sets: 4, reps: '6', rest: 120 },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: 60 },
              { name: 'Weighted Dips', sets: 3, reps: '8', rest: 90 },
            ],
          },
          {
            day: 2,
            name: 'Lower A',
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '5', rest: 180 },
              { name: 'Romanian Deadlift', sets: 4, reps: '8', rest: 120 },
              { name: 'Leg Press', sets: 4, reps: '10', rest: 90 },
              { name: 'Calf Raises', sets: 4, reps: '20', rest: 45 },
              { name: 'Plank', sets: 3, reps: '60s', rest: 45 },
            ],
          },
          {
            day: 3,
            name: 'Upper B',
            exercises: [
              { name: 'Incline Dumbbell Press', sets: 4, reps: '8', rest: 90 },
              { name: 'Cable Row', sets: 4, reps: '10', rest: 90 },
              { name: 'Lateral Raises', sets: 4, reps: '15', rest: 60 },
              { name: 'Chin-Ups', sets: 4, reps: '8', rest: 90 },
              { name: 'Skull Crushers', sets: 4, reps: '10', rest: 60 },
              { name: 'Hammer Curls', sets: 4, reps: '10', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'Lower B',
            exercises: [
              { name: 'Front Squat', sets: 4, reps: '6', rest: 150 },
              { name: 'Hip Thrust', sets: 4, reps: '10', rest: 90 },
              { name: 'Walking Lunges', sets: 4, reps: '10 each', rest: 90 },
              { name: 'Leg Curl', sets: 4, reps: '10', rest: 60 },
              { name: 'Hanging Leg Raise', sets: 4, reps: '12', rest: 60 },
            ],
          },
        ],
      },
      {
        week: 4,
        theme: 'Peak Strength',
        days: [
          {
            day: 1,
            name: 'Upper A',
            exercises: [
              { name: 'Bench Press', sets: 5, reps: '3-5', rest: 180 },
              { name: 'Barbell Row', sets: 5, reps: '5', rest: 150 },
              { name: 'Overhead Press', sets: 4, reps: '5-6', rest: 120 },
              { name: 'Weighted Pull-Ups', sets: 4, reps: '5', rest: 120 },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: 60 },
              { name: 'Weighted Dips', sets: 3, reps: '6-8', rest: 90 },
            ],
          },
          {
            day: 2,
            name: 'Lower A',
            exercises: [
              { name: 'Barbell Back Squat', sets: 5, reps: '3-5', rest: 180 },
              { name: 'Romanian Deadlift', sets: 4, reps: '6', rest: 120 },
              { name: 'Leg Press', sets: 4, reps: '8', rest: 90 },
              { name: 'Calf Raises', sets: 4, reps: '20', rest: 45 },
              { name: 'Ab Wheel Rollout', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Upper B',
            exercises: [
              { name: 'Incline Dumbbell Press', sets: 4, reps: '6-8', rest: 120 },
              { name: 'Cable Row', sets: 4, reps: '8', rest: 90 },
              { name: 'Lateral Raises', sets: 4, reps: '12', rest: 60 },
              { name: 'Chin-Ups', sets: 4, reps: '6-8', rest: 90 },
              { name: 'Skull Crushers', sets: 4, reps: '8', rest: 60 },
              { name: 'Hammer Curls', sets: 4, reps: '8', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'Lower B',
            exercises: [
              { name: 'Front Squat', sets: 4, reps: '5', rest: 150 },
              { name: 'Hip Thrust', sets: 4, reps: '8', rest: 90 },
              { name: 'Walking Lunges', sets: 4, reps: '10 each', rest: 90 },
              { name: 'Leg Curl', sets: 4, reps: '10', rest: 60 },
              { name: 'Hanging Leg Raise', sets: 4, reps: '14', rest: 60 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'wendler_531',
    name: '5/3/1 Strength Program',
    emoji: '\u{1F3AF}',
    description: 'Based on Wendler\'s 5/3/1 methodology. 4-week cycles with structured percentage-based progression for advanced lifters.',
    level: 'advanced',
    durationWeeks: 4,
    daysPerWeek: 4,
    goal: 'strength',
    color: '#FF9800',
    weeks: [
      {
        week: 1,
        theme: '5s Week (65% / 75% / 85%)',
        days: [
          {
            day: 1,
            name: 'Squat Day',
            exercises: [
              { name: 'Barbell Back Squat (65%)', sets: 1, reps: '5', rest: 180 },
              { name: 'Barbell Back Squat (75%)', sets: 1, reps: '5', rest: 180 },
              { name: 'Barbell Back Squat (85%)', sets: 1, reps: '5+', rest: 180 },
              { name: 'Leg Press', sets: 3, reps: '10', rest: 90 },
              { name: 'Leg Curl', sets: 3, reps: '12', rest: 60 },
              { name: 'Plank', sets: 3, reps: '45s', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Bench Day',
            exercises: [
              { name: 'Barbell Bench Press (65%)', sets: 1, reps: '5', rest: 180 },
              { name: 'Barbell Bench Press (75%)', sets: 1, reps: '5', rest: 180 },
              { name: 'Barbell Bench Press (85%)', sets: 1, reps: '5+', rest: 180 },
              { name: 'Dumbbell Row', sets: 3, reps: '10', rest: 90 },
              { name: 'Dumbbell Flye', sets: 3, reps: '12', rest: 60 },
              { name: 'Tricep Pushdown', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Deadlift Day',
            exercises: [
              { name: 'Barbell Deadlift (65%)', sets: 1, reps: '5', rest: 180 },
              { name: 'Barbell Deadlift (75%)', sets: 1, reps: '5', rest: 180 },
              { name: 'Barbell Deadlift (85%)', sets: 1, reps: '5+', rest: 180 },
              { name: 'Good Mornings', sets: 3, reps: '10', rest: 90 },
              { name: 'Hanging Leg Raise', sets: 3, reps: '12', rest: 60 },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'OHP Day',
            exercises: [
              { name: 'Overhead Press (65%)', sets: 1, reps: '5', rest: 180 },
              { name: 'Overhead Press (75%)', sets: 1, reps: '5', rest: 180 },
              { name: 'Overhead Press (85%)', sets: 1, reps: '5+', rest: 180 },
              { name: 'Chin-Ups', sets: 3, reps: '8', rest: 90 },
              { name: 'Lateral Raises', sets: 3, reps: '15', rest: 60 },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: 60 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: '3s Week (70% / 80% / 90%)',
        days: [
          {
            day: 1,
            name: 'Squat Day',
            exercises: [
              { name: 'Barbell Back Squat (70%)', sets: 1, reps: '3', rest: 180 },
              { name: 'Barbell Back Squat (80%)', sets: 1, reps: '3', rest: 180 },
              { name: 'Barbell Back Squat (90%)', sets: 1, reps: '3+', rest: 240 },
              { name: 'Leg Press', sets: 3, reps: '10', rest: 90 },
              { name: 'Leg Curl', sets: 3, reps: '12', rest: 60 },
              { name: 'Ab Wheel Rollout', sets: 3, reps: '10', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Bench Day',
            exercises: [
              { name: 'Barbell Bench Press (70%)', sets: 1, reps: '3', rest: 180 },
              { name: 'Barbell Bench Press (80%)', sets: 1, reps: '3', rest: 180 },
              { name: 'Barbell Bench Press (90%)', sets: 1, reps: '3+', rest: 240 },
              { name: 'Dumbbell Row', sets: 4, reps: '8', rest: 90 },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10', rest: 60 },
              { name: 'Skull Crushers', sets: 3, reps: '10', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Deadlift Day',
            exercises: [
              { name: 'Barbell Deadlift (70%)', sets: 1, reps: '3', rest: 180 },
              { name: 'Barbell Deadlift (80%)', sets: 1, reps: '3', rest: 180 },
              { name: 'Barbell Deadlift (90%)', sets: 1, reps: '3+', rest: 240 },
              { name: 'Romanian Deadlift', sets: 3, reps: '8', rest: 90 },
              { name: 'Hanging Leg Raise', sets: 3, reps: '14', rest: 60 },
              { name: 'Hammer Curl', sets: 3, reps: '10', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'OHP Day',
            exercises: [
              { name: 'Overhead Press (70%)', sets: 1, reps: '3', rest: 180 },
              { name: 'Overhead Press (80%)', sets: 1, reps: '3', rest: 180 },
              { name: 'Overhead Press (90%)', sets: 1, reps: '3+', rest: 240 },
              { name: 'Weighted Pull-Ups', sets: 4, reps: '6', rest: 120 },
              { name: 'Lateral Raises', sets: 4, reps: '15', rest: 60 },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: 60 },
            ],
          },
        ],
      },
      {
        week: 3,
        theme: '5/3/1 Week (75% / 85% / 95%)',
        days: [
          {
            day: 1,
            name: 'Squat Day',
            exercises: [
              { name: 'Barbell Back Squat (75%)', sets: 1, reps: '5', rest: 180 },
              { name: 'Barbell Back Squat (85%)', sets: 1, reps: '3', rest: 240 },
              { name: 'Barbell Back Squat (95%)', sets: 1, reps: '1+', rest: 300 },
              { name: 'Pause Squat', sets: 3, reps: '5', rest: 120 },
              { name: 'Leg Extension', sets: 3, reps: '12', rest: 60 },
              { name: 'Plank', sets: 3, reps: '60s', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Bench Day',
            exercises: [
              { name: 'Barbell Bench Press (75%)', sets: 1, reps: '5', rest: 180 },
              { name: 'Barbell Bench Press (85%)', sets: 1, reps: '3', rest: 240 },
              { name: 'Barbell Bench Press (95%)', sets: 1, reps: '1+', rest: 300 },
              { name: 'Close-Grip Bench Press', sets: 3, reps: '8', rest: 90 },
              { name: 'Dumbbell Row', sets: 4, reps: '8', rest: 90 },
              { name: 'Dips', sets: 3, reps: '10', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Deadlift Day',
            exercises: [
              { name: 'Barbell Deadlift (75%)', sets: 1, reps: '5', rest: 180 },
              { name: 'Barbell Deadlift (85%)', sets: 1, reps: '3', rest: 240 },
              { name: 'Barbell Deadlift (95%)', sets: 1, reps: '1+', rest: 300 },
              { name: 'Deficit Deadlift', sets: 3, reps: '5', rest: 120 },
              { name: 'Barbell Row', sets: 3, reps: '8', rest: 90 },
              { name: 'Hanging Leg Raise', sets: 3, reps: '15', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'OHP Day',
            exercises: [
              { name: 'Overhead Press (75%)', sets: 1, reps: '5', rest: 180 },
              { name: 'Overhead Press (85%)', sets: 1, reps: '3', rest: 240 },
              { name: 'Overhead Press (95%)', sets: 1, reps: '1+', rest: 300 },
              { name: 'Push Press', sets: 3, reps: '5', rest: 120 },
              { name: 'Weighted Chin-Ups', sets: 4, reps: '5', rest: 120 },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: 60 },
            ],
          },
        ],
      },
      {
        week: 4,
        theme: 'Deload (40% / 50% / 60%)',
        days: [
          {
            day: 1,
            name: 'Squat Day',
            exercises: [
              { name: 'Barbell Back Squat (40%)', sets: 1, reps: '5', rest: 120 },
              { name: 'Barbell Back Squat (50%)', sets: 1, reps: '5', rest: 120 },
              { name: 'Barbell Back Squat (60%)', sets: 1, reps: '5', rest: 120 },
              { name: 'Leg Press', sets: 2, reps: '10', rest: 60 },
              { name: 'Bodyweight Lunges', sets: 2, reps: '10 each', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Bench Day',
            exercises: [
              { name: 'Barbell Bench Press (40%)', sets: 1, reps: '5', rest: 120 },
              { name: 'Barbell Bench Press (50%)', sets: 1, reps: '5', rest: 120 },
              { name: 'Barbell Bench Press (60%)', sets: 1, reps: '5', rest: 120 },
              { name: 'Dumbbell Row', sets: 2, reps: '10', rest: 60 },
              { name: 'Push-Ups', sets: 2, reps: '15', rest: 45 },
            ],
          },
          {
            day: 3,
            name: 'Deadlift Day',
            exercises: [
              { name: 'Barbell Deadlift (40%)', sets: 1, reps: '5', rest: 120 },
              { name: 'Barbell Deadlift (50%)', sets: 1, reps: '5', rest: 120 },
              { name: 'Barbell Deadlift (60%)', sets: 1, reps: '5', rest: 120 },
              { name: 'Good Mornings', sets: 2, reps: '10', rest: 60 },
              { name: 'Plank', sets: 2, reps: '45s', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'OHP Day',
            exercises: [
              { name: 'Overhead Press (40%)', sets: 1, reps: '5', rest: 120 },
              { name: 'Overhead Press (50%)', sets: 1, reps: '5', rest: 120 },
              { name: 'Overhead Press (60%)', sets: 1, reps: '5', rest: 120 },
              { name: 'Pull-Ups', sets: 2, reps: '8', rest: 60 },
              { name: 'Lateral Raises', sets: 2, reps: '12', rest: 45 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'hiit_circuit_fat_burner',
    name: 'HIIT Fat Burner',
    emoji: '\u{26A1}',
    description: 'Circuit-based HIIT program for fat loss. Progressive work-to-rest ratios over 4 weeks, suitable for beginners to intermediates.',
    level: 'beginner',
    durationWeeks: 4,
    daysPerWeek: 3,
    goal: 'fat_loss',
    color: '#F44336',
    weeks: [
      {
        week: 1,
        theme: '30s Work / 30s Rest, 3 Rounds',
        days: [
          {
            day: 1,
            name: 'Circuit A',
            exercises: [
              { name: 'Burpees', sets: 3, reps: '30s work', rest: 30 },
              { name: 'Mountain Climbers', sets: 3, reps: '30s work', rest: 30 },
              { name: 'Jump Squats', sets: 3, reps: '30s work', rest: 30 },
              { name: 'Push-Ups', sets: 3, reps: '30s work', rest: 30 },
              { name: 'Plank', sets: 3, reps: '30s hold', rest: 30 },
              { name: 'High Knees', sets: 3, reps: '30s work', rest: 30 },
            ],
          },
          {
            day: 2,
            name: 'Circuit B',
            exercises: [
              { name: 'High Knees', sets: 3, reps: '30s work', rest: 30 },
              { name: 'Push-Ups', sets: 3, reps: '30s work', rest: 30 },
              { name: 'Burpees', sets: 3, reps: '30s work', rest: 30 },
              { name: 'Plank', sets: 3, reps: '30s hold', rest: 30 },
              { name: 'Mountain Climbers', sets: 3, reps: '30s work', rest: 30 },
              { name: 'Jump Squats', sets: 3, reps: '30s work', rest: 30 },
            ],
          },
          {
            day: 3,
            name: 'Circuit C',
            exercises: [
              { name: 'Jump Squats', sets: 3, reps: '30s work', rest: 30 },
              { name: 'Burpees', sets: 3, reps: '30s work', rest: 30 },
              { name: 'Plank', sets: 3, reps: '30s hold', rest: 30 },
              { name: 'High Knees', sets: 3, reps: '30s work', rest: 30 },
              { name: 'Push-Ups', sets: 3, reps: '30s work', rest: 30 },
              { name: 'Mountain Climbers', sets: 3, reps: '30s work', rest: 30 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: '35s Work / 25s Rest, 3 Rounds',
        days: [
          {
            day: 1,
            name: 'Circuit A',
            exercises: [
              { name: 'Burpees', sets: 3, reps: '35s work', rest: 25 },
              { name: 'Mountain Climbers', sets: 3, reps: '35s work', rest: 25 },
              { name: 'Jump Squats', sets: 3, reps: '35s work', rest: 25 },
              { name: 'Push-Ups', sets: 3, reps: '35s work', rest: 25 },
              { name: 'Plank', sets: 3, reps: '35s hold', rest: 25 },
              { name: 'High Knees', sets: 3, reps: '35s work', rest: 25 },
            ],
          },
          {
            day: 2,
            name: 'Circuit B',
            exercises: [
              { name: 'High Knees', sets: 3, reps: '35s work', rest: 25 },
              { name: 'Push-Ups', sets: 3, reps: '35s work', rest: 25 },
              { name: 'Burpees', sets: 3, reps: '35s work', rest: 25 },
              { name: 'Plank', sets: 3, reps: '35s hold', rest: 25 },
              { name: 'Mountain Climbers', sets: 3, reps: '35s work', rest: 25 },
              { name: 'Jump Squats', sets: 3, reps: '35s work', rest: 25 },
            ],
          },
          {
            day: 3,
            name: 'Circuit C',
            exercises: [
              { name: 'Jump Squats', sets: 3, reps: '35s work', rest: 25 },
              { name: 'Burpees', sets: 3, reps: '35s work', rest: 25 },
              { name: 'Plank', sets: 3, reps: '35s hold', rest: 25 },
              { name: 'High Knees', sets: 3, reps: '35s work', rest: 25 },
              { name: 'Push-Ups', sets: 3, reps: '35s work', rest: 25 },
              { name: 'Mountain Climbers', sets: 3, reps: '35s work', rest: 25 },
            ],
          },
        ],
      },
      {
        week: 3,
        theme: '40s Work / 20s Rest, 4 Rounds',
        days: [
          {
            day: 1,
            name: 'Circuit A',
            exercises: [
              { name: 'Burpees', sets: 4, reps: '40s work', rest: 20 },
              { name: 'Mountain Climbers', sets: 4, reps: '40s work', rest: 20 },
              { name: 'Jump Squats', sets: 4, reps: '40s work', rest: 20 },
              { name: 'Push-Ups', sets: 4, reps: '40s work', rest: 20 },
              { name: 'Plank', sets: 4, reps: '40s hold', rest: 20 },
              { name: 'High Knees', sets: 4, reps: '40s work', rest: 20 },
            ],
          },
          {
            day: 2,
            name: 'Circuit B',
            exercises: [
              { name: 'High Knees', sets: 4, reps: '40s work', rest: 20 },
              { name: 'Push-Ups', sets: 4, reps: '40s work', rest: 20 },
              { name: 'Burpees', sets: 4, reps: '40s work', rest: 20 },
              { name: 'Plank', sets: 4, reps: '40s hold', rest: 20 },
              { name: 'Mountain Climbers', sets: 4, reps: '40s work', rest: 20 },
              { name: 'Jump Squats', sets: 4, reps: '40s work', rest: 20 },
            ],
          },
          {
            day: 3,
            name: 'Circuit C',
            exercises: [
              { name: 'Jump Squats', sets: 4, reps: '40s work', rest: 20 },
              { name: 'Burpees', sets: 4, reps: '40s work', rest: 20 },
              { name: 'Plank', sets: 4, reps: '40s hold', rest: 20 },
              { name: 'High Knees', sets: 4, reps: '40s work', rest: 20 },
              { name: 'Push-Ups', sets: 4, reps: '40s work', rest: 20 },
              { name: 'Mountain Climbers', sets: 4, reps: '40s work', rest: 20 },
            ],
          },
        ],
      },
      {
        week: 4,
        theme: '45s Work / 15s Rest, 4 Rounds',
        days: [
          {
            day: 1,
            name: 'Circuit A',
            exercises: [
              { name: 'Burpees', sets: 4, reps: '45s work', rest: 15 },
              { name: 'Mountain Climbers', sets: 4, reps: '45s work', rest: 15 },
              { name: 'Jump Squats', sets: 4, reps: '45s work', rest: 15 },
              { name: 'Push-Ups', sets: 4, reps: '45s work', rest: 15 },
              { name: 'Plank', sets: 4, reps: '45s hold', rest: 15 },
              { name: 'High Knees', sets: 4, reps: '45s work', rest: 15 },
            ],
          },
          {
            day: 2,
            name: 'Circuit B',
            exercises: [
              { name: 'High Knees', sets: 4, reps: '45s work', rest: 15 },
              { name: 'Push-Ups', sets: 4, reps: '45s work', rest: 15 },
              { name: 'Burpees', sets: 4, reps: '45s work', rest: 15 },
              { name: 'Plank', sets: 4, reps: '45s hold', rest: 15 },
              { name: 'Mountain Climbers', sets: 4, reps: '45s work', rest: 15 },
              { name: 'Jump Squats', sets: 4, reps: '45s work', rest: 15 },
            ],
          },
          {
            day: 3,
            name: 'Circuit C',
            exercises: [
              { name: 'Jump Squats', sets: 4, reps: '45s work', rest: 15 },
              { name: 'Burpees', sets: 4, reps: '45s work', rest: 15 },
              { name: 'Plank', sets: 4, reps: '45s hold', rest: 15 },
              { name: 'High Knees', sets: 4, reps: '45s work', rest: 15 },
              { name: 'Push-Ups', sets: 4, reps: '45s work', rest: 15 },
              { name: 'Mountain Climbers', sets: 4, reps: '45s work', rest: 15 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'yoga_flexibility_flow',
    name: 'Yoga Flexibility',
    emoji: '\u{1F33F}',
    description: 'Dedicated flexibility program with daily themed sessions. Sun salutations, hip openers, backbends, balance work, and meditation.',
    level: 'beginner',
    durationWeeks: 4,
    daysPerWeek: 5,
    goal: 'flexibility',
    color: '#81C784',
    weeks: [
      {
        week: 1,
        theme: 'Gentle Introduction',
        days: [
          {
            day: 1,
            name: 'Sun Salutation Flow',
            exercises: [
              { name: 'Sun Salutation A', sets: 5, reps: '1 round', rest: 0 },
              { name: 'Sun Salutation B', sets: 3, reps: '1 round', rest: 0 },
              { name: 'Standing Forward Fold', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Downward Dog', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Child\'s Pose', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
          {
            day: 2,
            name: 'Hip Opener Sequence',
            exercises: [
              { name: 'Butterfly Stretch', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Pigeon Pose (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Low Lunge (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Frog Pose', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Happy Baby', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
          {
            day: 3,
            name: 'Backbend & Spine Mobility',
            exercises: [
              { name: 'Cat-Cow Stretch', sets: 1, reps: '10 breaths', rest: 0 },
              { name: 'Cobra Pose', sets: 3, reps: '30s hold', rest: 10 },
              { name: 'Bridge Pose', sets: 3, reps: '30s hold', rest: 15 },
              { name: 'Seated Twist (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Thread the Needle (each side)', sets: 1, reps: '45s hold', rest: 0 },
            ],
          },
          {
            day: 4,
            name: 'Balance & Core',
            exercises: [
              { name: 'Tree Pose (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Warrior III (each side)', sets: 1, reps: '30s hold', rest: 0 },
              { name: 'Boat Pose', sets: 3, reps: '30s hold', rest: 15 },
              { name: 'Side Plank (each side)', sets: 1, reps: '30s hold', rest: 0 },
              { name: 'Eagle Pose (each side)', sets: 1, reps: '30s hold', rest: 0 },
            ],
          },
          {
            day: 5,
            name: 'Full Body Stretch & Meditation',
            exercises: [
              { name: 'Supine Hamstring Stretch (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Reclined Butterfly', sets: 1, reps: '3 min', rest: 0 },
              { name: 'Legs Up The Wall', sets: 1, reps: '5 min', rest: 0 },
              { name: 'Supine Twist (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Savasana with Guided Meditation', sets: 1, reps: '5 min', rest: 0 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: 'Deepening Flexibility',
        days: [
          {
            day: 1,
            name: 'Sun Salutation Flow',
            exercises: [
              { name: 'Sun Salutation A', sets: 6, reps: '1 round', rest: 0 },
              { name: 'Sun Salutation B', sets: 4, reps: '1 round', rest: 0 },
              { name: 'Warrior I (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Warrior II (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Standing Forward Fold', sets: 1, reps: '90s hold', rest: 0 },
            ],
          },
          {
            day: 2,
            name: 'Hip Opener Sequence',
            exercises: [
              { name: 'Pigeon Pose (each side)', sets: 1, reps: '90s hold', rest: 0 },
              { name: 'Lizard Pose (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Frog Pose', sets: 1, reps: '90s hold', rest: 0 },
              { name: 'Fire Log Pose (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Malasana Squat', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
          {
            day: 3,
            name: 'Backbend & Spine Mobility',
            exercises: [
              { name: 'Cat-Cow Stretch', sets: 1, reps: '15 breaths', rest: 0 },
              { name: 'Upward Dog', sets: 3, reps: '20s hold', rest: 10 },
              { name: 'Camel Pose', sets: 2, reps: '30s hold', rest: 15 },
              { name: 'Bridge Pose', sets: 3, reps: '45s hold', rest: 15 },
              { name: 'Seated Twist (each side)', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
          {
            day: 4,
            name: 'Balance & Core',
            exercises: [
              { name: 'Tree Pose (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Warrior III (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Boat Pose', sets: 3, reps: '40s hold', rest: 15 },
              { name: 'Crow Pose (attempts)', sets: 3, reps: '15s hold', rest: 15 },
              { name: 'Half Moon (each side)', sets: 1, reps: '30s hold', rest: 0 },
            ],
          },
          {
            day: 5,
            name: 'Full Body Stretch & Meditation',
            exercises: [
              { name: 'Wide-Leg Forward Fold', sets: 1, reps: '90s hold', rest: 0 },
              { name: 'Seated Forward Fold', sets: 1, reps: '90s hold', rest: 0 },
              { name: 'Reclined Butterfly', sets: 1, reps: '4 min', rest: 0 },
              { name: 'Legs Up The Wall', sets: 1, reps: '5 min', rest: 0 },
              { name: 'Savasana with Body Scan', sets: 1, reps: '7 min', rest: 0 },
            ],
          },
        ],
      },
      {
        week: 3,
        theme: 'Building Flow',
        days: [
          {
            day: 1,
            name: 'Sun Salutation Flow',
            exercises: [
              { name: 'Sun Salutation A', sets: 7, reps: '1 round', rest: 0 },
              { name: 'Sun Salutation B', sets: 5, reps: '1 round', rest: 0 },
              { name: 'Extended Side Angle (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Triangle Pose (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Revolved Triangle (each side)', sets: 1, reps: '30s hold', rest: 0 },
            ],
          },
          {
            day: 2,
            name: 'Hip Opener Sequence',
            exercises: [
              { name: 'Pigeon Pose (each side)', sets: 1, reps: '2 min hold', rest: 0 },
              { name: 'Lizard Pose (each side)', sets: 1, reps: '90s hold', rest: 0 },
              { name: 'Frog Pose', sets: 1, reps: '2 min hold', rest: 0 },
              { name: 'Half Splits (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Happy Baby', sets: 1, reps: '90s hold', rest: 0 },
            ],
          },
          {
            day: 3,
            name: 'Backbend & Spine Mobility',
            exercises: [
              { name: 'Upward Dog', sets: 3, reps: '30s hold', rest: 10 },
              { name: 'Camel Pose', sets: 3, reps: '30s hold', rest: 15 },
              { name: 'Wheel Pose (attempts)', sets: 3, reps: '15s hold', rest: 20 },
              { name: 'Bridge Pose', sets: 3, reps: '45s hold', rest: 15 },
              { name: 'Supine Twist (each side)', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
          {
            day: 4,
            name: 'Balance & Core',
            exercises: [
              { name: 'Warrior III (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Half Moon (each side)', sets: 1, reps: '30s hold', rest: 0 },
              { name: 'Crow Pose', sets: 3, reps: '20s hold', rest: 15 },
              { name: 'Side Crow (attempts each side)', sets: 2, reps: '10s hold', rest: 15 },
              { name: 'Boat Pose', sets: 3, reps: '45s hold', rest: 15 },
            ],
          },
          {
            day: 5,
            name: 'Full Body Stretch & Meditation',
            exercises: [
              { name: 'Pyramid Pose (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Seated Forward Fold', sets: 1, reps: '2 min hold', rest: 0 },
              { name: 'Supported Fish Pose', sets: 1, reps: '4 min', rest: 0 },
              { name: 'Legs Up The Wall', sets: 1, reps: '5 min', rest: 0 },
              { name: 'Savasana with Loving Kindness', sets: 1, reps: '8 min', rest: 0 },
            ],
          },
        ],
      },
      {
        week: 4,
        theme: 'Integrated Practice',
        days: [
          {
            day: 1,
            name: 'Sun Salutation Flow',
            exercises: [
              { name: 'Sun Salutation A', sets: 8, reps: '1 round', rest: 0 },
              { name: 'Sun Salutation B', sets: 5, reps: '1 round', rest: 0 },
              { name: 'Dancer Pose (each side)', sets: 1, reps: '30s hold', rest: 0 },
              { name: 'Revolved Side Angle (each side)', sets: 1, reps: '30s hold', rest: 0 },
              { name: 'Standing Splits (each side)', sets: 1, reps: '30s hold', rest: 0 },
            ],
          },
          {
            day: 2,
            name: 'Hip Opener Sequence',
            exercises: [
              { name: 'Pigeon Pose (each side)', sets: 1, reps: '3 min hold', rest: 0 },
              { name: 'Lizard Pose (each side)', sets: 1, reps: '2 min hold', rest: 0 },
              { name: 'Frog Pose', sets: 1, reps: '3 min hold', rest: 0 },
              { name: 'Full Splits Prep (each side)', sets: 1, reps: '90s hold', rest: 0 },
              { name: 'Malasana Squat', sets: 1, reps: '90s hold', rest: 0 },
            ],
          },
          {
            day: 3,
            name: 'Backbend & Spine Mobility',
            exercises: [
              { name: 'Camel Pose', sets: 3, reps: '30s hold', rest: 15 },
              { name: 'Wheel Pose', sets: 3, reps: '20s hold', rest: 20 },
              { name: 'Bridge Pose', sets: 3, reps: '45s hold', rest: 15 },
              { name: 'Wild Thing (each side)', sets: 2, reps: '20s hold', rest: 15 },
              { name: 'Child\'s Pose (counter stretch)', sets: 1, reps: '2 min', rest: 0 },
            ],
          },
          {
            day: 4,
            name: 'Balance & Core',
            exercises: [
              { name: 'Handstand Prep (wall)', sets: 3, reps: '20s hold', rest: 20 },
              { name: 'Crow Pose', sets: 3, reps: '30s hold', rest: 15 },
              { name: 'Warrior III (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Half Moon (each side)', sets: 1, reps: '45s hold', rest: 0 },
              { name: 'Forearm Plank', sets: 3, reps: '45s hold', rest: 15 },
            ],
          },
          {
            day: 5,
            name: 'Full Body Stretch & Meditation',
            exercises: [
              { name: 'Full Body Yin Flow', sets: 1, reps: '10 min', rest: 0 },
              { name: 'Supported Fish Pose', sets: 1, reps: '5 min', rest: 0 },
              { name: 'Legs Up The Wall', sets: 1, reps: '5 min', rest: 0 },
              { name: 'Reclined Butterfly', sets: 1, reps: '5 min', rest: 0 },
              { name: 'Savasana with Breath Meditation', sets: 1, reps: '10 min', rest: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'bodyweight_mastery',
    name: 'Bodyweight Mastery',
    emoji: '\u{1F9BE}',
    description: 'Progressive calisthenics from beginner to advanced. 8-week journey from basic movements to impressive bodyweight skills.',
    level: 'beginner',
    durationWeeks: 8,
    daysPerWeek: 4,
    goal: 'progressive_calisthenics',
    color: '#7C4DFF',
    weeks: [
      {
        week: 1,
        theme: 'Foundation',
        days: [
          {
            day: 1,
            name: 'Push & Core',
            exercises: [
              { name: 'Push-Ups', sets: 4, reps: '10', rest: 60 },
              { name: 'Diamond Push-Ups', sets: 3, reps: '6-8', rest: 60 },
              { name: 'Dips (bench)', sets: 3, reps: '10', rest: 60 },
              { name: 'Plank', sets: 3, reps: '30s', rest: 45 },
              { name: 'Dead Bug', sets: 3, reps: '10 each', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Bodyweight Squat', sets: 4, reps: '15', rest: 60 },
              { name: 'Pull-Ups (or band-assisted)', sets: 4, reps: '5-8', rest: 90 },
              { name: 'Australian Rows', sets: 3, reps: '10', rest: 60 },
              { name: 'Lunges', sets: 3, reps: '10 each', rest: 60 },
              { name: 'Calf Raises', sets: 3, reps: '15', rest: 30 },
            ],
          },
          {
            day: 3,
            name: 'Push & Core',
            exercises: [
              { name: 'Wide Push-Ups', sets: 4, reps: '10', rest: 60 },
              { name: 'Pike Push-Ups', sets: 3, reps: '8', rest: 60 },
              { name: 'Plank to Push-Up', sets: 3, reps: '8', rest: 60 },
              { name: 'Hollow Body Hold', sets: 3, reps: '20s', rest: 45 },
              { name: 'Mountain Climbers', sets: 3, reps: '20', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Bulgarian Split Squat', sets: 3, reps: '8 each', rest: 60 },
              { name: 'Chin-Ups', sets: 4, reps: '5-8', rest: 90 },
              { name: 'Australian Rows (feet elevated)', sets: 3, reps: '10', rest: 60 },
              { name: 'Glute Bridge', sets: 3, reps: '15', rest: 45 },
              { name: 'Single-Leg Calf Raises', sets: 3, reps: '10 each', rest: 30 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: 'Foundation (progressive)',
        days: [
          {
            day: 1,
            name: 'Push & Core',
            exercises: [
              { name: 'Push-Ups', sets: 4, reps: '12', rest: 60 },
              { name: 'Diamond Push-Ups', sets: 3, reps: '8-10', rest: 60 },
              { name: 'Dips (parallel bars)', sets: 3, reps: '8', rest: 90 },
              { name: 'Plank', sets: 3, reps: '40s', rest: 45 },
              { name: 'Dead Bug', sets: 3, reps: '12 each', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Bodyweight Squat', sets: 4, reps: '20', rest: 60 },
              { name: 'Pull-Ups', sets: 4, reps: '6-8', rest: 90 },
              { name: 'Australian Rows (feet elevated)', sets: 3, reps: '12', rest: 60 },
              { name: 'Walking Lunges', sets: 3, reps: '12 each', rest: 60 },
              { name: 'Calf Raises', sets: 3, reps: '20', rest: 30 },
            ],
          },
          {
            day: 3,
            name: 'Push & Core',
            exercises: [
              { name: 'Decline Push-Ups', sets: 4, reps: '10', rest: 60 },
              { name: 'Pike Push-Ups', sets: 3, reps: '10', rest: 60 },
              { name: 'Pseudo Planche Push-Ups', sets: 3, reps: '6', rest: 90 },
              { name: 'Hollow Body Hold', sets: 3, reps: '25s', rest: 45 },
              { name: 'L-Sit Attempts', sets: 3, reps: '10s', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Pistol Squat Negatives', sets: 3, reps: '5 each', rest: 90 },
              { name: 'Chin-Ups', sets: 4, reps: '6-8', rest: 90 },
              { name: 'Wide Pull-Ups', sets: 3, reps: '5', rest: 90 },
              { name: 'Single-Leg Glute Bridge', sets: 3, reps: '10 each', rest: 45 },
              { name: 'Jump Squats', sets: 3, reps: '10', rest: 60 },
            ],
          },
        ],
      },
      {
        week: 3,
        theme: 'Building',
        days: [
          {
            day: 1,
            name: 'Push & Core',
            exercises: [
              { name: 'Diamond Push-Ups', sets: 4, reps: '10', rest: 60 },
              { name: 'Archer Push-Up Negatives', sets: 3, reps: '5 each', rest: 90 },
              { name: 'Dips (parallel bars)', sets: 4, reps: '10', rest: 90 },
              { name: 'Hollow Body Hold', sets: 3, reps: '30s', rest: 45 },
              { name: 'Dragon Flag Negatives', sets: 3, reps: '5', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Pistol Squat (assisted)', sets: 3, reps: '5 each', rest: 90 },
              { name: 'Pull-Ups', sets: 4, reps: '8', rest: 90 },
              { name: 'Typewriter Pull-Up Negatives', sets: 3, reps: '3 each', rest: 120 },
              { name: 'Nordic Curl Negatives', sets: 3, reps: '5', rest: 90 },
              { name: 'Calf Raises', sets: 3, reps: '20', rest: 30 },
            ],
          },
          {
            day: 3,
            name: 'Push & Core',
            exercises: [
              { name: 'Pike Push-Ups (elevated)', sets: 4, reps: '8', rest: 90 },
              { name: 'Pseudo Planche Push-Ups', sets: 3, reps: '8', rest: 90 },
              { name: 'Ring Dips (or deep dips)', sets: 3, reps: '6', rest: 120 },
              { name: 'L-Sit Hold', sets: 3, reps: '15s', rest: 60 },
              { name: 'Ab Wheel Rollout', sets: 3, reps: '8', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Bulgarian Split Squat', sets: 4, reps: '10 each', rest: 60 },
              { name: 'Weighted Pull-Ups', sets: 4, reps: '5', rest: 120 },
              { name: 'Front Lever Tuck Hold', sets: 3, reps: '10s', rest: 90 },
              { name: 'Shrimp Squat Negatives', sets: 3, reps: '5 each', rest: 90 },
              { name: 'Single-Leg Calf Raises', sets: 3, reps: '12 each', rest: 30 },
            ],
          },
        ],
      },
      {
        week: 4,
        theme: 'Building (progressive)',
        days: [
          {
            day: 1,
            name: 'Push & Core',
            exercises: [
              { name: 'Archer Push-Ups', sets: 3, reps: '5 each', rest: 90 },
              { name: 'Handstand Wall Hold', sets: 3, reps: '20s', rest: 90 },
              { name: 'Ring Dips', sets: 4, reps: '8', rest: 90 },
              { name: 'Hollow Body Hold', sets: 3, reps: '40s', rest: 45 },
              { name: 'Dragon Flag Negatives', sets: 3, reps: '6', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Pistol Squat (assisted)', sets: 4, reps: '6 each', rest: 90 },
              { name: 'Muscle-Up Negatives', sets: 3, reps: '3', rest: 120 },
              { name: 'Weighted Pull-Ups', sets: 4, reps: '5', rest: 120 },
              { name: 'Nordic Curl Negatives', sets: 3, reps: '6', rest: 90 },
              { name: 'Box Jump', sets: 3, reps: '8', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Push & Core',
            exercises: [
              { name: 'Handstand Push-Up Negatives', sets: 3, reps: '3', rest: 120 },
              { name: 'Pseudo Planche Push-Ups', sets: 4, reps: '8', rest: 90 },
              { name: 'Deep Dips', sets: 4, reps: '10', rest: 90 },
              { name: 'L-Sit Hold', sets: 3, reps: '20s', rest: 60 },
              { name: 'Ab Wheel Rollout', sets: 3, reps: '10', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Pistol Squat Negatives (unassisted)', sets: 3, reps: '5 each', rest: 90 },
              { name: 'Typewriter Pull-Ups', sets: 3, reps: '3 each', rest: 120 },
              { name: 'Front Lever Tuck Hold', sets: 3, reps: '15s', rest: 90 },
              { name: 'Shrimp Squat (assisted)', sets: 3, reps: '5 each', rest: 90 },
              { name: 'Explosive Calf Raises', sets: 3, reps: '15', rest: 45 },
            ],
          },
        ],
      },
      {
        week: 5,
        theme: 'Advanced Skills',
        days: [
          {
            day: 1,
            name: 'Push & Core',
            exercises: [
              { name: 'Archer Push-Ups', sets: 4, reps: '6 each', rest: 90 },
              { name: 'Handstand Push-Up Negatives', sets: 4, reps: '4', rest: 120 },
              { name: 'Ring Dips', sets: 4, reps: '10', rest: 90 },
              { name: 'Dragon Flags', sets: 3, reps: '5', rest: 60 },
              { name: 'Planche Lean Hold', sets: 3, reps: '15s', rest: 90 },
            ],
          },
          {
            day: 2,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Pistol Squat', sets: 3, reps: '5 each', rest: 90 },
              { name: 'Muscle-Up Attempts', sets: 5, reps: '1-2', rest: 150 },
              { name: 'Weighted Pull-Ups', sets: 4, reps: '5', rest: 120 },
              { name: 'Nordic Curls', sets: 3, reps: '5', rest: 90 },
              { name: 'Jump Squats', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Push & Core',
            exercises: [
              { name: 'One-Arm Push-Up Negatives', sets: 3, reps: '3 each', rest: 120 },
              { name: 'Handstand Wall Hold', sets: 3, reps: '30s', rest: 90 },
              { name: 'Weighted Dips', sets: 4, reps: '8', rest: 90 },
              { name: 'L-Sit Hold', sets: 3, reps: '25s', rest: 60 },
              { name: 'Hollow Body Rock', sets: 3, reps: '20', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Pistol Squat', sets: 4, reps: '5 each', rest: 90 },
              { name: 'Front Lever Progressions', sets: 3, reps: '15s hold', rest: 120 },
              { name: 'Typewriter Pull-Ups', sets: 3, reps: '4 each', rest: 120 },
              { name: 'Shrimp Squat', sets: 3, reps: '5 each', rest: 90 },
              { name: 'Single-Leg Calf Raises', sets: 3, reps: '15 each', rest: 30 },
            ],
          },
        ],
      },
      {
        week: 6,
        theme: 'Advanced Skills (progressive)',
        days: [
          {
            day: 1,
            name: 'Push & Core',
            exercises: [
              { name: 'One-Arm Push-Up Negatives', sets: 4, reps: '4 each', rest: 120 },
              { name: 'Handstand Push-Ups (wall)', sets: 3, reps: '3-5', rest: 120 },
              { name: 'Ring Dips', sets: 4, reps: '12', rest: 90 },
              { name: 'Dragon Flags', sets: 3, reps: '6', rest: 60 },
              { name: 'Planche Lean Hold', sets: 3, reps: '20s', rest: 90 },
            ],
          },
          {
            day: 2,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Weighted Pistol Squat', sets: 3, reps: '5 each', rest: 120 },
              { name: 'Muscle-Ups', sets: 4, reps: '2-3', rest: 150 },
              { name: 'Front Lever Tuck Rows', sets: 3, reps: '5', rest: 120 },
              { name: 'Nordic Curls', sets: 3, reps: '6', rest: 90 },
              { name: 'Box Jump', sets: 3, reps: '10', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Push & Core',
            exercises: [
              { name: 'Archer Push-Ups', sets: 4, reps: '8 each', rest: 90 },
              { name: 'Handstand Push-Ups (wall)', sets: 4, reps: '4', rest: 120 },
              { name: 'Weighted Dips', sets: 4, reps: '10', rest: 90 },
              { name: 'L-Sit Hold', sets: 3, reps: '30s', rest: 60 },
              { name: 'Ab Wheel Rollout (standing)', sets: 3, reps: '5', rest: 90 },
            ],
          },
          {
            day: 4,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Pistol Squat', sets: 4, reps: '6 each', rest: 90 },
              { name: 'Front Lever Progressions', sets: 3, reps: '20s hold', rest: 120 },
              { name: 'Weighted Chin-Ups', sets: 4, reps: '5', rest: 120 },
              { name: 'Shrimp Squat', sets: 4, reps: '5 each', rest: 90 },
              { name: 'Explosive Calf Raises', sets: 3, reps: '15', rest: 45 },
            ],
          },
        ],
      },
      {
        week: 7,
        theme: 'Mastery Preparation',
        days: [
          {
            day: 1,
            name: 'Push & Core',
            exercises: [
              { name: 'One-Arm Push-Up Attempts', sets: 4, reps: '2-3 each', rest: 120 },
              { name: 'Freestanding Handstand Practice', sets: 5, reps: '15s hold', rest: 90 },
              { name: 'Ring Dips (deep)', sets: 4, reps: '10', rest: 90 },
              { name: 'Dragon Flags', sets: 3, reps: '8', rest: 60 },
              { name: 'Tuck Planche Hold', sets: 3, reps: '10s', rest: 120 },
            ],
          },
          {
            day: 2,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Weighted Pistol Squat', sets: 4, reps: '5 each', rest: 120 },
              { name: 'Muscle-Ups', sets: 5, reps: '2-3', rest: 150 },
              { name: 'Front Lever Tuck Rows', sets: 4, reps: '5', rest: 120 },
              { name: 'Nordic Curls', sets: 3, reps: '8', rest: 90 },
              { name: 'Depth Jumps', sets: 3, reps: '6', rest: 90 },
            ],
          },
          {
            day: 3,
            name: 'Push & Core',
            exercises: [
              { name: 'Handstand Push-Ups (wall)', sets: 4, reps: '5', rest: 120 },
              { name: 'Planche Lean Push-Ups', sets: 3, reps: '5', rest: 120 },
              { name: 'Weighted Dips', sets: 4, reps: '10', rest: 90 },
              { name: 'V-Sit Attempts', sets: 3, reps: '10s', rest: 60 },
              { name: 'Hollow Body Rock', sets: 3, reps: '25', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Pull & Legs',
            exercises: [
              { name: 'Pistol Squat', sets: 4, reps: '8 each', rest: 90 },
              { name: 'Front Lever Hold Attempts', sets: 4, reps: '8s hold', rest: 120 },
              { name: 'Weighted Pull-Ups', sets: 4, reps: '5', rest: 120 },
              { name: 'Shrimp Squat', sets: 4, reps: '6 each', rest: 90 },
              { name: 'Single-Leg Calf Raises', sets: 3, reps: '18 each', rest: 30 },
            ],
          },
        ],
      },
      {
        week: 8,
        theme: 'Mastery Test',
        days: [
          {
            day: 1,
            name: 'Push Mastery Test',
            exercises: [
              { name: 'One-Arm Push-Up', sets: 3, reps: 'max each', rest: 150 },
              { name: 'Handstand Push-Ups', sets: 3, reps: 'max', rest: 150 },
              { name: 'Ring Dips', sets: 3, reps: 'max', rest: 120 },
              { name: 'Planche Lean Hold', sets: 3, reps: 'max hold', rest: 120 },
              { name: 'Dragon Flags', sets: 3, reps: 'max', rest: 90 },
            ],
          },
          {
            day: 2,
            name: 'Pull Mastery Test',
            exercises: [
              { name: 'Muscle-Ups', sets: 3, reps: 'max', rest: 180 },
              { name: 'Front Lever Hold', sets: 3, reps: 'max hold', rest: 150 },
              { name: 'Typewriter Pull-Ups', sets: 3, reps: 'max each', rest: 120 },
              { name: 'L-Sit Hold', sets: 3, reps: 'max hold', rest: 90 },
              { name: 'Weighted Pull-Ups', sets: 3, reps: 'max', rest: 120 },
            ],
          },
          {
            day: 3,
            name: 'Legs Mastery Test',
            exercises: [
              { name: 'Pistol Squat', sets: 3, reps: 'max each', rest: 120 },
              { name: 'Shrimp Squat', sets: 3, reps: 'max each', rest: 120 },
              { name: 'Nordic Curls', sets: 3, reps: 'max', rest: 120 },
              { name: 'Box Jump (max height)', sets: 5, reps: '1', rest: 90 },
              { name: 'Single-Leg Calf Raises', sets: 3, reps: 'max each', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Full Body Skills Showcase',
            exercises: [
              { name: 'One-Arm Push-Up', sets: 2, reps: '3 each', rest: 120 },
              { name: 'Muscle-Ups', sets: 2, reps: '3', rest: 150 },
              { name: 'Pistol Squat', sets: 2, reps: '5 each', rest: 90 },
              { name: 'Handstand Hold', sets: 3, reps: '20s', rest: 90 },
              { name: 'Front Lever Hold', sets: 3, reps: '10s', rest: 120 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'powerlifting_peaking',
    name: 'Powerlifting Peaking',
    emoji: '\u{1F3C6}',
    description: 'Competition prep peaking cycle. 6-week program progressing from volume accumulation to intensity peaking and max testing.',
    level: 'advanced',
    durationWeeks: 6,
    daysPerWeek: 4,
    goal: 'strength',
    color: '#E53935',
    weeks: [
      {
        week: 1,
        theme: 'Volume Accumulation (5x5)',
        days: [
          {
            day: 1,
            name: 'Squat Day',
            exercises: [
              { name: 'Competition Squat', sets: 5, reps: '5', rest: 180 },
              { name: 'Pause Squat', sets: 3, reps: '5', rest: 120 },
              { name: 'Leg Press', sets: 3, reps: '10', rest: 90 },
              { name: 'Leg Curl', sets: 3, reps: '12', rest: 60 },
              { name: 'Plank', sets: 3, reps: '60s', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Bench Day',
            exercises: [
              { name: 'Competition Bench Press', sets: 5, reps: '5', rest: 180 },
              { name: 'Close-Grip Bench Press', sets: 3, reps: '8', rest: 90 },
              { name: 'Dumbbell Row', sets: 4, reps: '10', rest: 90 },
              { name: 'Lateral Raises', sets: 3, reps: '15', rest: 60 },
              { name: 'Tricep Pushdown', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Deadlift Day',
            exercises: [
              { name: 'Competition Deadlift', sets: 5, reps: '5', rest: 180 },
              { name: 'Deficit Deadlift', sets: 3, reps: '5', rest: 120 },
              { name: 'Romanian Deadlift', sets: 3, reps: '8', rest: 90 },
              { name: 'Barbell Row', sets: 3, reps: '8', rest: 90 },
              { name: 'Hanging Leg Raise', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'Accessories',
            exercises: [
              { name: 'Overhead Press', sets: 4, reps: '6', rest: 120 },
              { name: 'Pull-Ups', sets: 4, reps: '8', rest: 90 },
              { name: 'Lunges', sets: 3, reps: '10 each', rest: 60 },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 3, reps: '12', rest: 60 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: 'Volume Accumulation (4x6)',
        days: [
          {
            day: 1,
            name: 'Squat Day',
            exercises: [
              { name: 'Competition Squat', sets: 4, reps: '6', rest: 180 },
              { name: 'Front Squat', sets: 3, reps: '6', rest: 120 },
              { name: 'Leg Press', sets: 4, reps: '10', rest: 90 },
              { name: 'Leg Extension', sets: 3, reps: '12', rest: 60 },
              { name: 'Ab Wheel Rollout', sets: 3, reps: '10', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Bench Day',
            exercises: [
              { name: 'Competition Bench Press', sets: 4, reps: '6', rest: 180 },
              { name: 'Spoto Press', sets: 3, reps: '6', rest: 120 },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10', rest: 90 },
              { name: 'Cable Row', sets: 4, reps: '10', rest: 90 },
              { name: 'Skull Crushers', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Deadlift Day',
            exercises: [
              { name: 'Competition Deadlift', sets: 4, reps: '6', rest: 180 },
              { name: 'Block Pulls', sets: 3, reps: '5', rest: 120 },
              { name: 'Good Mornings', sets: 3, reps: '8', rest: 90 },
              { name: 'Dumbbell Row', sets: 4, reps: '10', rest: 90 },
              { name: 'Plank', sets: 3, reps: '60s', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Accessories',
            exercises: [
              { name: 'Overhead Press', sets: 4, reps: '8', rest: 90 },
              { name: 'Weighted Pull-Ups', sets: 4, reps: '6', rest: 120 },
              { name: 'Bulgarian Split Squat', sets: 3, reps: '8 each', rest: 60 },
              { name: 'Face Pulls', sets: 4, reps: '15', rest: 60 },
              { name: 'Hammer Curl', sets: 3, reps: '12', rest: 60 },
            ],
          },
        ],
      },
      {
        week: 3,
        theme: 'Volume Accumulation (heavy)',
        days: [
          {
            day: 1,
            name: 'Squat Day',
            exercises: [
              { name: 'Competition Squat', sets: 5, reps: '4', rest: 210 },
              { name: 'Pause Squat', sets: 3, reps: '4', rest: 150 },
              { name: 'Leg Press', sets: 3, reps: '8', rest: 90 },
              { name: 'Leg Curl', sets: 3, reps: '10', rest: 60 },
              { name: 'Plank', sets: 3, reps: '60s', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Bench Day',
            exercises: [
              { name: 'Competition Bench Press', sets: 5, reps: '4', rest: 210 },
              { name: 'Close-Grip Bench Press', sets: 3, reps: '6', rest: 120 },
              { name: 'Dumbbell Row', sets: 4, reps: '8', rest: 90 },
              { name: 'Lateral Raises', sets: 3, reps: '12', rest: 60 },
              { name: 'Dips', sets: 3, reps: '10', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Deadlift Day',
            exercises: [
              { name: 'Competition Deadlift', sets: 5, reps: '4', rest: 210 },
              { name: 'Deficit Deadlift', sets: 3, reps: '4', rest: 150 },
              { name: 'Barbell Row', sets: 3, reps: '8', rest: 90 },
              { name: 'Romanian Deadlift', sets: 3, reps: '6', rest: 90 },
              { name: 'Hanging Leg Raise', sets: 3, reps: '12', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'Accessories',
            exercises: [
              { name: 'Overhead Press', sets: 3, reps: '6', rest: 120 },
              { name: 'Pull-Ups', sets: 4, reps: '8', rest: 90 },
              { name: 'Lunges', sets: 3, reps: '8 each', rest: 60 },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: 60 },
              { name: 'Barbell Curl', sets: 3, reps: '10', rest: 60 },
            ],
          },
        ],
      },
      {
        week: 4,
        theme: 'Intensity (3x3, 2x2)',
        days: [
          {
            day: 1,
            name: 'Squat Day',
            exercises: [
              { name: 'Competition Squat', sets: 3, reps: '3', rest: 240 },
              { name: 'Competition Squat (heavy)', sets: 2, reps: '2', rest: 300 },
              { name: 'Leg Press', sets: 2, reps: '8', rest: 90 },
              { name: 'Leg Curl', sets: 2, reps: '10', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Bench Day',
            exercises: [
              { name: 'Competition Bench Press', sets: 3, reps: '3', rest: 240 },
              { name: 'Competition Bench Press (heavy)', sets: 2, reps: '2', rest: 300 },
              { name: 'Dumbbell Row', sets: 3, reps: '8', rest: 90 },
              { name: 'Tricep Pushdown', sets: 2, reps: '12', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Deadlift Day',
            exercises: [
              { name: 'Competition Deadlift', sets: 3, reps: '3', rest: 240 },
              { name: 'Competition Deadlift (heavy)', sets: 2, reps: '2', rest: 300 },
              { name: 'Barbell Row', sets: 3, reps: '6', rest: 90 },
              { name: 'Plank', sets: 2, reps: '60s', rest: 45 },
            ],
          },
          {
            day: 4,
            name: 'Light Accessories',
            exercises: [
              { name: 'Overhead Press', sets: 3, reps: '6', rest: 90 },
              { name: 'Pull-Ups', sets: 3, reps: '8', rest: 90 },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: 60 },
              { name: 'Bodyweight Lunges', sets: 2, reps: '10 each', rest: 45 },
            ],
          },
        ],
      },
      {
        week: 5,
        theme: 'Peak (2x1, 1x1)',
        days: [
          {
            day: 1,
            name: 'Squat Day',
            exercises: [
              { name: 'Competition Squat', sets: 2, reps: '1', rest: 300 },
              { name: 'Competition Squat (opener)', sets: 1, reps: '1', rest: 300 },
              { name: 'Light Leg Press', sets: 2, reps: '8', rest: 60 },
            ],
          },
          {
            day: 2,
            name: 'Bench Day',
            exercises: [
              { name: 'Competition Bench Press', sets: 2, reps: '1', rest: 300 },
              { name: 'Competition Bench Press (opener)', sets: 1, reps: '1', rest: 300 },
              { name: 'Light Dumbbell Row', sets: 2, reps: '10', rest: 60 },
            ],
          },
          {
            day: 3,
            name: 'Deadlift Day',
            exercises: [
              { name: 'Competition Deadlift', sets: 2, reps: '1', rest: 300 },
              { name: 'Competition Deadlift (opener)', sets: 1, reps: '1', rest: 300 },
              { name: 'Light Romanian Deadlift', sets: 2, reps: '8', rest: 60 },
            ],
          },
          {
            day: 4,
            name: 'Active Recovery',
            exercises: [
              { name: 'Light Walking', sets: 1, reps: '15 min', rest: 0 },
              { name: 'Foam Rolling', sets: 1, reps: '10 min', rest: 0 },
              { name: 'Stretching', sets: 1, reps: '10 min', rest: 0 },
            ],
          },
        ],
      },
      {
        week: 6,
        theme: 'Deload & Test Maxes',
        days: [
          {
            day: 1,
            name: 'Light Movement',
            exercises: [
              { name: 'Bodyweight Squat', sets: 3, reps: '10', rest: 60 },
              { name: 'Push-Ups', sets: 3, reps: '10', rest: 60 },
              { name: 'Light Walking', sets: 1, reps: '15 min', rest: 0 },
              { name: 'Foam Rolling', sets: 1, reps: '10 min', rest: 0 },
            ],
          },
          {
            day: 2,
            name: 'Opener Practice',
            exercises: [
              { name: 'Squat Opener', sets: 1, reps: '1', rest: 300 },
              { name: 'Bench Opener', sets: 1, reps: '1', rest: 300 },
              { name: 'Deadlift Opener', sets: 1, reps: '1', rest: 300 },
            ],
          },
          {
            day: 3,
            name: 'Rest & Mobility',
            exercises: [
              { name: 'Light Walking', sets: 1, reps: '20 min', rest: 0 },
              { name: 'Full Body Stretching', sets: 1, reps: '15 min', rest: 0 },
              { name: 'Foam Rolling', sets: 1, reps: '10 min', rest: 0 },
            ],
          },
          {
            day: 4,
            name: 'Max Test Day',
            exercises: [
              { name: 'Squat 1RM Test', sets: 1, reps: '1', rest: 300 },
              { name: 'Bench Press 1RM Test', sets: 1, reps: '1', rest: 300 },
              { name: 'Deadlift 1RM Test', sets: 1, reps: '1', rest: 300 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'runners_strength',
    name: 'Runner\'s Strength',
    emoji: '\u{1F3C3}',
    description: 'Complementary strength training for runners. Builds single-leg stability, hip strength, and core endurance to prevent injury and improve performance.',
    level: 'beginner',
    durationWeeks: 4,
    daysPerWeek: 3,
    goal: 'endurance',
    color: '#26C6DA',
    weeks: [
      {
        week: 1,
        theme: 'Building a Base',
        days: [
          {
            day: 1,
            name: 'Lower Body Power',
            exercises: [
              { name: 'Reverse Lunges', sets: 3, reps: '10 each', rest: 60 },
              { name: 'Step-Ups', sets: 3, reps: '10 each', rest: 60 },
              { name: 'Calf Raises', sets: 3, reps: '15', rest: 45 },
              { name: 'Single-Leg Glute Bridge', sets: 3, reps: '10 each', rest: 45 },
              { name: 'Wall Sit', sets: 3, reps: '30s', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Core & Stability',
            exercises: [
              { name: 'Plank', sets: 3, reps: '30s', rest: 45 },
              { name: 'Dead Bug', sets: 3, reps: '10 each', rest: 45 },
              { name: 'Bird Dog', sets: 3, reps: '10 each', rest: 45 },
              { name: 'Side Plank (each side)', sets: 3, reps: '20s', rest: 30 },
              { name: 'Pallof Press (each side)', sets: 3, reps: '10', rest: 45 },
            ],
          },
          {
            day: 3,
            name: 'Upper Body & Mobility',
            exercises: [
              { name: 'Push-Ups', sets: 3, reps: '10', rest: 60 },
              { name: 'Dumbbell Row', sets: 3, reps: '10', rest: 60 },
              { name: 'Band Pull-Aparts', sets: 3, reps: '15', rest: 30 },
              { name: 'Hip Flexor Stretch (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Pigeon Pose (each side)', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
        ],
      },
      {
        week: 2,
        theme: 'Progressive Loading',
        days: [
          {
            day: 1,
            name: 'Lower Body Power',
            exercises: [
              { name: 'Reverse Lunges', sets: 3, reps: '12 each', rest: 60 },
              { name: 'Step-Ups (weighted)', sets: 3, reps: '10 each', rest: 60 },
              { name: 'Single-Leg Calf Raises', sets: 3, reps: '12 each', rest: 45 },
              { name: 'Single-Leg Romanian Deadlift', sets: 3, reps: '8 each', rest: 60 },
              { name: 'Wall Sit', sets: 3, reps: '40s', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Core & Stability',
            exercises: [
              { name: 'Plank', sets: 3, reps: '40s', rest: 45 },
              { name: 'Dead Bug', sets: 3, reps: '12 each', rest: 45 },
              { name: 'Bird Dog (with pause)', sets: 3, reps: '10 each', rest: 45 },
              { name: 'Side Plank (each side)', sets: 3, reps: '30s', rest: 30 },
              { name: 'Pallof Press (each side)', sets: 3, reps: '12', rest: 45 },
            ],
          },
          {
            day: 3,
            name: 'Upper Body & Mobility',
            exercises: [
              { name: 'Push-Ups', sets: 3, reps: '12', rest: 60 },
              { name: 'Dumbbell Row', sets: 3, reps: '12', rest: 60 },
              { name: 'Band Pull-Aparts', sets: 3, reps: '18', rest: 30 },
              { name: 'Hip Flexor Stretch (each side)', sets: 1, reps: '90s hold', rest: 0 },
              { name: 'Pigeon Pose (each side)', sets: 1, reps: '90s hold', rest: 0 },
              { name: 'Hamstring Stretch (each side)', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
        ],
      },
      {
        week: 3,
        theme: 'Strength & Stability',
        days: [
          {
            day: 1,
            name: 'Lower Body Power',
            exercises: [
              { name: 'Bulgarian Split Squat', sets: 3, reps: '10 each', rest: 60 },
              { name: 'Step-Ups (weighted)', sets: 3, reps: '12 each', rest: 60 },
              { name: 'Single-Leg Calf Raises', sets: 3, reps: '15 each', rest: 45 },
              { name: 'Single-Leg Romanian Deadlift', sets: 3, reps: '10 each', rest: 60 },
              { name: 'Lateral Band Walk', sets: 3, reps: '12 each', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Core & Stability',
            exercises: [
              { name: 'Plank', sets: 3, reps: '50s', rest: 45 },
              { name: 'Dead Bug (weighted)', sets: 3, reps: '10 each', rest: 45 },
              { name: 'Bird Dog Row', sets: 3, reps: '8 each', rest: 60 },
              { name: 'Copenhagen Plank (each side)', sets: 3, reps: '15s', rest: 45 },
              { name: 'Pallof Press Walk-Out (each side)', sets: 3, reps: '10', rest: 45 },
            ],
          },
          {
            day: 3,
            name: 'Upper Body & Mobility',
            exercises: [
              { name: 'Diamond Push-Ups', sets: 3, reps: '10', rest: 60 },
              { name: 'Dumbbell Row', sets: 3, reps: '12', rest: 60 },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: 45 },
              { name: 'Hip 90/90 Stretch (each side)', sets: 1, reps: '60s hold', rest: 0 },
              { name: 'Pigeon Pose (each side)', sets: 1, reps: '90s hold', rest: 0 },
              { name: 'Calf Stretch (each side)', sets: 1, reps: '60s hold', rest: 0 },
            ],
          },
        ],
      },
      {
        week: 4,
        theme: 'Peak & Maintain',
        days: [
          {
            day: 1,
            name: 'Lower Body Power',
            exercises: [
              { name: 'Bulgarian Split Squat', sets: 4, reps: '10 each', rest: 60 },
              { name: 'Single-Leg Box Jump', sets: 3, reps: '5 each', rest: 90 },
              { name: 'Single-Leg Calf Raises', sets: 3, reps: '18 each', rest: 45 },
              { name: 'Single-Leg Romanian Deadlift', sets: 4, reps: '10 each', rest: 60 },
              { name: 'Lateral Band Walk', sets: 3, reps: '15 each', rest: 45 },
            ],
          },
          {
            day: 2,
            name: 'Core & Stability',
            exercises: [
              { name: 'Plank', sets: 3, reps: '60s', rest: 45 },
              { name: 'Dead Bug (weighted)', sets: 3, reps: '12 each', rest: 45 },
              { name: 'Bird Dog Row', sets: 3, reps: '10 each', rest: 60 },
              { name: 'Copenhagen Plank (each side)', sets: 3, reps: '20s', rest: 45 },
              { name: 'Anti-Rotation Hold (each side)', sets: 3, reps: '20s', rest: 45 },
            ],
          },
          {
            day: 3,
            name: 'Upper Body & Mobility',
            exercises: [
              { name: 'Diamond Push-Ups', sets: 3, reps: '12', rest: 60 },
              { name: 'Dumbbell Row', sets: 4, reps: '10', rest: 60 },
              { name: 'Face Pulls', sets: 3, reps: '18', rest: 45 },
              { name: 'Full Body Stretching Flow', sets: 1, reps: '5 min', rest: 0 },
              { name: 'Pigeon Pose (each side)', sets: 1, reps: '2 min hold', rest: 0 },
              { name: 'Hamstring Stretch (each side)', sets: 1, reps: '90s hold', rest: 0 },
            ],
          },
        ],
      },
    ],
  },
];

/**
 * Helper to look up a program by ID.
 */
export function getProgramById(id: string): WorkoutProgram | null {
  return WORKOUT_PROGRAMS.find((p) => p.id === id) || null;
}

/**
 * Filter programs by level.
 */
export function getProgramsByLevel(level: ProgramLevel | 'all'): WorkoutProgram[] {
  if (!level || level === 'all') return WORKOUT_PROGRAMS;
  return WORKOUT_PROGRAMS.filter((p) => p.level === level);
}

/**
 * Filter programs by goal.
 */
export function getProgramsByGoal(goal: ProgramGoal | 'all'): WorkoutProgram[] {
  if (!goal || goal === 'all') return WORKOUT_PROGRAMS;
  return WORKOUT_PROGRAMS.filter((p) => p.goal === goal);
}

/**
 * Get the total number of workout days in a program.
 */
export function getTotalDays(program: WorkoutProgram | null | undefined): number {
  if (!program?.weeks) return 0;
  return program.weeks.reduce((sum: number, w: ProgramWeek) => sum + (w.days?.length || 0), 0);
}

export type {
  ProgramExercise,
  ProgramDay,
  ProgramWeek,
  ProgramLevel,
  ProgramGoal,
  WorkoutProgram,
};
