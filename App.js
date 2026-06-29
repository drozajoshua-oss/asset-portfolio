import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import ScanScreen       from './src/screens/ScanScreen';
import CollectionScreen from './src/screens/CollectionScreen';
import DashboardScreen  from './src/screens/DashboardScreen';
import AuthScreen       from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { C }            from './src/constants/colors';
import { AuthProvider, useAuth }         from './src/context/AuthContext';
import { CollectionProvider }            from './src/context/CollectionContext';

const Tab = createBottomTabNavigator();

const TABS = {
  Scan:       { active: 'camera',      inactive: 'camera-outline' },
  Collection: { active: 'albums',      inactive: 'albums-outline' },
  Dashboard:  { active: 'stats-chart', inactive: 'stats-chart-outline' },
};

function MainTabs() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? TABS[route.name].active : TABS[route.name].inactive}
              size={size}
              color={color}
            />
          ),
          tabBarActiveTintColor:   C.accent,
          tabBarInactiveTintColor: C.textMuted,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopWidth: 1,
            borderTopColor: C.border,
            shadowColor:   C.shadow,
            shadowOffset:  { width: 0, height: -2 },
            shadowOpacity: 1,
            shadowRadius:  8,
            elevation: 8,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 4 : 10,
            height: Platform.OS === 'ios' ? 80 : 64,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.6,
            marginTop: -2,
          },
          tabBarItemStyle: { borderRadius: 12 },
        })}
      >
        <Tab.Screen name="Scan"       component={ScanScreen} />
        <Tab.Screen name="Collection" component={CollectionScreen} />
        <Tab.Screen name="Dashboard"  component={DashboardScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const ONBOARDING_KEY = 'onboarding_complete_v1';

function AppContent() {
  const { session, loading } = useAuth();
  const [onboarded, setOnboarded] = useState(null); // null = still loading flag

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then(v => setOnboarded(v === 'true'))
      .catch(() => setOnboarded(false));
  }, []);

  async function completeOnboarding() {
    setOnboarded(true);
    try { await AsyncStorage.setItem(ONBOARDING_KEY, 'true'); } catch (_) {}
  }

  if (loading || onboarded === null) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!onboarded) return <OnboardingScreen onDone={completeOnboarding} />;

  if (!session) return <AuthScreen />;

  return <MainTabs />;
}

export default function App() {
  return (
    <AuthProvider>
      <CollectionProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <AppContent />
        </SafeAreaProvider>
      </CollectionProvider>
    </AuthProvider>
  );
}
