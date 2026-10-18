import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';

const avatarVariants = cva(
  'rounded-full overflow-hidden flex-shrink-0 bg-neutral-200 dark:bg-neutral-700',
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
    const fallbackBg = fallbackColor || (name ? stringToColor(name) : 'var(--color-neutral-400)');
    const initials = name ? getInitials(name) : '?';

    if (src) {
      return (
        <View
          ref={ref}
          className={avatarVariants({ size, shape, className })}
          style={style}
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
        className={avatarVariants({ size, shape, className })}
        style={[{ backgroundColor: fallbackBg }, style]}
        {...props}
        accessibilityLabel={alt || name || 'Avatar'}
      >
        <Text
          className="w-full h-full flex-center text-white font-semibold select-none"
          style={StyleSheet.absoluteFill}
        >
          {initials}
        </Text>
      </View>
    );
  }
);

Avatar.displayName = 'Avatar';

export { avatarVariants };