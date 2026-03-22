import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { normalizeManualProfileMeasurements } from '../lib/profileState';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

export default function ManualProfile() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [loading, setLoading] = useState(false);
  const prefilledUserRef = useRef(null);

  // Unit preference (true = Imperial, false = Metric)
  const [isImperial, setIsImperial] = useState(true);

  // Form State
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [goal, setGoal] = useState('Maintain');

  // Imperial inputs
  const [weightLbs, setWeightLbs] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');

  // Metric inputs
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');

  // Pre-fill form from existing profile data
  useEffect(() => {
    const currentUserId = user?.id || 'anonymous';
    if (prefilledUserRef.current === currentUserId) {
      return;
    }

    if (profile && profile.weight && profile.height && profile.age) {
      // Profile stores weight in lbs and height in inches
      const storedWeightLbs = profile.weight;
      const storedHeightInches = profile.height;

      setAge(profile.age?.toString() || '');
      setGender(profile.gender === 'female' ? 'Female' : 'Male');

      // Map weekly goal back to display value
      const goalReverseMap = {
        'lose2': 'Lose Fat',
        'lose1': 'Lose Fat',
        'lose05': 'Lose Fat',
        'maintain': 'Maintain',
        'gain05': 'Build Muscle',
        'gain1': 'Build Muscle',
      };
      setGoal(goalReverseMap[profile.weeklyGoal] || 'Maintain');

      // Set Imperial values
      setWeightLbs(storedWeightLbs?.toString() || '');
      const feet = Math.floor(storedHeightInches / 12);
      const inches = storedHeightInches % 12;
      setHeightFeet(feet?.toString() || '');
      setHeightInches(inches?.toString() || '');

      // Set Metric values (convert from stored imperial)
      const kg = Math.round(storedWeightLbs / 2.20462);
      const cm = Math.round(storedHeightInches * 2.54);
      setWeightKg(kg?.toString() || '');
      setHeightCm(cm?.toString() || '');
      prefilledUserRef.current = currentUserId;
    }
  }, [profile, user?.id]);

  // Validate inputs based on unit selection
  const validateInputs = () => {
    if (!age) {
      Alert.alert('Missing Info', 'Please enter your age.');
      return false;
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      Alert.alert('Invalid Age', 'Please enter an age between 13 and 120.');
      return false;
    }

    if (isImperial) {
      if (!weightLbs || !heightFeet) {
        Alert.alert('Missing Info', 'Please fill in your weight and height.');
        return false;
      }
      const w = parseFloat(weightLbs);
      const ft = parseInt(heightFeet, 10);
      const inches = parseInt(heightInches || '0', 10);
      if (isNaN(w) || w < 50 || w > 700) {
        Alert.alert('Invalid Weight', 'Please enter a weight between 50 and 700 lbs.');
        return false;
      }
      if (isNaN(ft) || ft < 3 || ft > 8 || inches < 0 || inches > 11) {
        Alert.alert('Invalid Height', 'Please enter a valid height (3-8 ft, 0-11 in).');
        return false;
      }
    } else {
      if (!weightKg || !heightCm) {
        Alert.alert('Missing Info', 'Please fill in your weight and height.');
        return false;
      }
      const w = parseFloat(weightKg);
      const h = parseFloat(heightCm);
      if (isNaN(w) || w < 25 || w > 320) {
        Alert.alert('Invalid Weight', 'Please enter a weight between 25 and 320 kg.');
        return false;
      }
      if (isNaN(h) || h < 90 || h > 250) {
        Alert.alert('Invalid Height', 'Please enter a height between 90 and 250 cm.');
        return false;
      }
    }

    return true;
  };

  const saveProfile = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const { weightLbs: canonicalWeightLbs, heightInches: canonicalHeightInches } =
        normalizeManualProfileMeasurements({
          isImperial,
          weightLbs,
          heightFeet,
          heightInches,
          weightKg,
          heightCm,
        });

      if (!canonicalWeightLbs || !canonicalHeightInches) {
        throw new Error('Could not convert your measurements. Please review your inputs.');
      }

      const goalMap = {
        'Lose Fat': 'lose1',
        'Maintain': 'maintain',
        'Build Muscle': 'gain05',
      };
      const weeklyGoal = goalMap[goal] || 'maintain';

      await updateProfile({
        age: parseInt(age, 10),
        weight: canonicalWeightLbs,
        height: canonicalHeightInches,
        gender: gender.toLowerCase(),
        weeklyGoal,
        activityLevel: 'moderate',
        weightUnit: isImperial ? 'lbs' : 'kg',
      }, {
        onboardingCompleted: true,
        targetBehavior: 'commit_generated',
      });

      router.replace('/(tabs)');
    } catch (error) {
      if (__DEV__) console.error("Save failed:", error);
      Alert.alert('Error', error.message || 'Could not save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.header}>Profile Setup</Text>
        <Text style={styles.subHeader}>Enter your stats to calculate your targets.</Text>

        {/* Unit Toggle */}
        <Text style={styles.sectionTitle}>Units</Text>
        <View style={styles.unitToggleContainer}>
          <TouchableOpacity
            style={[styles.unitToggle, isImperial && styles.unitToggleActive]}
            onPress={() => setIsImperial(true)}
          >
            <Text style={[styles.unitToggleText, isImperial && styles.unitToggleTextActive]}>
              Imperial (lbs, ft)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitToggle, !isImperial && styles.unitToggleActive]}
            onPress={() => setIsImperial(false)}
          >
            <Text style={[styles.unitToggleText, !isImperial && styles.unitToggleTextActive]}>
              Metric (kg, cm)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Age Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="31"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
          />
        </View>

        {/* Weight Input - conditional based on unit */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isImperial ? 'Weight (lbs)' : 'Weight (kg)'}</Text>
          <TextInput
            style={styles.input}
            placeholder={isImperial ? "180" : "82"}
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            value={isImperial ? weightLbs : weightKg}
            onChangeText={isImperial ? setWeightLbs : setWeightKg}
          />
        </View>

        {/* Height Input - conditional based on unit */}
        {isImperial ? (
          <>
            <Text style={styles.label}>Height</Text>
            <View style={styles.heightRow}>
              <View style={styles.heightInput}>
                <TextInput
                  style={styles.input}
                  placeholder="5"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  value={heightFeet}
                  onChangeText={setHeightFeet}
                />
                <Text style={styles.heightUnit}>ft</Text>
              </View>
              <View style={styles.heightInput}>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  value={heightInches}
                  onChangeText={setHeightInches}
                />
                <Text style={styles.heightUnit}>in</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              placeholder="178"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={heightCm}
              onChangeText={setHeightCm}
            />
          </View>
        )}

        {/* Gender Selection */}
        <Text style={styles.sectionTitle}>Gender</Text>
        <View style={styles.selectorContainer}>
          {['Male', 'Female'].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.selectorButton, gender === g && styles.activeButton]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.selectorText, gender === g && styles.activeText]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goal Selection */}
        <Text style={styles.sectionTitle}>Goal</Text>
        <View style={styles.selectorContainer}>
          {['Lose Fat', 'Maintain', 'Build Muscle'].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.selectorButton, goal === g && styles.activeButton]}
              onPress={() => setGoal(g)}
            >
              <Text style={[styles.selectorText, goal === g && styles.activeText]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.saveButtonText}>Complete Setup</Text>
          )}
        </TouchableOpacity>

        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
  scroll: { padding: Spacing.lg },
  backButton: { marginBottom: Spacing.lg },
  header: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  subHeader: { fontSize: FontSize.md, color: Colors.textTertiary, marginBottom: Spacing.xl },

  inputGroup: { marginBottom: Spacing.lg },

  label: { color: Colors.textSecondary, marginBottom: Spacing.sm, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  input: {
    backgroundColor: Colors.inputBackground,
    color: Colors.text,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: FontSize.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },

  // Unit toggle styles
  unitToggleContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  unitToggle: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  unitToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitToggleText: {
    color: Colors.textTertiary,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
  },
  unitToggleTextActive: {
    color: Colors.text,
    fontWeight: FontWeight.bold,
  },

  // Height row for feet + inches side by side
  heightRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  heightInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heightUnit: {
    color: Colors.textTertiary,
    fontSize: FontSize.md,
    marginLeft: Spacing.sm,
    fontWeight: FontWeight.semibold,
  },

  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.sm, marginBottom: Spacing.md },
  selectorContainer: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  selectorButton: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  activeButton: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  selectorText: { color: Colors.textTertiary, fontWeight: FontWeight.semibold },
  activeText: { color: Colors.text, fontWeight: FontWeight.bold },

  saveButton: {
    backgroundColor: Colors.text,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  saveButtonText: { color: Colors.background, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  skipButton: {
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  skipButtonText: { color: Colors.textTertiary, fontSize: FontSize.md },
});
