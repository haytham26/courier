import { clsx, type ClassValue } from 'clsx';

/**
 * Utility to merge class names with Unistyles
 * Since Unistyles uses StyleSheet.create under the hood, we don't need twMerge
 * but we keep clsx for conditional classes
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Create styles with Unistyles - works like StyleSheet.create but with theme awareness
 */
export { StyleSheet } from 'react-native-unistyles';