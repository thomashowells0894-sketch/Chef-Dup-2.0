import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.nutrichef.app',
  appName: 'NutriChef',
  webDir: 'dist',
  bundledWebRuntime: false,

  // iOS-specific configuration
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    preferredContentMode: 'mobile',
    scheme: 'NutriChef',
    backgroundColor: '#F8FAFC',
    // Enable entitlements
    allowsLinkPreview: true,
    limitsNavigationsToAppBoundDomains: true,
  },

  // Plugin configurations
  plugins: {
    // Splash Screen
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#F8FAFC',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: false,
    },

    // Status Bar
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#F8FAFC',
      overlaysWebView: false,
    },

    // Keyboard
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
      style: 'LIGHT',
    },

    // Push Notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // Local Notifications
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#F97316',
      sound: 'notification.wav',
    },

    // Camera
    Camera: {
      saveToGallery: false,
      promptLabelPhoto: 'Select from Gallery',
      promptLabelPicture: 'Take a Photo',
    },

    // CapAwesome App Update
    AppUpdate: {
      enabled: true,
    },

    // Haptics
    Haptics: {
      // iOS haptics enabled by default
    },

    // Preferences (Secure Storage)
    Preferences: {
      // Group for shared preferences
      group: 'ai.nutrichef.app.preferences',
    },
  },

  // Server configuration for live reload during development
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'nutrichef.app',
    allowNavigation: [
      'https://esm.sh',
      'https://cdn.tailwindcss.com',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://world.openfoodfacts.org',
      'https://image.pollinations.ai',
      'https://generativelanguage.googleapis.com',
    ],
  },
};

export default config;
