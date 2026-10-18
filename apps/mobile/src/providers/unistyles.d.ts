// Module augmentation for react-native-unistyles 3
// This extends the Unistyles theme with our design tokens

import { Theme, ThemeName } from '@courier/design-tokens/themes';

declare module 'react-native-unistyles' {
  export interface UnistylesThemes {
    day: Theme;
    night: Theme;
    highContrast: Theme;
  }
  
  export interface UnistylesSettings {
    initialTheme: ThemeName;
    CSSVars: boolean;
    adaptiveThemes: boolean;
  }
}