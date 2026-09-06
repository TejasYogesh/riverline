import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useCreditCards } from '../../hooks/useCreditCards';
import { supabase } from '../../lib/supabase';

type Profile = {
  username: string;
  full_name: string | null;
  created_at: string;
};

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { cards } = useCreditCards();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user) return;
      const { data } = await supabase
        .from('profiles')
        .select('username, full_name, created_at')
        .eq('id', session.user.id)
        .single();
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const totalLimit = cards.reduce((sum, c) => sum + c.credit_limit, 0);
  const totalBalance = cards.reduce((sum, c) => sum + c.current_balance, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.username?.[0] ?? session?.user?.email?.[0] ?? '?').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.username}>{profile?.username ?? 'User'}</Text>
        <Text style={styles.email}>{session?.user?.email}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{cards.length}</Text>
          <Text style={styles.statLabel}>Cards tracked</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{totalBalance.toLocaleString('en-IN')}</Text>
          <Text style={styles.statLabel}>Total balance</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{totalLimit.toLocaleString('en-IN')}</Text>
          <Text style={styles.statLabel}>Total limit</Text>
        </View>
      </View>

      <View style={styles.menu}>
        <View style={styles.menuItem}>
          <Ionicons name="person-outline" size={20} color="#6b6b6b" />
          <Text style={styles.menuText}>Account settings</Text>
          <Ionicons name="chevron-forward" size={18} color="#c4c4c4" />
        </View>
        <View style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={20} color="#6b6b6b" />
          <Text style={styles.menuText}>Notification preferences</Text>
          <Ionicons name="chevron-forward" size={18} color="#c4c4c4" />
        </View>
        <View style={styles.menuItem}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#6b6b6b" />
          <Text style={styles.menuText}>Privacy & data</Text>
          <Ionicons name="chevron-forward" size={18} color="#c4c4c4" />
        </View>
      </View>

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  avatarWrap: { alignItems: 'center', marginTop: 20, marginBottom: 28 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  username: { fontSize: 19, fontWeight: '800', color: '#1a1a1a' },
  email: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  statValue: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  statLabel: { fontSize: 10.5, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  menu: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0', overflow: 'hidden', marginBottom: 28 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  menuText: { flex: 1, fontSize: 14, color: '#1a1a1a', fontWeight: '600' },
  signOutButton: { backgroundColor: '#fee2e2', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  signOutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
});