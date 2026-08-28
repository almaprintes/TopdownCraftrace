import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.almaprint.topdownrace',
  appName: 'Top Down RACE',
  webDir: 'dist',
  server: {
    iosScheme: 'capacitor'
  }
};

export default config;
