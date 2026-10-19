import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTheme } from '../providers/ThemeProvider';

const avatarVariants = cva(
  'rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-center',
  {
    variants: {
      size: {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
        xl: 'w-16 h-16 text-xl',
        '2xl': 'w-24 h-24 text-2xl',
      },
      shape: {
        circle: 'rounded-full',
        square: 'rounded-lg',
      },
    },
    defaultVariants: {
      size: 'md',
      shape: 'circle',
    },
  }
);

interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof View>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  name?: string;
}

export const Avatar = React.forwardRef<React.ElementRef<typeof View>, AvatarProps>(
  ({ className, size, shape, src, alt, fallback, name, style, ...props }, ref) => {
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
      const sizeKey = size ?? 'md';
      return sizes[sizeKey] || sizes.md;
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

    // Generate consistent color from name
    const getBackgroundColor = () => {
      if (!name) return theme.colors.textTertiary || theme.colors.textSecondary || '#71717a';
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash) % 360;
      return `hsl(${hue}, 60%, 45%)`;
    };

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
            },
            style,
          ]}
          {...props}
        >
          <Text
            style={[
              styles.initials,
              {
                fontSize: sizeStyles.fontSize,
                color: theme.colors.textInverse,
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
  }
);

Avatar.displayName = 'Avatar';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  initials: {
    fontWeight: '600',
  },
});

export { avatarVariants };