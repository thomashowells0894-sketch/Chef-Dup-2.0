import * as Haptics from 'expo-haptics';

// ─── Light ─── Default taps, minor interactions
export async function hapticLight(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics not available
  }
}

// ─── Medium ─── Confirmations, toggles, switches
export async function hapticMedium(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Haptics not available
  }
}

// ─── Heavy ─── Important actions (delete, submit, major confirmations)
export async function hapticHeavy(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    // Haptics not available
  }
}

// ─── Success ─── Successful operations (food logged, workout completed, streak saved)
export async function hapticSuccess(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics not available
  }
}

// ─── Warning ─── Warnings (approaching calorie limit, nearing goal boundaries)
export async function hapticWarning(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // Haptics not available
  }
}

// ─── Error ─── Errors (failed operations, validation failures)
export async function hapticError(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Haptics not available
  }
}

// ─── Selection ─── Picker/selection changes (scroll pickers, segment controls)
export async function hapticSelection(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Haptics not available
  }
}

// ─── Generic Impact ─── Flexible impact with configurable style (backward compatible)
export async function hapticImpact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium): Promise<void> {
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Haptics not available
  }
}
