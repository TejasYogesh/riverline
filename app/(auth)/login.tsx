import { Link } from 'expo-router';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import AuthHero from '../../components/AuthHero';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) setError(error);
    // On success, app/_layout.tsx redirects to (tabs) automatically
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AuthHero title="Welcome back" subtitle="Log in to continue your credit journey." />

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttonWrap}>
            <PrimaryButton label="Log In" onPress={handleLogin} loading={loading} />
          </View>

          <Link href="/signup" style={styles.link}>
            <Text style={styles.linkText}>
              Dont have an account? <Text style={styles.linkBold}>Sign up</Text>
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flexGrow: 1, padding: 24, paddingTop: 48, justifyContent: 'center' },
  form: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  error: { color: '#dc2626', marginTop: 12, fontSize: 13 },
  buttonWrap: { marginTop: 28 },
  link: { marginTop: 20, alignSelf: 'center' },
  linkText: { color: '#6b6b6b', fontSize: 14 },
  linkBold: { color: '#7C3AED', fontWeight: '700' },
});
