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

const BAR_HEIGHTS = [30, 46, 38, 62, 80];
const BAR_COLORS = ['#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED'];
const BAR_WIDTH = 26;
const BAR_GAP = 10;
const MAX_BAR_HEIGHT = 80;

type SignupHeroProps = {
  title: string;
  subtitle: string;
};

export default function SignupHero({ title, subtitle }: SignupHeroProps) {
  const bar0 = useSharedValue(0);
  const bar1 = useSharedValue(0);
  const bar2 = useSharedValue(0);
  const bar3 = useSharedValue(0);
  const bar4 = useSharedValue(0);
  const bars = [bar0, bar1, bar2, bar3, bar4];
  const coin = useSharedValue(0);
  const bob = useSharedValue(0);
  const ping = useSharedValue(0);

  useEffect(() => {
    bars.forEach((bar, i) => {
      bar.value = withDelay(
        i * 90,
        withSpring(1, { damping: 13, stiffness: 110, reduceMotion: ReduceMotion.System }),
      );
    });

    const settleDelay = BAR_HEIGHTS.length * 90 + 150;

    coin.value = withDelay(
      settleDelay,
      withSpring(1, { damping: 10, stiffness: 140, reduceMotion: ReduceMotion.System }),
    );

    ping.value = withDelay(
      settleDelay + 120,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }),
    );

    bob.value = withDelay(
      settleDelay + 500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const barStyle0 = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(bar0.value, [0, 1], [0, 1]) }],
    opacity: interpolate(bar0.value, [0, 0.3, 1], [0, 1, 1]),
  }));
  const barStyle1 = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(bar1.value, [0, 1], [0, 1]) }],
    opacity: interpolate(bar1.value, [0, 0.3, 1], [0, 1, 1]),
  }));
  const barStyle2 = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(bar2.value, [0, 1], [0, 1]) }],
    opacity: interpolate(bar2.value, [0, 0.3, 1], [0, 1, 1]),
  }));
  const barStyle3 = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(bar3.value, [0, 1], [0, 1]) }],
    opacity: interpolate(bar3.value, [0, 0.3, 1], [0, 1, 1]),
  }));
  const barStyle4 = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(bar4.value, [0, 1], [0, 1]) }],
    opacity: interpolate(bar4.value, [0, 0.3, 1], [0, 1, 1]),
  }));
  const barStyles = [barStyle0, barStyle1, barStyle2, barStyle3, barStyle4];

  const coinStyle = useAnimatedStyle(() => ({
    opacity: coin.value,
    transform: [
      { translateY: interpolate(coin.value, [0, 1], [16, 0]) - bob.value * 5 },
      { scale: interpolate(coin.value, [0, 1], [0.5, 1]) },
    ],
  }));

  const pingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ping.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(ping.value, [0, 1], [1, 2.1]) }],
  }));

  return (
    <View style={styles.heroWrap}>
      <View style={styles.stage}>
        <View style={styles.barsRow}>
          {BAR_HEIGHTS.map((height, i) => (
            <Animated.View
              key={i}
              style={[
                styles.bar,
                {
                  height,
                  backgroundColor: BAR_COLORS[i],
                  transformOrigin: 'bottom',
                },
                barStyles[i],
              ]}
            />
          ))}
        </View>

        <View style={styles.coinSlot}>
          <Animated.View style={[styles.ping, pingStyle]} />
          <Animated.View style={[styles.coin, coinStyle]}>
            <LinearGradient
              colors={['#FDE68A', '#F5B84A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.coinText}>₹</Text>
          </Animated.View>
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { alignItems: 'center', marginBottom: 8 },
  stage: {
    height: MAX_BAR_HEIGHT + 56,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BAR_GAP,
  },
  bar: {
    width: BAR_WIDTH,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  coinSlot: {
    position: 'absolute',
    top: 0,
    right: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
  },
  ping: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#F5B84A',
  },
  coin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B45309',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  coinText: { fontSize: 22, fontWeight: '800', color: '#7C4A03' },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', letterSpacing: -0.3 },
  subtitle: {
    fontSize: 14,
    color: '#6b6b6b',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 270,
  },
});
