import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { getUtilizationColor } from './UtilizationBar';
import { CreditCard } from '../hooks/useCreditCards';
import { supabase } from '../lib/supabase';

type PayDownSimulatorProps = {
  card: CreditCard;
  onClose: () => void;
  onApplied: () => void;
};

export default function PayDownSimulator({ card, onClose, onApplied }: PayDownSimulatorProps) {
  const originalFraction = card.credit_limit > 0
    ? Math.min(1, card.current_balance / card.credit_limit)
    : 0;

  const [trackWidth, setTrackWidth] = useState(0);
  const [pct, setPct] = useState(Math.round(originalFraction * 100));
  const [saving, setSaving] = useState(false);
  const fraction = useSharedValue(originalFraction);

  const updateFromX = (x: number) => {
    if (trackWidth <= 0) return;
    const raw = x / trackWidth;
    const clamped = Math.min(originalFraction, Math.max(0, raw));
    fraction.value = clamped;
    setPct(Math.round(clamped * 100));
  };

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fraction.value * 100}%`,
  }));
  const handleStyle = useAnimatedStyle(() => ({
    left: `${fraction.value * 100}%`,
  }));

  const colors = getUtilizationColor(pct);
  const newBalance = Math.round(card.credit_limit * (pct / 100));
  const paidAmount = Math.max(0, card.current_balance - newBalance);
  const amountTo30 = Math.max(0, Math.ceil(newBalance - card.credit_limit * 0.3));

  const reset = () => {
    fraction.value = withTiming(originalFraction, { duration: 250 });
    setPct(Math.round(originalFraction * 100));
  };

  const handleApply = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('credit_cards')
      .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', card.id);
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    onApplied();
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{card.name}</Text>
              {card.bank && <Text style={styles.bankName}>{card.bank}</Text>}
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="#9ca3af" />
            </Pressable>
          </View>

          <Text style={styles.eyebrow}>Simulate a payment</Text>

          <View style={styles.pctRow}>
            <Text style={[styles.pctValue, { color: colors.text }]}>{pct}%</Text>
            <View style={[styles.pctPill, { backgroundColor: colors.bg }]}>
              <Text style={[styles.pctPillText, { color: colors.text }]}>
                {pct < 30 ? 'Healthy' : pct < 60 ? 'Watch it' : 'High risk'}
              </Text>
            </View>
          </View>

          <View
            style={styles.track}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => updateFromX(e.nativeEvent.locationX)}
            onResponderMove={(e) => updateFromX(e.nativeEvent.locationX)}
          >
            <Animated.View style={[styles.fill, fillStyle, { backgroundColor: colors.bar }]} />
            <View style={styles.thresholdMarker} />
            <Animated.View style={[styles.handle, handleStyle, { borderColor: colors.bar }]} />
          </View>

          <Text style={styles.dragHint}>Drag the bar to preview paying down this card</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>New balance</Text>
            <Text style={styles.summaryValue}>
              ₹{newBalance.toLocaleString('en-IN')} of ₹{card.credit_limit.toLocaleString('en-IN')}
            </Text>
          </View>

          <Text style={styles.paidText}>
            {paidAmount > 0
              ? `That's a payment of ₹${paidAmount.toLocaleString('en-IN')}.`
              : 'This is your current balance.'}
          </Text>

          <Text style={[styles.hint, pct < 30 ? styles.hintGood : styles.hintWarn]}>
            {pct < 30
              ? 'This card would be in the healthy zone.'
              : `Pay ₹${amountTo30.toLocaleString('en-IN')} more to drop under 30%.`}
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.resetButton} onPress={reset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
            <Pressable
              style={[styles.applyButton, paidAmount <= 0 && styles.applyButtonDisabled]}
              onPress={handleApply}
              disabled={paidAmount <= 0 || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.applyButtonText}>Log this payment</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  cardName: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  bankName: { fontSize: 12.5, color: '#9ca3af', marginTop: 2 },
  eyebrow: { fontSize: 13, color: '#7C3AED', fontWeight: '700', marginTop: 4, marginBottom: 20 },
  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  pctValue: { fontSize: 32, fontWeight: '800' },
  pctPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pctPillText: { fontSize: 12.5, fontWeight: '700' },
  track: {
    height: 22,
    justifyContent: 'center',
    overflow: 'visible',
  },
  fill: {
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    left: 0,
    backgroundColor: '#f1f1f1',
  },
  thresholdMarker: {
    position: 'absolute',
    left: '30%',
    top: -1,
    width: 2,
    height: 24,
    backgroundColor: '#6b6b6b',
    opacity: 0.35,
  },
  handle: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    borderWidth: 3,
    top: 0,
    transform: [{ translateX: -11 }],
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dragHint: { fontSize: 12, color: '#9ca3af', marginTop: 10, marginBottom: 22 },
  summaryRow: { marginBottom: 4 },
  summaryLabel: { fontSize: 12.5, color: '#9ca3af', fontWeight: '600' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  paidText: { fontSize: 13.5, color: '#4b5563', marginTop: 10 },
  hint: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  hintGood: { color: '#15803d' },
  hintWarn: { color: '#b91c1c' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 28 },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
  },
  resetButtonText: { fontWeight: '700', color: '#4b5563' },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#7C3AED',
  },
  applyButtonDisabled: { backgroundColor: '#d1d5db' },
  applyButtonText: { fontWeight: '700', color: '#fff' },
});
