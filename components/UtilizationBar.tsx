import { StyleSheet, Text, View } from 'react-native';
import { CreditCard } from '../hooks/useCreditCards';

// Riverline's own onboarding tip: "Don't use more than 30% of your limit."
// Green = safe, Yellow = caution (30-60%), Red = risky (60%+)
export function getUtilizationColor(pct: number) {
  if (pct < 30) return { bar: '#22c55e', bg: '#dcfce7', text: '#15803d' };
  if (pct < 60) return { bar: '#eab308', bg: '#fef9c3', text: '#a16207' };
  return { bar: '#ef4444', bg: '#fee2e2', text: '#b91c1c' };
}

export default function UtilizationBar({ card }: { card: CreditCard }) {
  const pct = card.credit_limit > 0
    ? Math.min(100, Math.round((card.current_balance / card.credit_limit) * 100))
    : 0;
  const colors = getUtilizationColor(pct);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{card.name}</Text>
          {card.bank && <Text style={styles.bankName}>{card.bank}</Text>}
        </View>
        <View style={[styles.pctPill, { backgroundColor: colors.bg }]}>
          <Text style={[styles.pctText, { color: colors.text }]}>{pct}%</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.bar }]} />
        {/* 30% threshold marker, per Riverline's own tip */}
        <View style={[styles.thresholdMarker, { left: '30%' }]} />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.amountText}>
          ₹{card.current_balance.toLocaleString('en-IN')} used
        </Text>
        <Text style={styles.limitText}>
          of ₹{card.credit_limit.toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  bankName: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  pctPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pctText: { fontSize: 13, fontWeight: '700' },
  track: {
    height: 10,
    borderRadius: 6,
    backgroundColor: '#f1f1f1',
    overflow: 'visible',
    justifyContent: 'center',
  },
  fill: { height: 10, borderRadius: 6, position: 'absolute', left: 0 },
  thresholdMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 14,
    backgroundColor: '#6b6b6b',
    opacity: 0.4,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  amountText: { fontSize: 12.5, color: '#4b5563', fontWeight: '600' },
  limitText: { fontSize: 12.5, color: '#9ca3af' },
});