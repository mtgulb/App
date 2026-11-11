import { useMemo, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { radius } from '@/theme/colors';

export type SwipeAction = { label: string; color: string; run: () => void };

const THRESHOLD = 90;
const MAX = 140;

/**
 * Rad som kan sveipes. Sveip mot høyre utløser `right`, mot venstre utløser `left`.
 * Raden spretter tilbake etter sveipet. Vertikal scrolling påvirkes ikke.
 * Samme handlinger er tilgjengelige for skjermleser via accessibilityActions.
 */
export function SwipeRow({
  children,
  right,
  left,
  accessibilityLabel,
}: {
  children: ReactNode;
  right?: SwipeAction;
  left?: SwipeAction;
  accessibilityLabel?: string;
}) {
  const [x] = useState(() => new Animated.Value(0));
  // Lages på nytt når handlingene endres, så sveipet alltid bruker de siste.
  const pan = useMemo(() => {
    const reset = () =>
      Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        let dx = g.dx;
        if (dx > 0 && !right) dx = 0;
        if (dx < 0 && !left) dx = 0;
        x.setValue(Math.max(-MAX, Math.min(MAX, dx)));
      },
      onPanResponderRelease: (_, g) => {
        reset();
        if (g.dx > THRESHOLD && right) right.run();
        else if (g.dx < -THRESHOLD && left) left.run();
      },
      onPanResponderTerminate: reset,
    });
  }, [x, right, left]);

  const rightOpacity = x.interpolate({
    inputRange: [0, THRESHOLD],
    outputRange: [0.35, 1],
    extrapolate: 'clamp',
  });
  const leftOpacity = x.interpolate({
    inputRange: [-THRESHOLD, 0],
    outputRange: [1, 0.35],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={styles.wrap}
      accessible={false}
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={[
        ...(right ? [{ name: 'right', label: right.label }] : []),
        ...(left ? [{ name: 'left', label: left.label }] : []),
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'right') right?.run();
        if (e.nativeEvent.actionName === 'left') left?.run();
      }}
    >
      {right ? (
        <Animated.View
          style={[
            styles.bg,
            styles.bgRight,
            { backgroundColor: right.color, opacity: rightOpacity },
          ]}
        >
          <Text style={styles.bgText}>{right.label}</Text>
        </Animated.View>
      ) : null}
      {left ? (
        <Animated.View
          style={[styles.bg, styles.bgLeft, { backgroundColor: left.color, opacity: leftOpacity }]}
        >
          <Text style={styles.bgText}>{left.label}</Text>
        </Animated.View>
      ) : null}
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius - 6, overflow: 'hidden' },
  bg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  bgRight: { alignItems: 'flex-start' },
  bgLeft: { alignItems: 'flex-end' },
  bgText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
