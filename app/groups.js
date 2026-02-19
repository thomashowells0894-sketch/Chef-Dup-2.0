import React, { useState, useMemo, useCallback, memo } from 'react';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
  Switch,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ReAnimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Plus,
  Search,
  Pin,
  Heart,
  Send,
  ChevronRight,
  Hash,
  Shield,
  Flame,
  Target,
  Dumbbell,
  Apple,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassCard from '../components/ui/GlassCard';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Gradients,
  Glass,
} from '../constants/theme';
import { hapticLight, hapticSuccess, hapticImpact, hapticError } from '../lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Tabs ---
const TABS = [
  { key: 'discover', label: 'Discover', icon: Search },
  { key: 'my', label: 'My Groups', icon: Users },
  { key: 'create', label: 'Create', icon: Plus },
];

// --- Categories ---
const CATEGORIES = [
  { key: 'all', label: 'All', emoji: '', color: Colors.primary },
  { key: 'general', label: 'General', emoji: '💬', color: Colors.primary },
  { key: 'weight-loss', label: 'Weight Loss', emoji: '🔥', color: Colors.secondary },
  { key: 'muscle-building', label: 'Muscle Building', emoji: '💪', color: '#BF5AF2' },
  { key: 'running', label: 'Running', emoji: '🏃', color: Colors.success },
  { key: 'nutrition', label: 'Nutrition', emoji: '🍎', color: '#64D2FF' },
  { key: 'beginners', label: 'Beginners', emoji: '🌱', color: '#FFD700' },
  { key: 'challenge', label: 'Challenge', emoji: '🏆', color: Colors.warning },
];

// --- Sample groups data ---
const SAMPLE_GROUPS = [
  {
    id: '1',
    name: 'Couch to 5K',
    description: 'Supporting each other on the journey from zero to running 5K. All paces welcome!',
    category: 'running',
    memberCount: 2847,
    isPublic: true,
    lastThread: { title: 'Week 3 check-in! How is everyone doing?', replyCount: 43 },
    joined: true,
  },
  {
    id: '2',
    name: 'Keto Warriors',
    description: 'Share keto recipes, tips, and meal preps. Stay in ketosis together.',
    category: 'nutrition',
    memberCount: 5621,
    isPublic: true,
    lastThread: { title: 'Best electrolyte supplements?', replyCount: 28 },
    joined: false,
  },
  {
    id: '3',
    name: 'Morning Runners Club',
    description: 'For those who get their miles in before sunrise. Early bird accountability.',
    category: 'running',
    memberCount: 1893,
    isPublic: true,
    lastThread: { title: '5am gang check in', replyCount: 67 },
    joined: true,
  },
  {
    id: '4',
    name: 'Protein Gang',
    description: 'Hit your protein goals daily. Share high-protein meals and snack ideas.',
    category: 'nutrition',
    memberCount: 3412,
    isPublic: true,
    lastThread: { title: 'Cottage cheese recipes that actually taste good', replyCount: 92 },
    joined: false,
  },
  {
    id: '5',
    name: 'New Year Transformers 2026',
    description: 'Started in January, going all year. Post your progress and stay motivated!',
    category: 'challenge',
    memberCount: 8204,
    isPublic: true,
    lastThread: { title: 'February progress photos thread', replyCount: 156 },
    joined: true,
  },
  {
    id: '6',
    name: 'Gym Beginners Safe Space',
    description: 'No question is too silly. Learn proper form, routines, and gym etiquette.',
    category: 'beginners',
    memberCount: 4510,
    isPublic: true,
    lastThread: { title: 'How much should I rest between sets?', replyCount: 34 },
    joined: false,
  },
  {
    id: '7',
    name: 'Hypertrophy Hub',
    description: 'Science-based muscle building discussion. PPL, Upper/Lower, and beyond.',
    category: 'muscle-building',
    memberCount: 6733,
    isPublic: true,
    lastThread: { title: 'RIR vs RPE - which do you use?', replyCount: 78 },
    joined: false,
  },
  {
    id: '8',
    name: 'Intermittent Fasting Crew',
    description: '16:8, 20:4, OMAD - all IF protocols welcome. Share your fasting journey.',
    category: 'weight-loss',
    memberCount: 7120,
    isPublic: true,
    lastThread: { title: 'Does black coffee break a fast?', replyCount: 112 },
    joined: true,
  },
  {
    id: '9',
    name: 'Plant-Based Athletes',
    description: 'Crushing fitness goals on a plant-based diet. Recipes, tips, and encouragement.',
    category: 'nutrition',
    memberCount: 2156,
    isPublic: true,
    lastThread: { title: 'Best vegan protein powder 2026?', replyCount: 45 },
    joined: false,
  },
  {
    id: '10',
    name: '30-Day Abs Challenge',
    description: 'Daily core workouts for 30 days. Post your daily check-in and keep the streak!',
    category: 'challenge',
    memberCount: 3890,
    isPublic: true,
    lastThread: { title: 'Day 14 - Halfway there!', replyCount: 201 },
    joined: false,
  },
  {
    id: '11',
    name: 'Weight Loss Accountability',
    description: 'Weekly weigh-ins, meal sharing, and genuine support. We are all in this together.',
    category: 'weight-loss',
    memberCount: 9342,
    isPublic: true,
    lastThread: { title: 'How do you handle plateaus?', replyCount: 87 },
    joined: true,
  },
  {
    id: '12',
    name: 'Home Workout Heroes',
    description: 'No gym? No problem. Share bodyweight routines and home equipment setups.',
    category: 'general',
    memberCount: 4289,
    isPublic: true,
    lastThread: { title: 'Best resistance bands for pull-ups?', replyCount: 39 },
    joined: false,
  },
];

// --- Helpers ---
function formatMemberCount(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(count);
}

function getCategoryInfo(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[1];
}

// --- Tab Selector ---
const TabSelector = memo(function TabSelector({ activeTab, onTabChange }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(60).springify().mass(0.5).damping(10)}
      style={styles.tabContainer}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const IconComponent = tab.icon;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabChange(tab.key)}
          >
            {isActive ? (
              <LinearGradient
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tabGradient}
              >
                <IconComponent size={14} color={Colors.background} />
                <Text style={styles.tabTextActive}>{tab.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.tabInner}>
                <IconComponent size={14} color={Colors.textTertiary} />
                <Text style={styles.tabText}>{tab.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ReAnimated.View>
  );
});

// --- Category Pills ---
const CategoryPills = memo(function CategoryPills({ selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryScroll}
    >
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.key;
        return (
          <Pressable
            key={cat.key}
            style={[
              styles.categoryPill,
              isActive && { backgroundColor: cat.color + '20', borderColor: cat.color + '50' },
            ]}
            onPress={() => onSelect(cat.key)}
          >
            {cat.emoji ? (
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            ) : null}
            <Text
              style={[
                styles.categoryPillText,
                isActive && { color: cat.color, fontWeight: FontWeight.semibold },
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

// --- Group Card (Discover view) ---
const GroupCard = memo(function GroupCard({ group, onJoin, onPress, index }) {
  const catInfo = getCategoryInfo(group.category);

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(80 + index * 40).springify().mass(0.5).damping(10)}
    >
      <Pressable onPress={() => onPress(group)} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
        <GlassCard style={styles.groupCard} animated={false}>
          {/* Category badge + name */}
          <View style={styles.groupCardHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: catInfo.color + '18' }]}>
              <Text style={styles.categoryBadgeEmoji}>{catInfo.emoji}</Text>
              <Text style={[styles.categoryBadgeText, { color: catInfo.color }]}>{catInfo.label}</Text>
            </View>
            {!group.isPublic && (
              <Shield size={14} color={Colors.textTertiary} />
            )}
          </View>

          {/* Group name */}
          <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>

          {/* Description */}
          <Text style={styles.groupDescription} numberOfLines={2}>{group.description}</Text>

          {/* Bottom row */}
          <View style={styles.groupCardFooter}>
            <View style={styles.memberCountRow}>
              <Users size={14} color={Colors.textTertiary} />
              <Text style={styles.memberCountText}>{formatMemberCount(group.memberCount)} members</Text>
            </View>

            {group.joined ? (
              <View style={styles.joinedBadge}>
                <Text style={styles.joinedBadgeText}>Joined</Text>
              </View>
            ) : (
              <Pressable
                style={styles.joinButton}
                onPress={() => onJoin(group)}
              >
                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.joinButtonGradient}
                >
                  <Plus size={14} color={Colors.background} />
                  <Text style={styles.joinButtonText}>Join</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </GlassCard>
      </Pressable>
    </ReAnimated.View>
  );
});

// --- My Group Row ---
const MyGroupRow = memo(function MyGroupRow({ group, onPress, index }) {
  const catInfo = getCategoryInfo(group.category);

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(80 + index * 40).springify().mass(0.5).damping(10)}
    >
      <Pressable onPress={() => onPress(group)} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
        <GlassCard style={styles.myGroupRow} animated={false}>
          {/* Left icon */}
          <View style={[styles.myGroupIcon, { backgroundColor: catInfo.color + '18' }]}>
            <Text style={styles.myGroupEmoji}>{catInfo.emoji}</Text>
          </View>

          {/* Info */}
          <View style={styles.myGroupInfo}>
            <Text style={styles.myGroupName} numberOfLines={1}>{group.name}</Text>
            {group.lastThread && (
              <View style={styles.lastThreadRow}>
                <MessageSquare size={11} color={Colors.textTertiary} />
                <Text style={styles.lastThreadText} numberOfLines={1}>
                  {group.lastThread.title}
                </Text>
              </View>
            )}
            <View style={styles.myGroupMeta}>
              <Users size={11} color={Colors.textMuted} />
              <Text style={styles.myGroupMetaText}>{formatMemberCount(group.memberCount)}</Text>
              {group.lastThread && (
                <>
                  <MessageSquare size={11} color={Colors.textMuted} />
                  <Text style={styles.myGroupMetaText}>{group.lastThread.replyCount} replies</Text>
                </>
              )}
            </View>
          </View>

          {/* Chevron */}
          <ChevronRight size={18} color={Colors.textTertiary} />
        </GlassCard>
      </Pressable>
    </ReAnimated.View>
  );
});

// --- Empty State ---
const EmptyState = memo(function EmptyState({ icon: IconComponent, title, subtitle }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(120).springify().mass(0.5).damping(10)}
      style={styles.emptyState}
    >
      <View style={styles.emptyIconContainer}>
        <IconComponent size={48} color={Colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </ReAnimated.View>
  );
});

// --- Create Category Picker ---
const CreateCategoryPicker = memo(function CreateCategoryPicker({ selected, onSelect }) {
  // Exclude the 'all' option for creation
  const options = CATEGORIES.filter((c) => c.key !== 'all');

  return (
    <View style={styles.createCategoryGrid}>
      {options.map((cat) => {
        const isSelected = selected === cat.key;
        return (
          <Pressable
            key={cat.key}
            style={[
              styles.createCategoryOption,
              isSelected && { borderColor: cat.color + '80', backgroundColor: cat.color + '15' },
            ]}
            onPress={() => onSelect(cat.key)}
          >
            <Text style={styles.createCategoryEmoji}>{cat.emoji}</Text>
            <Text
              style={[
                styles.createCategoryText,
                isSelected && { color: cat.color, fontWeight: FontWeight.semibold },
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

// --- Main Screen ---
function GroupsScreenInner() {
  const [activeTab, setActiveTab] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [groups, setGroups] = useState(SAMPLE_GROUPS);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formIsPublic, setFormIsPublic] = useState(true);

  // --- Handlers ---
  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, []);

  const handleTabChange = useCallback(async (key) => {
    await hapticLight();
    setActiveTab(key);
  }, []);

  const handleCategoryChange = useCallback(async (key) => {
    await hapticLight();
    setSelectedCategory(key);
  }, []);

  const handleJoinGroup = useCallback(async (group) => {
    await hapticImpact();
    setGroups((prev) =>
      prev.map((g) =>
        g.id === group.id
          ? { ...g, joined: true, memberCount: g.memberCount + 1 }
          : g
      )
    );
    await hapticSuccess();
  }, []);

  const handleGroupPress = useCallback(async (group) => {
    await hapticLight();
    // Future: navigate to group detail screen
    // router.push(`/group/${group.id}`);
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!formName.trim()) {
      await hapticError();
      return;
    }

    await hapticImpact();

    const newGroup = {
      id: String(Date.now()),
      name: formName.trim(),
      description: formDescription.trim(),
      category: formCategory,
      memberCount: 1,
      isPublic: formIsPublic,
      lastThread: null,
      joined: true,
    };

    setGroups((prev) => [newGroup, ...prev]);
    await hapticSuccess();

    // Reset form
    setFormName('');
    setFormDescription('');
    setFormCategory('general');
    setFormIsPublic(true);
    setActiveTab('my');
  }, [formName, formDescription, formCategory, formIsPublic]);

  // --- Derived data ---
  const filteredGroups = useMemo(() => {
    let list = groups;

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.description && g.description.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      list = list.filter((g) => g.category === selectedCategory);
    }

    return list;
  }, [groups, searchQuery, selectedCategory]);

  const myGroups = useMemo(() => groups.filter((g) => g.joined), [groups]);

  const isFormValid = formName.trim().length > 0;

  // --- Render Discover ---
  const renderDiscoverItem = useCallback(
    ({ item, index }) => (
      <GroupCard
        group={item}
        onJoin={handleJoinGroup}
        onPress={handleGroupPress}
        index={index}
      />
    ),
    [handleJoinGroup, handleGroupPress]
  );

  const renderMyGroupItem = useCallback(
    ({ item, index }) => (
      <MyGroupRow group={item} onPress={handleGroupPress} index={index} />
    ),
    [handleGroupPress]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  // --- Tab content ---
  const renderDiscoverTab = () => (
    <FlatList
      data={filteredGroups}
      renderItem={renderDiscoverItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={10}
      ListHeaderComponent={
        <View>
          {/* Search bar */}
          <ReAnimated.View
            entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}
          >
            <GlassCard style={styles.searchCard} animated={false}>
              <View style={styles.searchRow}>
                <Search size={18} color={Colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search groups..."
                  placeholderTextColor={Colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <Hash size={18} color={Colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            </GlassCard>
          </ReAnimated.View>

          {/* Category pills */}
          <ReAnimated.View
            entering={FadeInDown.delay(140).springify().mass(0.5).damping(10)}
          >
            <CategoryPills selected={selectedCategory} onSelect={handleCategoryChange} />
          </ReAnimated.View>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={Search}
          title="No Groups Found"
          subtitle="Try adjusting your search or browsing a different category."
        />
      }
    />
  );

  const renderMyGroupsTab = () => {
    if (myGroups.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="No Groups Joined"
          subtitle="Discover and join groups to connect with like-minded people."
        />
      );
    }

    return (
      <FlatList
        data={myGroups}
        renderItem={renderMyGroupItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
      />
    );
  };

  const renderCreateTab = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.createContainer}
    >
      <ScrollView
        contentContainerStyle={styles.createScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <ReAnimated.View entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}>
          <Text style={styles.formLabel}>Group Name</Text>
          <TextInput
            style={styles.formInput}
            value={formName}
            onChangeText={setFormName}
            placeholder="e.g. Morning Runners Club"
            placeholderTextColor={Colors.inputPlaceholder}
            maxLength={60}
          />
        </ReAnimated.View>

        {/* Description */}
        <ReAnimated.View entering={FadeInDown.delay(120).springify().mass(0.5).damping(10)}>
          <Text style={styles.formLabel}>Description</Text>
          <TextInput
            style={[styles.formInput, styles.formInputMultiline]}
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder="What is this group about?"
            placeholderTextColor={Colors.inputPlaceholder}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
        </ReAnimated.View>

        {/* Category */}
        <ReAnimated.View entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)}>
          <Text style={styles.formLabel}>Category</Text>
          <CreateCategoryPicker selected={formCategory} onSelect={setFormCategory} />
        </ReAnimated.View>

        {/* Public/Private Toggle */}
        <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}>
          <Text style={styles.formLabel}>Visibility</Text>
          <View style={styles.visibilityRow}>
            <View style={styles.visibilityInfo}>
              <Shield size={18} color={formIsPublic ? Colors.primary : Colors.textTertiary} />
              <View style={styles.visibilityTextContainer}>
                <Text style={[styles.visibilityLabel, formIsPublic && { color: Colors.primary }]}>
                  {formIsPublic ? 'Public Group' : 'Private Group'}
                </Text>
                <Text style={styles.visibilityDescription}>
                  {formIsPublic
                    ? 'Anyone can find and join this group'
                    : 'Only invited members can join'}
                </Text>
              </View>
            </View>
            <Switch
              value={formIsPublic}
              onValueChange={setFormIsPublic}
              trackColor={{ false: Colors.surfaceElevated, true: Colors.primary + '60' }}
              thumbColor={formIsPublic ? Colors.primary : Colors.textTertiary}
            />
          </View>
        </ReAnimated.View>

        {/* Create Button */}
        <ReAnimated.View entering={FadeInUp.delay(260).springify().mass(0.5).damping(10)}>
          <Pressable
            onPress={handleCreateGroup}
            disabled={!isFormValid}
            style={({ pressed }) => [
              styles.createButton,
              !isFormValid && styles.createButtonDisabled,
              pressed && isFormValid && { opacity: 0.85 },
            ]}
          >
            <LinearGradient
              colors={isFormValid ? Gradients.primary : Gradients.disabled}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              <Plus size={20} color={Colors.background} />
              <Text style={styles.createButtonText}>Create Group</Text>
            </LinearGradient>
          </Pressable>
        </ReAnimated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <ScreenWrapper>
      {/* Header */}
      <ReAnimated.View
        entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}
        style={styles.header}
      >
        <Pressable style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Users size={22} color={Colors.primary} />
          <Text style={styles.headerTitle}>Groups</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.groupCountBadge}>
            <Text style={styles.groupCountText}>{myGroups.length}</Text>
          </View>
        </View>
      </ReAnimated.View>

      {/* Tab Selector */}
      <TabSelector activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'discover' && renderDiscoverTab()}
        {activeTab === 'my' && renderMyGroupsTab()}
        {activeTab === 'create' && renderCreateTab()}
      </View>
    </ScreenWrapper>
  );
}

export default function GroupsScreen(props) {
  return (
    <ScreenErrorBoundary screenName="GroupsScreen">
      <GroupsScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerRight: {
    width: 44,
    alignItems: 'center',
  },
  groupCountBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  groupCountText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  tabActive: {
    ...Shadows.button,
    shadowOpacity: 0.2,
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: 6,
    borderRadius: BorderRadius.full,
  },
  tabInner: {
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
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  tabTextActive: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },

  // Tab content
  tabContent: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 120,
  },

  // Search bar
  searchCard: {
    marginBottom: Spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    padding: 0,
  },

  // Category pills
  categoryScroll: {
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },

  // Group card (Discover)
  groupCard: {
    marginBottom: Spacing.sm,
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  categoryBadgeEmoji: {
    fontSize: 12,
  },
  categoryBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  groupName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  groupDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  groupCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberCountText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  joinButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.button,
    shadowOpacity: 0.15,
  },
  joinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.xs + 3,
    gap: 4,
    borderRadius: BorderRadius.full,
  },
  joinButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  joinedBadge: {
    backgroundColor: Colors.successSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  joinedBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },

  // My Group Row
  myGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  myGroupIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myGroupEmoji: {
    fontSize: 22,
  },
  myGroupInfo: {
    flex: 1,
  },
  myGroupName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 3,
  },
  lastThreadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  lastThreadText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
  myGroupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  myGroupMetaText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    marginRight: 6,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Create form
  createContainer: {
    flex: 1,
  },
  createScroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  formLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  formInputMultiline: {
    minHeight: 80,
    paddingTop: Spacing.md,
  },

  // Create category grid
  createCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  createCategoryOption: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm * 2) / 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  createCategoryEmoji: {
    fontSize: 20,
  },
  createCategoryText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },

  // Visibility toggle
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  visibilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  visibilityDescription: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },

  // Create button
  createButton: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.button,
  },
  createButtonDisabled: {
    ...Shadows.inner,
    opacity: 0.7,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  createButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 120,
  },
});
