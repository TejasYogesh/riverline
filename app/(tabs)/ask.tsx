import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
} from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line as SvgLine, Path, Polyline } from 'react-native-svg';
import { getUtilizationColor } from '../../components/UtilizationBar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Fixed categorical order (validated for CVD-safe adjacent contrast) - never
// cycled, never reassigned by rank. Scatter uses only the first 3 slots since
// it needs all-pairs (not just adjacent) separation; the rest fold to muted.
const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const MUTED = '#898781';
const AXIS_COLOR = '#c3c2b7';

function categoricalColor(index: number, cap = CATEGORICAL.length) {
  return index < cap ? CATEGORICAL[index] : MUTED;
}

type ChartType = 'bar' | 'pie' | 'line' | 'scatter';
type ChartPoint = { x: number; y: number; label: string };
type Chart = {
  type: ChartType;
  metric: 'utilization' | 'balance' | 'bills';
  unit: 'percent' | 'currency';
  labels: string[];
  values: number[];
  points?: ChartPoint[];
  xLabel?: string;
  yLabel?: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isError?: boolean;
  chart?: Chart | null;
};

const CHART_TITLES: Record<Chart['metric'], string> = {
  utilization: 'Card utilization',
  balance: 'Card balances',
  bills: 'Upcoming bills',
};

const VIEW_TYPES: ChartType[] = ['bar', 'pie', 'line', 'scatter'];

function formatChartValue(chart: Chart, value: number) {
  return chart.unit === 'percent' ? `${value}%` : `₹${value.toLocaleString('en-IN')}`;
}

function BarView({ chart }: { chart: Chart }) {
  const max = Math.max(...chart.values, 1);
  return (
    <View style={{ gap: 10 }}>
      {chart.labels.map((label, i) => {
        const value = chart.values[i];
        const color = chart.metric === 'utilization' ? getUtilizationColor(value).bar : categoricalColor(i);
        return (
          <View key={`${label}-${i}`} style={styles.chartRow}>
            <Text style={styles.chartLabel} numberOfLines={1}>
              {label}
            </Text>
            <View style={styles.chartTrack}>
              <View style={[styles.chartFill, { width: `${(value / max) * 100}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.chartValue}>{formatChartValue(chart, value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function PieView({ chart, width }: { chart: Chart; width: number }) {
  const size = Math.min(width, 180);
  const r = size / 2;
  const innerR = r * 0.58;
  const total = chart.values.reduce((sum, v) => sum + v, 0) || 1;

  const slices = chart.labels.map((label, i) => ({
    color: chart.metric === 'utilization' ? getUtilizationColor(chart.values[i]).bar : categoricalColor(i),
    label,
    value: chart.values[i],
  }));

  let cursor = -Math.PI / 2;
  const arcs = slices.map((slice) => {
    const angle = (slice.value / total) * Math.PI * 2;
    const start = cursor;
    const end = cursor + angle;
    cursor = end;
    const x1 = r + r * Math.cos(start);
    const y1 = r + r * Math.sin(start);
    const x2 = r + r * Math.cos(end);
    const y2 = r + r * Math.sin(end);
    const ix1 = r + innerR * Math.cos(end);
    const iy1 = r + innerR * Math.sin(end);
    const ix2 = r + innerR * Math.cos(start);
    const iy2 = r + innerR * Math.sin(start);
    const largeArc = angle > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
  });

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Svg width={size} height={size}>
        {slices.length === 1 ? (
          <>
            <Circle cx={r} cy={r} r={r} fill={slices[0].color} />
            <Circle cx={r} cy={r} r={innerR} fill="#fff" />
          </>
        ) : (
          arcs.map((d, i) => <Path key={i} d={d} fill={slices[i].color} stroke="#fff" strokeWidth={2} />)
        )}
      </Svg>
      <ChartLegend items={slices.map((s) => ({ color: s.color, label: s.label, value: formatChartValue(chart, s.value) }))} />
    </View>
  );
}

function LineView({ chart, width }: { chart: Chart; width: number }) {
  const h = 120;
  const padding = 16;
  const max = Math.max(...chart.values, 1);
  const min = Math.min(...chart.values, 0);
  const range = max - min || 1;
  const innerW = width - padding * 2;
  const n = chart.values.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  const color = '#7C3AED';

  const points = chart.values.map((v, i) => ({
    x: padding + i * stepX,
    y: padding + (1 - (v - min) / range) * (h - padding * 2),
    v,
    label: chart.labels[i],
  }));

  return (
    <View style={{ gap: 10 }}>
      <Svg width={width} height={h}>
        <SvgLine x1={padding} y1={h - padding} x2={width - padding} y2={h - padding} stroke={AXIS_COLOR} strokeWidth={1} />
        {n > 1 && (
          <Polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={2} />
        )}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={color} />
        ))}
      </Svg>
      <ChartLegend items={points.map((p) => ({ color, label: p.label, value: formatChartValue(chart, p.v) }))} />
    </View>
  );
}

function ScatterView({ chart, width }: { chart: Chart; width: number }) {
  const points = chart.points ?? [];
  if (points.length === 0) {
    return <Text style={styles.chartEmptyText}>Not enough data to plot.</Text>;
  }

  const h = 150;
  const padding = 20;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMax = Math.max(...xs, 1);
  const xMin = Math.min(...xs, 0);
  const yMax = Math.max(...ys, 1);
  const yMin = Math.min(...ys, 0);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const innerW = width - padding * 2;
  const innerH = h - padding * 2;

  // Scatter needs all-pairs separation, not just adjacent - cap to the first
  // 3 categorical slots (the only ones that clear the all-pairs floor).
  const plotted = points.map((p, i) => ({
    cx: padding + ((p.x - xMin) / xRange) * innerW,
    cy: padding + (1 - (p.y - yMin) / yRange) * innerH,
    color: categoricalColor(i, 3),
    label: p.label,
  }));

  return (
    <View style={{ gap: 10 }}>
      <Svg width={width} height={h}>
        <SvgLine x1={padding} y1={h - padding} x2={width - padding} y2={h - padding} stroke={AXIS_COLOR} strokeWidth={1} />
        <SvgLine x1={padding} y1={padding} x2={padding} y2={h - padding} stroke={AXIS_COLOR} strokeWidth={1} />
        {plotted.map((p, i) => (
          <Circle key={i} cx={p.cx} cy={p.cy} r={5} fill={p.color} />
        ))}
      </Svg>
      {(chart.xLabel || chart.yLabel) && (
        <Text style={styles.chartAxisCaption}>
          {chart.xLabel} vs {chart.yLabel}
        </Text>
      )}
      <ChartLegend items={plotted.map((p) => ({ color: p.color, label: p.label }))} />
    </View>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string; value?: string }[] }) {
  return (
    <View style={styles.chartLegend}>
      {items.map((item, i) => (
        <View key={`${item.label}-${i}`} style={styles.chartLegendRow}>
          <View style={[styles.chartLegendDot, { backgroundColor: item.color }]} />
          <Text style={styles.chartLegendLabel} numberOfLines={1}>
            {item.label}
          </Text>
          {item.value !== undefined && <Text style={styles.chartLegendValue}>{item.value}</Text>}
        </View>
      ))}
    </View>
  );
}

function ChartCard({ chart }: { chart: Chart }) {
  const [viewType, setViewType] = useState<ChartType>(chart.type);
  const [width, setWidth] = useState(240);

  return (
    <View style={styles.chartCard} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Text style={styles.chartTitle}>{CHART_TITLES[chart.metric]}</Text>

      {chart.labels.length === 0 ? (
        <Text style={styles.chartEmptyText}>Nothing to chart yet.</Text>
      ) : viewType === 'bar' ? (
        <BarView chart={chart} />
      ) : viewType === 'pie' ? (
        <PieView chart={chart} width={width} />
      ) : viewType === 'line' ? (
        <LineView chart={chart} width={width} />
      ) : (
        <ScatterView chart={chart} width={width} />
      )}

      <View style={styles.chartTypeRow}>
        {VIEW_TYPES.map((t) => (
          <Pressable
            key={t}
            style={[styles.chartTypeChip, viewType === t && styles.chartTypeChipActive]}
            onPress={() => setViewType(t)}
          >
            <Text style={[styles.chartTypeChipText, viewType === t && styles.chartTypeChipTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type ChatSession = {
  id: string;
  title: string;
  updated_at: string;
};

const SUGGESTIONS = [
  'Which card should I pay down first?',
  'What bills are due soon?',
  'Why does utilization matter?',
];

// Renders the small subset of markdown the model tends to produce
// (**bold**, *italic*, "* " bullets) as real formatting instead of literal asterisks.
function FormattedText({ text, style }: { text: string; style: TextStyle }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        const bulletMatch = line.match(/^(\s*)[*-]\s+(.*)/);
        const indent = bulletMatch ? bulletMatch[1].length : 0;
        const content = bulletMatch ? bulletMatch[2] : line;
        const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);

        return (
          <Text key={i} style={style}>
            {'  '.repeat(indent)}
            {bulletMatch ? '•  ' : ''}
            {parts.length > 0
              ? parts.map((part, j) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <Text key={j} style={styles.bold}>
                        {part.slice(2, -2)}
                      </Text>
                    );
                  }
                  if (part.startsWith('*') && part.endsWith('*')) {
                    return (
                      <Text key={j} style={styles.italic}>
                        {part.slice(1, -1)}
                      </Text>
                    );
                  }
                  return part;
                })
              : ' '}
          </Text>
        );
      })}
    </>
  );
}

export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const { session: authSession } = useAuth();
  const listRef = useRef<FlatList<Message>>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const sessionId = useRef<string | null>(null);
  const lastInteractionId = useRef<string | null>(null);
  const keyboard = useAnimatedKeyboard();
  // The bottom tab bar (64px, see (tabs)/_layout.tsx) collapses away when the
  // keyboard opens, so the viewport already reclaims that much space - don't
  // double count it on top of the raw keyboard height.
  const TAB_BAR_HEIGHT = 60;
  const keyboardSpacerStyle = useAnimatedStyle(() => ({
    height: Math.max(keyboard.height.value - TAB_BAR_HEIGHT, 0),
  }));

  const startNewChat = () => {
    sessionId.current = null;
    lastInteractionId.current = null;
    setMessages([]);
    setHistoryVisible(false);
  };

  const openHistory = async () => {
    setHistoryVisible(true);
    setHistoryLoading(true);
    const { data } = await supabase
      .from('chat_sessions')
      .select('id, title, updated_at')
      .eq('user_id', authSession!.user.id)
      .order('updated_at', { ascending: false });
    setSessions(data ?? []);
    setHistoryLoading(false);
  };

  const openSession = async (s: ChatSession) => {
    setHistoryVisible(false);
    setHistoryLoading(true);
    const { data } = await supabase
      .from('chat_messages')
      .select('id, role, content, chart')
      .eq('session_id', s.id)
      .order('created_at', { ascending: true });
    setMessages((data ?? []).map((m) => ({ id: String(m.id), role: m.role, text: m.content, chart: m.chart })));
    sessionId.current = s.id;
    const { data: full } = await supabase.from('chat_sessions').select('last_interaction_id').eq('id', s.id).single();
    lastInteractionId.current = full?.last_interaction_id ?? null;
    setHistoryLoading(false);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || !authSession?.user) return;

    setInput('');
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: trimmed }]);
    setLoading(true);

    let sid = sessionId.current;
    if (!sid) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: authSession.user.id, title: trimmed.slice(0, 48) })
        .select('id')
        .single();
      if (error || !data) {
        setLoading(false);
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: 'Could not start a chat — try again.', isError: true }]);
        return;
      }
      sid = data.id;
      sessionId.current = sid;
    }

    await supabase.from('chat_messages').insert({ session_id: sid, user_id: authSession.user.id, role: 'user', content: trimmed });

    const { data, error } = await supabase.functions.invoke('ask-riverline', {
      body: { message: trimmed, previousInteractionId: lastInteractionId.current },
    });

    setLoading(false);
    if (error || !data?.reply) {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: "Couldn't reach the assistant — try again.", isError: true },
      ]);
      return;
    }

    lastInteractionId.current = data.interactionId ?? null;
    const chart: Chart | null = data.chart ?? null;
    setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: data.reply, chart }]);

    await Promise.all([
      supabase.from('chat_messages').insert({ session_id: sid, user_id: authSession.user.id, role: 'assistant', content: data.reply, chart }),
      supabase
        .from('chat_sessions')
        .update({ last_interaction_id: lastInteractionId.current, updated_at: new Date().toISOString() })
        .eq('id', sid),
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Ask Riverline</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerButton} onPress={openHistory} hitSlop={8}>
            <Ionicons name="time-outline" size={20} color="#4b5563" />
          </Pressable>
          <Pressable style={styles.headerButton} onPress={startNewChat} hitSlop={8}>
            <Ionicons name="add-circle-outline" size={20} color="#4b5563" />
          </Pressable>
        </View>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="sparkles" size={28} color="#7C3AED" />
          <Text style={styles.emptyTitle}>Ask Riverline</Text>
          <Text style={styles.emptySubtitle}>
            Ask about your real balances, upcoming bills, or general credit-health advice.
          </Text>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} style={styles.suggestionChip} onPress={() => send(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          style={styles.list}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === 'user' ? styles.userBubble : styles.assistantBubble,
                item.isError && styles.errorBubble,
                item.chart && styles.chartBubble,
              ]}
            >
              <FormattedText text={item.text} style={item.role === 'user' ? styles.userText : styles.assistantText} />
              {item.chart && <ChartCard chart={item.chart} />}
            </View>
          )}
        />
      )}

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.loadingText}>Thinking…</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask about your credit…"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <Pressable style={styles.sendButton} onPress={() => send(input)} disabled={loading || !input.trim()}>
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
      <Animated.View style={keyboardSpacerStyle} />

      <Modal visible={historyVisible} animationType="slide" transparent onRequestClose={() => setHistoryVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Past chats</Text>
              <Pressable onPress={() => setHistoryVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color="#9ca3af" />
              </Pressable>
            </View>

            {historyLoading ? (
              <ActivityIndicator size="large" color="#7C3AED" style={{ marginVertical: 24 }} />
            ) : sessions.length === 0 ? (
              <Text style={styles.emptyHistoryText}>No past chats yet.</Text>
            ) : (
              <FlatList
                data={sessions}
                keyExtractor={(s) => s.id}
                style={{ maxHeight: 360 }}
                renderItem={({ item }) => (
                  <Pressable style={styles.sessionRow} onPress={() => openSession(item)}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.sessionDate}>
                      {new Date(item.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </Pressable>
                )}
              />
            )}

            <Pressable style={styles.newChatButton} onPress={startNewChat}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.newChatButtonText}>New chat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  headerActions: { flexDirection: 'row', gap: 16 },
  headerButton: { padding: 2 },
  emptyState: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginTop: 12, marginBottom: 6 },
  emptySubtitle: { fontSize: 13.5, color: '#9ca3af', textAlign: 'center', marginBottom: 24 },
  suggestions: { gap: 10, width: '100%' },
  suggestionChip: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  suggestionText: { fontSize: 13.5, color: '#4b5563', fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: 20, gap: 10 },
  bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: '#7C3AED', alignSelf: 'flex-end' },
  assistantBubble: { backgroundColor: '#fff', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#f0f0f0' },
  errorBubble: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  userText: { color: '#fff', fontSize: 14.5, lineHeight: 20 },
  assistantText: { color: '#1a1a1a', fontSize: 14.5, lineHeight: 20 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  chartBubble: { maxWidth: '96%' },
  chartCard: { marginTop: 10, gap: 12 },
  chartTitle: { fontSize: 12.5, fontWeight: '700', color: '#9ca3af' },
  chartEmptyText: { fontSize: 13, color: '#9ca3af' },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartLabel: { width: 78, fontSize: 12, color: '#4b5563', fontWeight: '600' },
  chartTrack: { flex: 1, height: 10, borderRadius: 6, backgroundColor: '#f1f1f1' },
  chartFill: { height: 10, borderRadius: 6 },
  chartValue: { width: 64, fontSize: 12, color: '#1a1a1a', fontWeight: '700', textAlign: 'right' },
  chartAxisCaption: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
  chartLegend: { width: '100%', gap: 6 },
  chartLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartLegendDot: { width: 10, height: 10, borderRadius: 5 },
  chartLegendLabel: { flex: 1, fontSize: 12, color: '#4b5563', fontWeight: '600' },
  chartLegendValue: { fontSize: 12, color: '#1a1a1a', fontWeight: '700' },
  chartTypeRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  chartTypeChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  chartTypeChipActive: { backgroundColor: '#7C3AED' },
  chartTypeChipText: { fontSize: 11.5, fontWeight: '700', color: '#6b6b6b' },
  chartTypeChipTextActive: { color: '#fff' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  loadingText: { fontSize: 12.5, color: '#9ca3af' },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14.5,
    backgroundColor: '#fafafa',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  emptyHistoryText: { fontSize: 13.5, color: '#9ca3af', textAlign: 'center', marginVertical: 24 },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  sessionTitle: { flex: 1, fontSize: 14, color: '#1a1a1a', fontWeight: '600', marginRight: 12 },
  sessionDate: { fontSize: 12, color: '#9ca3af' },
  newChatButton: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },
  newChatButtonText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
});
