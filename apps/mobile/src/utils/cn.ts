import { clsx, type ClassValue } from 'clsx';
import { style as unistyle } from 'react-native-unistyles';

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
export const createStyles = unistyle.createStyleSheet;