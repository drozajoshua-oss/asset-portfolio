import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

// Catches any render/runtime error in the tree and shows it ON SCREEN instead
// of a blank/black screen. Critical for diagnosing production (TestFlight) builds
// where there's no dev console.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={eb.root} contentContainerStyle={eb.content}>
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.sub}>This screen is here to help diagnose the issue.</Text>
          <Text style={eb.label}>Error</Text>
          <Text style={eb.mono}>{String(this.state.error?.message || this.state.error)}</Text>
          {this.state.error?.stack ? (
            <>
              <Text style={eb.label}>Stack</Text>
              <Text style={eb.mono}>{String(this.state.error.stack)}</Text>
            </>
          ) : null}
          {this.state.info?.componentStack ? (
            <>
              <Text style={eb.label}>Component stack</Text>
              <Text style={eb.mono}>{String(this.state.info.componentStack)}</Text>
            </>
          ) : null}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24, paddingTop: 80 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginTop: 16, marginBottom: 4 },
  mono: { fontSize: 12, color: '#B91C1C', fontFamily: 'Courier' },
});
