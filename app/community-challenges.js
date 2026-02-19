import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import {
  ArrowLeft,
  Trophy,
  Users,
  Plus,
  X,
  Crown,
  Target,
  Flame,
  Footprints,
  Droplets,
  Beef,
  ClipboardList,
  Dumbbell,
  Clock,
  Zap,
  ChevronRight,
  Search,
  UserPlus,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import ChallengeCard from '../components/ChallengeCard';
import GlassCard from '../components/ui/GlassCard';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Gradients,
} from '../constants/theme';
import { hapticLight, hapticSuccess, hapticImpact, hapticError } from '../lib/haptics';
import { useChallenges } from '../hooks/useChallenges';
import { useFriends } from '../hooks/useFriends';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = [
  { key: 'active', label: 'Active', icon: Target },
  { key: 'friends', label: 'Friends', icon: Users },
  { key: 'my', label: 'My Challenges', icon: Trophy },
  { key: 'create', label: 'Create', icon: Plus },
];

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: 'Trending' },
  { key: 'new', label: 'New' },
];

const CHALLENGE_TYPE_OPTIONS = [
  { key: 'steps', label: 'Steps', icon: Footprints, color: Colors.primary },
  { key: 'calories_burned', label: 'Calories', icon: Flame, color: Colors.secondary },
  { key: 'workouts', label: 'Workouts', icon: Dumbbell, color: Colors.success },
  { key: 'water', label: 'Water', icon: Droplets, color: '#64D2FF' },
  { key: 'protein', label: 'Protein', icon: Beef, color: Colors.protein },
  { key: 'logging', label: 'Logging', icon: ClipboardList, color: Colors.warning },
];

const DURATION_OPTIONS = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
];

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

// --- Challenge Type Selector ---
const ChallengeTypeSelector = memo(function ChallengeTypeSelector({ selected, onSelect }) {
  return (
    <View style={styles.typeGrid}>
      {CHALLENGE_TYPE_OPTIONS.map((type) => {
        const isSelected = selected === type.key;
        const IconComponent = type.icon;
        return (
          <Pressable
            key={type.key}
            style={[
              styles.typeOption,
              isSelected && { borderColor: type.color + '80', backgroundColor: type.color + '15' },
            ]}
            onPress={() => onSelect(type.key)}
          >
            <IconComponent size={20} color={isSelected ? type.color : Colors.textTertiary} />
            <Text
              style={[
                styles.typeOptionText,
                isSelected && { color: type.color, fontWeight: FontWeight.semibold },
              ]}
            >
              {type.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

// --- Duration Picker ---
const DurationPicker = memo(function DurationPicker({ selected, onSelect }) {
  return (
    <View style={styles.durationRow}>
      {DURATION_OPTIONS.map((option) => {
        const isSelected = selected === option.days;
        return (
          <Pressable
            key={option.days}
            style={[styles.durationOption, isSelected && styles.durationOptionActive]}
            onPress={() => onSelect(option.days)}
          >
            {isSelected ? (
              <LinearGradient
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.durationGradient}
              >
                <Clock size={14} color={Colors.background} />
                <Text style={styles.durationTextActive}>{option.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.durationInner}>
                <Clock size={14} color={Colors.textTertiary} />
                <Text style={styles.durationText}>{option.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
});

// --- Leaderboard Row ---
const LeaderboardRow = memo(function LeaderboardRow({ entry, index }) {
  const isTop3 = entry.rank <= 3;
  const medalColor = entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : entry.rank === 3 ? '#CD7F32' : null;

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(index * 50).springify().mass(0.5).damping(10)}
    >
      <View style={[styles.lbRow, entry.isCurrentUser && styles.lbRowCurrent]}>
        {entry.isCurrentUser && (
          <LinearGradient
            colors={['rgba(0, 212, 255, 0.08)', 'rgba(0, 212, 255, 0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Rank */}
        <View style={styles.lbRankContainer}>
          {isTop3 ? (
            <View style={[styles.lbMedal, { backgroundColor: medalColor }]}>
              {entry.rank === 1 ? (
                <Crown size={12} color="#000" />
              ) : (
                <Text style={styles.lbMedalText}>{entry.rank}</Text>
              )}
            </View>
          ) : (
            <Text style={[styles.lbRankText, entry.isCurrentUser && { color: Colors.primary }]}>
              {entry.rank}
            </Text>
          )}
        </View>

        {/* Avatar */}
        <View style={[styles.lbAvatar, entry.isCurrentUser && { borderColor: Colors.primary + '60' }]}>
          <Text style={styles.lbAvatarText}>
            {entry.userName ? entry.userName.slice(0, 2).toUpperCase() : '??'}
          </Text>
        </View>

        {/* Name */}
        <View style={styles.lbInfo}>
          <Text
            style={[styles.lbName, entry.isCurrentUser && { color: Colors.primary, fontWeight: FontWeight.bold }]}
            numberOfLines={1}
          >
            {entry.isCurrentUser ? `${entry.userName} (You)` : entry.userName}
          </Text>
        </View>

        {/* Progress */}
        <Text style={[styles.lbProgress, entry.isCurrentUser && { color: Colors.primary }]}>
          {entry.progress}
        </Text>
      </View>
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

// --- Main Screen ---
export default function CommunityChallengesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    availableChallenges,
    activeChallenges,
    isLoading,
    joinChallenge,
    createChallenge,
    getLeaderboard,
    challengeTypes,
    createTeam,
    joinTeam,
    getTeamProgress,
    inviteFriendsToChallenge,
  } = useChallenges();
  const { friends } = useFriends();

  const [activeTab, setActiveTab] = useState('active');
  const [activeFilter, setActiveFilter] = useState('all');
  const [leaderboardModal, setLeaderboardModal] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardChallenge, setLeaderboardChallenge] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Create form state
  const [formType, setFormType] = useState('steps');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formDuration, setFormDuration] = useState(7);
  const [isCreating, setIsCreating] = useState(false);

  // Team mode state
  const [teamMode, setTeamMode] = useState(false);
  const [teamSize, setTeamSize] = useState(2);

  // Team leaderboard state
  const [teamLeaderboard, setTeamLeaderboard] = useState([]);
  const [showTeamLeaderboard, setShowTeamLeaderboard] = useState(false);

  // Join team modal state
  const [joinTeamModal, setJoinTeamModal] = useState(false);
  const [joinTeamName, setJoinTeamName] = useState('');
  const [joiningTeamChallengeId, setJoiningTeamChallengeId] = useState(null);

  // --- Handlers ---
  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  const handleTabChange = useCallback(async (key) => {
    await hapticLight();
    setActiveTab(key);
  }, []);

  const handleJoinChallenge = useCallback(async (challengeId) => {
    await hapticImpact();
    const success = await joinChallenge(challengeId);
    if (success) {
      await hapticSuccess();
    } else {
      await hapticError();
    }
  }, [joinChallenge]);

  const handleChallengePress = useCallback(async (challenge) => {
    await hapticLight();
    setLeaderboardChallenge(challenge);
    setLeaderboardModal(true);
    setLeaderboardLoading(true);
    try {
      const data = await getLeaderboard(challenge.challengeId || challenge.id);
      setLeaderboardData(data);
    } catch {
      setLeaderboardData([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [getLeaderboard]);

  const handleCloseLeaderboard = useCallback(async () => {
    await hapticLight();
    setLeaderboardModal(false);
    setLeaderboardData([]);
    setLeaderboardChallenge(null);
  }, []);

  const handleCreateChallenge = useCallback(async () => {
    if (!formTitle.trim() || !formTarget.trim()) {
      await hapticError();
      return;
    }

    await hapticImpact();
    setIsCreating(true);

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + formDuration);

    const result = await createChallenge({
      type: formType,
      title: formTitle.trim(),
      description: formDescription.trim() + (teamMode ? `\n[Team Mode: ${teamSize} per team]` : ''),
      goal: parseInt(formTarget, 10) || 0,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      maxParticipants: teamMode ? teamSize * 10 : 50,
    });

    setIsCreating(false);

    if (result) {
      // If team mode, auto-create a team for the creator
      if (teamMode) {
        await createTeam(result.id, `${formTitle.trim()} - Team 1`);
      }
      await hapticSuccess();
      setFormTitle('');
      setFormDescription('');
      setFormTarget('');
      setFormType('steps');
      setFormDuration(7);
      setTeamMode(false);
      setTeamSize(2);
      setActiveTab('my');
    } else {
      await hapticError();
    }
  }, [formTitle, formDescription, formTarget, formType, formDuration, teamMode, teamSize, createChallenge, createTeam]);

  const handleShowTeamProgress = useCallback(async (challengeId) => {
    try {
      const data = await getTeamProgress(challengeId);
      setTeamLeaderboard(data);
      setShowTeamLeaderboard(true);
    } catch {
      setTeamLeaderboard([]);
    }
  }, [getTeamProgress]);

  const handleCreateAndJoinTeam = useCallback(async () => {
    if (!joinTeamName.trim() || !joiningTeamChallengeId) return;
    await hapticImpact();
    const team = await createTeam(joiningTeamChallengeId, joinTeamName.trim());
    if (team) {
      await joinTeam(joiningTeamChallengeId, team.id);
      await hapticSuccess();
    } else {
      await hapticError();
    }
    setJoinTeamModal(false);
    setJoinTeamName('');
    setJoiningTeamChallengeId(null);
  }, [joinTeamName, joiningTeamChallengeId, createTeam, joinTeam]);

  // Invite friends to a challenge
  const handleInviteFriends = useCallback(async (challenge) => {
    if (!friends?.length) {
      await hapticError();
      return;
    }
    await hapticImpact();
    const friendIds = friends.map(f => f.friendId);
    const title = challenge?.title || challenge?.challengeId || '';
    const id = challenge?.challengeId || challenge?.id;
    await inviteFriendsToChallenge(id, friendIds, title);
    await hapticSuccess();
  }, [friends, inviteFriendsToChallenge]);

  // Filter available challenges
  const filteredAvailableChallenges = useMemo(() => {
    let list = availableChallenges;
    if (activeFilter === 'trending') {
      list = [...list].sort((a, b) => (b.participantCount || 0) - (a.participantCount || 0));
    } else if (activeFilter === 'new') {
      list = [...list].sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
    }
    return list;
  }, [availableChallenges, activeFilter]);

  // Challenges created by friends
  const friendChallenges = useMemo(() => {
    if (!friends?.length) return [];
    const friendIds = new Set(friends.map(f => f.friendId));
    // Show challenges that friends have joined (from available list)
    return availableChallenges.filter(c =>
      c.participantCount > 0 // If we can't check friend participation, show popular ones
    );
  }, [availableChallenges, friends]);

  const handleFilterChange = useCallback(async (key) => {
    await hapticLight();
    setActiveFilter(key);
  }, []);

  // --- Derived data ---
  const selectedTypeInfo = useMemo(
    () => challengeTypes?.[formType] || { label: 'Challenge', unit: '', defaultGoal: 0 },
    [formType, challengeTypes],
  );

  const isFormValid = formTitle.trim().length > 0 && formTarget.trim().length > 0 && parseInt(formTarget, 10) > 0;

  // --- Render helpers ---
  const renderActiveItem = useCallback(({ item, index }) => (
    <ReAnimated.View entering={FadeInDown.delay(80 + index * 40).springify().mass(0.5).damping(10)}>
      <ChallengeCard
        challenge={item}
        onPress={() => handleChallengePress(item)}
        onJoin={() => handleJoinChallenge(item.id)}
        isJoined={false}
      />
    </ReAnimated.View>
  ), [handleChallengePress, handleJoinChallenge]);

  const renderMyItem = useCallback(({ item, index }) => (
    <ReAnimated.View entering={FadeInDown.delay(80 + index * 40).springify().mass(0.5).damping(10)}>
      <ChallengeCard
        challenge={item}
        onPress={() => handleChallengePress(item)}
        isJoined={true}
      />
    </ReAnimated.View>
  ), [handleChallengePress]);

  const keyExtractor = useCallback((item) => String(item.id || item.challengeId), []);

  // --- Tab content ---
  const renderActiveTab = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading challenges...</Text>
        </View>
      );
    }

    if (availableChallenges.length === 0) {
      return (
        <EmptyState
          icon={Search}
          title="No Active Challenges"
          subtitle="Check back later for new community challenges to join."
        />
      );
    }

    return (
      <FlatList
        data={filteredAvailableChallenges}
        renderItem={renderActiveItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map((option) => {
              const isActive = activeFilter === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => handleFilterChange(option.key)}
                >
                  <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        }
      />
    );
  };

  const renderFriendsTab = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading friend challenges...</Text>
        </View>
      );
    }

    if (!friends?.length) {
      return (
        <EmptyState
          icon={Users}
          title="No Friends Yet"
          subtitle="Add friends to see challenges they're participating in."
        />
      );
    }

    if (friendChallenges.length === 0) {
      return (
        <EmptyState
          icon={UserPlus}
          title="No Friend Challenges"
          subtitle="Your friends haven't joined any challenges yet. Invite them to one!"
        />
      );
    }

    return (
      <FlatList
        data={friendChallenges}
        renderItem={renderActiveItem}
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

  const renderMyTab = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your challenges...</Text>
        </View>
      );
    }

    if (activeChallenges.length === 0) {
      return (
        <EmptyState
          icon={Trophy}
          title="No Challenges Joined"
          subtitle="Browse Active challenges and join one to get started!"
        />
      );
    }

    return (
      <FlatList
        data={activeChallenges}
        renderItem={renderMyItem}
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
        {/* Challenge Type */}
        <ReAnimated.View entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}>
          <Text style={styles.formLabel}>Challenge Type</Text>
          <ChallengeTypeSelector selected={formType} onSelect={setFormType} />
        </ReAnimated.View>

        {/* Title */}
        <ReAnimated.View entering={FadeInDown.delay(120).springify().mass(0.5).damping(10)}>
          <Text style={styles.formLabel}>Title</Text>
          <TextInput
            style={styles.formInput}
            value={formTitle}
            onChangeText={setFormTitle}
            placeholder={`e.g. ${selectedTypeInfo.label}`}
            placeholderTextColor={Colors.inputPlaceholder}
            maxLength={60}
          />
        </ReAnimated.View>

        {/* Description */}
        <ReAnimated.View entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)}>
          <Text style={styles.formLabel}>Description</Text>
          <TextInput
            style={[styles.formInput, styles.formInputMultiline]}
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder="Describe your challenge..."
            placeholderTextColor={Colors.inputPlaceholder}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
        </ReAnimated.View>

        {/* Target Value */}
        <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}>
          <Text style={styles.formLabel}>Target ({selectedTypeInfo.unit})</Text>
          <TextInput
            style={styles.formInput}
            value={formTarget}
            onChangeText={setFormTarget}
            placeholder={`e.g. ${selectedTypeInfo.defaultGoal}`}
            placeholderTextColor={Colors.inputPlaceholder}
            keyboardType="numeric"
          />
        </ReAnimated.View>

        {/* Duration */}
        <ReAnimated.View entering={FadeInDown.delay(240).springify().mass(0.5).damping(10)}>
          <Text style={styles.formLabel}>Duration</Text>
          <DurationPicker selected={formDuration} onSelect={setFormDuration} />
        </ReAnimated.View>

        {/* Team Mode Toggle */}
        <ReAnimated.View entering={FadeInDown.delay(280).springify().mass(0.5).damping(10)}>
          <Text style={styles.formLabel}>Team Mode</Text>
          <View style={styles.teamModeRow}>
            <View style={styles.teamModeInfo}>
              <Users size={18} color={teamMode ? Colors.primary : Colors.textTertiary} />
              <View style={styles.teamModeTextContainer}>
                <Text style={[styles.teamModeLabel, teamMode && { color: Colors.primary }]}>
                  Team Challenge
                </Text>
                <Text style={styles.teamModeDescription}>
                  Friends join together in teams
                </Text>
              </View>
            </View>
            <Switch
              value={teamMode}
              onValueChange={setTeamMode}
              trackColor={{ false: Colors.surfaceElevated, true: Colors.primary + '60' }}
              thumbColor={teamMode ? Colors.primary : Colors.textTertiary}
            />
          </View>
          {teamMode && (
            <View style={styles.teamSizeRow}>
              <Text style={styles.teamSizeLabel}>Team Size</Text>
              <View style={styles.teamSizePicker}>
                {[2, 3, 4, 5].map((size) => (
                  <Pressable
                    key={size}
                    style={[styles.teamSizeOption, teamSize === size && styles.teamSizeOptionActive]}
                    onPress={() => setTeamSize(size)}
                  >
                    {teamSize === size ? (
                      <LinearGradient
                        colors={Gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.teamSizeGradient}
                      >
                        <Text style={styles.teamSizeTextActive}>{size}</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.teamSizeText}>{size}</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ReAnimated.View>

        {/* Create Button */}
        <ReAnimated.View entering={FadeInUp.delay(300).springify().mass(0.5).damping(10)}>
          <Pressable
            onPress={handleCreateChallenge}
            disabled={!isFormValid || isCreating}
            style={({ pressed }) => [
              styles.createButton,
              (!isFormValid || isCreating) && styles.createButtonDisabled,
              pressed && isFormValid && !isCreating && { opacity: 0.85 },
            ]}
          >
            <LinearGradient
              colors={isFormValid && !isCreating ? Gradients.primary : Gradients.disabled}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <>
                  <Plus size={20} color={Colors.background} />
                  <Text style={styles.createButtonText}>Create Challenge</Text>
                </>
              )}
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
          <Trophy size={22} color={Colors.primary} />
          <Text style={styles.headerTitle}>Challenges</Text>
        </View>
        <View style={styles.headerRight}>
          <Users size={20} color={Colors.textTertiary} />
        </View>
      </ReAnimated.View>

      {/* Tab Selector */}
      <TabSelector activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'active' && renderActiveTab()}
        {activeTab === 'friends' && renderFriendsTab()}
        {activeTab === 'my' && renderMyTab()}
        {activeTab === 'create' && renderCreateTab()}
      </View>

      {/* Leaderboard Modal */}
      <Modal
        visible={leaderboardModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseLeaderboard}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleCloseLeaderboard} />
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#16161A', '#0A0A0C']}
              style={styles.modalGradient}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHandle} />
              </View>

              <View style={styles.modalTitleRow}>
                <View style={styles.modalTitleLeft}>
                  <Trophy size={20} color={Colors.primary} />
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {leaderboardChallenge?.title || 'Leaderboard'}
                  </Text>
                </View>
                <Pressable style={styles.modalCloseButton} onPress={handleCloseLeaderboard}>
                  <X size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {/* Challenge info badge */}
              {leaderboardChallenge && (
                <View style={styles.modalBadgeRow}>
                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeText}>
                      {leaderboardChallenge.icon || '🏆'} {challengeTypes?.[leaderboardChallenge.type]?.label || leaderboardChallenge.type}
                    </Text>
                  </View>
                  <View style={styles.modalBadge}>
                    <Target size={12} color={Colors.textSecondary} />
                    <Text style={styles.modalBadgeText}>
                      Goal: {leaderboardChallenge.goal} {leaderboardChallenge.unit || ''}
                    </Text>
                  </View>
                  {friends?.length > 0 && (
                    <Pressable
                      style={styles.inviteBadge}
                      onPress={() => handleInviteFriends(leaderboardChallenge)}
                    >
                      <UserPlus size={12} color={Colors.primary} />
                      <Text style={styles.inviteBadgeText}>Invite Friends</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {/* Team/Individual Toggle */}
              {leaderboardData.some(e => e.teamId) && (
                <View style={styles.lbToggleRow}>
                  <Pressable
                    style={[styles.lbToggle, !showTeamLeaderboard && styles.lbToggleActive]}
                    onPress={() => setShowTeamLeaderboard(false)}
                  >
                    <Text style={[styles.lbToggleText, !showTeamLeaderboard && styles.lbToggleTextActive]}>Individual</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.lbToggle, showTeamLeaderboard && styles.lbToggleActive]}
                    onPress={() => handleShowTeamProgress(leaderboardChallenge?.challengeId || leaderboardChallenge?.id)}
                  >
                    <Users size={14} color={showTeamLeaderboard ? Colors.background : Colors.textTertiary} />
                    <Text style={[styles.lbToggleText, showTeamLeaderboard && styles.lbToggleTextActive]}>Teams</Text>
                  </Pressable>
                </View>
              )}

              {/* Leaderboard Content */}
              {leaderboardLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading leaderboard...</Text>
                </View>
              ) : showTeamLeaderboard && teamLeaderboard.length > 0 ? (
                <FlatList
                  data={teamLeaderboard}
                  keyExtractor={(item) => String(item.teamId)}
                  renderItem={({ item, index }) => (
                    <ReAnimated.View entering={FadeInDown.delay(index * 50).springify().mass(0.5).damping(10)}>
                      <View style={styles.teamRow}>
                        <View style={styles.teamRankCircle}>
                          <Text style={styles.teamRankText}>{index + 1}</Text>
                        </View>
                        <View style={styles.teamInfo}>
                          <Text style={styles.teamName}>{item.teamName}</Text>
                          <Text style={styles.teamMembers}>
                            {item.members.length} member{item.members.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <Text style={styles.teamProgress}>{item.totalProgress}</Text>
                      </View>
                    </ReAnimated.View>
                  )}
                  contentContainerStyle={styles.lbList}
                  showsVerticalScrollIndicator={false}
                />
              ) : leaderboardData.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Users size={40} color={Colors.textTertiary} />
                  <Text style={styles.emptyTitle}>No Participants Yet</Text>
                  <Text style={styles.emptySubtitle}>Be the first to join this challenge!</Text>
                </View>
              ) : (
                <FlatList
                  data={leaderboardData}
                  keyExtractor={(item) => String(item.userId || item.rank)}
                  renderItem={({ item, index }) => (
                    <LeaderboardRow entry={item} index={index} />
                  )}
                  contentContainerStyle={styles.lbList}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
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
  },
  headerRight: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
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

  // Type selector
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeOption: {
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
  typeOptionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },

  // Duration picker
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  durationOption: {
    flex: 1,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  durationOptionActive: {
    ...Shadows.button,
    shadowOpacity: 0.15,
  },
  durationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: 6,
    borderRadius: BorderRadius.full,
  },
  durationInner: {
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
  durationText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  durationTextActive: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.background,
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

  // Filter pills
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary + '40',
  },
  filterPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  filterPillTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Invite badge
  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  inviteBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 120,
  },

  // Leaderboard Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  modalContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
  },
  modalGradient: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingBottom: Spacing.xl,
    minHeight: 300,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceBright,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  modalTitleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceGlass,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxxl,
  },
  modalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxxl,
  },

  // Leaderboard list
  lbList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  lbRow: {
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
  lbRowCurrent: {
    borderColor: 'rgba(0, 212, 255, 0.3)',
    ...Shadows.glowPrimary,
    shadowOpacity: 0.1,
  },
  lbRankContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  lbMedal: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lbMedalText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
    color: '#000',
  },
  lbRankText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  lbAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  lbAvatarText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  lbInfo: {
    flex: 1,
  },
  lbName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  lbProgress: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },

  // Team mode
  teamModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  teamModeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  teamModeTextContainer: {
    flex: 1,
  },
  teamModeLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  teamModeDescription: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  teamSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  teamSizeLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  teamSizePicker: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  teamSizeOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  teamSizeOptionActive: {
    borderColor: Colors.primary + '50',
    ...Shadows.button,
    shadowOpacity: 0.15,
  },
  teamSizeGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  teamSizeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
  },
  teamSizeTextActive: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },

  // Team/Individual toggle in leaderboard
  lbToggleRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  lbToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lbToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  lbToggleText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  lbToggleTextActive: {
    color: Colors.background,
    fontWeight: FontWeight.bold,
  },

  // Team rows in leaderboard
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  teamRankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '25',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  teamRankText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  teamMembers: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  teamProgress: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
});
