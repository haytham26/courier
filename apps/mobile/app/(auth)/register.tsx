/**
 * The create-account screen.
 *
 * The same rules as the sign-in screen: plain NZ English, one primary action
 * of 72 pt, every field with a label, and no emoji.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text role="heading" style={[styles.title, { color: theme.colors.textPrimary }]}>
          Create an account
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Join Courier Copilot
        </Text>

        <View style={styles.form}>
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
          />
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
          />
          <Input
            testID="register-password"
            label="Password"
            helperText="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            editable={!isSubmitting}
          />
          <Input
            testID="register-confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            editable={!isSubmitting}
          />
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
