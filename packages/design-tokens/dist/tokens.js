/**
 * Design Tokens for Courier Copilot
 * Enterprise-grade design system (D7)
 * Supports day/night/high-contrast themes (D16)
 * Built for NativeWind + Style Dictionary pipeline
 */
// Color Palette - Semantic tokens
export const colors = {
    // Brand colors - Courier Orange/Blue
    brand: {
        primary: {
            50: '#fff4ed',
            100: '#ffe8d0',
            200: '#ffd1a1',
            300: '#ffb066',
            400: '#ff8a33',
            500: '#ff6b00', // Primary brand orange
            600: '#e65400',
            700: '#cc4400',
            800: '#b33300',
            900: '#992600',
            950: '#4d1300',
        },
        secondary: {
            50: '#eef7ff',
            100: '#d0e8ff',
            200: '#a1d1ff',
            300: '#66adff',
            400: '#3391ff',
            500: '#0070e6', // Primary brand blue
            600: '#0059cc',
            700: '#0044b3',
            800: '#003399',
            900: '#002680',
            950: '#001340',
        },
    },
    // Semantic colors for status/feedback
    semantic: {
        success: {
            light: '#10b981',
            DEFAULT: '#059669',
            dark: '#047857',
            bg: '#ecfdf5',
            border: '#a7f3d0',
        },
        warning: {
            light: '#fbbf24',
            DEFAULT: '#f59e0b',
            dark: '#d97706',
            bg: '#fffbeb',
            border: '#fde68a',
        },
        error: {
            light: '#f87171',
            DEFAULT: '#ef4444',
            dark: '#dc2626',
            bg: '#fef2f2',
            border: '#fecaca',
        },
        info: {
            light: '#60a5fa',
            DEFAULT: '#3b82f6',
            dark: '#2563eb',
            bg: '#eff6ff',
            border: '#bfdbfe',
        },
    },
    // Neutral grays
    neutral: {
        0: '#ffffff',
        50: '#fafafa',
        100: '#f4f4f5',
        200: '#e4e4e7',
        300: '#d4d4d8',
        400: '#a1a1aa',
        500: '#71717a',
        600: '#52525b',
        700: '#3f3f46',
        800: '#27272a',
        900: '#18181b',
        950: '#09090b',
    },
    // Background colors (semantic)
    background: {
        primary: '{neutral.0}',
        secondary: '{neutral.50}',
        tertiary: '{neutral.100}',
        inverse: '{neutral.900}',
        overlay: 'rgba(0, 0, 0, 0.5)',
    },
    // Surface colors (cards, sheets, modals)
    surface: {
        primary: '{neutral.0}',
        secondary: '{neutral.50}',
        tertiary: '{neutral.100}',
        elevated: '{neutral.0}',
        inverse: '{neutral.900}',
    },
    // Border colors
    border: {
        light: '{neutral.200}',
        DEFAULT: '{neutral.300}',
        dark: '{neutral.400}',
        focus: '{brand.primary.500}',
        error: '{semantic.error.DEFAULT}',
    },
    // Text colors
    text: {
        primary: '{neutral.900}',
        secondary: '{neutral.600}',
        tertiary: '{neutral.400}',
        inverse: '{neutral.0}',
        link: '{brand.secondary.500}',
        linkHover: '{brand.secondary.600}',
        error: '{semantic.error.DEFAULT}',
        success: '{semantic.success.DEFAULT}',
        warning: '{semantic.warning.DEFAULT}',
    },
    // Icon colors
    icon: {
        primary: '{neutral.700}',
        secondary: '{neutral.400}',
        inverse: '{neutral.0}',
        brand: '{brand.primary.500}',
    },
    // Status colors for delivery states
    status: {
        pending: '{neutral.500}',
        active: '{brand.secondary.500}',
        delivered: '{semantic.success.DEFAULT}',
        failed: '{semantic.error.DEFAULT}',
        skipped: '{semantic.warning.DEFAULT}',
    },
};
// Spacing scale (4px base)
export const spacing = {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
};
// Typography
export const typography = {
    fontFamilies: {
        sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        mono: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        display: 'Inter Display, Inter, system-ui, sans-serif',
    },
    fontSizes: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '36px',
        '5xl': '48px',
    },
    fontWeights: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },
    lineHeights: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75',
    },
    letterSpacing: {
        tight: '-0.02em',
        normal: '0',
        wide: '0.02em',
    },
};
// Border radius
export const borderRadius = {
    none: '0',
    sm: '4px',
    DEFAULT: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
};
// Shadows
export const shadows = {
    none: 'none',
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    // Elevation shadows for Material-like depth
    elevation1: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
    elevation2: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10)',
    elevation3: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
    elevation4: '0 14px 28px rgba(0,0,0,0.18), 0 3px 6px rgba(0,0,0,0.12)',
    elevation5: '0 19px 38px rgba(0,0,0,0.20), 0 3px 6px rgba(0,0,0,0.15)',
};
// Animation / Motion
export const motion = {
    durations: {
        instant: '0ms',
        fast: '150ms',
        normal: '250ms',
        slow: '350ms',
        slower: '500ms',
    },
    easings: {
        linear: 'linear',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        // Spring-like for interactive elements
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
};
// Z-index scale
export const zIndex = {
    hide: -1,
    base: 0,
    dropdown: 100,
    sticky: 200,
    fixed: 300,
    modalBackdrop: 400,
    modal: 500,
    popover: 600,
    tooltip: 700,
    toast: 800,
    max: 9999,
};
// Breakpoints (for responsive design)
export const breakpoints = {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
};
// Touch target sizes (accessibility)
export const touchTarget = {
    minimum: '44px',
    comfortable: '48px',
    spacious: '56px',
};
// Component-specific tokens
export const components = {
    button: {
        height: {
            sm: '36px',
            DEFAULT: '44px',
            lg: '52px',
        },
        paddingX: {
            sm: '{spacing.3}',
            DEFAULT: '{spacing.4}',
            lg: '{spacing.6}',
        },
        borderRadius: '{borderRadius.DEFAULT}',
        fontSize: '{typography.fontSizes.sm}',
        fontWeight: '{typography.fontWeights.medium}',
    },
    input: {
        height: '{button.height.DEFAULT}',
        paddingX: '{spacing.4}',
        paddingY: '{spacing.2}',
        borderRadius: '{borderRadius.DEFAULT}',
        fontSize: '{typography.fontSizes.base}',
        borderWidth: '1px',
    },
    card: {
        padding: '{spacing.4}',
        borderRadius: '{borderRadius.lg}',
        shadow: '{shadows.elevation1}',
        borderWidth: '1px',
        borderColor: '{border.light}',
    },
    badge: {
        paddingX: '{spacing.2}',
        paddingY: '{spacing.0.5}',
        borderRadius: '{borderRadius.full}',
        fontSize: '{typography.fontSizes.xs}',
        fontWeight: '{typography.fontWeights.medium}',
    },
    // Map-specific tokens (D16 custom map style)
    map: {
        // Day theme colors
        day: {
            background: '#f8f9fa',
            water: '#d6eaff',
            land: '#f5f5f0',
            road: '#ffffff',
            roadOutline: '#e0e0e0',
            highway: '#ff6b00',
            highwayOutline: '#e65400',
            building: '#e8e8e8',
            park: '#d4edda',
            text: '#18181b',
            textHalo: '#ffffff',
            stopPin: '#ff6b00',
            stopPinHalo: '#ffffff',
            routeLine: '#0070e6',
            routeLineWidth: '4px',
            geofenceApproach: 'rgba(255, 107, 0, 0.3)',
            geofenceImminent: 'rgba(255, 107, 0, 0.5)',
            userLocation: '#0070e6',
            userLocationHalo: 'rgba(0, 112, 230, 0.3)',
        },
        // Night theme colors
        night: {
            background: '#0f172a',
            water: '#0c1a2e',
            land: '#1e293b',
            road: '#334155',
            roadOutline: '#1e293b',
            highway: '#ff8a33',
            highwayOutline: '#ff6b00',
            building: '#334155',
            park: '#0f5132',
            text: '#f1f5f9',
            textHalo: '#0f172a',
            stopPin: '#ff8a33',
            stopPinHalo: '#0f172a',
            routeLine: '#66adff',
            routeLineWidth: '4px',
            geofenceApproach: 'rgba(255, 138, 51, 0.3)',
            geofenceImminent: 'rgba(255, 138, 51, 0.5)',
            userLocation: '#66adff',
            userLocationHalo: 'rgba(102, 173, 255, 0.3)',
        },
        // High contrast theme colors
        highContrast: {
            background: '#000000',
            water: '#000080',
            land: '#000000',
            road: '#ffffff',
            roadOutline: '#000000',
            highway: '#ffff00',
            highwayOutline: '#000000',
            building: '#ffffff',
            park: '#008000',
            text: '#ffffff',
            textHalo: '#000000',
            stopPin: '#ffff00',
            stopPinHalo: '#000000',
            routeLine: '#00ffff',
            routeLineWidth: '5px',
            geofenceApproach: 'rgba(255, 255, 0, 0.5)',
            geofenceImminent: 'rgba(255, 255, 0, 0.8)',
            userLocation: '#00ffff',
            userLocationHalo: 'rgba(0, 255, 255, 0.5)',
        },
    },
};
// Voice UI specific tokens
export const voice = {
    // Visual feedback for voice states
    listening: {
        pulseColor: '{brand.primary.500}',
        pulseDuration: '{motion.durations.slow}',
        ringWidth: '4px',
    },
    processing: {
        spinnerColor: '{brand.secondary.500}',
        spinnerDuration: '{motion.durations.normal}',
    },
    speaking: {
        waveColor: '{semantic.success.DEFAULT}',
        waveDuration: '{motion.durations.fast}',
    },
    error: {
        flashColor: '{semantic.error.DEFAULT}',
        flashDuration: '{motion.durations.fast}',
    },
    // Earbud button visual feedback
    earbud: {
        singleClick: '{semantic.success.DEFAULT}',
        doubleClick: '{semantic.warning.DEFAULT}',
        tripleClick: '{semantic.error.DEFAULT}',
        longPress: '{brand.primary.500}',
    },
};
// Export all tokens as a single object for Style Dictionary
export const tokens = {
    color: colors,
    spacing,
    typography,
    borderRadius,
    shadow: shadows,
    motion,
    zIndex,
    breakpoint: breakpoints,
    touchTarget,
    component: components,
    voice,
};
//# sourceMappingURL=tokens.js.map