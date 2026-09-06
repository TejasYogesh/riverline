import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useCreditCards } from '../../hooks/useCreditCards';
import { supabase } from '../../lib/supabase';

function formatDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

type Bill = {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  card_id: string | null;
};

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function BillsScreen() {
  const { session } = useAuth();
  const { cards } = useCreditCards();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchBills = useCallback(async () => {
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', session.user.id)
      .order('due_date', { ascending: true });
    if (!error) setBills(data ?? []);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const openAddModal = () => {
    setTitle('');
    setAmount('');
    setDueDate('');
    setSelectedDate(new Date());
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed' || !date) return;
    setSelectedDate(date);
    setDueDate(formatDate(date));
  };

  const handleSave = async () => {
    if (!session?.user) return;
    const amountNum = parseFloat(amount);
    if (!title || isNaN(amountNum) || !dueDate) {
      Alert.alert('Missing info', 'Enter a title, amount, and due date.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('bills').insert({
      user_id: session.user.id,
      title,
      amount: amountNum,
      due_date: dueDate,
      status: 'pending',
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setModalVisible(false);
    fetchBills();
  };

  const markPaid = async (bill: Bill) => {
    const { error } = await supabase.from('bills').update({ status: 'paid' }).eq('id', bill.id);
    if (error) Alert.alert('Error', error.message);
    fetchBills();
  };

  const deleteBill = (bill: Bill) => {
    Alert.alert('Delete bill', `Remove "${bill.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('bills').delete().eq('id', bill.id);
          fetchBills();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const pendingBills = bills.filter((b) => b.status !== 'paid');
  const paidBills = bills.filter((b) => b.status === 'paid');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Upcoming bills</Text>
          <Pressable style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        {pendingBills.length === 0 && paidBills.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No bills tracked yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add a due date reminder.</Text>
          </View>
        ) : (
          <>
            {pendingBills.map((bill) => {
              const days = daysUntil(bill.due_date);
              const isOverdue = days < 0;
              const isSoon = days >= 0 && days <= 3;
              return (
                <View key={bill.id} style={styles.billCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.billTitle}>{bill.title}</Text>
                    <Text style={styles.billAmount}>₹{bill.amount.toLocaleString('en-IN')}</Text>
                    <Text
                      style={[
                        styles.billDue,
                        isOverdue && styles.billOverdue,
                        isSoon && styles.billSoon,
                      ]}
                    >
                      {isOverdue
                        ? `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`
                        : days === 0
                        ? 'Due today'
                        : `Due in ${days} day${days !== 1 ? 's' : ''}`}
                    </Text>
                  </View>
                  <View style={styles.billActions}>
                    <Pressable style={styles.paidButton} onPress={() => markPaid(bill)}>
                      <Ionicons name="checkmark" size={18} color="#15803d" />
                    </Pressable>
                    <Pressable style={styles.deleteButton} onPress={() => deleteBill(bill)}>
                      <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {paidBills.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Paid</Text>
                {paidBills.map((bill) => (
                  <View key={bill.id} style={[styles.billCard, styles.billCardPaid]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.billTitle, styles.textMuted]}>{bill.title}</Text>
                      <Text style={[styles.billAmount, styles.textMuted]}>₹{bill.amount.toLocaleString('en-IN')}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a bill</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} placeholder="Zet Card payment" value={title} onChangeText={setTitle} />

            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="2500" value={amount} onChangeText={setAmount} />

            <Text style={styles.label}>Due date</Text>
            <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={dueDate ? styles.dateText : styles.datePlaceholder}>
                {dueDate || 'Select a date'}
              </Text>
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
            {Platform.OS === 'ios' && showDatePicker && (
              <Pressable style={styles.doneButton} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heading: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  addButton: { backgroundColor: '#7C3AED', borderRadius: 24, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  emptyState: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0', borderStyle: 'dashed' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#9ca3af' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#9ca3af', marginTop: 20, marginBottom: 10 },
  billCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0',
  },
  billCardPaid: { opacity: 0.6 },
  billTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  billAmount: { fontSize: 13, color: '#4b5563', marginTop: 3 },
  billDue: { fontSize: 12.5, color: '#6b6b6b', marginTop: 6, fontWeight: '600' },
  billOverdue: { color: '#dc2626' },
  billSoon: { color: '#d97706' },
  textMuted: { color: '#9ca3af' },
  billActions: { flexDirection: 'row', gap: 8 },
  paidButton: { backgroundColor: '#dcfce7', borderRadius: 20, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  deleteButton: { backgroundColor: '#fee2e2', borderRadius: 20, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#e2e2e2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: '#fafafa' },
  helperText: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  dateText: { fontSize: 15, color: '#1a1a1a' },
  datePlaceholder: { fontSize: 15, color: '#9ca3af' },
  doneButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 16, marginTop: 4 },
  doneButtonText: { color: '#7C3AED', fontWeight: '700', fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 28 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: '#f1f1f1' },
  cancelButtonText: { fontWeight: '700', color: '#4b5563' },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: '#7C3AED' },
  saveButtonText: { fontWeight: '700', color: '#fff' },
});