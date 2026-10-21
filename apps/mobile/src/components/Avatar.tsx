import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

interface AvatarProps extends React.ComponentPropsWithoutRef<typeof View> {
  src?: string;
  alt?: string;
  fallback?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'square';
}

export const Avatar = React.forwardRef<React.ElementRef<typeof View>, AvatarProps>(
  ({ size = 'md', shape = 'circle', src, alt, fallback, name, style, ...props }, ref) => {
    const { theme } = useTheme();
    const [imageError, setImageError] = React.useState(false);

    const getSizeStyles = () => {
      const sizes: Record<string, { width: number; height: number; fontSize: number }> = {
        xs: { width: 24, height: 24, fontSize: 10 },
        sm: { width: 32, height: 32, fontSize: 12 },
        md: { width: 40, height: 40, fontSize: 14 },
        lg: { width: 48, height: 48, fontSize: 16 },
        xl: { width: 64, height: 64, fontSize: 20 },
        '2xl': { width: 96, height: 96, fontSize: 28 },
      };
      return sizes[size] || sizes.md;
    };

    const sizeStyles = getSizeStyles();
    const borderRadius = shape === 'circle' ? sizeStyles.width / 2 : 8;

    // Generate fallback initials from name
    const getInitials = () => {
      if (fallback) return fallback;
      if (name) {
        return name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
      }
      return '?';
    };

    // The fallback is the surface of the theme with the ink on it, so the
    // initials clear the contrast bar in every theme. A colour made up from
    // the name cannot promise that.
    const getBackgroundColor = () => theme.colors.surface;

    const showFallback = !src || imageError;

    if (showFallback) {
      return (
        <View
          ref={ref}
          style={[
            styles.container,
            {
              width: sizeStyles.width,
              height: sizeStyles.height,
              borderRadius,
              backgroundColor: getBackgroundColor(),
              borderColor: theme.colors.border,
            },
            style,
          ]}
          {...props}
          accessibilityRole="image"
          accessibilityLabel={alt || name}
        >
          <Text
            style={[
              styles.initials,
              {
                fontSize: sizeStyles.fontSize,
                color: theme.colors.textPrimary,
              },
            ]}
          >
            {getInitials()}
          </Text>
        </View>
      );
    }

    return (
      <View
        ref={ref}
        style={[
          styles.container,
          {
            width: sizeStyles.width,
            height: sizeStyles.height,
            borderRadius,
          },
          style,
        ]}
        {...props}
        accessibilityRole="image"
        accessibilityLabel={alt || name}
      >
        <Image
          source={{ uri: src }}
          style={[
            styles.image,
            {
              width: sizeStyles.width,
              height: sizeStyles.height,
              borderRadius,
            },
          ]}
          alt={alt || name}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />
      </View>
    );
  },
);

Avatar.displayName = 'Avatar';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  initials: {
    fontWeight: '600',
  },
});
