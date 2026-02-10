import { Tabs } from 'expo-router';
import { View, StyleSheet, Pressable, Animated, Platform, Dimensions } from 'react-native';
import { useEffect, useRef } from 'react';
import { Home, BookOpen, Plus, BarChart3, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { hapticImpact, hapticLight } from '../../lib/haptics';
import ReAnimated, { FadeInUp } from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius, Gradients, Glass } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Kinetic FAB - The centerpiece button with living animations
function KineticFAB({ onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 8,
      tension: 400,
      useNativeDriver: true,
    }).start();
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    await hapticImpact();
    onPress?.();
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.3, 0.6],
  });

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.fabContainer}
    >
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.fabGlowRing,
          {
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />

      {/* Inner glow ring */}
      <Animated.View
        style={[
          styles.fabGlowRingInner,
          {
            transform: [{ scale: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.1],
            }) }],
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 0.2],
            }),
          },
        ]}
      />

      {/* Main button */}
      <Animated.View
        style={[
          styles.fabButton,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={Gradients.electric}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Plus size={32} color="#fff" strokeWidth={3} />
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

// Tab icon with spring animation
function TabBarIcon({ icon: Icon, focused }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.1 : 1,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [focused, scaleAnim]);

  return (
    <Animated.View style={[styles.tabIconWrap, { transform: [{ scale: scaleAnim }] }]}>
      <Icon
        size={24}
        color={focused ? Colors.tabBarActive : Colors.tabBarInactive}
        strokeWidth={focused ? 2.5 : 2}
      />
      {focused && <View style={styles.tabIndicator} />}
    </Animated.View>
  );
}

const TAB_ICONS = {
  index: Home,
  diary: BookOpen,
  add: Plus,
  stats: BarChart3,
  profile: User,
};

const TAB_LABELS = {
  index: 'Dashboard',
  diary: 'Diary',
  add: '',
  stats: 'Stats',
  profile: 'Profile',
};

// Floating Glass Dock
function FloatingDock({ state, descriptors, navigation }) {
  return (
    <ReAnimated.View
      entering={FadeInUp.delay(200).springify().mass(0.5).damping(10)}
      style={styles.dockOuter}
    >
      {/* Blur backdrop */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, styles.dockOverlay]} />
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.dockFallback]} />
      )}

      {/* Border overlay */}
      <View style={styles.dockBorder} />

      {/* Tab items */}
      <View style={styles.dockRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const isFab = route.name === 'add';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isFab) {
            return (
              <View key={route.key} style={styles.fabSlot}>
                <KineticFAB onPress={onPress} />
              </View>
            );
          }

          const IconComponent = TAB_ICONS[route.name];
          if (!IconComponent) return null;

          return (
            <Pressable
              key={route.key}
              onPress={async () => {
                await hapticLight();
                onPress();
              }}
              style={styles.dockTab}
            >
              <TabBarIcon icon={IconComponent} focused={focused} />
            </Pressable>
          );
        })}
      </View>
    </ReAnimated.View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingDock {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="diary" options={{ title: 'Diary' }} />
      <Tabs.Screen name="add" options={{ title: '' }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Floating Dock
  dockOuter: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 16,
  },
  dockOverlay: {
    backgroundColor: 'rgba(10, 10, 14, 0.65)',
  },
  dockFallback: {
    backgroundColor: 'rgba(10, 10, 14, 0.95)',
    borderRadius: 35,
  },
  dockBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  dockRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.sm,
  },
  dockTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 4,
    alignSelf: 'center',
  },
  // FAB slot in dock
  fabSlot: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
  fabContainer: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabGlowRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
  },
  fabGlowRingInner: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
