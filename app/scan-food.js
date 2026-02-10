import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { useFood } from '../context/FoodContext';
import { analyzeFoodImage } from '../services/ai';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Gradients } from '../constants/theme';

export default function ScanFoodScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const cameraRef = useRef(null);
  const router = useRouter();
  const { addFood, getDefaultMealType } = useFood();

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ color: Colors.text, textAlign: 'center', marginTop: 100 }}>We need camera access</Text>
        <Pressable onPress={requestPermission} style={styles.btn}><Text>Grant Permission</Text></Pressable>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photoData = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.3 });
        setPhoto(photoData);
        analyzeImage(photoData.base64);
      } catch (error) {
        Alert.alert('Error', 'Could not take photo');
      }
    }
  };

  const analyzeImage = async (base64Image) => {
    setAnalyzing(true);
    try {
      const result = await analyzeFoodImage(base64Image);
      setAnalysis(result);
      // Clear base64 from memory, keep only URI for display
      setPhoto((prev) => prev ? { uri: prev.uri } : null);
    } catch (error) {
      Alert.alert('AI Error', 'Could not analyze food. Try again.');
      setPhoto(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (analysis) {
      addFood({ name: analysis.name, calories: analysis.calories, protein: analysis.protein, carbs: analysis.carbs, fat: analysis.fat }, getDefaultMealType());
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      {!photo ? (
        <CameraView style={styles.camera} ref={cameraRef}>
          <View style={styles.overlay}>
            <Pressable onPress={() => router.back()} style={styles.closeBtn}><X size={24} color={Colors.text} /></Pressable>
            <View style={styles.controls}>
              <Pressable onPress={takePicture} style={styles.captureBtn}><View style={styles.captureInner} /></Pressable>
            </View>
          </View>
        </CameraView>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.previewImage} />
          <LinearGradient colors={['transparent', Colors.background]} style={styles.resultOverlay}>
            {analyzing ? (
              <View style={styles.loadingBox}><ActivityIndicator size='large' color={Colors.primary} /><Text style={styles.loadingText}>Analyzing Food...</Text></View>
            ) : analysis ? (
              <View style={styles.resultBox}>
                <Text style={styles.foodName}>{analysis.name}</Text>
                <Text style={styles.portion}>{analysis.serving}</Text>
                <View style={styles.macroRow}>
                  <View style={styles.macro}><Text style={styles.macroVal}>{analysis.calories}</Text><Text style={styles.macroLabel}>KCAL</Text></View>
                  <View style={styles.macro}><Text style={[styles.macroVal, {color: Colors.success}]}>{analysis.protein}g</Text><Text style={styles.macroLabel}>PRO</Text></View>
                  <View style={styles.macro}><Text style={[styles.macroVal, {color: Colors.protein}]}>{analysis.carbs}g</Text><Text style={styles.macroLabel}>CARB</Text></View>
                  <View style={styles.macro}><Text style={[styles.macroVal, {color: Colors.fat}]}>{analysis.fat}g</Text><Text style={styles.macroLabel}>FAT</Text></View>
                </View>
                <View style={styles.actionRow}>
                  <Pressable onPress={() => setPhoto(null)} style={styles.retakeBtn}><Text style={styles.btnText}>Retake</Text></Pressable>
                  <Pressable onPress={handleSave} style={styles.saveBtn}><Text style={styles.saveText}>Add to Log</Text></Pressable>
                </View>
              </View>
            ) : null}
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between', padding: Spacing.lg },
  closeBtn: { marginTop: 40, alignSelf: 'flex-start', padding: Spacing.sm, backgroundColor: Colors.overlayLight, borderRadius: BorderRadius.lg },
  controls: { alignItems: 'center', marginBottom: Spacing.xl },
  captureBtn: { width: 80, height: 80, borderRadius: BorderRadius.full, borderWidth: 4, borderColor: Colors.text, justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 64, height: 64, borderRadius: BorderRadius.full, backgroundColor: Colors.text },
  previewContainer: { flex: 1 },
  previewImage: { flex: 1 },
  resultOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, paddingTop: 100 },
  loadingBox: { alignItems: 'center', paddingBottom: 40 },
  loadingText: { color: Colors.text, marginTop: Spacing.md, fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  resultBox: { backgroundColor: Colors.surfaceGlassDark, padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.inputBorder },
  foodName: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center' },
  portion: { color: Colors.textTertiary, textAlign: 'center', marginBottom: Spacing.lg },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  macro: { alignItems: 'center' },
  macroVal: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  macroLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: Spacing.xs },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  retakeBtn: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, backgroundColor: Colors.surfaceBright, alignItems: 'center' },
  saveBtn: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, backgroundColor: Colors.primary, alignItems: 'center' },
  btnText: { color: Colors.text, fontWeight: FontWeight.semibold },
  saveText: { color: Colors.background, fontWeight: FontWeight.bold },
});
