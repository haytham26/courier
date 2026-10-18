/**
 * Theme definitions for Courier Copilot
 * Day, Night, and High Contrast themes (D16)
 * Maps to NativeWind/Tailwind config
 */
import { spacing, typography, borderRadius, shadows, motion, components } from './tokens';
export type ThemeName = 'day' | 'night' | 'highContrast';
export interface ThemeColors {
    background: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;
    brandPrimary: string;
    brandSecondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    statusPending: string;
    statusActive: string;
    statusDelivered: string;
    statusFailed: string;
    statusSkipped: string;
    mapBackground: string;
    mapWater: string;
    mapLand: string;
    mapRoad: string;
    mapHighway: string;
    mapBuilding: string;
    mapPark: string;
    mapText: string;
    stopPin: string;
    routeLine: string;
    userLocation: string;
    [key: string]: string;
}
export interface Theme {
    name: ThemeName;
    displayName: string;
    colors: ThemeColors;
    spacing: typeof spacing;
    typography: typeof typography;
    borderRadius: typeof borderRadius;
    shadows: typeof shadows;
    motion: typeof motion;
    components: typeof components;
}
export declare const dayTheme: Theme;
export declare const nightTheme: Theme;
export declare const highContrastTheme: Theme;
export declare const themes: Record<ThemeName, Theme>;
export declare const defaultTheme: Theme;
export declare function getTheme(name: ThemeName): Theme;
export declare function getThemeNames(): ThemeName[];
export declare function generateCSSVariables(theme: Theme): string;
//# sourceMappingURL=themes.d.ts.map