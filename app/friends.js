import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import ReAnimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  UserPlus,
  UserMinus,
  Check,
  X,
  Users,
  ArrowLeft,
  Flame,
  Zap,
  Trophy,
  Clock,
  Shield,
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
} from '../constants/theme';
import { hapticLight, hapticSuccess, hapticWarning, hapticError, hapticImpact } from '../lib/haptics';
import { useFriends } from '../hooks/useFriends';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';

const TABS = [
  { key: 'friends', label: 'Friends' },
  { key: 'requests', label: 'Requests' },
  { key: 'search', label: 'Search' },
];

// --- Avatar component ---
const Avatar = memo(function Avatar({ name, size = 44 }) {
  const letter = (name || '?')[0].toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{letter}</Text>
    </View>
  );
});

// --- Tab selector ---
const TabSelector = memo(function TabSelector({ activeTab, onTabChange, pendingCount }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}
      style={styles.tabRow}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
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
                <Text style={styles.tabTextActive}>{tab.label}</Text>
                {tab.key === 'requests' && pendingCount > 0 && (
                  <View style={styles.badgeActive}>
                    <Text style={styles.badgeTextActive}>{pendingCount}</Text>
                  </View>
                )}
              </LinearGradient>
            ) : (
              <View style={styles.tabInner}>
                <Text style={styles.tabText}>{tab.label}</Text>
                {tab.key === 'requests' && pendingCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingCount}</Text>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </ReAnimated.View>
  );
});

// --- Friend row ---
const FriendRow = memo(function FriendRow({ item, onRemove, onPress, index }) {
  const handleRemove = useCallback(async () => {
    await hapticWarning();
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${item.name} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await hapticError();
            onRemove(item.id);
          },
        },
      ]
    );
  }, [item, onRemove]);

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(60 + index * 40).springify().mass(0.5).damping(10)}
    >
      <Pressable onPress={() => onPress?.(item)} style={styles.friendRow}>
        <View style={styles.avatarContainer}>
          <Avatar name={item.name} />
          {item.isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.friendMetaRow}>
            {item.streak > 0 && (
              <View style={styles.friendMetaBadge}>
                <Flame size={10} color={Colors.secondary} />
                <Text style={styles.friendMetaText}>{item.streak}d</Text>
              </View>
            )}
            {item.level > 0 && (
              <View style={styles.friendMetaBadge}>
                <Zap size={10} color={Colors.gold} />
                <Text style={styles.friendMetaText}>Lvl {item.level}</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable style={styles.removeButton} onPress={handleRemove}>
          <UserMinus size={16} color={Colors.error} />
          <Text style={styles.removeButtonText}>Remove</Text>
        </Pressable>
      </Pressable>
    </ReAnimated.View>
  );
});

// --- Request row ---
const RequestRow = memo(function RequestRow({ item, onAccept, onDecline, index }) {
  const [isActing, setIsActing] = useState(false);

  const handleAccept = useCallback(async () => {
    setIsActing(true);
    await hapticSuccess();
    const success = await onAccept(item.id);
    if (!success) setIsActing(false);
  }, [item, onAccept]);

  const handleDecline = useCallback(async () => {
    setIsActing(true);
    await hapticLight();
    const success = await onDecline(item.id);
    if (!success) setIsActing(false);
  }, [item, onDecline]);

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(60 + index * 40).springify().mass(0.5).damping(10)}
    >
      <View style={styles.friendRow}>
        <Avatar name={item.name} />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.friendSince}>Sent {formatDate(item.sentAt)}</Text>
        </View>
        {isActing ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <View style={styles.requestActions}>
            <Pressable style={styles.acceptButton} onPress={handleAccept}>
              <Check size={16} color="#000" />
            </Pressable>
            <Pressable style={styles.declineButton} onPress={handleDecline}>
              <X size={16} color={Colors.text} />
            </Pressable>
          </View>
        )}
      </View>
    </ReAnimated.View>
  );
});

// --- Search result row ---
const SearchResultRow = memo(function SearchResultRow({ item, onAdd, sentIds, friendIds, index }) {
  const [isSending, setIsSending] = useState(false);
  const alreadySent = sentIds.has(item.userId);
  const alreadyFriend = friendIds.has(item.userId);

  const handleAdd = useCallback(async () => {
    setIsSending(true);
    await hapticSuccess();
    const success = await onAdd(item.userId);
    if (!success) {
      setIsSending(false);
      await hapticError();
    }
  }, [item, onAdd]);

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(60 + index * 40).springify().mass(0.5).damping(10)}
    >
      <View style={styles.friendRow}>
        <Avatar name={item.name} />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        {alreadyFriend ? (
          <View style={styles.statusBadge}>
            <Check size={14} color={Colors.success} />
            <Text style={styles.statusText}>Friend</Text>
          </View>
        ) : alreadySent || isSending ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusTextPending}>Pending</Text>
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={handleAdd}>
            <UserPlus size={16} color="#000" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        )}
      </View>
    </ReAnimated.View>
  );
});

// --- Empty states ---
const EmptyState = memo(function EmptyState({ tab }) {
  const config = {
    friends: {
      icon: <Users size={48} color={Colors.textTertiary} />,
      title: 'No friends yet',
      subtitle: 'Search for users to add them as friends',
    },
    requests: {
      icon: <UserPlus size={48} color={Colors.textTertiary} />,
      title: 'No pending requests',
      subtitle: 'When someone sends you a friend request, it will appear here',
    },
    search: {
      icon: <Search size={48} color={Colors.textTertiary} />,
      title: 'Find your friends',
      subtitle: 'Search by name to find and add friends',
    },
  };

  const c = config[tab];

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(120).springify().mass(0.5).damping(10)}
      style={styles.emptyState}
    >
      {c.icon}
      <Text style={styles.emptyTitle}>{c.title}</Text>
      <Text style={styles.emptySubtitle}>{c.subtitle}</Text>
    </ReAnimated.View>
  );
});

// --- Helpers ---
function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// --- Friend Profile Modal ---
const FriendProfileModal = memo(function FriendProfileModal({ visible, friend, recentActivity, onClose, onChallenge, onBlock }) {
  if (!friend) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.profileModalOverlay}>
        <Pressable style={styles.profileModalBackdrop} onPress={onClose} />
        <View style={styles.profileModalContainer}>
          <LinearGradient
            colors={['rgba(22, 22, 26, 0.98)', 'rgba(10, 10, 12, 0.99)']}
            style={styles.profileModalGradient}
          >
            <View style={styles.profileModalHandle} />

            {/* Header */}
            <View style={styles.profileModalHeader}>
              <View style={styles.profileModalAvatarContainer}>
                <Avatar name={friend.name} size={64} />
                {friend.isOnline && <View style={styles.profileOnlineDot} />}
              </View>
              <Text style={styles.profileModalName}>{friend.name}</Text>
              <Text style={styles.profileModalSince}>Friends since {formatDate(friend.since)}</Text>
            </View>

            {/* Stats */}
            <View style={styles.profileStatsRow}>
              <View style={styles.profileStatItem}>
                <Flame size={18} color={Colors.secondary} />
                <Text style={styles.profileStatValue}>{friend.streak || 0}</Text>
                <Text style={styles.profileStatLabel}>Streak</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStatItem}>
                <Zap size={18} color={Colors.gold} />
                <Text style={styles.profileStatValue}>{friend.level || 1}</Text>
                <Text style={styles.profileStatLabel}>Level</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStatItem}>
                <Trophy size={18} color={Colors.primary} />
                <Text style={styles.profileStatValue}>{(friend.totalXp || 0).toLocaleString()}</Text>
                <Text style={styles.profileStatLabel}>XP</Text>
              </View>
            </View>

            {/* Recent Activity */}
            <Text style={styles.profileSectionTitle}>Recent Activity</Text>
            {recentActivity.length === 0 ? (
              <Text style={styles.profileNoActivity}>No recent activity</Text>
            ) : (
              recentActivity.map((item) => (
                <View key={item.id} style={styles.profileActivityItem}>
                  <Clock size={12} color={Colors.textTertiary} />
                  <Text style={styles.profileActivityText} numberOfLines={1}>{item.title}</Text>
                </View>
              ))
            )}

            {/* Actions */}
            <View style={styles.profileActionsRow}>
              <Pressable style={styles.profileActionButton} onPress={onChallenge}>
                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.profileActionGradient}
                >
                  <Trophy size={16} color={Colors.background} />
                  <Text style={styles.profileActionText}>Challenge</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.profileBlockButton} onPress={onBlock}>
                <Shield size={16} color={Colors.error} />
                <Text style={styles.profileBlockText}>Block</Text>
              </Pressable>
            </View>

            {/* Close button */}
            <Pressable style={styles.profileCloseButton} onPress={onClose}>
              <Text style={styles.profileCloseText}>Close</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
});

// --- Main screen ---
export default function FriendsScreen() {
  const { user } = useAuth();
  const {
    friends,
    pendingRequests,
    sentRequests,
    isLoading,
    friendCount,
    onlineFriendsCount,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    searchUsers,
    blockUser,
    getFriendRecentActivity,
    refresh,
  } = useFriends();

  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Profile modal state
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendRecentActivity, setFriendRecentActivity] = useState([]);

  const debouncedQuery = useDebounce(searchQuery, 400);

  // Execute search when debounced query changes
  useEffect(() => {
    if (activeTab !== 'search') return;
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const runSearch = async () => {
      setIsSearching(true);
      const results = await searchUsers(debouncedQuery);
      if (!cancelled) {
        setSearchResults(results);
        setIsSearching(false);
      }
    };
    runSearch();
    return () => { cancelled = true; };
  }, [debouncedQuery, activeTab, searchUsers]);

  // Derive sets for quick lookups
  const sentIds = useMemo(
    () => new Set(sentRequests.map((r) => r.userId)),
    [sentRequests]
  );
  const friendIds = useMemo(
    () => new Set(friends.map((f) => f.friendId)),
    [friends]
  );

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Tab change with haptics
  const handleTabChange = useCallback(async (tab) => {
    await hapticLight();
    setActiveTab(tab);
  }, []);

  // Navigate back
  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, []);

  // Open friend profile
  const handleFriendPress = useCallback(async (friend) => {
    await hapticLight();
    setSelectedFriend(friend);
    setProfileModalVisible(true);
    // Fetch recent activity in background
    const activity = await getFriendRecentActivity(friend.friendId);
    setFriendRecentActivity(activity);
  }, [getFriendRecentActivity]);

  // Close profile modal
  const handleCloseProfile = useCallback(async () => {
    await hapticLight();
    setProfileModalVisible(false);
    setSelectedFriend(null);
    setFriendRecentActivity([]);
  }, []);

  // Challenge friend (navigate to challenges screen)
  const handleChallengeFriend = useCallback(async () => {
    await hapticImpact();
    setProfileModalVisible(false);
    router.push('/community-challenges');
  }, []);

  // Block friend from profile modal
  const handleBlockFriend = useCallback(async () => {
    if (!selectedFriend) return;
    await hapticWarning();
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${selectedFriend.name}? This will also remove them as a friend.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            await blockUser(selectedFriend.friendId);
            setProfileModalVisible(false);
            setSelectedFriend(null);
          },
        },
      ]
    );
  }, [selectedFriend, blockUser]);

  // Remove friend
  const handleRemoveFriend = useCallback(async (friendshipId) => {
    await removeFriend(friendshipId);
  }, [removeFriend]);

  // Accept request
  const handleAcceptRequest = useCallback(async (friendshipId) => {
    return await acceptRequest(friendshipId);
  }, [acceptRequest]);

  // Decline request
  const handleDeclineRequest = useCallback(async (friendshipId) => {
    return await declineRequest(friendshipId);
  }, [declineRequest]);

  // Send friend request
  const handleSendRequest = useCallback(async (userId) => {
    return await sendRequest(userId);
  }, [sendRequest]);

  // Friends list render
  const renderFriendItem = useCallback(({ item, index }) => (
    <FriendRow item={item} onRemove={handleRemoveFriend} onPress={handleFriendPress} index={index} />
  ), [handleRemoveFriend, handleFriendPress]);

  // Requests list render
  const renderRequestItem = useCallback(({ item, index }) => (
    <RequestRow
      item={item}
      onAccept={handleAcceptRequest}
      onDecline={handleDeclineRequest}
      index={index}
    />
  ), [handleAcceptRequest, handleDeclineRequest]);

  // Search results render
  const renderSearchItem = useCallback(({ item, index }) => (
    <SearchResultRow
      item={item}
      onAdd={handleSendRequest}
      sentIds={sentIds}
      friendIds={friendIds}
      index={index}
    />
  ), [handleSendRequest, sentIds, friendIds]);

  const keyExtractorFriends = useCallback((item) => `friend-${item.id}`, []);
  const keyExtractorRequests = useCallback((item) => `request-${item.id}`, []);
  const keyExtractorSearch = useCallback((item) => `search-${item.userId}`, []);

  // Determine which data and renderer to use
  const listConfig = useMemo(() => {
    switch (activeTab) {
      case 'friends':
        return {
          data: friends,
          renderItem: renderFriendItem,
          keyExtractor: keyExtractorFriends,
        };
      case 'requests':
        return {
          data: pendingRequests,
          renderItem: renderRequestItem,
          keyExtractor: keyExtractorRequests,
        };
      case 'search':
        return {
          data: searchResults,
          renderItem: renderSearchItem,
          keyExtractor: keyExtractorSearch,
        };
      default:
        return { data: [], renderItem: () => null, keyExtractor: () => '' };
    }
  }, [
    activeTab,
    friends,
    pendingRequests,
    searchResults,
    renderFriendItem,
    renderRequestItem,
    renderSearchItem,
    keyExtractorFriends,
    keyExtractorRequests,
    keyExtractorSearch,
  ]);

  const showEmptyState =
    !isLoading && !isSearching && listConfig.data.length === 0;

  // For search tab, only show empty if user has typed something or hasn't typed yet
  const showSearchEmpty =
    activeTab === 'search' && !isSearching && searchResults.length === 0;

  const ListHeaderComponent = useMemo(
    () => (
      <View>
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
            <Text style={styles.headerTitle}>Friends</Text>
          </View>
          <View style={styles.headerRight}>
            {friendCount > 0 && (
              <View style={styles.friendCountBadge}>
                <Text style={styles.friendCountText}>{friendCount}</Text>
              </View>
            )}
          </View>
        </ReAnimated.View>

        {/* Search bar */}
        <ReAnimated.View
          entering={FadeInDown.delay(40).springify().mass(0.5).damping(10)}
        >
          <GlassCard style={styles.searchCard} animated={false}>
            <View style={styles.searchRow}>
              <Search size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for users..."
                placeholderTextColor={Colors.textTertiary}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (text.length > 0 && activeTab !== 'search') {
                    setActiveTab('search');
                  }
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  <X size={18} color={Colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </GlassCard>
        </ReAnimated.View>

        {/* Tab selector */}
        <TabSelector
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pendingCount={pendingRequests.length}
        />

        {/* Loading indicator */}
        {(isLoading || isSearching) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>
              {isSearching ? 'Searching...' : 'Loading...'}
            </Text>
          </View>
        )}
      </View>
    ),
    [
      handleBack,
      friendCount,
      searchQuery,
      activeTab,
      handleTabChange,
      pendingRequests.length,
      isLoading,
      isSearching,
    ]
  );

  const ListEmptyComponent = useMemo(() => {
    if (isLoading || isSearching) return null;
    return <EmptyState tab={activeTab} />;
  }, [activeTab, isLoading, isSearching]);

  const ListFooterComponent = useMemo(
    () => <View style={styles.bottomSpacer} />,
    []
  );

  return (
    <ScreenWrapper edges={['top']}>
      <FlatList
        data={listConfig.data}
        renderItem={listConfig.renderItem}
        keyExtractor={listConfig.keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressBackgroundColor={Colors.surface}
          />
        }
      />

      {/* Friend Profile Modal */}
      <FriendProfileModal
        visible={profileModalVisible}
        friend={selectedFriend}
        recentActivity={friendRecentActivity}
        onClose={handleCloseProfile}
        onChallenge={handleChallengeFriend}
        onBlock={handleBlockFriend}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.md,
    flexGrow: 1,
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
  friendCountBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  friendCountText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
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

  // Tab selector
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  tabActive: {
    // handled by gradient
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
    color: Colors.textSecondary,
  },
  tabTextActive: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  badge: {
    backgroundColor: Colors.error,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  badgeActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeTextActive: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },

  // Loading
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  // Avatar
  avatar: {
    backgroundColor: Colors.surfaceGlassLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: {
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },

  // Friend / request / search rows
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  friendSince: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // Remove button
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.errorSoft,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  removeButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.error,
  },

  // Request action buttons
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glowSuccess,
    shadowOpacity: 0.2,
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Add friend button (search)
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    ...Shadows.glowPrimary,
    shadowOpacity: 0.2,
  },
  addButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#000',
  },

  // Status badges (already friend / pending)
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceGlass,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  statusTextPending: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
  },

  // Avatar container for online dot
  avatarContainer: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },

  // Friend meta badges (streak, level)
  friendMetaRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 3,
  },
  friendMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.surfaceGlass,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  friendMetaText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },

  // Profile Modal
  profileModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  profileModalBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  profileModalContainer: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  profileModalGradient: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.borderLight,
  },
  profileModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  profileModalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  profileModalAvatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  profileOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    borderWidth: 2.5,
    borderColor: Colors.background,
  },
  profileModalName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  profileModalSince: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  profileStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  profileStatValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  profileStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  profileSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  profileNoActivity: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  profileActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  profileActivityText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  profileActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  profileActionButton: {
    flex: 1,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  profileActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  profileActionText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  profileBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.errorSoft,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  profileBlockText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.error,
  },
  profileCloseButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  profileCloseText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 120,
  },
});
