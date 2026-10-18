import React from 'react';
import { Image, View, Text, StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useUnistyles } from 'react-native-unistyles';

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
    const { theme } = useUnistyles();
    const fallbackBg = fallbackColor || (name ? stringToColor(name) : theme.colors.border);
    const initials = name ? getInitials(name) : '?';

    const sizeStyles = StyleSheet.create({
      xs: { width: 24, height: 24, fontSize: 12 },
      sm: { width: 32, height: 32, fontSize: 14 },
      md: { width: 40, height: 40, fontSize: 16 },
      lg: { width: 48, height: 48, fontSize: 18 },
      xl: { width: 64, height: 64, fontSize: 20 },
      '2xl': { width: 96, height: 96, fontSize: 24 },
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
            style={StyleSheet.absoluteFill}
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
            StyleSheet.absoluteFill,
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