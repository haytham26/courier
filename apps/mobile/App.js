import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { ThemeProvider } from './src/providers/ThemeProvider';
import './src/unistyles';

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
  },
});
