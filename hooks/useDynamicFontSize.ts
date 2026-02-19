import { useState, useEffect } from 'react';
import { PixelRatio, Dimensions } from 'react-native';

const BASE_WIDTH = 375; // iPhone SE/8 width

/**
 * Returns a scale factor for responsive typography.
 * Respects the user's system font size preference.
 */
export function useDynamicFontSize() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fontScale = PixelRatio.getFontScale();
    const { width } = Dimensions.get('window');
    const screenScale = width / BASE_WIDTH;

    // Combine device font scaling with screen size scaling
    // Clamp between 0.8 and 1.4 to prevent extreme sizes
    const combinedScale = Math.min(1.4, Math.max(0.8, fontScale * Math.min(screenScale, 1.2)));
    setScale(combinedScale);

    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const newScreenScale = window.width / BASE_WIDTH;
      const newCombined = Math.min(1.4, Math.max(0.8, PixelRatio.getFontScale() * Math.min(newScreenScale, 1.2)));
      setScale(newCombined);
    });

    return () => subscription.remove();
  }, []);

  return {
    scale,
    fontSize: (base: number) => Math.round(base * scale),
  };
}
