
import { Exercise, WorkoutPlan, WorkoutSession } from '../types';

// --- Exercise Database ---

export const EXERCISE_DB: Exercise[] = [
    // --- STRENGTH (GYM) ---
    { id: 'bench_press', name: 'Barbell Bench Press', type: 'strength', muscleGroup: 'Chest', defaultRestSeconds: 90 },
    { id: 'incline_bench', name: 'Incline Dumbbell Press', type: 'strength', muscleGroup: 'Chest', defaultRestSeconds: 90 },
    { id: 'dumbbell_fly', name: 'Dumbbell Flys', type: 'strength', muscleGroup: 'Chest', defaultRestSeconds: 60 },
    { id: 'squat', name: 'Barbell Squat', type: 'strength', muscleGroup: 'Legs', defaultRestSeconds: 120 },
    { id: 'front_squat', name: 'Front Squat', type: 'strength', muscleGroup: 'Legs', defaultRestSeconds: 120 },
    { id: 'leg_press', name: 'Leg Press', type: 'strength', muscleGroup: 'Legs', defaultRestSeconds: 90 },
    { id: 'lunge', name: 'Walking Lunges', type: 'strength', muscleGroup: 'Legs', defaultRestSeconds: 60 },
    { id: 'deadlift', name: 'Deadlift', type: 'strength', muscleGroup: 'Back', defaultRestSeconds: 120 },
    { id: 'row', name: 'Barbell Row', type: 'strength', muscleGroup: 'Back', defaultRestSeconds: 90 },
    { id: 'lat_pulldown', name: 'Lat Pulldown', type: 'strength', muscleGroup: 'Back', defaultRestSeconds: 60 },
    { id: 'overhead_press', name: 'Overhead Press', type: 'strength', muscleGroup: 'Shoulders', defaultRestSeconds: 90 },
    { id: 'lateral_raise', name: 'Lateral Raises', type: 'strength', muscleGroup: 'Shoulders', defaultRestSeconds: 60 },
    { id: 'face_pull', name: 'Face Pulls', type: 'strength', muscleGroup: 'Shoulders', defaultRestSeconds: 60 },
    { id: 'bicep_curl', name: 'Barbell Curl', type: 'strength', muscleGroup: 'Arms', defaultRestSeconds: 60 },
    { id: 'tricep_ext', name: 'Tricep Rope Extension', type: 'strength', muscleGroup: 'Arms', defaultRestSeconds: 60 },

    // --- CALISTHENICS (BODYWEIGHT) ---
    { id: 'push_up', name: 'Push Ups', type: 'calisthenics', muscleGroup: 'Chest', defaultRestSeconds: 60 },
    { id: 'diamond_push_up', name: 'Diamond Push Ups', type: 'calisthenics', muscleGroup: 'Triceps', defaultRestSeconds: 60 },
    { id: 'pull_up', name: 'Pull Ups', type: 'calisthenics', muscleGroup: 'Back', defaultRestSeconds: 90 },
    { id: 'chin_up', name: 'Chin Ups', type: 'calisthenics', muscleGroup: 'Back', defaultRestSeconds: 90 },
    { id: 'dip', name: 'Dips', type: 'calisthenics', muscleGroup: 'Chest', defaultRestSeconds: 90 },
    { id: 'muscle_up', name: 'Muscle Up', type: 'calisthenics', muscleGroup: 'Full Body', defaultRestSeconds: 180 },
    { id: 'pistol_squat', name: 'Pistol Squat', type: 'calisthenics', muscleGroup: 'Legs', defaultRestSeconds: 90 },
    { id: 'l_sit', name: 'L-Sit Hold', type: 'calisthenics', muscleGroup: 'Core', defaultRestSeconds: 60 },
    { id: 'plank', name: 'Plank Hold', type: 'calisthenics', muscleGroup: 'Core', defaultRestSeconds: 60 },
    { id: 'burpee', name: 'Burpees', type: 'hiit', muscleGroup: 'Full Body', defaultRestSeconds: 30 },
    { id: 'mountain_climber', name: 'Mountain Climbers', type: 'hiit', muscleGroup: 'Core', defaultRestSeconds: 30 },

    // --- YOGA (ASANAS) ---
    { id: 'yoga_mountain', name: 'Mountain Pose (Tadasana)', type: 'yoga', muscleGroup: 'Full Body', defaultRestSeconds: 0 },
    { id: 'yoga_down_dog', name: 'Downward-Facing Dog', type: 'yoga', muscleGroup: 'Full Body', defaultRestSeconds: 0 },
    { id: 'yoga_up_dog', name: 'Upward-Facing Dog', type: 'yoga', muscleGroup: 'Back', defaultRestSeconds: 0 },
    { id: 'yoga_cat_cow', name: 'Cat-Cow Flow', type: 'yoga', muscleGroup: 'Spine', defaultRestSeconds: 0 },
    { id: 'yoga_warrior_1', name: 'Warrior I', type: 'yoga', muscleGroup: 'Legs', defaultRestSeconds: 0 },
    { id: 'yoga_warrior_2', name: 'Warrior II', type: 'yoga', muscleGroup: 'Legs', defaultRestSeconds: 0 },
    { id: 'yoga_warrior_3', name: 'Warrior III', type: 'yoga', muscleGroup: 'Balance', defaultRestSeconds: 0 },
    { id: 'yoga_triangle', name: 'Triangle Pose', type: 'yoga', muscleGroup: 'Legs', defaultRestSeconds: 0 },
    { id: 'yoga_tree', name: 'Tree Pose', type: 'yoga', muscleGroup: 'Balance', defaultRestSeconds: 0 },
    { id: 'yoga_chair', name: 'Chair Pose', type: 'yoga', muscleGroup: 'Legs', defaultRestSeconds: 0 },
    { id: 'yoga_child', name: 'Child\'s Pose', type: 'yoga', muscleGroup: 'Rest', defaultRestSeconds: 0 },
    { id: 'yoga_cobra', name: 'Cobra Pose', type: 'yoga', muscleGroup: 'Back', defaultRestSeconds: 0 },
    { id: 'yoga_pigeon', name: 'Pigeon Pose', type: 'yoga', muscleGroup: 'Hips', defaultRestSeconds: 0 },
    { id: 'yoga_crow', name: 'Crow Pose', type: 'yoga', muscleGroup: 'Arms', defaultRestSeconds: 0 },
    { id: 'yoga_bridge', name: 'Bridge Pose', type: 'yoga', muscleGroup: 'Glutes', defaultRestSeconds: 0 },
    { id: 'yoga_corpse', name: 'Savasana', type: 'yoga', muscleGroup: 'Rest', defaultRestSeconds: 0 },
    { id: 'yoga_sun_sal_a', name: 'Sun Salutation A', type: 'yoga', muscleGroup: 'Flow', defaultRestSeconds: 0 },

    // --- CARDIO ---
    { id: 'run', name: 'Running', type: 'cardio', muscleGroup: 'Cardio', defaultRestSeconds: 0 },
    { id: 'sprint', name: 'Sprints', type: 'cardio', muscleGroup: 'Cardio', defaultRestSeconds: 60 },
    { id: 'cycle', name: 'Cycling', type: 'cardio', muscleGroup: 'Cardio', defaultRestSeconds: 0 },
    { id: 'jump_rope', name: 'Jump Rope', type: 'cardio', muscleGroup: 'Cardio', defaultRestSeconds: 0 },
    { id: 'row_machine', name: 'Rowing Machine', type: 'cardio', muscleGroup: 'Cardio', defaultRestSeconds: 0 },
];

// --- Comprehensive Plans ---

export const WORKOUT_PLANS: WorkoutPlan[] = [
    // --- STRENGTH ---
    {
        id: 'plan_stronglift',
        title: '5x5 Strength Base',
        description: 'The gold standard for beginner strength. Focus on heavy compound lifts.',
        category: 'Strength',
        difficulty: 'Beginner',
        durationMinutes: 45,
        tags: ['Gym Required', 'Barbell', 'Muscle Build'],
        exercises: [
            { exerciseId: 'squat', targetSets: 5, targetReps: 5 },
            { exerciseId: 'bench_press', targetSets: 5, targetReps: 5 },
            { exerciseId: 'row', targetSets: 5, targetReps: 5 },
        ]
    },
    {
        id: 'plan_upper_power',
        title: 'Upper Body Power',
        description: 'Advanced hypertrophy routine for chest, back, and shoulders.',
        category: 'Strength',
        difficulty: 'Advanced',
        durationMinutes: 60,
        tags: ['Gym Required', 'Hypertrophy', 'Aesthetics'],
        exercises: [
            { exerciseId: 'bench_press', targetSets: 4, targetReps: 8 },
            { exerciseId: 'overhead_press', targetSets: 4, targetReps: 10 },
            { exerciseId: 'lat_pulldown', targetSets: 4, targetReps: 12 },
            { exerciseId: 'incline_bench', targetSets: 3, targetReps: 10 },
            { exerciseId: 'lateral_raise', targetSets: 4, targetReps: 15 },
        ]
    },
    {
        id: 'plan_lower_focus',
        title: 'Leg Day Destruction',
        description: 'High volume leg workout to build mass and power.',
        category: 'Strength',
        difficulty: 'Intermediate',
        durationMinutes: 55,
        tags: ['Gym Required', 'Legs', 'High Volume'],
        exercises: [
            { exerciseId: 'squat', targetSets: 4, targetReps: 8 },
            { exerciseId: 'deadlift', targetSets: 3, targetReps: 5 },
            { exerciseId: 'leg_press', targetSets: 4, targetReps: 15 },
            { exerciseId: 'lunge', targetSets: 3, targetReps: 12 },
        ]
    },

    // --- YOGA ---
    {
        id: 'plan_yoga_morning',
        title: 'Morning Sun Flow',
        description: 'Energize your body with this classic Vinyasa flow. Perfect way to start the day.',
        category: 'Yoga',
        difficulty: 'Beginner',
        durationMinutes: 20,
        tags: ['No Equipment', 'Flexibility', 'Mindfulness'],
        exercises: [
            { exerciseId: 'yoga_mountain', targetSets: 1, targetReps: 1, targetDuration: 60 },
            { exerciseId: 'yoga_sun_sal_a', targetSets: 5, targetReps: 1 },
            { exerciseId: 'yoga_warrior_1', targetSets: 2, targetReps: 1, targetDuration: 30 },
            { exerciseId: 'yoga_warrior_2', targetSets: 2, targetReps: 1, targetDuration: 30 },
            { exerciseId: 'yoga_child', targetSets: 1, targetReps: 1, targetDuration: 60 },
        ]
    },
    {
        id: 'plan_yoga_core',
        title: 'Power Yoga Core',
        description: 'A challenging sequence focusing on balance and abdominal strength.',
        category: 'Yoga',
        difficulty: 'Intermediate',
        durationMinutes: 30,
        tags: ['No Equipment', 'Strength', 'Balance'],
        exercises: [
            { exerciseId: 'yoga_down_dog', targetSets: 3, targetReps: 1, targetDuration: 30 },
            { exerciseId: 'yoga_plank', targetSets: 3, targetReps: 1, targetDuration: 45 },
            { exerciseId: 'yoga_chair', targetSets: 3, targetReps: 1, targetDuration: 30 },
            { exerciseId: 'yoga_crow', targetSets: 5, targetReps: 1, targetDuration: 10 },
            { exerciseId: 'yoga_bridge', targetSets: 3, targetReps: 1, targetDuration: 30 },
        ]
    },
    {
        id: 'plan_yoga_relax',
        title: 'Bedtime Release',
        description: 'Deep stretching to release tension before sleep.',
        category: 'Yoga',
        difficulty: 'Beginner',
        durationMinutes: 15,
        tags: ['No Equipment', 'Relaxation', 'Recovery'],
        exercises: [
            { exerciseId: 'yoga_child', targetSets: 1, targetReps: 1, targetDuration: 120 },
            { exerciseId: 'yoga_pigeon', targetSets: 2, targetReps: 1, targetDuration: 90 },
            { exerciseId: 'yoga_cat_cow', targetSets: 1, targetReps: 20 },
            { exerciseId: 'yoga_corpse', targetSets: 1, targetReps: 1, targetDuration: 300 },
        ]
    },

    // --- CALISTHENICS ---
    {
        id: 'plan_bodyweight_basic',
        title: 'Zero Gear Full Body',
        description: 'No gym? No problem. Hit every muscle group at home.',
        category: 'Calisthenics',
        difficulty: 'Beginner',
        durationMinutes: 30,
        tags: ['No Equipment', 'Home Workout', 'Endurance'],
        exercises: [
            { exerciseId: 'push_up', targetSets: 3, targetReps: 15 },
            { exerciseId: 'squat', targetSets: 4, targetReps: 25 }, // Air squats
            { exerciseId: 'lunge', targetSets: 3, targetReps: 20 },
            { exerciseId: 'plank', targetSets: 3, targetReps: 1, targetDuration: 60 },
            { exerciseId: 'burpee', targetSets: 3, targetReps: 10 },
        ]
    },
    {
        id: 'plan_calisthenics_skills',
        title: 'Bar Skills Progression',
        description: 'Advanced movements for bar athletes. Focus on control.',
        category: 'Calisthenics',
        difficulty: 'Advanced',
        durationMinutes: 45,
        tags: ['Pull-up Bar', 'Skills', 'Strength'],
        exercises: [
            { exerciseId: 'muscle_up', targetSets: 5, targetReps: 3 },
            { exerciseId: 'dip', targetSets: 4, targetReps: 15 },
            { exerciseId: 'pull_up', targetSets: 4, targetReps: 12 },
            { exerciseId: 'l_sit', targetSets: 4, targetReps: 1, targetDuration: 20 },
            { exerciseId: 'pistol_squat', targetSets: 3, targetReps: 8 },
        ]
    },

    // --- HIIT & CARDIO ---
    {
        id: 'plan_hiit_shred',
        title: '15 Min Fat Incinerator',
        description: 'Maximum effort, short rest. Get your heart rate to the max.',
        category: 'HIIT',
        difficulty: 'Intermediate',
        durationMinutes: 15,
        tags: ['No Equipment', 'Fat Loss', 'Intense'],
        exercises: [
            { exerciseId: 'burpee', targetSets: 4, targetReps: 20 },
            { exerciseId: 'mountain_climber', targetSets: 4, targetReps: 40 },
            { exerciseId: 'jump_rope', targetSets: 4, targetReps: 100 },
            { exerciseId: 'sprint', targetSets: 4, targetReps: 1, targetDuration: 30 },
        ]
    },
    {
        id: 'plan_cardio_endure',
        title: '5K Prep Run',
        description: 'A steady state run to build cardiovascular endurance.',
        category: 'Cardio',
        difficulty: 'Beginner',
        durationMinutes: 35,
        tags: ['Outdoor', 'Running', 'Health'],
        exercises: [
            { exerciseId: 'run', targetSets: 1, targetReps: 1, targetDuration: 1800 }, // 30 mins
        ]
    }
];

export const getExerciseById = (id: string): Exercise | undefined => {
    return EXERCISE_DB.find(e => e.id === id);
};

export const calculateCaloriesBurned = (session: WorkoutSession): number => {
    let cals = 0;
    const durationMin = session.durationSeconds / 60;
    
    // Heuristics based on exercise type in session
    const types = new Set(session.exercises.map(e => e.exercise.type));
    
    if (types.has('hiit')) {
        cals = durationMin * 12; // High burn
    } else if (types.has('cardio')) {
        cals = durationMin * 10;
    } else if (types.has('strength')) {
        cals = durationMin * 5; // Lower active burn, higher EPOC
    } else if (types.has('yoga')) {
        cals = durationMin * 3.5;
    } else {
        cals = durationMin * 6;
    }

    return Math.round(cals);
};
