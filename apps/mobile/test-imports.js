// Test imports for all 6 native modules
try {
  // 1. sherpa-onnx
  const sherpa = require('react-native-sherpa-onnx');
  console.log('✓ sherpa-onnx imported');
} catch (e) { console.log('✗ sherpa-onnx:', e.message); }

try {
  // 2. VisionCamera
  const { Camera } = require('react-native-vision-camera');
  console.log('✓ VisionCamera imported');
} catch (e) { console.log('✗ VisionCamera:', e.message); }

try {
  // 3. Reanimated
  const Reanimated = require('react-native-reanimated');
  console.log('✓ Reanimated imported');
} catch (e) { console.log('✗ Reanimated:', e.message); }

try {
  // 4. MapLibre
  const MapLibre = require('@maplibre/maplibre-react-native');
  console.log('✓ MapLibre imported');
} catch (e) { console.log('✗ MapLibre:', e.message); }

try {
  // 5. op-sqlite
  const { openDatabaseSync } = require('op-sqlite');
  console.log('✓ op-sqlite imported');
} catch (e) { console.log('✗ op-sqlite:', e.message); }

try {
  // 6. expo-audio
  const { AudioPlayer, AudioRecorder } = require('expo-audio');
  console.log('✓ expo-audio imported');
} catch (e) { console.log('✗ expo-audio:', e.message); }

console.log('RUNTIME_TEST_COMPLETE');