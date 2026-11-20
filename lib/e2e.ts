// End-to-end test builds (T-367 · review I-12). Set only by .github/workflows/e2e.yml when it builds
// the emulator APK; Expo inlines EXPO_PUBLIC_ variables at build time, and no EAS profile sets it
// (__tests__/e2eBuild.test.js checks), so a store build never has it.
export const E2E_BUILD = process.env.EXPO_PUBLIC_E2E === '1';
