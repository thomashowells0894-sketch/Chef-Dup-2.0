import { useEffect, useState } from 'react';
import {
  getActivationProgress,
  getActivationStage,
  getActivationStateSnapshot,
  loadActivationState,
  shouldShowValuePaywall,
  subscribeActivationState,
  type ActivationStage,
  type ActivationState,
} from '../lib/activationTracker';

interface UseActivationTrackerResult {
  state: ActivationState;
  stage: ActivationStage;
  progress: number;
  isLoading: boolean;
  showValuePaywall: boolean;
}

export function useActivationTracker(): UseActivationTrackerResult {
  const [state, setState] = useState<ActivationState>(getActivationStateSnapshot());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    loadActivationState()
      .then((loaded) => {
        if (!active) return;
        setState(loaded);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setIsLoading(false);
      });

    const unsubscribe = subscribeActivationState((nextState) => {
      if (!active) return;
      setState(nextState);
      setIsLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return {
    state,
    stage: getActivationStage(state),
    progress: getActivationProgress(state),
    isLoading,
    showValuePaywall: shouldShowValuePaywall(state),
  };
}

export default useActivationTracker;
