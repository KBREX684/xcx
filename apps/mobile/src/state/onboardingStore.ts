import AsyncStorage from "@react-native-async-storage/async-storage";
import { ONBOARDING_VERSION } from "../onboarding/content";

const KEY = "acp.mobile.onboarding.version";

export interface OnboardingState {
  version: string | null;
  completed: boolean;
}

export async function readOnboardingState(): Promise<OnboardingState> {
  const version = await AsyncStorage.getItem(KEY);
  return {
    version,
    completed: version === ONBOARDING_VERSION,
  };
}

export async function markOnboardingComplete(): Promise<OnboardingState> {
  await AsyncStorage.setItem(KEY, ONBOARDING_VERSION);
  return {
    version: ONBOARDING_VERSION,
    completed: true,
  };
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export const onboardingStorageKey = KEY;
