/**
 * The create-account screen.
 *
 * The same rules as the sign-in screen: plain NZ English, one primary action
 * of 72 pt, every field with a label, and no emoji.
 */
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  type LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function RegisterScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A field that is focused scrolls itself into view. Run 41374393642's
  // device proved the flow cannot do this for the courier: on the 320x640 AVD
  // the keyboard owns the bottom of the screen, so Maestro's centre swipe
  // never reached the ScrollView and `register-confirm-password` stayed out
  // of the accessibility tree ("Element not found"). The scroll is computed
  // from the layout the field just reported - deterministic, never a timed
  // scrollTo racing a reveal (the sign-in screen's wrong fix, run
  // 41010537066). 96 pt of headroom keeps the next field on screen too, so
  // the courier's next tap lands without another scroll.
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const formTop = useRef(0);
  const fieldTops = useRef<Record<string, number>>({});
  const scrollToField = (key: string) => {
    const top = fieldTops.current[key];
    if (top === undefined) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, formTop.current + top - 96),
      animated: true,
    });
  };
  const fieldLayout = (key: string) => (event: LayoutChangeEvent) => {
    fieldTops.current[key] = event.nativeEvent.layout.y;
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all the fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'The passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'The password needs at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, password, name || undefined);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        (error as Error).message || 'Could not create the account',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      testID="register-screen"
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text role="heading" style={[styles.title, { color: theme.colors.textPrimary }]}>
          Create an account
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Join Courier Copilot
        </Text>

        <View
          testID="register-form"
          style={styles.form}
          onLayout={(event) => {
            formTop.current = event.nativeEvent.layout.y;
          }}
        >
          <View testID="field-name" onLayout={fieldLayout('name')}>
            <Input
              testID="register-name"
              label="Full name"
              helperText="Optional"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              editable={!isSubmitting}
              onFocus={() => scrollToField('name')}
            />
          </View>
          <View testID="field-email" onLayout={fieldLayout('email')}>
            <Input
              testID="register-email"
              label="Email"
              placeholder="you@example.co.nz"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isSubmitting}
              onFocus={() => scrollToField('email')}
            />
          </View>
          <View testID="field-password" onLayout={fieldLayout('password')}>
            <Input
              testID="register-password"
              label="Password"
              helperText="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              editable={!isSubmitting}
              onFocus={() => scrollToField('password')}
            />
          </View>
          <View testID="field-confirm" onLayout={fieldLayout('confirm')}>
            <Input
              testID="register-confirm-password"
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              editable={!isSubmitting}
              onFocus={() => scrollToField('confirm')}
            />
          </View>
          <Button
            size="lg"
            loading={isSubmitting}
            onPress={handleRegister}
            testID="register-submit"
            accessibilityHint="Creates your account"
          >
            Create Account
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="link"
            accessibilityLabel="Sign In"
            testID="register-sign-in"
          >
            <Text style={[styles.link, { color: theme.colors.brandPrimary }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 20,
  },
  form: {
    gap: 16,
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 19,
  },
  link: {
    fontSize: 19,
    fontWeight: '600',
  },
});
