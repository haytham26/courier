import React from 'react';

const View = ({ children, ...props }: any) => <div {...props}>{children}</div>;
const Text = ({ children, ...props }: any) => <span {...props}>{children}</span>;
const ScrollView = ({ children, ...props }: any) => <div {...props}>{children}</div>;
const SafeAreaView = ({ children, ...props }: any) => <div {...props}>{children}</div>;
const Pressable = ({ children, onPress, ...props }: any) => <div {...props} onClick={onPress}>{children}</div>;
const TouchableOpacity = ({ children, onPress, ...props }: any) => <div {...props} onClick={onPress}>{children}</div>;
const Image = ({ ...props }: any) => <div {...props} />;
const StatusBar = () => null;
const StyleSheet = {
  create: (styles: any) => styles,
  flatten: (styles: any) => styles,
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hairlineWidth: 1,
};
const Platform = {
  OS: 'ios',
  Version: '16.0',
  select: (obj: any) => obj.ios,
};
const PixelRatio = {
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size: number) => size * 2,
  roundToNearestPixel: (size: number) => Math.round(size * 2) / 2,
};
const Dimensions = {
  get: (dimension: string) => {
    if (dimension === 'window') return { width: 375, height: 667, scale: 2, fontScale: 1 };
    if (dimension === 'screen') return { width: 375, height: 667, scale: 2, fontScale: 1 };
    return { width: 375, height: 667, scale: 2, fontScale: 1 };
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};
const Animated = {
  View: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Image: ({ ...props }: any) => <div {...props} />,
  ScrollView: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  createAnimatedComponent: (component: any) => component,
  Value: class {
    constructor(public _value: number = 0) {}
    setValue(value: number) { this._value = value; }
    interpolate(config: any) { return this; }
    addListener(callback: any) { return 'mock-listener-id'; }
    removeListener(id: string) {}
    removeAllListeners() {}
    stopAnimation(callback?: any) { callback?.(this._value); }
  },
  timing: (value: any, config: any) => ({
    start: (callback?: any) => {
      if (config.toValue !== undefined) value.setValue(config.toValue);
      callback?.();
    },
    stop: () => {},
  }),
  spring: (value: any, config: any) => ({
    start: (callback?: any) => {
      if (config.toValue !== undefined) value.setValue(config.toValue);
      callback?.();
    },
    stop: () => {},
  }),
  delay: (time: number) => ({
    start: (callback?: any) => setTimeout(callback, time),
    stop: () => {},
  }),
  sequence: (animations: any[]) => ({
    start: (callback?: any) => {
      let index = 0;
      const runNext = () => {
        if (index < animations.length) {
          animations[index].start(() => {
            index++;
            runNext();
          });
        } else {
          callback?.();
        }
      };
      runNext();
    },
    stop: () => {},
  }),
  parallel: (animations: any[]) => ({
    start: (callback?: any) => {
      let completed = 0;
      animations.forEach((anim) => {
        anim.start(() => {
          completed++;
          if (completed === animations.length) callback?.();
        });
      });
    },
    stop: () => {},
  }),
  loop: (animation: any) => ({
    start: (callback?: any) => animation.start(callback),
    stop: () => animation.stop(),
  }),
  Easing: {
    linear: (t: number) => t,
    ease: (t: number) => t,
    quad: (t: number) => t * t,
    cubic: (t: number) => t * t * t,
    poly: (n: number) => (t: number) => Math.pow(t, n),
    sin: (t: number) => Math.sin(t * Math.PI / 2),
    circle: (t: number) => 1 - Math.sqrt(1 - t * t),
    exp: (t: number) => Math.pow(2, 10 * (t - 1)),
    elastic: (bounciness: number = 1) => (t: number) => t,
    back: (s: number) => (t: number) => t,
    bounce: (t: number) => t,
    bezier: (x1: number, y1: number, x2: number, y2: number) => (t: number) => t,
    in: (easing: any) => easing,
    out: (easing: any) => (t: number) => 1 - easing(1 - t),
    inOut: (easing: any) => (t: number) => t < 0.5 ? easing(2 * t) / 2 : 1 - easing(2 * (1 - t)) / 2,
  },
};

const Keyboard = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  dismiss: jest.fn(),
  scheduleLayoutAnimation: jest.fn(),
};

const Alert = {
  alert: jest.fn(),
};

const Linking = {
  openURL: jest.fn().mockResolvedValue(undefined),
  canOpenURL: jest.fn().mockResolvedValue(true),
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const AppState = {
  currentState: 'active',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const AccessibilityInfo = {
  isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
  isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const NativeModules = {
  PlatformConstants: {
    forceTouchAvailable: false,
  },
};

export {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Pressable,
  TouchableOpacity,
  Image,
  StatusBar,
  StyleSheet,
  Platform,
  PixelRatio,
  Dimensions,
  Animated,
  Keyboard,
  Alert,
  Linking,
  AppState,
  AccessibilityInfo,
  NativeModules,
};

// Default export for convenience
export default {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Pressable,
  TouchableOpacity,
  Image,
  StatusBar,
  StyleSheet,
  Platform,
  PixelRatio,
  Dimensions,
  Animated,
  Keyboard,
  Alert,
  Linking,
  AppState,
  AccessibilityInfo,
  NativeModules,
};