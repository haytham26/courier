import React from 'react';
import { Image, View, Text, StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTheme } from 'react-native-unistyles';

const avatarVariants = cva(
  'rounded-full overflow-hidden flex-shrink-0',
  {
    variants: {
      size: {
        xs: '',
        sm: '',
        md: '',
        lg: '',
        xl: '',
        '2xl': '',
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
  name?: string;
  fallbackColor?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

export const Avatar = React.forwardRef<React.ElementRef<typeof View>, AvatarProps>(
  ({ className, size, shape, src, alt, name, fallbackColor, style, ...props }, ref) => {
    const { theme } = useTheme();
    const fallbackBg = fallbackColor || (name ? stringToColor(name) : theme.colors.border);
    const initials = name ? getInitials(name) : '?';

    const sizeStyles = StyleSheet.create({
      xs: { width: 24, height: 24, fontSize: theme.typography.fontSizes.xs },
      sm: { width: 32, height: 32, fontSize: theme.typography.fontSizes.sm },
      md: { width: 40, height: 40, fontSize: theme.typography.fontSizes.base },
      lg: { width: 48, height: 48, fontSize: theme.typography.fontSizes.lg },
      xl: { width: 64, height: 64, fontSize: theme.typography.fontSizes.xl },
      '2xl': { width: 96, height: 96, fontSize: theme.typography.fontSizes['2xl'] },
    });

    const shapeStyles = StyleSheet.create({
      circle: { borderRadius: 9999 },
      square: { borderRadius: theme.borderRadius.lg },
    });

    const containerStyle = [
      sizeStyles[size as keyof typeof sizeStyles],
      shapeStyles[shape as keyof typeof shapeStyles],
      { backgroundColor: fallbackBg },
      style,
    ] as StyleProp<ViewStyle>;

    if (src) {
      return (
        <View
          ref={ref}
          style={containerStyle}
          {...props}
        >
          <Image
            source={{ uri: src }}
            alt={alt || name || 'Avatar'}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        </View>
      );
    }

    return (
      <View
        ref={ref}
        style={containerStyle}
        {...props}
        accessibilityLabel={alt || name || 'Avatar'}
      >
        <Text
          style={[
            StyleSheet.absoluteFillObject,
            {
              textAlign: 'center',
              textAlignVertical: 'center',
              color: '#ffffff',
              fontWeight: '600',
            } as TextStyle,
          ]}
        >
          {initials}
        </Text>
      </View>
    );
  }
);

Avatar.displayName = 'Avatar';

export { avatarVariants };