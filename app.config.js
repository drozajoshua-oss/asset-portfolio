module.exports = {
  expo: {
    name: 'Trovault',
    slug: 'trovault',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    platforms: ['ios', 'android', 'web'],
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#080B16',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.trovault.app',
    },
    android: {
      package: 'com.trovault.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#080B16',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-asset',
      [
        'expo-image-picker',
        {
          photosPermission: 'Trovault needs access to your photos so you can scan and identify your collectibles.',
          cameraPermission: 'Trovault needs camera access so you can photograph your collectibles.',
        },
      ],
    ],
  },
};
