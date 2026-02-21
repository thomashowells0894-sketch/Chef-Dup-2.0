import { useState, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { parseVoiceFood } from '../services/ai';
import { hapticLight, hapticSuccess, hapticImpact } from '../lib/haptics';

export interface VoiceFood {
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
}

interface UseVoiceLoggingReturn {
  isRecording: boolean;
  isProcessing: boolean;
  showResults: boolean;
  transcript: string;
  detectedFoods: VoiceFood[];
  addedIndices: Set<number>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  closeResults: () => void;
  addSingleFood: (food: VoiceFood, mealType: string, index: number) => void;
  addAllFoods: (mealType: string) => void;
}

export function useVoiceLogging(
  onFoodAdded: (food: VoiceFood, mealType: string) => void,
): UseVoiceLoggingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedFoods, setDetectedFoods] = useState<VoiceFood[]>([]);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Microphone Access',
          'FuelIQ needs microphone access to log food by voice. Please enable it in Settings.',
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setShowResults(false);
      setTranscript('');
      setDetectedFoods([]);
      setAddedIndices(new Set());
      hapticLight();
    } catch (error) {
      Alert.alert('Recording Error', 'Could not start recording. Please try again.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    setIsRecording(false);
    setIsProcessing(true);
    hapticImpact();

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('No recording URI');
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      // Read audio file as base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Determine MIME type based on platform
      const mimeType = Platform.OS === 'ios' ? 'audio/mp4' : 'audio/webm';

      // Send to AI for transcription + food parsing
      const result = await parseVoiceFood(base64Audio, mimeType);

      setTranscript(result.transcript || '');
      setDetectedFoods(
        (result.foods || []).map((f: any) => ({
          name: (f.name as string) || 'Unknown',
          emoji: (f.emoji as string) || '\u{1F37D}\u{FE0F}',
          calories: (f.calories as number) || 0,
          protein: (f.protein as number) || 0,
          carbs: (f.carbs as number) || 0,
          fat: (f.fat as number) || 0,
          serving: (f.serving as string) || '1 serving',
        })),
      );
      setShowResults(true);
      hapticSuccess();

      // Clean up temp file
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        // Ignore cleanup errors
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to process voice recording';
      Alert.alert('Voice Error', message);
      recordingRef.current = null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const closeResults = useCallback(() => {
    setShowResults(false);
    setTranscript('');
    setDetectedFoods([]);
    setAddedIndices(new Set());
  }, []);

  const addSingleFood = useCallback(
    (food: VoiceFood, mealType: string, index: number) => {
      onFoodAdded(food, mealType);
      setAddedIndices((prev) => new Set(prev).add(index));
    },
    [onFoodAdded],
  );

  const addAllFoods = useCallback(
    (mealType: string) => {
      const newIndices = new Set(addedIndices);
      detectedFoods.forEach((food, i) => {
        if (!addedIndices.has(i)) {
          onFoodAdded(food, mealType);
          newIndices.add(i);
        }
      });
      setAddedIndices(newIndices);
    },
    [detectedFoods, addedIndices, onFoodAdded],
  );

  return {
    isRecording,
    isProcessing,
    showResults,
    transcript,
    detectedFoods,
    addedIndices,
    startRecording,
    stopRecording,
    closeResults,
    addSingleFood,
    addAllFoods,
  };
}
