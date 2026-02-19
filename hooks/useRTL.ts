import { useState, useEffect } from 'react';
import { I18nManager } from 'react-native';

export function useRTL() {
  const [isRTL, setIsRTL] = useState(I18nManager.isRTL);

  useEffect(() => {
    setIsRTL(I18nManager.isRTL);
  }, []);

  return {
    isRTL,
    flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
    textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left',
    transform: isRTL ? [{ scaleX: -1 }] : [],
  };
}
