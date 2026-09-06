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

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSignup = async () => {
    if (!username || !email || !password) {
      setError('Fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await signUp(email.trim(), password, username.trim());
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <View style={styles.doneContainer}>
        <AuthHero
          title="Check your email"
          subtitle={`We sent a confirmation link to ${email}. Confirm it, then log in.`}
        />
        <Link href="/login" style={styles.link}>
          <Text style={styles.linkText}>
            <Text style={styles.linkBold}>Back to login</Text>
          </Text>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AuthHero title="Create your account" subtitle="Start tracking your credit health today." />

        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="tejas"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />

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
            placeholder="At least 6 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttonWrap}>
            <PrimaryButton label="Sign Up" onPress={handleSignup} loading={loading} />
          </View>

          <Link href="/login" style={styles.link}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Log in</Text>
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
  doneContainer: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
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
