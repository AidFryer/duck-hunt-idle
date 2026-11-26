import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the built web game (dist/) as native Android and iOS apps.
 * See docs/MOBILE_APPS.md for the step-by-step build instructions.
 */
const config: CapacitorConfig = {
  appId: 'com.duckhuntidle.app',
  appName: 'Duck Hunt Idle',
  webDir: 'dist',
  backgroundColor: '#1f1a17',
  android: {
    backgroundColor: '#1f1a17',
  },
  ios: {
    backgroundColor: '#1f1a17',
    contentInset: 'always',
  },
};

export default config;
