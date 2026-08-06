module.exports = {
  expo: {
    name: 'Trovault',
    slug: 'trovault',
    owner: 'jd379',
    version: '1.0.2',
    extra: {
      eas: {
        projectId: '27553097-c177-4015-9883-b42204259c71',
      },
    },
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    platforms: ['ios', 'android', 'web'],
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#2563EB',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.trovault.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.trovault.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#2563EB',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-asset',
      'expo-font',
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
