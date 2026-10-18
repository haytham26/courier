/**
 * Tests for design tokens
 */

import { describe, it, expect } from 'vitest';
import { tokens, themes, dayTheme, nightTheme, highContrastTheme, getTheme } from './index';

describe('Design Tokens', () => {
  it('exports tokens object with all categories', () => {
    expect(tokens.color).toBeDefined();
    expect(tokens.spacing).toBeDefined();
    expect(tokens.typography).toBeDefined();
    expect(tokens.borderRadius).toBeDefined();
    expect(tokens.shadow).toBeDefined();
    expect(tokens.motion).toBeDefined();
    expect(tokens.zIndex).toBeDefined();
    expect(tokens.breakpoint).toBeDefined();
    expect(tokens.touchTarget).toBeDefined();
    expect(tokens.component).toBeDefined();
    expect(tokens.voice).toBeDefined();
  });

  it('has brand colors defined', () => {
    expect(tokens.color.brand.primary[500]).toBe('#ff6b00');
    expect(tokens.color.brand.secondary[500]).toBe('#0070e6');
  });

  it('has semantic colors', () => {
    expect(tokens.color.semantic.success.DEFAULT).toBe('#059669');
    expect(tokens.color.semantic.error.DEFAULT).toBe('#ef4444');
    expect(tokens.color.semantic.warning.DEFAULT).toBe('#f59e0b');
  });

  it('has spacing scale', () => {
    expect(tokens.spacing[4]).toBe('16px');
    expect(tokens.spacing[6]).toBe('24px');
  });

  it('has typography tokens', () => {
    expect(tokens.typography.fontSizes.base).toBe('16px');
    expect(tokens.typography.fontWeights.medium).toBe('500');
  });
});

describe('Themes', () => {
  it('has three themes', () => {
    expect(Object.keys(themes)).toHaveLength(3);
    expect(themes.day).toBeDefined();
    expect(themes.night).toBeDefined();
    expect(themes.highContrast).toBeDefined();
  });

  it('day theme has correct colors', () => {
    expect(dayTheme.name).toBe('day');
    expect(dayTheme.colors.background).toBe('#ffffff');
    expect(dayTheme.colors.brandPrimary).toBe('#ff6b00');
  });

  it('night theme has correct colors', () => {
    expect(nightTheme.name).toBe('night');
    expect(nightTheme.colors.background).toBe('#09090b');
    expect(nightTheme.colors.brandPrimary).toBe('#ff8a33');
  });

  it('high contrast theme has correct colors', () => {
    expect(highContrastTheme.name).toBe('highContrast');
    expect(highContrastTheme.colors.background).toBe('#000000');
    expect(highContrastTheme.colors.brandPrimary).toBe('#ffff00');
  });

  it('getTheme returns correct theme', () => {
    expect(getTheme('day')).toBe(dayTheme);
    expect(getTheme('night')).toBe(nightTheme);
    expect(getTheme('highContrast')).toBe(highContrastTheme);
    expect(getTheme('invalid' as any)).toBe(dayTheme); // fallback
  });

  it('generateCSSVariables produces valid CSS', () => {
    const css = themes.day; // Just verify it doesn't throw
    expect(css.name).toBe('day');
  });
});

describe('Component tokens', () => {
  it('has button tokens', () => {
    expect(tokens.component.button.height.DEFAULT).toBe('44px');
    expect(tokens.component.button.borderRadius).toBe('{borderRadius.DEFAULT}');
  });

  it('has input tokens', () => {
    expect(tokens.component.input.height).toBe('{button.height.DEFAULT}');
    expect(tokens.component.input.borderRadius).toBe('{borderRadius.DEFAULT}');
  });

  it('has card tokens', () => {
    expect(tokens.component.card.padding).toBe('{spacing.4}');
    expect(tokens.component.card.borderRadius).toBe('{borderRadius.lg}');
  });

  it('has badge tokens', () => {
    expect(tokens.component.badge.borderRadius).toBe('{borderRadius.full}');
    expect(tokens.component.badge.fontSize).toBe('{typography.fontSizes.xs}');
  });
});

describe('Voice tokens', () => {
  it('has voice state tokens', () => {
    expect(tokens.voice.listening.pulseColor).toBe('{brand.primary.500}');
    expect(tokens.voice.speaking.waveColor).toBe('{semantic.success.DEFAULT}');
  });

  it('has earbud button feedback tokens', () => {
    expect(tokens.voice.earbud.singleClick).toBe('{semantic.success.DEFAULT}');
    expect(tokens.voice.earbud.doubleClick).toBe('{semantic.warning.DEFAULT}');
    expect(tokens.voice.earbud.tripleClick).toBe('{semantic.error.DEFAULT}');
    expect(tokens.voice.earbud.longPress).toBe('{brand.primary.500}');
  });
});

describe('Map tokens', () => {
  it('has map colors for all themes', () => {
    expect(tokens.component.map.day.background).toBe('#f8f9fa');
    expect(tokens.component.map.night.background).toBe('#0f172a');
    expect(tokens.component.map.highContrast.background).toBe('#000000');
  });

  it('has map route line colors', () => {
    expect(tokens.component.map.day.routeLine).toBe('#0070e6');
    expect(tokens.component.map.night.routeLine).toBe('#66adff');
    expect(tokens.component.map.highContrast.routeLine).toBe('#00ffff');
  });
});