import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const CARD_WIDTH = 216;
const CARD_HEIGHT = 134;

type LoginHeroProps = {
  title: string;
  subtitle: string;
};

export default function LoginHero({ title, subtitle }: LoginHeroProps) {
  const glow = useSharedValue(0.85);
  const back = useSharedValue(0);
  const mid = useSharedValue(0);
  const front = useSharedValue(0);
  const float = useSharedValue(0);
  const shine = useSharedValue(-1);

  useEffect(() => {
    const spring = (delay: number) =>
      withDelay(
        delay,
        withSpring(1, { damping: 14, stiffness: 120, reduceMotion: ReduceMotion.System }),
      );

    back.value = spring(50);
    mid.value = spring(150);
    front.value = spring(260);

    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.85, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    float.value = withDelay(
      750,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );

    shine.value = withDelay(
      950,
      withTiming(1.4, { duration: 1200, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }),
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.45,
    transform: [{ scale: 0.9 + glow.value * 0.15 }],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: back.value,
    transform: [
      { translateX: 32 },
      { translateY: interpolate(back.value, [0, 1], [-64, -22]) },
      { rotate: '-12deg' },
      { scale: interpolate(back.value, [0, 1], [0.9, 1]) },
    ],
  }));

  const midStyle = useAnimatedStyle(() => ({
    opacity: mid.value,
    transform: [
      { translateX: -28 },
      { translateY: interpolate(mid.value, [0, 1], [-56, -8]) },
      { rotate: '9deg' },
      { scale: interpolate(mid.value, [0, 1], [0.9, 1]) },
    ],
  }));

  const frontStyle = useAnimatedStyle(() => ({
    opacity: front.value,
    transform: [
      { translateY: interpolate(front.value, [0, 1], [40, 0]) - float.value * 6 * front.value },
      { scale: interpolate(front.value, [0, 1], [0.94, 1]) },
    ],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shine.value, [-1, 1.4], [-170, 230]) },
      { rotate: '20deg' },
    ],
  }));

  return (
    <View style={styles.heroWrap}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <View style={styles.stack}>
        <Animated.View style={[styles.card, styles.backCard, backStyle]} />
        <Animated.View style={[styles.card, styles.midCard, midStyle]} />
        <Animated.View style={[styles.card, styles.frontCardShadow, frontStyle]}>
          <View style={styles.frontCardInner}>
            <LinearGradient
              colors={['#8B5CF6', '#4C1D95']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.cardTopRow}>
              <View style={styles.chip} />
              <Ionicons
                name="wifi"
                size={18}
                color="rgba(255,255,255,0.65)"
                style={{ transform: [{ rotate: '90deg' }] }}
              />
            </View>
            <Text style={styles.cardNumber}>•••• •••• •••• 4218</Text>
            <View style={styles.cardBottomRow}>
              <Text style={styles.cardBrand}>Riverline</Text>
              <View style={styles.networkMark}>
                <View style={[styles.networkDot, { backgroundColor: '#F5D68A' }]} />
                <View
                  style={[
                    styles.networkDot,
                    styles.networkDotOverlap,
                    { backgroundColor: 'rgba(255,255,255,0.85)' },
                  ]}
                />
              </View>
            </View>
            <Animated.View style={[styles.shine, shineStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { alignItems: 'center', marginBottom: 8 },
  glow: {
    position: 'absolute',
    top: 6,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#DDD6FE',
  },
  stack: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT + 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
  },
  backCard: { backgroundColor: '#C4B5FD' },
  midCard: { backgroundColor: '#7C3AED' },
  frontCardShadow: {
    shadowColor: '#4C1D95',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  frontCardInner: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 18,
    justifyContent: 'space-between',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chip: { width: 34, height: 24, borderRadius: 5, backgroundColor: '#F5D68A' },
  cardNumber: { color: 'rgba(255,255,255,0.92)', fontSize: 16, letterSpacing: 2, fontWeight: '600' },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBrand: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
  networkMark: { flexDirection: 'row' },
  networkDot: { width: 20, height: 20, borderRadius: 10 },
  networkDotOverlap: { marginLeft: -8 },
  shine: { position: 'absolute', top: -60, bottom: -60, width: 70 },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', letterSpacing: -0.3 },
  subtitle: {
    fontSize: 14,
    color: '#6b6b6b',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 270,
  },
});
