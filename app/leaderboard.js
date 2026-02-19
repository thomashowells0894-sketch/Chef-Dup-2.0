import React, { useState, useMemo, useCallback, useRef, memo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import {
  Trophy,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  Crown,
  Zap,
  Flame,
  Target,
  Users,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import OptimizedFlatList from '../components/OptimizedFlatList';
import {
  Colors,
  Gradients,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { hapticLight } from '../lib/haptics';
import { useGamification } from '../context/GamificationContext';
import { useProfile } from '../context/ProfileContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../hooks/useFriends';
import { LEADERBOARD_CATEGORIES } from '../data/leaderboardData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Medal colors
const GOLD = '#FFD700';
const GOLD_DIM = '#DAA520';
const GOLD_GLOW = 'rgba(255, 215, 0, 0.3)';
const SILVER = '#C0C0C0';
const SILVER_DIM = '#A8A8A8';
const SILVER_GLOW = 'rgba(192, 192, 192, 0.25)';
const BRONZE = '#CD7F32';
const BRONZE_DIM = '#B87333';
const BRONZE_GLOW = 'rgba(205, 127, 50, 0.25)';

// Leaderboard now shows only real users - no simulated fallback

// Filter tabs
const FILTER_TABS = [
  { key: 'global', label: 'Global', icon: Trophy },
  { key: 'friends', label: 'Friends', icon: Users },
];

// Time period tabs
const TIME_PERIOD_TABS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'alltime', label: 'All Time' },
];

// Header with back button and title
const Header = memo(function Header() {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}
      style={styles.header}
    >
      <Pressable
        style={styles.backButton}
        onPress={async () => {
          await hapticLight();
          router.back();
        }}
      >
        <ChevronLeft size={24} color={Colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Leaderboard</Text>
      <View style={styles.headerTrophyContainer}>
        <Trophy size={24} color={GOLD} />
      </View>
    </ReAnimated.View>
  );
});

// Filter tab selector (Global / Friends)
const FilterTabs = memo(function FilterTabs({ activeFilter, onFilterChange }) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(40).springify().mass(0.5).damping(10)} style={styles.filterTabsContainer}>
      {FILTER_TABS.map((tab) => {
        const isActive = activeFilter === tab.key;
        const IconComponent = tab.icon;
        return (
          <Pressable
            key={tab.key}
            style={[styles.filterTab, isActive && styles.filterTabActive]}
            onPress={() => onFilterChange(tab.key)}
          >
            {isActive ? (
              <LinearGradient
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterTabGradient}
              >
                <IconComponent size={14} color={Colors.background} />
                <Text style={styles.filterTabTextActive}>{tab.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.filterTabInner}>
                <IconComponent size={14} color={Colors.textTertiary} />
                <Text style={styles.filterTabText}>{tab.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ReAnimated.View>
  );
});

// Time period tab selector
const TimePeriodTabs = memo(function TimePeriodTabs({ activePeriod, onPeriodChange }) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(60).springify().mass(0.5).damping(10)} style={styles.timePeriodContainer}>
      {TIME_PERIOD_TABS.map((tab) => {
        const isActive = activePeriod === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={[styles.timePeriodTab, isActive && styles.timePeriodTabActive]}
            onPress={() => onPeriodChange(tab.key)}
          >
            <Text style={[styles.timePeriodText, isActive && styles.timePeriodTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ReAnimated.View>
  );
});

// Category tab pill
const CategoryTab = memo(function CategoryTab({ category, isActive, onPress }) {
  return (
    <Pressable
      onPress={() => onPress(category.id)}
      style={[styles.categoryTab, isActive && styles.categoryTabActive]}
    >
      {isActive ? (
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.categoryTabGradient}
        >
          <Text style={styles.categoryTabEmoji}>{category.emoji}</Text>
          <Text style={styles.categoryTabTextActive}>{category.name}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.categoryTabInner}>
          <Text style={styles.categoryTabEmoji}>{category.emoji}</Text>
          <Text style={styles.categoryTabText}>{category.name}</Text>
        </View>
      )}
    </Pressable>
  );
});

// Category tabs horizontal scroll
const CategoryTabs = memo(function CategoryTabs({ activeCategory, onCategoryChange }) {
  const handlePress = useCallback(async (id) => {
    await hapticLight();
    onCategoryChange(id);
  }, [onCategoryChange]);

  return (
    <ReAnimated.View entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryTabsContainer}
      >
        {LEADERBOARD_CATEGORIES.map((cat) => (
          <CategoryTab
            key={cat.id}
            category={cat}
            isActive={activeCategory === cat.id}
            onPress={handlePress}
          />
        ))}
      </ScrollView>
    </ReAnimated.View>
  );
});

// Your rank hero card
const YourRankCard = memo(function YourRankCard({ rank, totalUsers, userName, userLevel, statValue, statFormatted, categoryEmoji }) {
  const percentile = Math.round(((totalUsers - rank + 1) / totalUsers) * 100);

  return (
    <ReAnimated.View entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)}>
      <View style={styles.yourRankCard}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.12)', 'rgba(255, 215, 0, 0.03)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.yourRankGradient}
        >
          {/* Rank number */}
          <View style={styles.yourRankLeft}>
            <Text style={styles.yourRankHash}>#</Text>
            <Text style={styles.yourRankNumber}>{rank}</Text>
          </View>

          {/* User info */}
          <View style={styles.yourRankCenter}>
            <View style={styles.yourRankAvatarCircle}>
              <Text style={styles.yourRankAvatarText}>
                {userName ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'VF'}
              </Text>
            </View>
            <View style={styles.yourRankInfo}>
              <Text style={styles.yourRankName} numberOfLines={1}>
                {userName || 'You'}
              </Text>
              <View style={styles.yourRankLevelBadge}>
                <Zap size={10} color={GOLD} />
                <Text style={styles.yourRankLevelText}>Lvl {userLevel}</Text>
              </View>
            </View>
          </View>

          {/* Stat + percentile */}
          <View style={styles.yourRankRight}>
            <Text style={styles.yourRankStat}>{statFormatted}</Text>
            <View style={styles.percentileBadge}>
              <Text style={styles.percentileText}>Top {Math.max(1, 100 - percentile + 1)}%</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </ReAnimated.View>
  );
});

// Podium card for top 3
const PodiumCard = memo(function PodiumCard({ user, rank, statFormatted, isYou, positionChange }) {
  const medalColor = rank === 1 ? GOLD : rank === 2 ? SILVER : BRONZE;
  const medalGlow = rank === 1 ? GOLD_GLOW : rank === 2 ? SILVER_GLOW : BRONZE_GLOW;
  const borderColor = rank === 1 ? 'rgba(255, 215, 0, 0.4)' : rank === 2 ? 'rgba(192, 192, 192, 0.35)' : 'rgba(205, 127, 50, 0.35)';
  const bgGradient = rank === 1
    ? ['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.02)']
    : rank === 2
      ? ['rgba(192, 192, 192, 0.08)', 'rgba(192, 192, 192, 0.02)']
      : ['rgba(205, 127, 50, 0.08)', 'rgba(205, 127, 50, 0.02)'];

  return (
    <View style={[
      styles.podiumCard,
      { borderColor },
      rank === 1 && styles.podiumCardGold,
      isYou && styles.podiumCardYou,
    ]}>
      <LinearGradient
        colors={bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.podiumCardGradient}
      >
        {/* Medal rank */}
        <View style={styles.podiumRankRow}>
          <View style={[styles.podiumRankCircle, { backgroundColor: medalColor }]}>
            {rank === 1 ? (
              <Crown size={14} color="#000" />
            ) : (
              <Text style={styles.podiumRankText}>{rank}</Text>
            )}
          </View>
          {positionChange !== 0 && (
            <View style={styles.positionChangeSmall}>
              {positionChange > 0 ? (
                <ArrowUp size={10} color={Colors.success} />
              ) : (
                <ArrowDown size={10} color={Colors.error} />
              )}
              <Text style={[
                styles.positionChangeTextSmall,
                { color: positionChange > 0 ? Colors.success : Colors.error },
              ]}>
                {Math.abs(positionChange)}
              </Text>
            </View>
          )}
        </View>

        {/* Avatar */}
        <Text style={[styles.podiumAvatar, rank === 1 && styles.podiumAvatarGold]}>{user.avatar}</Text>

        {/* Name */}
        <Text style={styles.podiumName} numberOfLines={1}>{user.name}</Text>

        {/* Level */}
        <View style={[styles.podiumLevelBadge, { backgroundColor: medalColor + '25' }]}>
          <Text style={[styles.podiumLevelText, { color: medalColor }]}>Lvl {user.level}</Text>
        </View>

        {/* Stat */}
        <Text style={[styles.podiumStat, { color: medalColor }]}>{statFormatted}</Text>

        {isYou && (
          <View style={styles.youIndicator}>
            <Text style={styles.youIndicatorText}>YOU</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
});

// Top 3 podium layout
const PodiumSection = memo(function PodiumSection({ topThree, category, yourIndex }) {
  if (topThree.length < 3) return null;

  const formatValue = LEADERBOARD_CATEGORIES.find(c => c.id === category)?.format || ((v) => String(v));
  const categoryKey = LEADERBOARD_CATEGORIES.find(c => c.id === category)?.key || 'xp';

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(240).springify().mass(0.5).damping(10)}
      style={styles.podiumSection}
    >
      {/* 2nd, 1st, 3rd layout */}
      <View style={styles.podiumRow}>
        <View style={styles.podiumSlot2}>
          <PodiumCard
            user={topThree[1].user}
            rank={2}
            statFormatted={formatValue(topThree[1].user[categoryKey])}
            isYou={topThree[1].isYou}
            positionChange={topThree[1].positionChange || 0}
          />
        </View>
        <View style={styles.podiumSlot1}>
          <PodiumCard
            user={topThree[0].user}
            rank={1}
            statFormatted={formatValue(topThree[0].user[categoryKey])}
            isYou={topThree[0].isYou}
            positionChange={topThree[0].positionChange || 0}
          />
        </View>
        <View style={styles.podiumSlot3}>
          <PodiumCard
            user={topThree[2].user}
            rank={3}
            statFormatted={formatValue(topThree[2].user[categoryKey])}
            isYou={topThree[2].isYou}
            positionChange={topThree[2].positionChange || 0}
          />
        </View>
      </View>
    </ReAnimated.View>
  );
});

// Standard leaderboard row (rank 4+)
const LeaderboardRow = memo(function LeaderboardRow({ item, rank, isYou, statFormatted, positionChange, index }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(320 + index * 40).springify().mass(0.5).damping(10)}
    >
      <View style={[styles.leaderboardRow, isYou && styles.leaderboardRowYou]}>
        {isYou && (
          <LinearGradient
            colors={['rgba(0, 212, 255, 0.08)', 'rgba(0, 212, 255, 0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Rank */}
        <View style={styles.rowRankContainer}>
          <Text style={[styles.rowRank, isYou && styles.rowRankYou]}>
            {rank}
          </Text>
        </View>

        {/* Position change */}
        <View style={styles.rowPositionChange}>
          {positionChange > 0 ? (
            <>
              <ArrowUp size={12} color={Colors.success} />
              <Text style={[styles.positionChangeText, { color: Colors.success }]}>
                {positionChange}
              </Text>
            </>
          ) : positionChange < 0 ? (
            <>
              <ArrowDown size={12} color={Colors.error} />
              <Text style={[styles.positionChangeText, { color: Colors.error }]}>
                {Math.abs(positionChange)}
              </Text>
            </>
          ) : (
            <Text style={styles.positionChangeDash}>-</Text>
          )}
        </View>

        {/* Avatar */}
        <Text style={styles.rowAvatar}>{item.avatar}</Text>

        {/* Name + Level */}
        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, isYou && styles.rowNameYou]} numberOfLines={1}>
            {isYou ? `${item.name} (You)` : item.name}
          </Text>
          <View style={styles.rowLevelBadge}>
            <Zap size={9} color={Colors.gold} />
            <Text style={styles.rowLevelText}>Lvl {item.level}</Text>
          </View>
        </View>

        {/* Stat */}
        <Text style={[styles.rowStat, isYou && styles.rowStatYou]}>{statFormatted}</Text>
      </View>
    </ReAnimated.View>
  );
});

// Weekly challenge card at bottom
const WeeklyChallengeCard = memo(function WeeklyChallengeCard({ currentStreak }) {
  const progress = Math.min(currentStreak / 7, 1);
  const progressPercent = Math.round(progress * 100);

  return (
    <ReAnimated.View entering={FadeInDown.delay(500).springify().mass(0.5).damping(10)}>
      <View style={styles.challengeCard}>
        <LinearGradient
          colors={['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.03)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.challengeGradient}
        >
          <View style={styles.challengeHeader}>
            <View style={styles.challengeHeaderLeft}>
              <Target size={20} color={Colors.primary} />
              <Text style={styles.challengeTitle}>Weekly Challenge</Text>
            </View>
            <View style={styles.challengeReward}>
              <Zap size={14} color={GOLD} />
              <Text style={styles.challengeRewardText}>500 XP</Text>
            </View>
          </View>

          <Text style={styles.challengeDescription}>
            Log food for 7 days in a row
          </Text>

          <View style={styles.challengeProgressContainer}>
            <View style={styles.challengeProgressBar}>
              <LinearGradient
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.challengeProgressFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={styles.challengeProgressText}>
              {Math.min(currentStreak, 7)}/7 days
            </Text>
          </View>

          {progress >= 1 && (
            <View style={styles.challengeCompleteBadge}>
              <Text style={styles.challengeCompleteText}>COMPLETED</Text>
            </View>
          )}
        </LinearGradient>
      </View>
    </ReAnimated.View>
  );
});

/**
 * Fetch real leaderboard data from Supabase.
 * Only includes users who have opted in (leaderboard_visible = true).
 * Supports time period filtering: 'weekly', 'monthly', 'alltime'.
 * For weekly/monthly, only considers users active within the time window.
 */
async function fetchRealLeaderboard(period = 'alltime') {
  try {
    let query = supabase
      .from('profiles')
      .select('user_id, name, avatar_url, total_xp, current_streak, workout_count, calorie_accuracy, level, previous_rank, leaderboard_visible, last_active_at, updated_at')
      .eq('leaderboard_visible', true)
      .order('total_xp', { ascending: false })
      .limit(100);

    // For weekly/monthly, filter to users who were active within the time window
    if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('last_active_at', weekAgo.toISOString());
    } else if (period === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      query = query.gte('last_active_at', monthAgo.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((u) => ({
      name: u.name || 'Anonymous',
      avatar: '',
      level: u.level || 1,
      xp: u.total_xp || 0,
      streak: u.current_streak || 0,
      workouts: u.workout_count || 0,
      calories_accuracy: u.calorie_accuracy || 0,
      userId: u.user_id,
      previousRank: u.previous_rank || null,
    }));
  } catch (error) {
    if (__DEV__) console.error('[Leaderboard] Fetch real data error:', error.message);
    return null; // null indicates failure
  }
}

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('xp');
  const [activeFilter, setActiveFilter] = useState('global');
  const [activePeriod, setActivePeriod] = useState('alltime');
  const [realUsers, setRealUsers] = useState(null);
  const [isLoadingReal, setIsLoadingReal] = useState(true);
  const { totalXP, currentStreak, levelInfo } = useGamification();
  const { profile } = useProfile();
  const { friends } = useFriends();

  // Fetch real leaderboard data on mount and when time period changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingReal(true);
      const data = await fetchRealLeaderboard(activePeriod);
      if (!cancelled) {
        setRealUsers(data);
        setIsLoadingReal(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activePeriod]);

  // Build the "you" user from real data
  const yourUser = useMemo(() => ({
    name: profile?.name || 'You',
    avatar: '',
    level: levelInfo?.level || 1,
    xp: totalXP || 0,
    streak: currentStreak || 0,
    workouts: Math.floor((totalXP || 0) / 50),
    calories_accuracy: Math.min(95, 60 + Math.floor((totalXP || 0) / 200)),
    userId: user?.id,
    isYou: true,
  }), [profile, levelInfo, totalXP, currentStreak, user]);

  // Friend user IDs for "Friends Only" filter
  const friendIds = useMemo(() =>
    (friends || []).map(f => f.friendId),
    [friends]
  );

  // Get current category config
  const categoryConfig = useMemo(
    () => LEADERBOARD_CATEGORIES.find(c => c.id === activeCategory) || LEADERBOARD_CATEGORIES[0],
    [activeCategory]
  );

  // Only show real users from Supabase - no simulated/fake data
  const baseUsers = useMemo(() => {
    if (realUsers === null) {
      // Fetch failed, show empty leaderboard
      return [];
    }
    return realUsers;
  }, [realUsers]);

  // Merge your user with the data, sort, and apply filter
  const sortedLeaderboard = useMemo(() => {
    let users = baseUsers;

    // Apply "Friends Only" filter
    if (activeFilter === 'friends') {
      users = users.filter(u => friendIds.includes(u.userId));
    }

    const allUsers = [
      ...users.map((u, i) => ({ user: u, isYou: false, originalIndex: i })),
      { user: yourUser, isYou: true, originalIndex: users.length },
    ];

    // Sort descending by the category key
    allUsers.sort((a, b) => (b.user[categoryConfig.key] || 0) - (a.user[categoryConfig.key] || 0));

    // Calculate position changes based on stored previous rank
    return allUsers.map((entry, idx) => {
      const currentRank = idx + 1;
      const prevRank = entry.user.previousRank;
      const positionChange = prevRank != null ? prevRank - currentRank : 0;
      return { ...entry, positionChange };
    });
  }, [categoryConfig, yourUser, baseUsers, activeFilter, friendIds]);

  // Find your rank
  const yourRank = useMemo(() => {
    const idx = sortedLeaderboard.findIndex(item => item.isYou);
    return idx + 1;
  }, [sortedLeaderboard]);

  // Top 3 for podium
  const topThree = useMemo(() => sortedLeaderboard.slice(0, 3), [sortedLeaderboard]);

  // Rest of list (rank 4+)
  const restOfList = useMemo(() => sortedLeaderboard.slice(3), [sortedLeaderboard]);

  // Your stat formatted
  const yourStatFormatted = useMemo(
    () => categoryConfig.format(yourUser[categoryConfig.key]),
    [categoryConfig, yourUser]
  );

  const handlePeriodChange = useCallback(async (key) => {
    await hapticLight();
    setActivePeriod(key);
  }, []);

  const handleCategoryChange = useCallback((id) => {
    setActiveCategory(id);
  }, []);

  const handleFilterChange = useCallback(async (key) => {
    await hapticLight();
    setActiveFilter(key);
  }, []);

  const renderRow = useCallback(({ item, index }) => {
    const rank = index + 4; // starts at rank 4
    const statFormatted = categoryConfig.format(item.user[categoryConfig.key] || 0);

    return (
      <LeaderboardRow
        item={item.user}
        rank={rank}
        isYou={item.isYou}
        statFormatted={statFormatted}
        positionChange={item.positionChange || 0}
        index={index}
      />
    );
  }, [categoryConfig]);

  const keyExtractor = useCallback((item, index) => `${item.user.name}-${item.user.userId || ''}-${index}`, []);

  const ListHeaderComponent = useMemo(() => (
    <View>
      <Header />

      <FilterTabs
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      <TimePeriodTabs
        activePeriod={activePeriod}
        onPeriodChange={handlePeriodChange}
      />

      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />

      {isLoadingReal && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingBannerText}>Loading live rankings...</Text>
        </View>
      )}

      <YourRankCard
        rank={yourRank}
        totalUsers={sortedLeaderboard.length}
        userName={yourUser.name}
        userLevel={yourUser.level}
        statValue={yourUser[categoryConfig.key]}
        statFormatted={yourStatFormatted}
        categoryEmoji={categoryConfig.emoji}
      />

      <PodiumSection
        topThree={topThree}
        category={activeCategory}
        yourIndex={yourRank - 1}
      />

      {/* Section divider */}
      {restOfList.length > 0 && (
        <ReAnimated.View
          entering={FadeInDown.delay(300).springify().mass(0.5).damping(10)}
          style={styles.sectionDivider}
        >
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Rankings</Text>
          <View style={styles.dividerLine} />
        </ReAnimated.View>
      )}
    </View>
  ), [activeCategory, activeFilter, activePeriod, yourRank, sortedLeaderboard.length, yourUser, categoryConfig, yourStatFormatted, topThree, restOfList.length, handleCategoryChange, handleFilterChange, handlePeriodChange, isLoadingReal]);

  const ListFooterComponent = useMemo(() => (
    <View>
      <WeeklyChallengeCard currentStreak={currentStreak} />
      <View style={styles.bottomSpacer} />
    </View>
  ), [currentStreak]);

  return (
    <ScreenWrapper edges={['top']}>
      <OptimizedFlatList
        data={restOfList}
        renderItem={renderRow}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerTrophyContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Filter Tabs (Global / Friends)
  filterTabsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterTab: {
    flex: 1,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  filterTabActive: {
    ...Shadows.button,
    shadowOpacity: 0.15,
  },
  filterTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: 6,
    borderRadius: BorderRadius.full,
  },
  filterTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: 6,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  filterTabTextActive: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },

  // Time Period Tabs
  timePeriodContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timePeriodTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  timePeriodTabActive: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  timePeriodText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  timePeriodTextActive: {
    color: Colors.text,
    fontWeight: FontWeight.bold,
  },

  // Loading banner
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  loadingBannerText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  // Category Tabs
  categoryTabsContainer: {
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  categoryTab: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  categoryTabActive: {
    // active styles handled by gradient
  },
  categoryTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
    borderRadius: BorderRadius.full,
  },
  categoryTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryTabEmoji: {
    fontSize: 16,
  },
  categoryTabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  categoryTabTextActive: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },

  // Your Rank Card
  yourRankCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    marginBottom: Spacing.lg,
    ...Shadows.card,
    shadowColor: GOLD,
    shadowOpacity: 0.15,
  },
  yourRankGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  yourRankLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  yourRankHash: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
  },
  yourRankNumber: {
    fontSize: 36,
    fontWeight: FontWeight.black,
    color: GOLD,
    letterSpacing: -1,
  },
  yourRankCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  yourRankAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yourRankAvatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  yourRankInfo: {
    flex: 1,
  },
  yourRankName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  yourRankLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  yourRankLevelText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: GOLD,
  },
  yourRankRight: {
    alignItems: 'flex-end',
  },
  yourRankStat: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  percentileBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  percentileText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },

  // Podium Section
  podiumSection: {
    marginBottom: Spacing.md,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  podiumSlot1: {
    flex: 1,
    maxWidth: (SCREEN_WIDTH - 64) / 3,
  },
  podiumSlot2: {
    flex: 1,
    maxWidth: (SCREEN_WIDTH - 64) / 3,
    marginBottom: 16,
  },
  podiumSlot3: {
    flex: 1,
    maxWidth: (SCREEN_WIDTH - 64) / 3,
    marginBottom: 24,
  },
  podiumCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  podiumCardGold: {
    ...Shadows.card,
    shadowColor: GOLD,
    shadowOpacity: 0.2,
  },
  podiumCardYou: {
    borderColor: Colors.primary + '60',
    ...Shadows.glowPrimary,
    shadowOpacity: 0.2,
  },
  podiumCardGradient: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: 6,
  },
  podiumRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  podiumRankCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRankText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.black,
    color: '#000',
  },
  positionChangeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  positionChangeTextSmall: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  podiumAvatar: {
    fontSize: 32,
  },
  podiumAvatarGold: {
    fontSize: 38,
  },
  podiumName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  podiumLevelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  podiumLevelText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  podiumStat: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  youIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  youIndicatorText: {
    fontSize: 8,
    fontWeight: FontWeight.black,
    color: Colors.background,
    letterSpacing: 0.5,
  },

  // Section Divider
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Leaderboard Row
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  leaderboardRowYou: {
    borderColor: 'rgba(0, 212, 255, 0.3)',
    ...Shadows.glowPrimary,
    shadowOpacity: 0.1,
  },
  rowRankContainer: {
    width: 30,
    alignItems: 'center',
  },
  rowRank: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  rowRankYou: {
    color: Colors.primary,
  },
  rowPositionChange: {
    width: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  positionChangeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  positionChangeDash: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  rowAvatar: {
    fontSize: 28,
    marginRight: Spacing.sm,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  rowNameYou: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  rowLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  rowLevelText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    color: Colors.gold,
  },
  rowStat: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  rowStatYou: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },

  // Weekly Challenge Card
  challengeCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    marginTop: Spacing.lg,
  },
  challengeGradient: {
    padding: Spacing.lg,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  challengeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  challengeTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  challengeReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  challengeRewardText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: GOLD,
  },
  challengeDescription: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  challengeProgressContainer: {
    gap: Spacing.xs,
  },
  challengeProgressBar: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  challengeProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  challengeProgressText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'right',
  },
  challengeCompleteBadge: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  challengeCompleteText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.black,
    color: Colors.success,
    letterSpacing: 1,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 140,
  },
});
