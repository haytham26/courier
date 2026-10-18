/**
 * Design Tokens for Courier Copilot
 * Enterprise-grade design system (D7)
 * Supports day/night/high-contrast themes (D16)
 * Built for NativeWind + Style Dictionary pipeline
 */
export declare const colors: {
    readonly brand: {
        readonly primary: {
            readonly 50: "#fff4ed";
            readonly 100: "#ffe8d0";
            readonly 200: "#ffd1a1";
            readonly 300: "#ffb066";
            readonly 400: "#ff8a33";
            readonly 500: "#ff6b00";
            readonly 600: "#e65400";
            readonly 700: "#cc4400";
            readonly 800: "#b33300";
            readonly 900: "#992600";
            readonly 950: "#4d1300";
        };
        readonly secondary: {
            readonly 50: "#eef7ff";
            readonly 100: "#d0e8ff";
            readonly 200: "#a1d1ff";
            readonly 300: "#66adff";
            readonly 400: "#3391ff";
            readonly 500: "#0070e6";
            readonly 600: "#0059cc";
            readonly 700: "#0044b3";
            readonly 800: "#003399";
            readonly 900: "#002680";
            readonly 950: "#001340";
        };
    };
    readonly semantic: {
        readonly success: {
            readonly light: "#10b981";
            readonly DEFAULT: "#059669";
            readonly dark: "#047857";
            readonly bg: "#ecfdf5";
            readonly border: "#a7f3d0";
        };
        readonly warning: {
            readonly light: "#fbbf24";
            readonly DEFAULT: "#f59e0b";
            readonly dark: "#d97706";
            readonly bg: "#fffbeb";
            readonly border: "#fde68a";
        };
        readonly error: {
            readonly light: "#f87171";
            readonly DEFAULT: "#ef4444";
            readonly dark: "#dc2626";
            readonly bg: "#fef2f2";
            readonly border: "#fecaca";
        };
        readonly info: {
            readonly light: "#60a5fa";
            readonly DEFAULT: "#3b82f6";
            readonly dark: "#2563eb";
            readonly bg: "#eff6ff";
            readonly border: "#bfdbfe";
        };
    };
    readonly neutral: {
        readonly 0: "#ffffff";
        readonly 50: "#fafafa";
        readonly 100: "#f4f4f5";
        readonly 200: "#e4e4e7";
        readonly 300: "#d4d4d8";
        readonly 400: "#a1a1aa";
        readonly 500: "#71717a";
        readonly 600: "#52525b";
        readonly 700: "#3f3f46";
        readonly 800: "#27272a";
        readonly 900: "#18181b";
        readonly 950: "#09090b";
    };
    readonly background: {
        readonly primary: "{neutral.0}";
        readonly secondary: "{neutral.50}";
        readonly tertiary: "{neutral.100}";
        readonly inverse: "{neutral.900}";
        readonly overlay: "rgba(0, 0, 0, 0.5)";
    };
    readonly surface: {
        readonly primary: "{neutral.0}";
        readonly secondary: "{neutral.50}";
        readonly tertiary: "{neutral.100}";
        readonly elevated: "{neutral.0}";
        readonly inverse: "{neutral.900}";
    };
    readonly border: {
        readonly light: "{neutral.200}";
        readonly DEFAULT: "{neutral.300}";
        readonly dark: "{neutral.400}";
        readonly focus: "{brand.primary.500}";
        readonly error: "{semantic.error.DEFAULT}";
    };
    readonly text: {
        readonly primary: "{neutral.900}";
        readonly secondary: "{neutral.600}";
        readonly tertiary: "{neutral.400}";
        readonly inverse: "{neutral.0}";
        readonly link: "{brand.secondary.500}";
        readonly linkHover: "{brand.secondary.600}";
        readonly error: "{semantic.error.DEFAULT}";
        readonly success: "{semantic.success.DEFAULT}";
        readonly warning: "{semantic.warning.DEFAULT}";
    };
    readonly icon: {
        readonly primary: "{neutral.700}";
        readonly secondary: "{neutral.400}";
        readonly inverse: "{neutral.0}";
        readonly brand: "{brand.primary.500}";
    };
    readonly status: {
        readonly pending: "{neutral.500}";
        readonly active: "{brand.secondary.500}";
        readonly delivered: "{semantic.success.DEFAULT}";
        readonly failed: "{semantic.error.DEFAULT}";
        readonly skipped: "{semantic.warning.DEFAULT}";
    };
};
export declare const spacing: {
    readonly 0: "0";
    readonly 1: "4px";
    readonly 2: "8px";
    readonly 3: "12px";
    readonly 4: "16px";
    readonly 5: "20px";
    readonly 6: "24px";
    readonly 8: "32px";
    readonly 10: "40px";
    readonly 12: "48px";
    readonly 16: "64px";
    readonly 20: "80px";
    readonly 24: "96px";
};
export declare const typography: {
    readonly fontFamilies: {
        readonly sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif";
        readonly mono: "JetBrains Mono, Menlo, Monaco, Consolas, monospace";
        readonly display: "Inter Display, Inter, system-ui, sans-serif";
    };
    readonly fontSizes: {
        readonly xs: "12px";
        readonly sm: "14px";
        readonly base: "16px";
        readonly lg: "18px";
        readonly xl: "20px";
        readonly '2xl': "24px";
        readonly '3xl': "30px";
        readonly '4xl': "36px";
        readonly '5xl': "48px";
    };
    readonly fontWeights: {
        readonly normal: "400";
        readonly medium: "500";
        readonly semibold: "600";
        readonly bold: "700";
    };
    readonly lineHeights: {
        readonly tight: "1.25";
        readonly normal: "1.5";
        readonly relaxed: "1.75";
    };
    readonly letterSpacing: {
        readonly tight: "-0.02em";
        readonly normal: "0";
        readonly wide: "0.02em";
    };
};
export declare const borderRadius: {
    readonly none: "0";
    readonly sm: "4px";
    readonly DEFAULT: "8px";
    readonly md: "12px";
    readonly lg: "16px";
    readonly xl: "24px";
    readonly full: "9999px";
};
export declare const shadows: {
    readonly none: "none";
    readonly xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
    readonly sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)";
    readonly DEFAULT: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)";
    readonly md: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)";
    readonly lg: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)";
    readonly xl: "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
    readonly inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)";
    readonly elevation1: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)";
    readonly elevation2: "0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10)";
    readonly elevation3: "0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)";
    readonly elevation4: "0 14px 28px rgba(0,0,0,0.18), 0 3px 6px rgba(0,0,0,0.12)";
    readonly elevation5: "0 19px 38px rgba(0,0,0,0.20), 0 3px 6px rgba(0,0,0,0.15)";
};
export declare const motion: {
    readonly durations: {
        readonly instant: "0ms";
        readonly fast: "150ms";
        readonly normal: "250ms";
        readonly slow: "350ms";
        readonly slower: "500ms";
    };
    readonly easings: {
        readonly linear: "linear";
        readonly easeIn: "cubic-bezier(0.4, 0, 1, 1)";
        readonly easeOut: "cubic-bezier(0, 0, 0.2, 1)";
        readonly easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)";
        readonly spring: "cubic-bezier(0.34, 1.56, 0.64, 1)";
    };
};
export declare const zIndex: {
    readonly hide: -1;
    readonly base: 0;
    readonly dropdown: 100;
    readonly sticky: 200;
    readonly fixed: 300;
    readonly modalBackdrop: 400;
    readonly modal: 500;
    readonly popover: 600;
    readonly tooltip: 700;
    readonly toast: 800;
    readonly max: 9999;
};
export declare const breakpoints: {
    readonly xs: "320px";
    readonly sm: "640px";
    readonly md: "768px";
    readonly lg: "1024px";
    readonly xl: "1280px";
    readonly '2xl': "1536px";
};
export declare const touchTarget: {
    readonly minimum: "44px";
    readonly comfortable: "48px";
    readonly spacious: "56px";
};
export declare const components: {
    readonly button: {
        readonly height: {
            readonly sm: "36px";
            readonly DEFAULT: "44px";
            readonly lg: "52px";
        };
        readonly paddingX: {
            readonly sm: "{spacing.3}";
            readonly DEFAULT: "{spacing.4}";
            readonly lg: "{spacing.6}";
        };
        readonly borderRadius: "{borderRadius.DEFAULT}";
        readonly fontSize: "{typography.fontSizes.sm}";
        readonly fontWeight: "{typography.fontWeights.medium}";
    };
    readonly input: {
        readonly height: "{button.height.DEFAULT}";
        readonly paddingX: "{spacing.4}";
        readonly paddingY: "{spacing.2}";
        readonly borderRadius: "{borderRadius.DEFAULT}";
        readonly fontSize: "{typography.fontSizes.base}";
        readonly borderWidth: "1px";
    };
    readonly card: {
        readonly padding: "{spacing.4}";
        readonly borderRadius: "{borderRadius.lg}";
        readonly shadow: "{shadows.elevation1}";
        readonly borderWidth: "1px";
        readonly borderColor: "{border.light}";
    };
    readonly badge: {
        readonly paddingX: "{spacing.2}";
        readonly paddingY: "{spacing.0.5}";
        readonly borderRadius: "{borderRadius.full}";
        readonly fontSize: "{typography.fontSizes.xs}";
        readonly fontWeight: "{typography.fontWeights.medium}";
    };
    readonly map: {
        readonly day: {
            readonly background: "#f8f9fa";
            readonly water: "#d6eaff";
            readonly land: "#f5f5f0";
            readonly road: "#ffffff";
            readonly roadOutline: "#e0e0e0";
            readonly highway: "#ff6b00";
            readonly highwayOutline: "#e65400";
            readonly building: "#e8e8e8";
            readonly park: "#d4edda";
            readonly text: "#18181b";
            readonly textHalo: "#ffffff";
            readonly stopPin: "#ff6b00";
            readonly stopPinHalo: "#ffffff";
            readonly routeLine: "#0070e6";
            readonly routeLineWidth: "4px";
            readonly geofenceApproach: "rgba(255, 107, 0, 0.3)";
            readonly geofenceImminent: "rgba(255, 107, 0, 0.5)";
            readonly userLocation: "#0070e6";
            readonly userLocationHalo: "rgba(0, 112, 230, 0.3)";
        };
        readonly night: {
            readonly background: "#0f172a";
            readonly water: "#0c1a2e";
            readonly land: "#1e293b";
            readonly road: "#334155";
            readonly roadOutline: "#1e293b";
            readonly highway: "#ff8a33";
            readonly highwayOutline: "#ff6b00";
            readonly building: "#334155";
            readonly park: "#0f5132";
            readonly text: "#f1f5f9";
            readonly textHalo: "#0f172a";
            readonly stopPin: "#ff8a33";
            readonly stopPinHalo: "#0f172a";
            readonly routeLine: "#66adff";
            readonly routeLineWidth: "4px";
            readonly geofenceApproach: "rgba(255, 138, 51, 0.3)";
            readonly geofenceImminent: "rgba(255, 138, 51, 0.5)";
            readonly userLocation: "#66adff";
            readonly userLocationHalo: "rgba(102, 173, 255, 0.3)";
        };
        readonly highContrast: {
            readonly background: "#000000";
            readonly water: "#000080";
            readonly land: "#000000";
            readonly road: "#ffffff";
            readonly roadOutline: "#000000";
            readonly highway: "#ffff00";
            readonly highwayOutline: "#000000";
            readonly building: "#ffffff";
            readonly park: "#008000";
            readonly text: "#ffffff";
            readonly textHalo: "#000000";
            readonly stopPin: "#ffff00";
            readonly stopPinHalo: "#000000";
            readonly routeLine: "#00ffff";
            readonly routeLineWidth: "5px";
            readonly geofenceApproach: "rgba(255, 255, 0, 0.5)";
            readonly geofenceImminent: "rgba(255, 255, 0, 0.8)";
            readonly userLocation: "#00ffff";
            readonly userLocationHalo: "rgba(0, 255, 255, 0.5)";
        };
    };
};
export declare const voice: {
    readonly listening: {
        readonly pulseColor: "{brand.primary.500}";
        readonly pulseDuration: "{motion.durations.slow}";
        readonly ringWidth: "4px";
    };
    readonly processing: {
        readonly spinnerColor: "{brand.secondary.500}";
        readonly spinnerDuration: "{motion.durations.normal}";
    };
    readonly speaking: {
        readonly waveColor: "{semantic.success.DEFAULT}";
        readonly waveDuration: "{motion.durations.fast}";
    };
    readonly error: {
        readonly flashColor: "{semantic.error.DEFAULT}";
        readonly flashDuration: "{motion.durations.fast}";
    };
    readonly earbud: {
        readonly singleClick: "{semantic.success.DEFAULT}";
        readonly doubleClick: "{semantic.warning.DEFAULT}";
        readonly tripleClick: "{semantic.error.DEFAULT}";
        readonly longPress: "{brand.primary.500}";
    };
};
export declare const tokens: {
    readonly color: {
        readonly brand: {
            readonly primary: {
                readonly 50: "#fff4ed";
                readonly 100: "#ffe8d0";
                readonly 200: "#ffd1a1";
                readonly 300: "#ffb066";
                readonly 400: "#ff8a33";
                readonly 500: "#ff6b00";
                readonly 600: "#e65400";
                readonly 700: "#cc4400";
                readonly 800: "#b33300";
                readonly 900: "#992600";
                readonly 950: "#4d1300";
            };
            readonly secondary: {
                readonly 50: "#eef7ff";
                readonly 100: "#d0e8ff";
                readonly 200: "#a1d1ff";
                readonly 300: "#66adff";
                readonly 400: "#3391ff";
                readonly 500: "#0070e6";
                readonly 600: "#0059cc";
                readonly 700: "#0044b3";
                readonly 800: "#003399";
                readonly 900: "#002680";
                readonly 950: "#001340";
            };
        };
        readonly semantic: {
            readonly success: {
                readonly light: "#10b981";
                readonly DEFAULT: "#059669";
                readonly dark: "#047857";
                readonly bg: "#ecfdf5";
                readonly border: "#a7f3d0";
            };
            readonly warning: {
                readonly light: "#fbbf24";
                readonly DEFAULT: "#f59e0b";
                readonly dark: "#d97706";
                readonly bg: "#fffbeb";
                readonly border: "#fde68a";
            };
            readonly error: {
                readonly light: "#f87171";
                readonly DEFAULT: "#ef4444";
                readonly dark: "#dc2626";
                readonly bg: "#fef2f2";
                readonly border: "#fecaca";
            };
            readonly info: {
                readonly light: "#60a5fa";
                readonly DEFAULT: "#3b82f6";
                readonly dark: "#2563eb";
                readonly bg: "#eff6ff";
                readonly border: "#bfdbfe";
            };
        };
        readonly neutral: {
            readonly 0: "#ffffff";
            readonly 50: "#fafafa";
            readonly 100: "#f4f4f5";
            readonly 200: "#e4e4e7";
            readonly 300: "#d4d4d8";
            readonly 400: "#a1a1aa";
            readonly 500: "#71717a";
            readonly 600: "#52525b";
            readonly 700: "#3f3f46";
            readonly 800: "#27272a";
            readonly 900: "#18181b";
            readonly 950: "#09090b";
        };
        readonly background: {
            readonly primary: "{neutral.0}";
            readonly secondary: "{neutral.50}";
            readonly tertiary: "{neutral.100}";
            readonly inverse: "{neutral.900}";
            readonly overlay: "rgba(0, 0, 0, 0.5)";
        };
        readonly surface: {
            readonly primary: "{neutral.0}";
            readonly secondary: "{neutral.50}";
            readonly tertiary: "{neutral.100}";
            readonly elevated: "{neutral.0}";
            readonly inverse: "{neutral.900}";
        };
        readonly border: {
            readonly light: "{neutral.200}";
            readonly DEFAULT: "{neutral.300}";
            readonly dark: "{neutral.400}";
            readonly focus: "{brand.primary.500}";
            readonly error: "{semantic.error.DEFAULT}";
        };
        readonly text: {
            readonly primary: "{neutral.900}";
            readonly secondary: "{neutral.600}";
            readonly tertiary: "{neutral.400}";
            readonly inverse: "{neutral.0}";
            readonly link: "{brand.secondary.500}";
            readonly linkHover: "{brand.secondary.600}";
            readonly error: "{semantic.error.DEFAULT}";
            readonly success: "{semantic.success.DEFAULT}";
            readonly warning: "{semantic.warning.DEFAULT}";
        };
        readonly icon: {
            readonly primary: "{neutral.700}";
            readonly secondary: "{neutral.400}";
            readonly inverse: "{neutral.0}";
            readonly brand: "{brand.primary.500}";
        };
        readonly status: {
            readonly pending: "{neutral.500}";
            readonly active: "{brand.secondary.500}";
            readonly delivered: "{semantic.success.DEFAULT}";
            readonly failed: "{semantic.error.DEFAULT}";
            readonly skipped: "{semantic.warning.DEFAULT}";
        };
    };
    readonly spacing: {
        readonly 0: "0";
        readonly 1: "4px";
        readonly 2: "8px";
        readonly 3: "12px";
        readonly 4: "16px";
        readonly 5: "20px";
        readonly 6: "24px";
        readonly 8: "32px";
        readonly 10: "40px";
        readonly 12: "48px";
        readonly 16: "64px";
        readonly 20: "80px";
        readonly 24: "96px";
    };
    readonly typography: {
        readonly fontFamilies: {
            readonly sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif";
            readonly mono: "JetBrains Mono, Menlo, Monaco, Consolas, monospace";
            readonly display: "Inter Display, Inter, system-ui, sans-serif";
        };
        readonly fontSizes: {
            readonly xs: "12px";
            readonly sm: "14px";
            readonly base: "16px";
            readonly lg: "18px";
            readonly xl: "20px";
            readonly '2xl': "24px";
            readonly '3xl': "30px";
            readonly '4xl': "36px";
            readonly '5xl': "48px";
        };
        readonly fontWeights: {
            readonly normal: "400";
            readonly medium: "500";
            readonly semibold: "600";
            readonly bold: "700";
        };
        readonly lineHeights: {
            readonly tight: "1.25";
            readonly normal: "1.5";
            readonly relaxed: "1.75";
        };
        readonly letterSpacing: {
            readonly tight: "-0.02em";
            readonly normal: "0";
            readonly wide: "0.02em";
        };
    };
    readonly borderRadius: {
        readonly none: "0";
        readonly sm: "4px";
        readonly DEFAULT: "8px";
        readonly md: "12px";
        readonly lg: "16px";
        readonly xl: "24px";
        readonly full: "9999px";
    };
    readonly shadow: {
        readonly none: "none";
        readonly xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
        readonly sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)";
        readonly DEFAULT: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)";
        readonly md: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)";
        readonly lg: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)";
        readonly xl: "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
        readonly inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)";
        readonly elevation1: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)";
        readonly elevation2: "0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10)";
        readonly elevation3: "0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)";
        readonly elevation4: "0 14px 28px rgba(0,0,0,0.18), 0 3px 6px rgba(0,0,0,0.12)";
        readonly elevation5: "0 19px 38px rgba(0,0,0,0.20), 0 3px 6px rgba(0,0,0,0.15)";
    };
    readonly motion: {
        readonly durations: {
            readonly instant: "0ms";
            readonly fast: "150ms";
            readonly normal: "250ms";
            readonly slow: "350ms";
            readonly slower: "500ms";
        };
        readonly easings: {
            readonly linear: "linear";
            readonly easeIn: "cubic-bezier(0.4, 0, 1, 1)";
            readonly easeOut: "cubic-bezier(0, 0, 0.2, 1)";
            readonly easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)";
            readonly spring: "cubic-bezier(0.34, 1.56, 0.64, 1)";
        };
    };
    readonly zIndex: {
        readonly hide: -1;
        readonly base: 0;
        readonly dropdown: 100;
        readonly sticky: 200;
        readonly fixed: 300;
        readonly modalBackdrop: 400;
        readonly modal: 500;
        readonly popover: 600;
        readonly tooltip: 700;
        readonly toast: 800;
        readonly max: 9999;
    };
    readonly breakpoint: {
        readonly xs: "320px";
        readonly sm: "640px";
        readonly md: "768px";
        readonly lg: "1024px";
        readonly xl: "1280px";
        readonly '2xl': "1536px";
    };
    readonly touchTarget: {
        readonly minimum: "44px";
        readonly comfortable: "48px";
        readonly spacious: "56px";
    };
    readonly component: {
        readonly button: {
            readonly height: {
                readonly sm: "36px";
                readonly DEFAULT: "44px";
                readonly lg: "52px";
            };
            readonly paddingX: {
                readonly sm: "{spacing.3}";
                readonly DEFAULT: "{spacing.4}";
                readonly lg: "{spacing.6}";
            };
            readonly borderRadius: "{borderRadius.DEFAULT}";
            readonly fontSize: "{typography.fontSizes.sm}";
            readonly fontWeight: "{typography.fontWeights.medium}";
        };
        readonly input: {
            readonly height: "{button.height.DEFAULT}";
            readonly paddingX: "{spacing.4}";
            readonly paddingY: "{spacing.2}";
            readonly borderRadius: "{borderRadius.DEFAULT}";
            readonly fontSize: "{typography.fontSizes.base}";
            readonly borderWidth: "1px";
        };
        readonly card: {
            readonly padding: "{spacing.4}";
            readonly borderRadius: "{borderRadius.lg}";
            readonly shadow: "{shadows.elevation1}";
            readonly borderWidth: "1px";
            readonly borderColor: "{border.light}";
        };
        readonly badge: {
            readonly paddingX: "{spacing.2}";
            readonly paddingY: "{spacing.0.5}";
            readonly borderRadius: "{borderRadius.full}";
            readonly fontSize: "{typography.fontSizes.xs}";
            readonly fontWeight: "{typography.fontWeights.medium}";
        };
        readonly map: {
            readonly day: {
                readonly background: "#f8f9fa";
                readonly water: "#d6eaff";
                readonly land: "#f5f5f0";
                readonly road: "#ffffff";
                readonly roadOutline: "#e0e0e0";
                readonly highway: "#ff6b00";
                readonly highwayOutline: "#e65400";
                readonly building: "#e8e8e8";
                readonly park: "#d4edda";
                readonly text: "#18181b";
                readonly textHalo: "#ffffff";
                readonly stopPin: "#ff6b00";
                readonly stopPinHalo: "#ffffff";
                readonly routeLine: "#0070e6";
                readonly routeLineWidth: "4px";
                readonly geofenceApproach: "rgba(255, 107, 0, 0.3)";
                readonly geofenceImminent: "rgba(255, 107, 0, 0.5)";
                readonly userLocation: "#0070e6";
                readonly userLocationHalo: "rgba(0, 112, 230, 0.3)";
            };
            readonly night: {
                readonly background: "#0f172a";
                readonly water: "#0c1a2e";
                readonly land: "#1e293b";
                readonly road: "#334155";
                readonly roadOutline: "#1e293b";
                readonly highway: "#ff8a33";
                readonly highwayOutline: "#ff6b00";
                readonly building: "#334155";
                readonly park: "#0f5132";
                readonly text: "#f1f5f9";
                readonly textHalo: "#0f172a";
                readonly stopPin: "#ff8a33";
                readonly stopPinHalo: "#0f172a";
                readonly routeLine: "#66adff";
                readonly routeLineWidth: "4px";
                readonly geofenceApproach: "rgba(255, 138, 51, 0.3)";
                readonly geofenceImminent: "rgba(255, 138, 51, 0.5)";
                readonly userLocation: "#66adff";
                readonly userLocationHalo: "rgba(102, 173, 255, 0.3)";
            };
            readonly highContrast: {
                readonly background: "#000000";
                readonly water: "#000080";
                readonly land: "#000000";
                readonly road: "#ffffff";
                readonly roadOutline: "#000000";
                readonly highway: "#ffff00";
                readonly highwayOutline: "#000000";
                readonly building: "#ffffff";
                readonly park: "#008000";
                readonly text: "#ffffff";
                readonly textHalo: "#000000";
                readonly stopPin: "#ffff00";
                readonly stopPinHalo: "#000000";
                readonly routeLine: "#00ffff";
                readonly routeLineWidth: "5px";
                readonly geofenceApproach: "rgba(255, 255, 0, 0.5)";
                readonly geofenceImminent: "rgba(255, 255, 0, 0.8)";
                readonly userLocation: "#00ffff";
                readonly userLocationHalo: "rgba(0, 255, 255, 0.5)";
            };
        };
    };
    readonly voice: {
        readonly listening: {
            readonly pulseColor: "{brand.primary.500}";
            readonly pulseDuration: "{motion.durations.slow}";
            readonly ringWidth: "4px";
        };
        readonly processing: {
            readonly spinnerColor: "{brand.secondary.500}";
            readonly spinnerDuration: "{motion.durations.normal}";
        };
        readonly speaking: {
            readonly waveColor: "{semantic.success.DEFAULT}";
            readonly waveDuration: "{motion.durations.fast}";
        };
        readonly error: {
            readonly flashColor: "{semantic.error.DEFAULT}";
            readonly flashDuration: "{motion.durations.fast}";
        };
        readonly earbud: {
            readonly singleClick: "{semantic.success.DEFAULT}";
            readonly doubleClick: "{semantic.warning.DEFAULT}";
            readonly tripleClick: "{semantic.error.DEFAULT}";
            readonly longPress: "{brand.primary.500}";
        };
    };
};
export type Tokens = typeof tokens;
//# sourceMappingURL=tokens.d.ts.map