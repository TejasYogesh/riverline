import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PayDownSimulator from '../../components/PayDownSimulator';
import UtilizationBar from '../../components/UtilizationBar';
import { useAuth } from '../../contexts/AuthContext';
import { daysUntil, formatDueLabel, useBills } from '../../hooks/useBills';
import { CreditCard, useCreditCards } from '../../hooks/useCreditCards';

export default function OverviewScreen() {
  const { session } = useAuth();
  const { cards, loading, error, refresh } = useCreditCards();
  const { bills, refresh: refreshBills } = useBills();
  const [refreshing, setRefreshing] = useState(false);
  const [simCard, setSimCard] = useState<CreditCard | null>(null);
  const insets = useSafeAreaInsets();

  const billsSummary = useMemo(() => {
    const pending = bills.filter((b) => b.status !== 'paid');
    const overdueCount = pending.filter((b) => daysUntil(b.due_date) < 0).length;
    const dueSoonCount = pending.filter((b) => {
      const days = daysUntil(b.due_date);
      return days >= 0 && days <= 3;
    }).length;
    return { pending, overdueCount, dueSoonCount, next: pending[0] ?? null };
  }, [bills]);

  const summary = useMemo(() => {
    const totalLimit = cards.reduce((sum, c) => sum + c.credit_limit, 0);
    const totalBalance = cards.reduce((sum, c) => sum + c.current_balance, 0);
    const overallPct = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
    const cardsOverThreshold = cards.filter(
      (c) => c.credit_limit > 0 && c.current_balance / c.credit_limit >= 0.3
    ).length;
    return { totalLimit, totalBalance, overallPct, cardsOverThreshold };
  }, [cards]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshBills()]);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>
        Hey {session?.user?.user_metadata?.username ?? 'there'} 👋
      </Text>
      <Text style={styles.heading}>Your utilization heatmap</Text>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Overall utilization</Text>
            <Text style={styles.summaryValue}>{summary.overallPct}%</Text>
          </View>
          <View
            style={[
              styles.summaryBadge,
              { backgroundColor: summary.overallPct < 30 ? '#dcfce7' : summary.overallPct < 60 ? '#fef9c3' : '#fee2e2' },
            ]}
          >
            <Text
              style={[
                styles.summaryBadgeText,
                { color: summary.overallPct < 30 ? '#15803d' : summary.overallPct < 60 ? '#a16207' : '#b91c1c' },
              ]}
            >
              {summary.overallPct < 30 ? 'Healthy' : summary.overallPct < 60 ? 'Watch it' : 'High risk'}
            </Text>
          </View>
        </View>
        <Text style={styles.summarySub}>
          ₹{summary.totalBalance.toLocaleString('en-IN')} used of ₹{summary.totalLimit.toLocaleString('en-IN')} across {cards.length} card{cards.length !== 1 ? 's' : ''}
        </Text>
        {summary.cardsOverThreshold > 0 && (
          <Text style={styles.warningText}>
            ⚠️ {summary.cardsOverThreshold} card{summary.cardsOverThreshold > 1 ? 's are' : ' is'} over the 30% mark
          </Text>
        )}
      </View>

      {/* Upcoming bills */}
      {bills.length > 0 && (
        <View style={styles.billsCard}>
          <View style={styles.billsHeaderRow}>
            <Text style={styles.billsHeading}>Upcoming bills</Text>
            <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
          </View>

          {billsSummary.overdueCount > 0 || billsSummary.dueSoonCount > 0 ? (
            <Text style={styles.billsStatusLine}>
              {billsSummary.overdueCount > 0 && (
                <Text style={styles.billsOverdueText}>
                  ⚠️ {billsSummary.overdueCount} overdue
                </Text>
              )}
              {billsSummary.overdueCount > 0 && billsSummary.dueSoonCount > 0 && '  •  '}
              {billsSummary.dueSoonCount > 0 && (
                <Text style={styles.billsSoonText}>{billsSummary.dueSoonCount} due soon</Text>
              )}
            </Text>
          ) : (
            <Text style={styles.billsAllGoodText}>You&rsquo;re all caught up 🎉</Text>
          )}

          {billsSummary.next && (
            <Text style={styles.billsNextText}>
              Next: {billsSummary.next.title} — ₹{billsSummary.next.amount.toLocaleString('en-IN')}{' '}
              ({formatDueLabel(daysUntil(billsSummary.next.due_date))})
            </Text>
          )}
        </View>
      )}

      {/* Per-card heatmap */}
      <Text style={styles.sectionTitle}>By card</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {cards.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No cards yet</Text>
          <Text style={styles.emptySubtitle}>
            Add a credit card in the Cards tab to see your utilization heatmap.
          </Text>
        </View>
      ) : (
        <>
          {cards.map((card) => (
            <Pressable key={card.id} onPress={() => setSimCard(card)}>
              <UtilizationBar card={card} />
            </Pressable>
          ))}
          <Text style={styles.hint}>Tap a card to simulate a payment</Text>
        </>
      )}

      {simCard && (
        <PayDownSimulator
          key={simCard.id}
          card={simCard}
          onClose={() => setSimCard(null)}
          onApplied={refresh}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  greeting: { fontSize: 15, color: '#6b6b6b', marginBottom: 4 },
  heading: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 20 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  summaryValue: { fontSize: 34, fontWeight: '800', color: '#1a1a1a', marginTop: 2 },
  summaryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  summaryBadgeText: { fontSize: 12.5, fontWeight: '700' },
  summarySub: { fontSize: 13, color: '#6b6b6b', marginTop: 14 },
  warningText: { fontSize: 13, color: '#b91c1c', marginTop: 8, fontWeight: '600' },
  billsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  billsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  billsHeading: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  billsStatusLine: { fontSize: 13.5, fontWeight: '600' },
  billsOverdueText: { color: '#b91c1c' },
  billsSoonText: { color: '#a16207' },
  billsAllGoodText: { fontSize: 13.5, color: '#15803d', fontWeight: '600' },
  billsNextText: { fontSize: 13, color: '#6b6b6b', marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  errorText: { color: '#dc2626', marginBottom: 12 },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  hint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
});