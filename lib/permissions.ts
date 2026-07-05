import * as Location from 'expo-location';

// Thin native permission adapter (T-022, extended in T-024). This is the only onboarding piece
// that touches the OS, so it is kept minimal and free of app logic — the flow it feeds is the
// unit-tested state machine in lib/onboarding.ts. We request while-in-use (foreground) location
// only; background location is never requested (PRIVACY §1).

export type PermissionOutcome = 'granted' | 'denied';

/** Fire the OS while-in-use location dialog (after our own pre-prompt explainer, T-022). */
export async function requestLocationPermission(): Promise<PermissionOutcome> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}
