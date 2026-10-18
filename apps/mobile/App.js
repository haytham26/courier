import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Slot } from 'expo-router';
import { ThemeProvider } from './src/providers/ThemeProvider';
import './global.css';

export default function App() {
  return (
    <ThemeProvider>
      <View style={styles.container}>
        <Slot />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'var(--color-background)',
  },
});