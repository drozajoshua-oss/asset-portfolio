import { registerRootComponent } from 'expo';
import React from 'react';
import { ScrollView, Text } from 'react-native';

// Last-resort diagnostic: if anything in the App import chain throws synchronously
// at startup (before React/ErrorBoundary can mount), show the error ON SCREEN
// instead of a black screen or native crash. Critical for debugging TestFlight,
// where there's no console.
function StartupError({ error }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Startup error</Text>
      <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 16 }}>
        The app failed to start. Details below.
      </Text>
      <Text selectable style={{ fontSize: 12, color: '#B91C1C', fontFamily: 'Courier' }}>
        {String((error && (error.stack || error.message)) || error)}
      </Text>
    </ScrollView>
  );
}

let Root;
try {
  Root = require('./App').default;
} catch (e) {
  Root = function FallbackRoot() {
    return <StartupError error={e} />;
  };
}

registerRootComponent(Root);
