import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UtilizationBar from '../../components/UtilizationBar';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, useCreditCards } from '../../hooks/useCreditCards';
import { supabase } from '../../lib/supabase';

const CARD_COLORS = ['#7C3AED', '#2563eb', '#059669', '#dc2626', '#d97706', '#0891b2'];

export default function CardsScreen() {
  const { session } = useAuth();
  const { cards, loading, refresh } = useCreditCards();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [limit, setLimit] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const openAddModal = () => {
    setEditingCard(null);
    setName('');
    setBank('');
    setLimit('');
    setBalance('');
    setColor(CARD_COLORS[0]);
    setModalVisible(true);
  };

  const openEditModal = (card: CreditCard) => {
    setEditingCard(card);
    setName(card.name);
    setBank(card.bank ?? '');
    setLimit(String(card.credit_limit));
    setBalance(String(card.current_balance));
    setColor(card.color);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!session?.user) return;
    const limitNum = parseFloat(limit);
    const balanceNum = parseFloat(balance || '0');

    if (!name || isNaN(limitNum) || limitNum <= 0) {
      Alert.alert('Missing info', 'Enter a card name and a valid credit limit.');
      return;
    }

    setSaving(true);
    if (editingCard) {
      const { error } = await supabase
        .from('credit_cards')
        .update({ name, bank, credit_limit: limitNum, current_balance: balanceNum, color, updated_at: new Date().toISOString() })
        .eq('id', editingCard.id);
      if (error) Alert.alert('Error', error.message);
    } else {
      const { error } = await supabase.from('credit_cards').insert({
        user_id: session.user.id,
        name,
        bank,
        credit_limit: limitNum,
        current_balance: balanceNum,
        color,
      });
      if (error) Alert.alert('Error', error.message);
    }
    setSaving(false);
    setModalVisible(false);
    refresh();
  };

  const handleDelete = (card: CreditCard) => {
    Alert.alert('Delete card', `Remove "${card.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('credit_cards').delete().eq('id', card.id);
          if (error) Alert.alert('Error', error.message);
          refresh();
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Your cards</Text>
          <Pressable style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        {cards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No cards yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first card.</Text>
          </View>
        ) : (
          cards.map((card) => (
            <Pressable key={card.id} onLongPress={() => handleDelete(card)} onPress={() => openEditModal(card)}>
              <UtilizationBar card={card} />
            </Pressable>
          ))
        )}

        {cards.length > 0 && (
          <Text style={styles.hint}>Tap a card to edit • Long-press to delete</Text>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingCard ? 'Edit card' : 'Add a card'}</Text>

            <Text style={styles.label}>Card name</Text>
            <TextInput style={styles.input} placeholder="Zet Secured Card" value={name} onChangeText={setName} />

            <Text style={styles.label}>Bank (optional)</Text>
            <TextInput style={styles.input} placeholder="Indian Overseas Bank" value={bank} onChangeText={setBank} />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Credit limit (₹)</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="50000" value={limit} onChangeText={setLimit} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Current balance (₹)</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={balance} onChangeText={setBalance} />
              </View>
            </View>

            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {CARD_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]}
                />
              ))}
            </View>

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
  hint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#e2e2e2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row' },
  colorRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: '#1a1a1a' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 28 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: '#f1f1f1' },
  cancelButtonText: { fontWeight: '700', color: '#4b5563' },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: '#7C3AED' },
  saveButtonText: { fontWeight: '700', color: '#fff' },
});