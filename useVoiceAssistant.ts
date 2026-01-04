
import { useEffect, useState, useRef, useCallback } from 'react';

interface UseVoiceAssistantProps {
  onNext: () => void;
  onBack: () => void;
  onRepeat: () => void;
  enabled: boolean;
}

export const useVoiceAssistant = ({ onNext, onBack, onRepeat, enabled }: UseVoiceAssistantProps) => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
      
      console.log("Voice Command:", transcript);
      setLastCommand(transcript);

      if (transcript.includes('next')) {
        onNext();
      } else if (transcript.includes('back') || transcript.includes('previous')) {
        onBack();
      } else if (transcript.includes('repeat') || transcript.includes('again')) {
        onRepeat();
      }
    };

    recognition.onend = () => {
      if (enabled) {
        recognition.start(); // Auto-restart to keep listening
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [onNext, onBack, onRepeat, enabled]);

  // Toggle Listening based on enabled prop
  useEffect(() => {
    if (enabled && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        // Already started
      }
    } else if (!enabled && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [enabled]);

  const speak = useCallback((text: string) => {
    // Stop listening temporarily while speaking to avoid self-triggering
    if (recognitionRef.current) recognitionRef.current.abort();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      // Resume listening after speaking
      if (enabled && recognitionRef.current) {
        try {
            recognitionRef.current.start();
        } catch(e) {}
      }
    };

    window.speechSynthesis.cancel(); // Duck existing audio
    window.speechSynthesis.speak(utterance);
  }, [enabled]);

  return { isListening, lastCommand, speak };
};
