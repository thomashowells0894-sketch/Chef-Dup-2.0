import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import {
  Heart,
  MessageCircle,
  Share2,
  Plus,
  ArrowLeft,
  Users,
  Trophy,
  Dumbbell,
  TrendingUp,
  Utensils,
  X,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import OptimizedFlatList from '../components/OptimizedFlatList';
import SocialPostCard from '../components/SocialPostCard';
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
import { hapticLight, hapticSuccess, hapticImpact } from '../lib/haptics';
import { useSocialFeed } from '../hooks/useSocialFeed';
import { useFriends } from '../hooks/useFriends';
import { useBlockedUsers } from '../hooks/useBlockedUsers';
import { useAuth } from '../context/AuthContext';
import { Image } from 'expo-image';
import ReportModal from '../components/ReportModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Feed tabs
const FEED_TABS = [
  { key: 'community', label: 'Community' },
  { key: 'friends', label: 'Friends' },
];

// Post type configuration
const POST_TYPES = [
  { key: 'achievement', label: 'Achievement', icon: Trophy, color: '#FFD700' },
  { key: 'workout', label: 'Workout', icon: Dumbbell, color: '#00D4FF' },
  { key: 'milestone', label: 'Milestone', icon: TrendingUp, color: '#BF5AF2' },
  { key: 'progress', label: 'Progress', icon: TrendingUp, color: '#FF6B35' },
  { key: 'meal', label: 'Meal', icon: Utensils, color: '#00E676' },
];

// Loading skeleton for posts
function SkeletonPost({ index }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(index * 80)
        .springify()
        .damping(12)}
      style={styles.skeletonContainer}
    >
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonHeaderText}>
            <View style={[styles.skeletonLine, { width: '40%' }]} />
            <View style={[styles.skeletonLine, { width: '25%', height: 10 }]} />
          </View>
        </View>
        <View style={[styles.skeletonLine, { width: '90%', marginTop: Spacing.md }]} />
        <View style={[styles.skeletonLine, { width: '70%' }]} />
        <View style={[styles.skeletonLine, { width: '50%' }]} />
        <View style={styles.skeletonActions}>
          <View style={[styles.skeletonLine, { width: 40, height: 16 }]} />
          <View style={[styles.skeletonLine, { width: 40, height: 16 }]} />
          <View style={[styles.skeletonLine, { width: 40, height: 16 }]} />
        </View>
      </View>
    </ReAnimated.View>
  );
}

// Type selector pill for modal
function TypePill({ type, isActive, onPress }) {
  const IconComponent = type.icon;
  return (
    <Pressable
      onPress={() => onPress(type.key)}
      style={[
        styles.typePill,
        isActive && { backgroundColor: type.color + '25', borderColor: type.color + '50' },
      ]}
    >
      <IconComponent size={14} color={isActive ? type.color : Colors.textTertiary} />
      <Text
        style={[
          styles.typePillText,
          isActive && { color: type.color, fontWeight: FontWeight.semibold },
        ]}
      >
        {type.label}
      </Text>
    </Pressable>
  );
}

// Activity type icons and labels
const ACTIVITY_ICONS = {
  workout: { emoji: '\uD83C\uDFCB\uFE0F', color: '#00D4FF' },
  streak: { emoji: '\uD83D\uDD25', color: '#FF6B35' },
  protein_goal: { emoji: '\uD83C\uDF56', color: '#FF6B9D' },
  challenge_join: { emoji: '\uD83C\uDFC6', color: '#FFD700' },
  achievement: { emoji: '\u2B50', color: '#BF5AF2' },
  meal: { emoji: '\uD83C\uDF7D\uFE0F', color: '#00E676' },
  default: { emoji: '\uD83D\uDCAA', color: Colors.primary },
};

// Friend activity item (lightweight)
function FriendActivityItem({ item, onReact }) {
  const activityConfig = ACTIVITY_ICONS[item.activityType] || ACTIVITY_ICONS.default;
  const timeAgo = getTimeAgo(item.createdAt);

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityLeft}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.activityAvatar} cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={[styles.activityAvatar, styles.activityAvatarPlaceholder]}>
            <Text style={styles.activityAvatarText}>{(item.userName || '?')[0].toUpperCase()}</Text>
          </View>
        )}
        <View style={[styles.activityDot, { backgroundColor: activityConfig.color }]}>
          <Text style={styles.activityDotEmoji}>{activityConfig.emoji}</Text>
        </View>
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.activityTime}>{timeAgo}</Text>
      </View>
      <Pressable
        style={styles.activityReactButton}
        onPress={() => onReact?.(item.id)}
      >
        <Text style={styles.activityReactEmoji}>{'\uD83D\uDCAA'}</Text>
      </Pressable>
    </View>
  );
}

function getTimeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SocialFeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    posts,
    isLoading,
    isRefreshing,
    hasMore,
    loadMore,
    refresh,
    createPost,
    toggleLike,
    fetchComments,
    addComment,
    getFriendActivity,
  } = useSocialFeed();
  const { friends } = useFriends();
  const { blockedIds, blockUser, reportContent } = useBlockedUsers();

  // Report modal state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // Feed tab state
  const [activeTab, setActiveTab] = useState('community');
  const [friendActivity, setFriendActivity] = useState([]);
  const [friendActivityLoading, setFriendActivityLoading] = useState(false);

  // Create post modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [postType, setPostType] = useState('workout');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load friend activity when Friends tab is selected
  useEffect(() => {
    if (activeTab !== 'friends' || !friends?.length) return;
    const friendIds = friends.map(f => f.friendId);
    let cancelled = false;
    const load = async () => {
      setFriendActivityLoading(true);
      const data = await getFriendActivity(friendIds, 30);
      if (!cancelled) {
        setFriendActivity(data);
        setFriendActivityLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeTab, friends, getFriendActivity]);

  // Handlers
  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  const handleLike = useCallback(
    async (postId, reactionType) => {
      await hapticLight();
      toggleLike(postId, reactionType);
    },
    [toggleLike]
  );

  const handleFetchComments = useCallback(
    async (postId) => fetchComments(postId),
    [fetchComments]
  );

  const handleAddComment = useCallback(
    async (postId, content) => addComment(postId, content),
    [addComment]
  );

  const handleShare = useCallback((postId) => {
    // Share handling
  }, []);

  const handleMore = useCallback((postId) => {
    // More options handling
  }, []);

  const handleReport = useCallback((post) => {
    setSelectedPost(post);
    setReportModalVisible(true);
  }, []);

  const handleReportSubmit = useCallback(async ({ reason, description }) => {
    if (!selectedPost) return;
    await reportContent({
      reportedUserId: selectedPost.userId,
      contentType: 'post',
      contentId: selectedPost.id,
      reason,
      description,
    });
    setReportModalVisible(false);
    setSelectedPost(null);
  }, [selectedPost, reportContent]);

  const handleBlock = useCallback(async (post) => {
    await blockUser(post.userId, post.userName);
  }, [blockUser]);

  const handleTabChange = useCallback(async (tab) => {
    await hapticLight();
    setActiveTab(tab);
  }, []);

  const handleOpenModal = useCallback(async () => {
    await hapticImpact();
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(async () => {
    await hapticLight();
    setModalVisible(false);
    setPostType('workout');
    setPostTitle('');
    setPostBody('');
  }, []);

  const handleSelectType = useCallback(async (type) => {
    await hapticLight();
    setPostType(type);
  }, []);

  const handleSubmitPost = useCallback(async () => {
    if (!postBody.trim()) return;
    setIsSubmitting(true);
    await hapticSuccess();

    const content = postTitle.trim()
      ? `${postTitle.trim()}\n\n${postBody.trim()}`
      : postBody.trim();

    await createPost({
      type: postType,
      content,
    });

    setIsSubmitting(false);
    setModalVisible(false);
    setPostType('workout');
    setPostTitle('');
    setPostBody('');
  }, [postTitle, postBody, postType, createPost]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  // Render post item
  const renderPost = useCallback(
    ({ item, index }) => (
      <ReAnimated.View
        entering={FadeInDown.delay(60 + index * 40)
          .springify()
          .damping(12)}
      >
        <SocialPostCard
          post={item}
          onLike={handleLike}
          onReaction={handleLike}
          onFetchComments={handleFetchComments}
          onAddComment={handleAddComment}
          onShare={handleShare}
          onMore={handleMore}
          onReport={handleReport}
          onBlock={handleBlock}
        />
      </ReAnimated.View>
    ),
    [handleLike, handleFetchComments, handleAddComment, handleShare, handleMore, handleReport, handleBlock]
  );

  // Render friend activity item
  const renderActivityItem = useCallback(
    ({ item, index }) => (
      <ReAnimated.View
        entering={FadeInDown.delay(40 + index * 30)
          .springify()
          .damping(12)}
      >
        <FriendActivityItem item={item} />
      </ReAnimated.View>
    ),
    []
  );

  const activityKeyExtractor = useCallback((item) => item.id, []);

  const keyExtractor = useCallback((item) => item.id, []);

  const handleGoToFriends = useCallback(async () => {
    await hapticLight();
    router.push('/friends');
  }, [router]);

  // Empty state
  const EmptyState = useMemo(
    () => (
      <ReAnimated.View
        entering={FadeInDown.springify().damping(12)}
        style={styles.emptyContainer}
      >
        <GlassCard style={styles.emptyCard}>
          <View style={styles.emptyIconContainer}>
            <Users size={48} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to share!
          </Text>
          <Text style={styles.emptyDescription}>
            Share your workouts, achievements, and milestones with the community.
          </Text>
          <Pressable onPress={handleOpenModal} style={styles.emptyButton}>
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyButtonGradient}
            >
              <Plus size={18} color={Colors.background} />
              <Text style={styles.emptyButtonText}>Create First Post</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={handleGoToFriends} style={styles.findFriendsButton}>
            <Users size={16} color={Colors.primary} />
            <Text style={styles.findFriendsText}>Find Friends</Text>
          </Pressable>
        </GlassCard>
      </ReAnimated.View>
    ),
    [handleOpenModal, handleGoToFriends]
  );

  // Filter out posts from blocked users
  const filteredPosts = useMemo(
    () => posts.filter((p) => !blockedIds.has(p.userId)),
    [posts, blockedIds]
  );

  // Footer loading indicator
  const ListFooter = useMemo(() => {
    if (!hasMore || filteredPosts.length === 0) return <View style={styles.bottomSpacer} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <View style={styles.bottomSpacer} />
      </View>
    );
  }, [hasMore, filteredPosts.length]);

  // Can submit check
  const canSubmit = postBody.trim().length > 0 && !isSubmitting;

  return (
    <ScreenWrapper edges={['top']}>
      {/* Header */}
      <ReAnimated.View
        entering={FadeInDown.delay(0).springify().damping(12)}
        style={styles.header}
      >
        <Pressable style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Users size={20} color={Colors.primary} />
          <Text style={styles.headerTitle}>Community Feed</Text>
        </View>
        <View style={styles.headerRight} />
      </ReAnimated.View>

      {/* Feed Tabs */}
      <ReAnimated.View
        entering={FadeInDown.delay(20).springify().damping(12)}
        style={styles.feedTabsContainer}
      >
        {FEED_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.feedTab, isActive && styles.feedTabActive]}
              onPress={() => handleTabChange(tab.key)}
            >
              {isActive ? (
                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.feedTabGradient}
                >
                  <Text style={styles.feedTabTextActive}>{tab.label}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.feedTabText}>{tab.label}</Text>
              )}
            </Pressable>
          );
        })}
      </ReAnimated.View>

      {/* Community Tab: posts */}
      {activeTab === 'community' && (
        <>
          {/* Loading skeleton */}
          {isLoading && filteredPosts.length === 0 ? (
            <FlatList
              data={[0, 1, 2, 3]}
              renderItem={({ item }) => <SkeletonPost index={item} />}
              keyExtractor={(item) => `skeleton-${item}`}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            /* Posts list */
            <OptimizedFlatList
              data={filteredPosts}
              renderItem={renderPost}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.4}
              ListEmptyComponent={EmptyState}
              ListFooterComponent={ListFooter}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={refresh}
                  tintColor={Colors.primary}
                  colors={[Colors.primary]}
                  progressBackgroundColor={Colors.surface}
                />
              }
            />
          )}
        </>
      )}

      {/* Friends Tab: activity feed */}
      {activeTab === 'friends' && (
        <>
          {friendActivityLoading ? (
            <View style={styles.friendsLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.friendsLoadingText}>Loading friend activity...</Text>
            </View>
          ) : friendActivity.length === 0 ? (
            <ReAnimated.View
              entering={FadeInDown.springify().damping(12)}
              style={styles.emptyContainer}
            >
              <GlassCard style={styles.emptyCard}>
                <View style={styles.emptyIconContainer}>
                  <Users size={48} color={Colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No friend activity</Text>
                <Text style={styles.emptyDescription}>
                  {friends?.length === 0
                    ? 'Add some friends to see their activity here!'
                    : 'Your friends have been quiet lately. Check back soon!'}
                </Text>
              </GlassCard>
            </ReAnimated.View>
          ) : (
            <FlatList
              data={friendActivity}
              renderItem={renderActivityItem}
              keyExtractor={activityKeyExtractor}
              contentContainerStyle={styles.activityListContent}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={<View style={styles.bottomSpacer} />}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
              initialNumToRender={10}
            />
          )}
        </>
      )}

      {/* FAB - Create Post */}
      <ReAnimated.View
        entering={FadeInDown.delay(300).springify().damping(12)}
        style={styles.fabContainer}
      >
        <Pressable onPress={handleOpenModal}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Plus size={26} color={Colors.background} strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </ReAnimated.View>

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => { setReportModalVisible(false); setSelectedPost(null); }}
        onSubmit={handleReportSubmit}
      />

      {/* Create Post Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={handleCloseModal} />
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['rgba(22, 22, 26, 0.98)', 'rgba(10, 10, 12, 0.99)']}
              style={styles.modalGradient}
            >
              {/* Modal top bar */}
              <View style={styles.modalHandle} />

              {/* Modal header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Post</Text>
                <Pressable onPress={handleCloseModal} style={styles.modalCloseButton}>
                  <X size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {/* Type selector */}
              <Text style={styles.modalSectionLabel}>Post Type</Text>
              <View style={styles.typePillsRow}>
                {POST_TYPES.map((type) => (
                  <TypePill
                    key={type.key}
                    type={type}
                    isActive={postType === type.key}
                    onPress={handleSelectType}
                  />
                ))}
              </View>

              {/* Title input */}
              <TextInput
                style={styles.titleInput}
                placeholder="Title (optional)"
                placeholderTextColor={Colors.textMuted}
                value={postTitle}
                onChangeText={setPostTitle}
                maxLength={120}
                returnKeyType="next"
              />

              {/* Body textarea */}
              <TextInput
                style={styles.bodyInput}
                placeholder="Share your progress with the community..."
                placeholderTextColor={Colors.textMuted}
                value={postBody}
                onChangeText={setPostBody}
                multiline
                maxLength={2000}
                textAlignVertical="top"
              />

              {/* Character count */}
              <Text style={styles.charCount}>{postBody.length}/2000</Text>

              {/* Submit button */}
              <Pressable
                onPress={handleSubmitPost}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && canSubmit && { opacity: 0.85 },
                ]}
              >
                <LinearGradient
                  colors={canSubmit ? Gradients.primary : Gradients.disabled}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <Text style={styles.submitText}>Post</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
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
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 44,
  },

  // Feed Tabs
  feedTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  feedTab: {
    flex: 1,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feedTabActive: {
    borderWidth: 0,
    ...Shadows.button,
    shadowOpacity: 0.15,
  },
  feedTabGradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  feedTabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  feedTabTextActive: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },

  // Friend activity
  activityListContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  activityLeft: {
    position: 'relative',
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  activityAvatarPlaceholder: {
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityAvatarText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  activityDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  activityDotEmoji: {
    fontSize: 9,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  activityReactButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityReactEmoji: {
    fontSize: 16,
  },
  friendsLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xxxl,
  },
  friendsLoadingText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  // List
  listContent: {
    paddingBottom: 100,
  },

  // Skeleton
  skeletonContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  skeletonCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    marginRight: Spacing.sm,
  },
  skeletonHeaderText: {
    gap: 6,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.surfaceElevated,
    marginBottom: 6,
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  // Empty state
  emptyContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xxxl,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  emptyButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  emptyButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  findFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  findFriendsText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: Spacing.lg,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.fab,
  },

  // Footer
  footerLoader: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 80,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  modalContainer: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalGradient: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.borderLight,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Type selector
  modalSectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typePillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },

  // Inputs
  titleInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  bodyInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 120,
    maxHeight: 200,
    lineHeight: 22,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },

  // Submit
  submitButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  submitGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    height: 52,
  },
  submitText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.background,
    letterSpacing: 0.3,
  },
});
