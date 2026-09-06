import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type CreditCard = {
  id: string;
  user_id: string;
  name: string;
  bank: string | null;
  credit_limit: number;
  current_balance: number;
  color: string;
  created_at: string;
};

export function useCreditCards() {
  const { session } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const instanceId = useRef(Math.random().toString(36).slice(2)).current;

  const fetchCards = useCallback(async () => {
    if (!session?.user) return;
    setError(null);
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setCards(data ?? []);
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchCards();

    if (!session?.user) return;

    // Live-update the heatmap if a balance changes elsewhere (e.g. another device)
    const channel = supabase
      .channel(`credit_cards_changes_${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credit_cards', filter: `user_id=eq.${session.user.id}` },
        () => fetchCards()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCards, session?.user?.id]);

  // Belt-and-suspenders: refetch whenever this tab regains focus, in case the
  // realtime event was missed (e.g. Realtime replication not enabled for this table).
  useFocusEffect(
    useCallback(() => {
      fetchCards();
    }, [fetchCards]),
  );

  return { cards, loading, error, refresh: fetchCards };
}