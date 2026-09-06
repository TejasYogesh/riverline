import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type Bill = {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  card_id: string | null;
};

export function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function formatDueLabel(days: number) {
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
  if (days === 0) return 'Due today';
  return `Due in ${days} day${days !== 1 ? 's' : ''}`;
}

export function useBills() {
  const { session } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const instanceId = useRef(Math.random().toString(36).slice(2)).current;

  const fetchBills = useCallback(async () => {
    if (!session?.user) return;
    setError(null);
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', session.user.id)
      .order('due_date', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setBills(data ?? []);
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchBills();

    if (!session?.user) return;

    // Live-update if a bill changes elsewhere (e.g. another device, or another tab)
    const channel = supabase
      .channel(`bills_changes_${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills', filter: `user_id=eq.${session.user.id}` },
        () => fetchBills(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBills, session?.user?.id]);

  // Belt-and-suspenders: refetch whenever this tab regains focus, in case the
  // realtime event was missed (e.g. Realtime replication not enabled for this table).
  useFocusEffect(
    useCallback(() => {
      fetchBills();
    }, [fetchBills]),
  );

  return { bills, loading, error, refresh: fetchBills };
}
